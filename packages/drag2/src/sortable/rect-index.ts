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
   *
   * `live` reports whether the controller is still alive (I-36). It is read
   * **between every consumer-reachable call in the traversal**, which since
   * C4-01 includes the candidate's own `getBoundingClientRect()`: the candidate
   * is a consumer-owned element and an overridden `getBoundingClientRect()` is
   * a consumer call, not a layout read (contract 05 I-36, indirect-invocation
   * clause). So a composition with **no** `visual()` reads it too — there the
   * item is its own visual and the geometry read is the only consumer call in
   * the loop, but it is still one.
   *
   * Returns `false` — and **only** then — when the rebuild aborted on the
   * terminal barrier. The caller owes the rest of I-36 for its own reads: it
   * must invoke no further consumer code, which includes measuring the
   * consumer-owned placeholder, whose `getBoundingClientRect()` a consumer may
   * have overridden. One shared channel rather than a per-axis `live()`
   * recheck: the recheck would cost a call per resolution in *every*
   * composition, where this costs one per candidate per **rebuild** only.
   */
  refresh(
    snapshot: CollectionSnapshot,
    dragged: HTMLElement,
    getVisual: ((item: HTMLElement) => HTMLElement) | null,
    live: () => boolean,
  ): boolean;
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

  // Declared before the record so the shared I-36 exit below can name it: the
  // exit restores the retired state and reports the abort, and one definition
  // of "stop" is what keeps the four barriers in `refresh` from drifting.
  let index: RectIndex;
  /**
   * **Not a `break`.** `destroy()` has already run `retire()` on this very cache
   * through the assembler's retire hooks, and falling through to `refresh`'s
   * trailing bookkeeping would write `count = n`, `items.length = n`,
   * `measured = version`, `dirty = false` — resurrecting a retired cache,
   * marking it clean, and pinning every row of the list in a destroyed
   * controller against I-20.
   *
   * **And the abort is reported**, because emptying the cache is not enough on
   * its own: `count === 0` makes the candidate scan find nothing, but both axes
   * measure the consumer-owned *placeholder* before that scan.
   */
  const abort = (): boolean => {
    index.retire();

    return false;
  };

  index = {
    values: new Float64Array(0),
    items: [],
    count: 0,

    refresh(snapshot, dragged, getVisual, live): boolean {
      // A warm cache reads no geometry and calls no resolver, so it needs no
      // barrier — and it cannot be reached on a destroyed controller anyway:
      // `retire()` sets `dirty`, and teardown always runs it.
      if (!dirty && measured === snapshot.version) {
        return true;
      }

      // **The entry barrier** (I-36). A caller can reach a *dirty* cache with
      // the controller already closed: `settleDisplacement` runs the
      // `beforeMove` hooks — which measure consumer-owned rows — and
      // `release.prepare` resolves straight afterwards. Without this the first
      // `getVisual` of that rebuild would be a consumer call after `destroy()`
      // returned.
      if (!live()) {
        return abort();
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
        let visual = item;

        if (getVisual !== null) {
          visual = getVisual(item);

          // **The resolver barrier** (I-36), inside the branch because with no
          // resolver composed there is no call here for it to stand behind.
          if (!live()) {
            return abort();
          }
        }

        // **The geometry barrier** (I-36, indirect-invocation clause), and it
        // is *outside* the branch: `visual` is a consumer-owned element in
        // every composition — with no `visual()` composed the candidate item is
        // its own visual — so an overridden `getBoundingClientRect()` is
        // consumer code the loop just ran. Everything after this line is a
        // publication into the cache, and the next iteration is another
        // consumer call, so the reading is taken before either.
        //
        // This is the barrier C2-01 and C3-01 placed one call too early
        // (C4-01): they stood between the resolver and the geometry read and
        // then let the geometry read itself cross.
        const rect = visual.getBoundingClientRect();

        if (!live()) {
          return abort();
        }

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

      return true;
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

    /**
     * The element array is what pins DOM between operations, so it is emptied;
     * the numeric buffer is kept and reused. Also what `abort()` above calls.
     */
    retire(): void {
      index.items.length = 0;
      index.count = 0;
      dirty = true;
      measured = -1;
    },
  };

  return index;
}
