/**
 * The packed destination-slot geometry cache, shared by every axis rule.
 *
 * The cache is dimension-neutral: it packs both centers and both edges and has no
 * rule about which of them matters. It is one `Float64Array` plus one parallel
 * element array, indexed by destination position, which is the collection minus the
 * dragged item. A slot is therefore the index the resulting `Insertion` needs.
 *
 * Each axis rule creates its own instance inside its factory, so the cache has one
 * owner.
 */
import type { CollectionSnapshot } from './domain.ts';

/** Packed `[left, top, right, bottom, centerX, centerY]` per destination slot. */
export const STRIDE = 6;
export const LEFT = 0;
export const TOP = 1;
export const RIGHT = 2;
export const BOTTOM = 3;
export const CENTER_X = 4;
export const CENTER_Y = 5;

/**
 * Turns the buffer an axis has just measured into settled geometry, by subtracting
 * what the displacement sink currently holds for each element in the first `count`
 * slots. It computes the answer from animation timing and reads no layout. So no
 * animation is cancelled for a rebuild, and a row never jumps back.
 */
export type DisplacementSettle = (
  values: Float64Array,
  items: readonly HTMLElement[],
  count: number,
) => void;

/**
 * The read-only view of a packed buffer. `Float64Array` is assignable to it and
 * `view[0] = 1` is a type error. It has no runtime cost.
 */
export interface ReadonlyFloat64Array {
  readonly [index: number]: number;
  readonly length: number;
}

/**
 * What a collaborator may read from the cache. The owner writes through the class's
 * own declarations of the same members.
 */
export interface RectIndexView {
  readonly values: ReadonlyFloat64Array;
  readonly placeholderRect: ReadonlyFloat64Array;
  readonly items: readonly HTMLElement[];
  readonly count: number;
}

const capacityFor = (needed: number): number => {
  let capacity = 1;

  while (capacity < needed) {
    capacity *= 2;
  }

  return capacity;
};

/** The first four packed fields are the rect's edges, in this order. */
const edge = (rect: DOMRect, offset: number): number => {
  if (offset === LEFT) {
    return rect.left;
  }

  if (offset === TOP) {
    return rect.top;
  }

  return offset === RIGHT ? rect.right : rect.bottom;
};

/**
 * The hot path: each axis rule reads `values`, `count` and `placeholderRect` once per
 * resolution, and `items` only when proposing a gap change. Do not add a read
 * inside the candidate loop.
 */
export class RectIndex implements RectIndexView {
  /** Re-allocated only when the collection outgrows it or shrinks well below it. */
  values: Float64Array = new Float64Array(0);

  /**
   * The placeholder's rect, packed like a slot. Measured once per rebuild here, so a
   * resolution with nothing stale reads no layout at all.
   */
  readonly placeholderRect: Float64Array = new Float64Array(STRIDE);

  /** Destination-ordered elements, parallel to the packed slots. */
  readonly items: HTMLElement[] = [];

  /** How many destination slots the last scan produced. */
  count = 0;

  /** Slots the packed buffer can hold: a power of two once fitted. */
  #capacity = 0;

  /** Starts stale, at a version no collection holds, so the first read measures. */
  #dirty = true;

  #measured = -1;

  /**
   * Measures only when something marked the cache dirty or the collection version
   * changed. `getBox` is the configured geometry source, or `null` when every
   * candidate is its own box. `settle` is the sink's walk, or `null` with no
   * displacement composed.
   */
  refresh(
    snapshot: CollectionSnapshot,
    dragged: HTMLElement,
    getBox: ((item: HTMLElement) => HTMLElement) | null,
    placeholder: HTMLElement,
    settle: DisplacementSettle | null,
  ): void {
    if (!this.#dirty && this.#measured === snapshot.version) {
      return;
    }

    const list = snapshot.items;

    // `capacityFor` gives `n <= capacity < 2n` for a fitted buffer, so `4n` needs a
    // real shrink, and a collection moving around a power of two does not resize.
    // The inner test matters only at `n === 0`, whose one-slot buffer would
    // otherwise reallocate on every scan.
    if (list.length > this.#capacity || this.#capacity > 4 * list.length) {
      const fitted = capacityFor(list.length);

      if (fitted !== this.#capacity) {
        this.#capacity = fitted;
        this.values = new Float64Array(fitted * STRIDE);
      }
    }

    const { values, items, placeholderRect } = this;
    let n = 0;

    for (const item of list) {
      if (item === dragged) {
        continue;
      }

      // The box, because the placeholder is sized from the box's footprint, so both
      // sides of the comparison are the same kind of rect.
      const rect = (getBox ? getBox(item) : item).getBoundingClientRect();
      const offset = n * STRIDE;

      values[offset + LEFT] = rect.left;
      values[offset + TOP] = rect.top;
      values[offset + RIGHT] = rect.right;
      values[offset + BOTTOM] = rect.bottom;
      values[offset + CENTER_X] = (rect.left + rect.right) * 0.5;
      values[offset + CENTER_Y] = (rect.top + rect.bottom) * 0.5;
      items[n] = item;
      n += 1;
    }

    // The slots must hold where flow puts a row, not where an animation draws it.
    settle?.(values, items, n);

    const rect = placeholder.getBoundingClientRect();

    placeholderRect[LEFT] = rect.left;
    placeholderRect[TOP] = rect.top;
    placeholderRect[RIGHT] = rect.right;
    placeholderRect[BOTTOM] = rect.bottom;
    placeholderRect[CENTER_X] = (rect.left + rect.right) * 0.5;
    placeholderRect[CENTER_Y] = (rect.top + rect.bottom) * 0.5;

    this.count = n;
    // Truncated, so that a shrinking collection does not retain elements.
    items.length = n;
    this.#measured = snapshot.version;
    this.#dirty = false;
  }

  /**
   * Advances a span of slots by a constant. It moves the three fields the caller
   * names. The center is recomputed from the shifted edges, so the arithmetic is the
   * one a full scan performs.
   */
  advance(
    lo: number,
    hi: number,
    delta: number,
    start: number,
    end: number,
    center: number,
  ): void {
    const { values } = this;

    for (let i = lo; i < hi; i += 1) {
      const offset = i * STRIDE;
      const shiftedStart = values[offset + start]! + delta;
      const shiftedEnd = values[offset + end]! + delta;

      values[offset + start] = shiftedStart;
      values[offset + end] = shiftedEnd;
      values[offset + center] = (shiftedStart + shiftedEnd) * 0.5;
    }
  }

  /**
   * Re-reads the placeholder's three fields along the axis. A relocation leaves both
   * cross-axis coordinates unchanged.
   */
  remeasurePlaceholder(
    placeholder: HTMLElement,
    start: number,
    end: number,
    center: number,
  ): void {
    const rect = placeholder.getBoundingClientRect();
    const { placeholderRect } = this;
    const a = edge(rect, start);
    const b = edge(rect, end);

    placeholderRect[start] = a;
    placeholderRect[end] = b;
    placeholderRect[center] = (a + b) * 0.5;
  }

  /** One flag, because any reason for staleness forces the same full rebuild. */
  invalidate(): void {
    this.#dirty = true;
  }

  /**
   * Empties the element array, which would retain DOM between operations, and keeps
   * the numeric buffer for reuse.
   */
  retire(): void {
    this.items.length = 0;
    this.count = 0;
    this.#dirty = true;
    this.#measured = -1;
  }
}

/** The development-build flag. Branches guarded by it fold away. */
export const DEV: boolean = __DEV__;

/**
 * One slack value, sized to the precision at which geometry is reported. Gecko
 * reports a rect in 1/60 px, so a settled reading is off by up to 1/120 px. A
 * predicted slot is a reading plus the difference of two readings, and the rebuild
 * carries its own, so the bound is 1/30 px. The slack is the next power of two above
 * it, far below the smallest disagreement a broken rule produces, which is a row.
 */
const EQUIVALENCE_SLACK = 1 / 16;

/**
 * Development only: the buffer the previous advance wrote must equal what a full
 * scan of the tree now produces. Every test that drives a drag through `y()` checks
 * it. It forces the rebuild and compares a copy, so a mismatch leaves the cache
 * correct, and the scan has one definition. It is a free function so that it
 * tree-shakes from the published build.
 */
export const verifyEquivalence = (
  index: RectIndex,
  snapshot: CollectionSnapshot,
  dragged: HTMLElement,
  getBox: ((item: HTMLElement) => HTMLElement) | null,
  placeholder: HTMLElement,
  settle: DisplacementSettle | null,
): void => {
  const held = index.count;
  const predicted = index.values.slice(0, held * STRIDE);
  const predictedPlaceholder = index.placeholderRect.slice();
  const predictedItems = [...index.items];

  index.invalidate();
  index.refresh(snapshot, dragged, getBox, placeholder, settle);

  const differs = (a: number, b: number): boolean =>
    Math.abs(a - b) > EQUIVALENCE_SLACK;
  const { values, placeholderRect, items, count } = index;
  let mismatch = count === held ? '' : `count ${held}, full scan ${count}`;

  for (let i = 0; mismatch === '' && i < held * STRIDE; i += 1) {
    if (
      predictedItems[Math.floor(i / STRIDE)] !==
        items[Math.floor(i / STRIDE)] ||
      differs(predicted[i]!, values[i]!)
    ) {
      mismatch = `slot ${Math.floor(i / STRIDE)}`;
    }
  }

  for (let field = LEFT; mismatch === '' && field <= BOTTOM; field += 1) {
    if (differs(predictedPlaceholder[field]!, placeholderRect[field]!)) {
      mismatch = 'the placeholder';
    }
  }

  if (mismatch !== '') {
    throw new Error(
      `drag: the predicted insertion geometry disagreed with a full scan at ${mismatch}; the linear shift rule does not hold for this list`,
    );
  }
};
