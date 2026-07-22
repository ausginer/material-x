/**
 * A packed, reusable geometry cache for sortable hit testing. The rects of every
 * non-dragged item are stored in one `Float64Array` (stride 6) with a parallel
 * element array, so a frame's nearest-centre search is a single scalar scan with
 * no `Map`, no per-item `Point`, and no intermediate destination array. The
 * buffer grows by powers of two and is reused for the lifetime of an operation.
 *
 * The array is indexed by *destination* position — the collection minus the
 * dragged item, in DOM order — so a slot is directly the index the resulting
 * {@link Insertion} needs, and its neighbours are the adjacent elements.
 */
import type { Point } from '../kernel/types.ts';

const RECT_STRIDE = 6;
const RECT_LEFT = 0;
const RECT_TOP = 1;
const RECT_RIGHT = 2;
const RECT_BOTTOM = 3;
const RECT_CENTER_X = 4;
const RECT_CENTER_Y = 5;

export type RectIndex = {
  /** Packed `[left, top, right, bottom, centerX, centerY]` per destination slot. */
  values: Float64Array;
  /** Destination items in DOM order, parallel to the packed slots. */
  items: HTMLElement[];
  /** Number of populated slots. */
  count: number;
  /** Allocated slot capacity of `values`. */
  capacity: number;
};

export function createRectIndex(): RectIndex {
  return { values: new Float64Array(0), items: [], count: 0, capacity: 0 };
}

const nextPow2 = (n: number): number => {
  let capacity = 1;

  while (capacity < n) {
    capacity *= 2;
  }

  return capacity;
};

/** Grows `values` to hold `needed` slots, never shrinking during a gesture. */
function ensureCapacity(index: RectIndex, needed: number): void {
  if (needed <= index.capacity) {
    return;
  }

  const capacity = nextPow2(needed);
  index.values = new Float64Array(capacity * RECT_STRIDE);
  index.capacity = capacity;
}

/**
 * Re-measures every non-dragged item into `index`. Reads one `getBoundingClientRect`
 * per item and nothing else; after it returns, hit testing touches only the
 * packed array.
 */
export function rebuildRectIndex(
  index: RectIndex,
  items: readonly HTMLElement[],
  dragged: HTMLElement,
  getVisual: (item: HTMLElement) => HTMLElement,
): void {
  ensureCapacity(index, items.length);
  const { values } = index;
  let n = 0;

  for (const item of items) {
    if (item === dragged) {
      continue;
    }

    const rect = getVisual(item).getBoundingClientRect();
    const offset = n * RECT_STRIDE;
    values[offset + RECT_LEFT] = rect.left;
    values[offset + RECT_TOP] = rect.top;
    values[offset + RECT_RIGHT] = rect.right;
    values[offset + RECT_BOTTOM] = rect.bottom;
    values[offset + RECT_CENTER_X] = (rect.left + rect.right) * 0.5;
    values[offset + RECT_CENTER_Y] = (rect.top + rect.bottom) * 0.5;
    index.items[n] = item;
    n += 1;
  }

  index.count = n;
  // Truncate so stale references from a larger previous rebuild neither pin
  // memory nor leak into a neighbour lookup.
  index.items.length = n;
}

/**
 * The destination slot whose centre is nearest the pointer, or `-1` when the
 * `anchor` centre (the placeholder's own slot) is nearest — meaning the anchor
 * should stay put. The anchor is the incumbent to beat, which resists oscillation.
 */
export function nearestSlot(
  index: RectIndex,
  anchor: Point,
  pointer: Point,
): number {
  const { values, count } = index;
  const ax = pointer.x - anchor.x;
  const ay = pointer.y - anchor.y;
  let best = ax * ax + ay * ay;
  let nearest = -1;

  for (let i = 0; i < count; i += 1) {
    const offset = i * RECT_STRIDE;
    const dx = pointer.x - values[offset + RECT_CENTER_X]!;
    const dy = pointer.y - values[offset + RECT_CENTER_Y]!;
    const distance = dx * dx + dy * dy;

    if (distance < best) {
      best = distance;
      nearest = i;
    }
  }

  return nearest;
}
