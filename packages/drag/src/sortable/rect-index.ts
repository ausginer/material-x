/**
 * The packed destination-slot geometry cache, shared by every axis rule.
 *
 * The cache is dimension-neutral: it packs both centers and both edges and has no
 * rule about which of them matters. It is one `Float64Array` plus one parallel
 * element array, indexed by destination position, which is the collection minus the
 * dragged item. A slot is therefore the index the resulting `Insertion` needs.
 *
 * The element array holds every slot. The packed buffer holds measured geometry for
 * one contiguous range of slots, the window: every slot after `refresh`, and only
 * the slots `measure` added after `collect`.
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

/** Packs one rect as a slot at `offset`: both edges on each axis, then both centers. */
function pack(
  target: Float64Array,
  offset: number,
  rect: DOMRectReadOnly,
): void {
  target[offset + LEFT] = rect.left;
  target[offset + TOP] = rect.top;
  target[offset + RIGHT] = rect.right;
  target[offset + BOTTOM] = rect.bottom;
  target[offset + CENTER_X] = (rect.left + rect.right) * 0.5;
  target[offset + CENTER_Y] = (rect.top + rect.bottom) * 0.5;
}

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
 * The hot path: each axis rule reads `values`, the slot range it scans and
 * `placeholderRect` once per resolution, and `items` only when proposing a gap
 * change. Do not add a read inside the candidate loop.
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

  /** The window's first slot. */
  #first = 0;

  /** The slot after the window's last one: the window is empty when it equals `#first`. */
  #end = 0;

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
    // The element array is truncated to the slots the last scan produced.
    return this.#items.length;
  }

  get first(): number {
    return this.#first;
  }

  get end(): number {
    return this.#end;
  }

  /**
   * Measures every slot, only when something marked the cache dirty or the
   * collection version changed. `getBox` is the configured geometry source, or
   * `null` when every candidate is its own box. `displacement` is the composed sink,
   * or `null`.
   */
  refresh(
    snapshot: CollectionSnapshot,
    dragged: HTMLElement,
    getBox: ((item: HTMLElement) => HTMLElement) | null,
    placeholder: HTMLElement,
    displacement: DisplacementSink | null,
  ): void {
    this.collect(snapshot, dragged, placeholder, 0);

    // An empty window after `collect` is a rebuild, or a collection with no slot.
    if (this.#first === this.#end) {
      this.measure(0, this.#items.length, getBox, displacement);
    }
  }

  /**
   * `refresh` without the slots: when the cache is stale, collects every slot's
   * element and measures the placeholder, and leaves an empty window at `slot`.
   * `measure` then adds slots to the window.
   */
  collect(
    snapshot: CollectionSnapshot,
    dragged: HTMLElement,
    placeholder: HTMLElement,
    slot: number,
  ): void {
    if (!this.#dirty && this.#measured === snapshot.version) {
      return;
    }

    if (snapshot.items.length > this.#capacity) {
      this.#capacity = capacityFor(snapshot.items.length);
      this.#values = new Float64Array(this.#capacity * STRIDE);
    }

    // A local, not repeated field reads: the loop writes it once per slot.
    const items = this.#items;
    let n = 0;

    for (const item of snapshot.items) {
      if (item !== dragged) {
        items[n] = item;
        n += 1;
      }
    }

    pack(this.#placeholderRect, 0, placeholder.getBoundingClientRect());
    // Truncated, so that a shrinking collection does not retain elements, and so
    // that its length is the slot count.
    items.length = n;
    this.#first = slot;
    this.#end = slot;
    this.#measured = snapshot.version;
    this.#dirty = false;
  }

  /**
   * Measures the slots from `lo` to before `hi`, settled through the sink, and adds
   * them to the window. The range starts or ends at the window's first or end slot,
   * so the window stays one contiguous range.
   */
  measure(
    lo: number,
    hi: number,
    getBox: ((item: HTMLElement) => HTMLElement) | null,
    displacement: DisplacementSink | null,
  ): void {
    // Locals, not repeated field reads inside the loop.
    const values = this.#values;
    const items = this.#items;

    for (let i = lo; i < hi; i += 1) {
      const item = items[i]!;
      // The box, because the placeholder is sized from the box's footprint, so both
      // sides of the comparison are the same kind of rect.
      pack(
        values,
        i * STRIDE,
        (getBox ? getBox(item) : item).getBoundingClientRect(),
      );
    }

    // The slots must hold where flow puts a row, not where an animation draws it.
    // The sink settles from the start of the buffer and the array it receives, so a
    // range after slot 0 is a view and a copy of its elements.
    displacement?.settle(
      values.subarray(lo * STRIDE),
      lo ? items.slice(lo, hi) : items,
      hi - lo,
    );

    // An empty window sits at the slot `collect` gave it, so a range next to it
    // extends it the same way.
    if (lo < this.#first) {
      this.#first = lo;
    }

    if (hi > this.#end) {
      this.#end = hi;
    }
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
   * slot shows it. A stale cache or an empty window reads nothing and answers
   * `true`, because the next resolution measures what it needs anyway.
   *
   * The slot is the end of the window farther from `gap`, the gap the placeholder
   * holds. Committed moves displace the slots next to the gap, so a slot far from it
   * is the least likely to carry a running animation, and a settled reading that
   * misses by more than the slack costs a new measurement.
   */
  holds(
    gap: number,
    snapshot: CollectionSnapshot,
    getBox: ((item: HTMLElement) => HTMLElement) | null,
    displacement: DisplacementSink | null,
  ): boolean {
    // Read once: each is used twice below.
    const first = this.#first;
    const end = this.#end;

    if (this.#dirty || this.#measured !== snapshot.version || first === end) {
      return true;
    }

    const slot = end - gap > gap - first ? end - 1 : first;
    const item = this.#items[slot]!;
    // Packed like a slot, because the sink settles slots. Only left and top are
    // compared.
    const scratch = new Float64Array(STRIDE);

    pack(scratch, 0, (getBox ? getBox(item) : item).getBoundingClientRect());
    displacement?.settle(scratch, [item], 1);

    const offset = slot * STRIDE;

    return (
      Math.abs(scratch[LEFT]! - this.#values[offset + LEFT]!) <=
        EQUIVALENCE_SLACK &&
      Math.abs(scratch[TOP]! - this.#values[offset + TOP]!) <= EQUIVALENCE_SLACK
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
    this.#dirty = true;
    this.#measured = -1;
  }
}

/**
 * Development only: the window the previous advance wrote must equal what a fresh
 * measurement of the same slots in the tree now produces. Every test that drives a
 * drag through `y()` checks it. It forces the rebuild, measures every slot of the
 * window again and compares a copy, so a mismatch leaves the cache correct, and the
 * measurement has one definition. It is a free function so that it tree-shakes from
 * the published build.
 */
export function verifyEquivalence(
  index: RectIndex,
  snapshot: CollectionSnapshot,
  dragged: HTMLElement,
  getBox: ((item: HTMLElement) => HTMLElement) | null,
  placeholder: HTMLElement,
  displacement: DisplacementSink | null,
): void {
  // Taken before the rebuild below rewrites them.
  const { count: held, first, end } = index;
  const predicted = index.values.slice(0, end * STRIDE);
  const predictedPlaceholder = index.placeholderRect.slice();
  const predictedItems = [...index.items];

  index.invalidate();
  index.collect(snapshot, dragged, placeholder, first);

  index.measure(first, end, getBox, displacement);

  const differs = (a: number, b: number): boolean =>
    Math.abs(a - b) > EQUIVALENCE_SLACK;
  // Read once, outside the comparison loops.
  const { values, placeholderRect, items, count } = index;
  let mismatch = count === held ? '' : `count ${held}, measured ${count}`;

  for (let slot = 0; mismatch === '' && slot < held; slot += 1) {
    if (predictedItems[slot] !== items[slot]) {
      mismatch = `slot ${slot}`;
    }
  }

  for (let i = first * STRIDE; mismatch === '' && i < end * STRIDE; i += 1) {
    if (differs(predicted[i]!, values[i]!)) {
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
      `drag: the predicted insertion geometry disagreed with a fresh measurement at ${mismatch}; the linear shift rule does not hold for this list`,
    );
  }
}
