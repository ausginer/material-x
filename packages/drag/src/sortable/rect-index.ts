/**
 * The packed destination-slot geometry cache, shared by every axis rule.
 *
 * The cache is dimension-neutral: it packs both centers and both edges and has no
 * rule about which of them matters. It is one `number[]` of packed slots plus one
 * parallel element array, indexed by destination position, which is the collection
 * minus the dragged item. A slot is therefore the index the resulting `Insertion`
 * needs. The same array holds the placeholder, at slot `PLACEHOLDER`, and one
 * scratch slot before it, which a single re-read uses.
 *
 * The element array holds every slot. The slot array holds measured geometry for
 * one contiguous range of slots, the window: the slots `measure` added after
 * `collect`. A rebuild measures every slot, so its window is all of them.
 *
 * Each axis rule creates its own instance inside its factory, so the cache has one
 * owner. The cache owns its storage, and every write to it is a method: each
 * measurement, the settling of a measurement and a predicted shift. Code outside
 * reads one value at a time, through `at`, `item` and `insertion`, and never holds
 * the slot array or the element array.
 *
 * The axis that `shift` and `travel` work along is chosen at construction, as data:
 * both apply the same arithmetic to either axis, so the cache keeps no rule about
 * which one a list moves along.
 */
import type { DisplacementSink } from './axis.ts';
import {
  type CollectionSnapshot,
  type Insertion,
  insertionAt,
} from './domain.ts';

/** Packed `[left, top, right, bottom, centerX, centerY]` per destination slot. */
export const STRIDE = 6;
export const LEFT = 0;
export const TOP = 1;
export const RIGHT = 2;
export const BOTTOM = 3;
export const CENTER_X = 4;
export const CENTER_Y = 5;

/** The slot `at` reads the placeholder at. */
export const PLACEHOLDER = -1;

/**
 * The slots stored before slot 0: the scratch slot, then the placeholder. Slot `s`
 * is at `(s + LEADING) * STRIDE`.
 */
const LEADING = 2;

/**
 * One slack value, sized to the precision at which geometry is reported. Gecko
 * reports a rect in 1/60 px, so a settled reading is off by up to 1/120 px. A
 * predicted slot is a reading plus the difference of two readings, and the rebuild
 * carries its own, so the bound is 1/30 px. The slack is the next power of two above
 * it, far below the smallest disagreement a broken rule produces, which is a row.
 */
const EQUIVALENCE_SLACK = 1 / 16;

/**
 * The hot path: each axis rule reads the slot range it scans once per resolution,
 * then one number per candidate through `at`.
 */
export class RectIndex {
  /**
   * The scratch slot, the placeholder, then the packed slots. It grows only by
   * appending, so it never has a hole, and it never shrinks: it holds the largest
   * collection the index measured, and is released with the index.
   */
  readonly #values: number[] = [];

  /** Destination-ordered elements, parallel to the packed slots. */
  readonly #items: HTMLElement[] = [];

  /**
   * `LEFT` or `TOP`: the axis `shift` moves along and `travel` reads. An index that
   * never shifts keeps the default.
   */
  readonly #axis: number;

  /** The window's first slot. */
  #first = 0;

  /** The slot after the window's last one: the window is empty when it equals `#first`. */
  #end = 0;

  /** Starts stale, at a version no collection holds, so the first read measures. */
  #dirty = true;

  #measured = -1;

  constructor(axis: number = LEFT) {
    this.#axis = axis;
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
   * One packed field of `slot`, or of the placeholder at `PLACEHOLDER`. A slot's
   * value is valid inside the window.
   */
  at(slot: number, field: number): number {
    return this.#values[(slot + LEADING) * STRIDE + field]!;
  }

  /** The element at `slot`. */
  item(slot: number): HTMLElement {
    return this.#items[slot]!;
  }

  /** The insertion at gap `gap` of the destination. */
  insertion(gap: number): Insertion {
    return insertionAt(this.#items, gap);
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
    for (let i = values.length; i < (n + LEADING) * STRIDE; i += 1) {
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
   * Measures the slots from `lo` to before `hi`, each settled through the sink, and
   * adds them to the window. The range starts or ends at the window's first or end
   * slot, so the window stays one contiguous range.
   */
  measure(
    lo: number,
    hi: number,
    getBox: ((item: HTMLElement) => HTMLElement) | null,
    displacement: DisplacementSink | null,
  ): void {
    // A local, not repeated field reads inside the loop.
    const items = this.#items;

    for (let i = lo; i < hi; i += 1) {
      this.#read(i, items[i]!, getBox, displacement);
    }

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
   * Moves the slots from `lo` to before `hi` by `delta` along the index's axis: both
   * edges move, and the center is recomputed from them, so the arithmetic is the
   * one a measurement performs. The other axis does not change. The range is inside
   * the window.
   */
  shift(lo: number, hi: number, delta: number): void {
    // Locals, not repeated field reads inside the loop.
    const values = this.#values;
    const axis = this.#axis;

    for (let i = lo; i < hi; i += 1) {
      // The near edge on the axis. The far edge and the center follow it at the
      // same distances as `RIGHT` and `CENTER_X` follow `LEFT`.
      const offset = (i + LEADING) * STRIDE + axis;
      const near = values[offset]! + delta;
      const far = values[offset + RIGHT]! + delta;

      values[offset] = near;
      values[offset + RIGHT] = far;
      values[offset + CENTER_X] = (near + far) * 0.5;
    }
  }

  /**
   * How far `slot`'s element now is, along the index's axis, from where the cache
   * holds it: measured again like a rebuild measures it, settled through the sink.
   * The slot is inside the window.
   */
  travel(
    slot: number,
    getBox: ((item: HTMLElement) => HTMLElement) | null,
    displacement: DisplacementSink | null,
  ): number {
    const axis = this.#axis;

    this.#read(-LEADING, this.#items[slot]!, getBox, displacement);

    return (
      this.#values[axis]! - this.#values[(slot + LEADING) * STRIDE + axis]!
    );
  }

  /**
   * Measures the placeholder again, packed like a slot. A rebuild calls it, and so
   * may an axis rule whose committed move relocated the placeholder.
   */
  measurePlaceholder(placeholder: HTMLElement): void {
    this.#read(PLACEHOLDER, placeholder, null, null);
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
    const values = this.#values;
    const offset = (slot + LEADING) * STRIDE;

    // Into the scratch slot, at offset 0. Only left and top are compared.
    this.#read(-LEADING, this.#items[slot]!, getBox, displacement);

    return (
      Math.abs(values[LEFT]! - values[offset + LEFT]!) <= EQUIVALENCE_SLACK &&
      Math.abs(values[TOP]! - values[offset + TOP]!) <= EQUIVALENCE_SLACK
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

  /**
   * Reads `element`'s rect, or its box's, into `slot`, settled: what a running
   * animation of the sink currently carries is subtracted, so the slot holds where
   * flow puts the element, not where the animation draws it.
   */
  #read(
    slot: number,
    element: HTMLElement,
    getBox: ((item: HTMLElement) => HTMLElement) | null,
    displacement: DisplacementSink | null,
  ): void {
    const values = this.#values;
    const offset = (slot + LEADING) * STRIDE;
    // The box, because the placeholder is sized from the box's footprint, so both
    // sides of the comparison are the same kind of rect.
    const rect = (getBox ? getBox(element) : element).getBoundingClientRect();
    let dx = 0;
    let dy = 0;

    if (displacement?.displaced(element)) {
      ({ dx, dy } = displacement);
    }

    const left = rect.left - dx;
    const top = rect.top - dy;
    const right = rect.right - dx;
    const bottom = rect.bottom - dy;

    values[offset + LEFT] = left;
    values[offset + TOP] = top;
    values[offset + RIGHT] = right;
    values[offset + BOTTOM] = bottom;
    values[offset + CENTER_X] = (left + right) * 0.5;
    values[offset + CENTER_Y] = (top + bottom) * 0.5;
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
 * `heldLeft` and `heldRight` are the placeholder's left and right as the cache held
 * them before the re-read after a committed move, or `NaN` when there was none. The
 * relocation must have left its x where the last rebuild measured it.
 */
export function verifyEquivalence(
  index: RectIndex,
  snapshot: CollectionSnapshot,
  dragged: HTMLElement,
  getBox: ((item: HTMLElement) => HTMLElement) | null,
  placeholder: HTMLElement,
  displacement: DisplacementSink | null,
  heldLeft: number,
  heldRight: number,
): void {
  // Taken before the rebuild below rewrites them.
  const { count: held, first, end } = index;
  const predicted: number[] = [];
  const predictedItems: HTMLElement[] = [];

  for (let slot = PLACEHOLDER; slot < end; slot += 1) {
    for (let field = 0; field < STRIDE; field += 1) {
      predicted.push(index.at(slot, field));
    }
  }

  // A relocation leaves the placeholder's x where the rebuild measured it.
  if (!Number.isNaN(heldLeft)) {
    predicted[LEFT] = heldLeft;
    predicted[RIGHT] = heldRight;
  }

  for (let slot = 0; slot < held; slot += 1) {
    predictedItems.push(index.item(slot));
  }

  index.invalidate();
  index.collect(snapshot, dragged, placeholder, first);

  index.measure(first, end, getBox, displacement);

  const differs = (slot: number, field: number): boolean =>
    Math.abs(
      predicted[(slot - PLACEHOLDER) * STRIDE + field]! - index.at(slot, field),
    ) > EQUIVALENCE_SLACK;
  const { count } = index;
  let mismatch = count === held ? '' : `count ${held}, measured ${count}`;

  for (let slot = 0; mismatch === '' && slot < held; slot += 1) {
    if (predictedItems[slot] !== index.item(slot)) {
      mismatch = `slot ${slot}`;
    }
  }

  for (let slot = first; mismatch === '' && slot < end; slot += 1) {
    for (let field = 0; mismatch === '' && field < STRIDE; field += 1) {
      if (differs(slot, field)) {
        mismatch = `slot ${slot}`;
      }
    }
  }

  for (let field = LEFT; mismatch === '' && field <= BOTTOM; field += 1) {
    if (differs(PLACEHOLDER, field)) {
      mismatch = 'the placeholder';
    }
  }

  if (mismatch !== '') {
    throw new Error(
      `drag: the predicted insertion geometry disagreed with a fresh measurement at ${mismatch}; the linear shift rule does not hold for this list`,
    );
  }
}
