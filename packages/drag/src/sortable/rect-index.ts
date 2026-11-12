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
import type { DisplacementSink } from './axis.ts';
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
 * The read-only view of a packed buffer. `Float64Array` is assignable to it and
 * `view[0] = 1` is a type error. It has no runtime cost.
 */
export type ReadonlyFloat64Array = Readonly<{
  [index: number]: number;
  length: number;
  slice(start?: number, end?: number): Float64Array;
}>;

function capacityFor(needed: number): number {
  let capacity = 1;

  while (capacity < needed) {
    capacity *= 2;
  }

  return capacity;
}

/**
 * One slack value, sized to the precision at which geometry is reported. Gecko
 * reports a rect in 1/60 px, so a settled reading is off by up to 1/120 px. A
 * predicted slot is a reading plus the difference of two readings, and the rebuild
 * carries its own, so the bound is 1/30 px. The slack is the next power of two above
 * it, far below the smallest disagreement a broken rule produces, which is a row.
 */
const EQUIVALENCE_SLACK = 1 / 16;

/**
 * The hot path: each axis rule reads `values`, `count` and `placeholderRect` once per
 * resolution, and `items` only when proposing a gap change. Do not add a read
 * inside the candidate loop.
 */
export class RectIndex {
  /**
   * Re-allocated only when the collection outgrows it. It never shrinks: it is
   * bounded by the largest collection the controller saw, and released with it.
   */
  #values: Float64Array = new Float64Array(0);

  /**
   * The placeholder's rect, packed like a slot. Measured once per rebuild here, so a
   * resolution with nothing stale reads no layout at all.
   */
  readonly #placeholderRect: Float64Array = new Float64Array(STRIDE);

  /** Destination-ordered elements, parallel to the packed slots. */
  readonly #items: HTMLElement[] = [];

  /** How many destination slots the last scan produced. */
  #count = 0;

  /** Slots the packed buffer can hold: a power of two once fitted. */
  #capacity = 0;

  /** Starts stale, at a version no collection holds, so the first read measures. */
  #dirty = true;

  #measured = -1;

  get values(): ReadonlyFloat64Array {
    return this.#values;
  }

  get placeholderRect(): ReadonlyFloat64Array {
    return this.#placeholderRect;
  }

  get items(): readonly HTMLElement[] {
    return this.#items;
  }

  get count(): number {
    return this.#count;
  }

  /**
   * Measures only when something marked the cache dirty or the collection version
   * changed. `getBox` is the configured geometry source, or `null` when every
   * candidate is its own box. `displacement` is the composed sink, or `null`.
   */
  refresh(
    snapshot: CollectionSnapshot,
    dragged: HTMLElement,
    getBox: ((item: HTMLElement) => HTMLElement) | null,
    placeholder: HTMLElement,
    displacement: DisplacementSink | null,
  ): void {
    if (!this.#dirty && this.#measured === snapshot.version) {
      return;
    }

    if (snapshot.items.length > this.#capacity) {
      this.#capacity = capacityFor(snapshot.items.length);
      this.#values = new Float64Array(this.#capacity * STRIDE);
    }

    // Locals, not repeated field reads: the loop writes `values` and `items` once
    // per slot, `placeholderRect` takes six writes, and a local is also smaller.
    const values = this.#values;
    const items = this.#items;
    const placeholderRect = this.#placeholderRect;
    let n = 0;

    for (const item of snapshot.items) {
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
    displacement?.settle(values, items, n);

    const rect = placeholder.getBoundingClientRect();

    placeholderRect[LEFT] = rect.left;
    placeholderRect[TOP] = rect.top;
    placeholderRect[RIGHT] = rect.right;
    placeholderRect[BOTTOM] = rect.bottom;
    placeholderRect[CENTER_X] = (rect.left + rect.right) * 0.5;
    placeholderRect[CENTER_Y] = (rect.top + rect.bottom) * 0.5;

    this.#count = n;
    // Truncated, so that a shrinking collection does not retain elements.
    items.length = n;
    this.#measured = snapshot.version;
    this.#dirty = false;
  }

  /**
   * Advances a span of slots by a constant along y. The center is recomputed from
   * the shifted edges, so the arithmetic is the one a full scan performs.
   */
  advance(lo: number, hi: number, delta: number): void {
    // Read once, outside the per-slot loop.
    const values = this.#values;

    for (let i = lo; i < hi; i += 1) {
      const offset = i * STRIDE;
      const top = values[offset + TOP]! + delta;
      const bottom = values[offset + BOTTOM]! + delta;

      values[offset + TOP] = top;
      values[offset + BOTTOM] = bottom;
      values[offset + CENTER_Y] = (top + bottom) * 0.5;
    }
  }

  /**
   * Re-reads the placeholder's fields along y. A relocation in a column leaves both
   * x coordinates unchanged.
   */
  remeasurePlaceholder(placeholder: HTMLElement): void {
    const { top, bottom } = placeholder.getBoundingClientRect();
    // A local is smaller than three field reads, even with mangled private names.
    const placeholderRect = this.#placeholderRect;

    placeholderRect[TOP] = top;
    placeholderRect[BOTTOM] = bottom;
    placeholderRect[CENTER_Y] = (top + bottom) * 0.5;
  }

  /**
   * Whether one slot's element is still where the cache holds it: measured again like
   * a rebuild measures it, and compared on left and top within `EQUIVALENCE_SLACK`. A
   * scroll or a layout shift outside the list moves every slot by one vector, so one
   * slot shows it. A stale or empty cache reads nothing and answers `true`, because
   * its next refresh measures every slot anyway.
   *
   * The slot is the end of the list farther from `gap`, the gap the placeholder
   * holds. Committed moves displace the slots next to the gap, so a slot far from it
   * is the least likely to carry a running animation, and a settled reading that
   * misses by more than the slack costs a full measurement.
   */
  holds(
    gap: number,
    snapshot: CollectionSnapshot,
    getBox: ((item: HTMLElement) => HTMLElement) | null,
    displacement: DisplacementSink | null,
  ): boolean {
    if (
      this.#dirty ||
      this.#measured !== snapshot.version ||
      this.#count === 0
    ) {
      return true;
    }

    const slot = gap * 2 < this.#count ? this.#count - 1 : 0;
    const item = this.#items[slot]!;
    const rect = (getBox ? getBox(item) : item).getBoundingClientRect();
    // Packed like a slot, because the sink settles slots. Only left and top are
    // compared.
    const scratch = new Float64Array(STRIDE);

    scratch[LEFT] = rect.left;
    scratch[TOP] = rect.top;
    scratch[RIGHT] = rect.right;
    scratch[BOTTOM] = rect.bottom;
    displacement?.settle(scratch, [item], 1);

    const offset = slot * STRIDE;

    return (
      Math.abs(scratch[LEFT] - this.#values[offset + LEFT]!) <=
        EQUIVALENCE_SLACK &&
      Math.abs(scratch[TOP] - this.#values[offset + TOP]!) <= EQUIVALENCE_SLACK
    );
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
    this.#items.length = 0;
    this.#count = 0;
    this.#dirty = true;
    this.#measured = -1;
  }
}

/**
 * Development only: the buffer the previous advance wrote must equal what a full
 * scan of the tree now produces. Every test that drives a drag through `y()` checks
 * it. It forces the rebuild and compares a copy, so a mismatch leaves the cache
 * correct, and the scan has one definition. It is a free function so that it
 * tree-shakes from the published build.
 */
export function verifyEquivalence(
  index: RectIndex,
  snapshot: CollectionSnapshot,
  dragged: HTMLElement,
  getBox: ((item: HTMLElement) => HTMLElement) | null,
  placeholder: HTMLElement,
  displacement: DisplacementSink | null,
): void {
  // Taken before the refresh below rewrites the count.
  const held = index.count;
  const predicted = index.values.slice(0, held * STRIDE);
  const predictedPlaceholder = index.placeholderRect.slice();
  const predictedItems = [...index.items];

  index.invalidate();
  index.refresh(snapshot, dragged, getBox, placeholder, displacement);

  const differs = (a: number, b: number): boolean =>
    Math.abs(a - b) > EQUIVALENCE_SLACK;
  // Read once, outside the comparison loops.
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
}
