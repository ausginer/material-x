/**
 * The packed destination-slot geometry cache, shared by every axis feature.
 *
 * **Dimension-neutral, deliberately.** It packs both centres and both edges and
 * expresses no rule about which of them matters — that is the axis feature's,
 * and stays in the axis feature's own module. Extracting this is what lets
 * `y()` and `xy()` be two *rules* rather than two implementations of a
 * cache, without either of them growing a branch about the other.
 *
 * One `Float64Array` plus one parallel element array, indexed by **destination**
 * position — the collection minus the dragged item — so a slot *is* the index
 * the resulting `Insertion` needs and its neighbours are the adjacent elements.
 *
 * Each axis feature holds its own instance, created inside its factory, so the
 * "where does the geometry cache live" question stays answered by construction:
 * nobody else can name it, reach it, or type it (H-4).
 */
import type { CollectionSnapshot } from './domain.ts';

/** Packed `[left, top, right, bottom, centreX, centreY]` per destination slot. */
export const STRIDE = 6;
export const LEFT = 0;
export const TOP = 1;
export const RIGHT = 2;
export const BOTTOM = 3;
export const CENTRE_X = 4;
export const CENTRE_Y = 5;

/**
 * **Fields, not accessors.** An earlier shape exposed `values()` and `count()`
 * as methods, which cost 90 B on the minimal composition and two calls per
 * resolution on the hot path — for encapsulation nothing can observe, since the
 * whole record is private to one feature instance.
 */
export type RectIndex = {
  /** The packed values. Re-allocated only when the collection outgrows it. */
  values: Float64Array;
  /** Destination-ordered elements, parallel to the packed slots. */
  items: HTMLElement[];
  /** How many destination slots the last scan produced. */
  count: number;
  /**
   * Re-measures only when something dirtied the cache or the collection version
   * moved. On a frame where the pointer merely travels inside the same slot this
   * reads no geometry at all and the previous scan stands.
   *
   * `getVisual` is the installed `visual()` resolver, or `null` when no
   * `visual()` is composed — in which case every candidate *is* its own visual
   * and the resolver would be an identity call per item per rebuild.
   */
  refresh(
    snapshot: CollectionSnapshot,
    dragged: HTMLElement,
    getVisual: ((item: HTMLElement) => HTMLElement) | null,
  ): void;
  invalidate(): void;
  retire(): void;
};

const capacityFor = (needed: number): number => {
  let capacity = 1;

  while (capacity < needed) {
    capacity *= 2;
  }

  return capacity;
};

export function createRectIndex(): RectIndex {
  let capacity = 0;
  // Starts stale, and at a version no real collection can hold, so the first
  // resolution of every operation measures.
  let dirty = true;
  let measured = -1;

  const index: RectIndex = {
    values: new Float64Array(0),
    items: [],
    count: 0,

    refresh(snapshot, dragged, getVisual): void {
      if (!dirty && measured === snapshot.version) {
        return;
      }

      const list = snapshot.items;

      if (list.length > capacity) {
        capacity = capacityFor(list.length);
        index.values = new Float64Array(capacity * STRIDE);
      }

      const { values, items } = index;
      let n = 0;

      for (const item of list) {
        if (item === dragged) {
          continue;
        }

        // The **visual's** box, not the item's, because the incumbent this
        // geometry is compared against is the placeholder — which is sized from
        // the visual's offset box (`placement.ts`). Measuring items here and
        // the placeholder there would compare centres of differently-derived
        // boxes, and for an inset or offset visual that biases the hysteresis.
        // Parity: the shipped index resolved the visual per candidate too.
        const rect = (
          getVisual === null ? item : getVisual(item)
        ).getBoundingClientRect();
        const offset = n * STRIDE;

        values[offset + LEFT] = rect.left;
        values[offset + TOP] = rect.top;
        values[offset + RIGHT] = rect.right;
        values[offset + BOTTOM] = rect.bottom;
        values[offset + CENTRE_X] = (rect.left + rect.right) * 0.5;
        values[offset + CENTRE_Y] = (rect.top + rect.bottom) * 0.5;
        items[n] = item;
        n += 1;
      }

      index.count = n;
      // Truncated, so a shrinking collection neither pins the elements a larger
      // previous rebuild saw nor leaks one into a neighbour lookup.
      items.length = n;
      measured = snapshot.version;
      dirty = false;
    },

    /**
     * The behavior owns the events that make geometry stale — activation,
     * scroll, resize, a committed placeholder move, collection publication,
     * release — and the feature owns the cache. One flag, because any single
     * reason forces the same full rebuild.
     */
    invalidate(): void {
      dirty = true;
    },

    retire(): void {
      // The element array is what pins DOM between operations, so it is
      // emptied; the numeric buffer is kept and reused.
      index.items.length = 0;
      index.count = 0;
      dirty = true;
      measured = -1;
    },
  };

  return index;
}
