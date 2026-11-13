/**
 * The packed destination-slot geometry cache, shared by every axis rule.
 *
 * The cache is dimension-neutral: it packs both centers and both edges and has no
 * rule about which of them matters. It is one `number[]` of packed slots plus one
 * parallel element array, indexed by destination position, which is the collection
 * minus the dragged item. A slot is therefore the index the resulting `Insertion`
 * needs.
 *
 * The element array holds every slot. The slot array holds measured geometry for
 * one contiguous range of slots, the window: the slots `measure` added after
 * `collect`. A rebuild measures every slot, so its window is all of them.
 *
 * Each axis rule creates its own instance inside its factory, so the cache has one
 * owner. The cache makes every measurement and alone grows the slot array. An axis
 * rule reads it through the getters' read-only views and writes it only through
 * `lend`.
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
  target: number[] | Float64Array,
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
   * The packed slots. It grows only by appending, so it never has a hole, and it
   * never shrinks: it holds the largest collection the index measured, and is
   * released with the index.
   */
  readonly #values: number[] = [];

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

  /** Starts stale, at a version no collection holds, so the first read measures. */
  #dirty = true;

  #measured = -1;

  /**
   * The same array for the index's life. Its contents are valid inside the window.
   */
  get values(): readonly number[] {
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
   * When the cache is stale, collects every slot's element and measures the
   * placeholder, and leaves an empty window at `slot`. `measure` then adds slots to
   * the window.
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

    // Locals, not repeated field reads inside the loops.
    const items = this.#items;
    const values = this.#values;
    let n = 0;

    for (const item of snapshot.items) {
      if (item !== dragged) {
        items[n] = item;
        n += 1;
      }
    }

    // Appended, because `measure` may first write a slot in the middle of the
    // collection, and a write past the length would leave a hole.
    for (let i = values.length; i < n * STRIDE; i += 1) {
      values.push(0);
    }

    this.measurePlaceholder(placeholder);
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
    displacement?.settle(values, items, lo, hi);

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
   * Calls `write` once with the writable slot array, to change the slots from `lo`
   * to before `hi`. This is the rule `measure` gives the sink's `settle`, and
   * nothing checks it at runtime:
   *
   * - the range is inside the window, and `write` reads and writes nothing outside
   *   it;
   * - `write` writes the array only during the call.
   */
  lend(
    lo: number,
    hi: number,
    write: (values: number[], lo: number, hi: number) => void,
  ): void {
    write(this.#values, lo, hi);
  }

  /**
   * Measures the placeholder again, packed like a slot. A rebuild calls it, and so
   * may an axis rule whose committed move relocated the placeholder.
   */
  measurePlaceholder(placeholder: HTMLElement): void {
    pack(this.#placeholderRect, 0, placeholder.getBoundingClientRect());
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
    displacement?.settle(scratch, [item], 0, 1);

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
   * the slot array for reuse.
   */
  retire(): void {
    this.#items.length = 0;
    this.#dirty = true;
    this.#measured = -1;
  }
}

/**
 * Development only: the window the previous committed move wrote must equal what a
 * fresh measurement of the same slots in the tree now produces. Every test that
 * drives a drag through `y()` checks it. It forces the rebuild, measures every
 * slot of the window again and compares a copy, so a mismatch leaves the cache
 * correct, and the measurement has one definition. It is a free function so that it
 * tree-shakes from the published build.
 *
 * `heldPlaceholder` is the placeholder as the cache held it before the re-read after
 * a committed move, or `null` when there was none. The relocation must have left its
 * x where the last rebuild measured it.
 */
export function verifyEquivalence(
  index: RectIndex,
  snapshot: CollectionSnapshot,
  dragged: HTMLElement,
  getBox: ((item: HTMLElement) => HTMLElement) | null,
  placeholder: HTMLElement,
  displacement: DisplacementSink | null,
  heldPlaceholder: ReadonlyFloat64Array | null,
): void {
  // Taken before the rebuild below rewrites them.
  const { count: held, first, end } = index;
  const predicted = index.values.slice(0, end * STRIDE);
  const predictedPlaceholder = index.placeholderRect.slice();

  // A relocation leaves the placeholder's x where the rebuild measured it.
  if (heldPlaceholder) {
    predictedPlaceholder[LEFT] = heldPlaceholder[LEFT]!;
    predictedPlaceholder[RIGHT] = heldPlaceholder[RIGHT]!;
  }
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
