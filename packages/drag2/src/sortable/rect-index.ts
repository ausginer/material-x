/**
 * The packed destination-slot geometry cache, shared by every axis feature.
 *
 * **Dimension-neutral, deliberately.** It packs both centres and both edges and
 * expresses no rule about which of them matters — that is the axis feature's,
 * and stays in the axis feature's own module. Extracting this is what lets
 * `y()` and `xy()` be two *rules* rather than two implementations of a cache,
 * without either of them growing a branch about the other.
 *
 * One `Float64Array` plus one parallel element array, indexed by
 * **destination** position — the collection minus the dragged item — so a slot
 * *is* the index the resulting `Insertion` needs and its neighbours are the
 * adjacent elements.
 *
 * Each axis feature holds its own instance, created inside its factory, so the
 * "where does the geometry cache live" question stays answered by construction:
 * nobody else can name it, reach it, or type it.
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
 * **Fields, not accessors.** Exposing `values()` and `count()` as methods costs
 * 90 B on the minimal composition and two calls per resolution on the hot path
 * — for encapsulation nothing can observe, since the whole record is private to
 * one feature instance.
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
   * moved. On a frame where the pointer merely travels inside the same slot
   * this reads no geometry at all and the previous scan stands.
   *
   * The parameter is the installed `box` slot — already defaulted to `visual`
   * by the assembler — or `null` when the config named neither, in which case
   * every candidate *is* its own box and the resolver would be an identity call
   * per item per rebuild.
   *
   * `live` reports whether the controller is still alive. It is read **between
   * every consumer-reachable call in the traversal**, including the candidate's
   * own `getBoundingClientRect()`: the candidate is a consumer-owned element
   * and an overridden `getBoundingClientRect()` is a consumer call, not a
   * layout read. So a composition with **no** resolver reads it too — there the
   * item is its own box and the geometry read is the only consumer call in the
   * loop, but it is still one.
   *
   * Returns `false` — and **only** then — when the rebuild aborted on the
   * terminal barrier. The caller owes the same discipline for its own reads: it
   * must invoke no further consumer code, which includes measuring the
   * consumer-owned placeholder, whose `getBoundingClientRect()` a consumer may
   * have overridden. One shared channel rather than a per-axis `live()`
   * recheck: the recheck would cost a call per resolution in *every*
   * composition, where this costs one per candidate per **rebuild** only.
   */
  refresh(
    snapshot: CollectionSnapshot,
    dragged: HTMLElement,
    getBox: ((item: HTMLElement) => HTMLElement) | null,
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

  // Declared before the record so the shared terminal exit below can name it:
  // the exit restores the retired state and reports the abort, and one
  // definition of "stop" is what keeps the four barriers in `refresh` from
  // drifting.
  let index: RectIndex;
  /**
   * **Not a `break`.** `destroy()` has already run `retire()` on this very
   * cache through the assembler's retire hooks, and falling through to
   * `refresh`'s trailing bookkeeping would write `count = n`,
   * `items.length = n`, `measured = version`, `dirty = false` — resurrecting a
   * retired cache, marking it clean, and pinning every row of the list in a
   * destroyed controller.
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

    refresh(snapshot, dragged, getBox, live): boolean {
      // A warm cache reads no geometry and calls no resolver, so it needs no
      // barrier — and it cannot be reached on a destroyed controller anyway:
      // `retire()` sets `dirty`, and teardown always runs it.
      if (!dirty && measured === snapshot.version) {
        return true;
      }

      // **The entry barrier.** A caller can reach a *dirty* cache with the
      // controller already closed: `settleDisplacement` runs the `beforeMove`
      // hooks — which measure consumer-owned rows — and `release.prepare`
      // resolves straight afterwards. Without this the first `getBox` of that
      // rebuild would be a consumer call after `destroy()` returned.
      if (!live()) {
        return abort();
      }

      const list = snapshot.items;

      // **One decision about one resource, driven by one number.** Growth and
      // shrink are the same question — is this buffer the right size for the
      // collection about to be scanned — so they are one branch rather than
      // two. It sits here, after the warm return and the entry barrier, because
      // `refresh` holds the real `list.length`: `retire()` would have to
      // **predict** the next operation's need from the last one's, and a policy
      // that needs no prediction needs no state that can go stale.
      //
      // **Nothing in the buffer is live at this instant.** The warm path
      // returned above, so the cache is dirty, and the scan below rewrites
      // every slot. A timer or an idle hook is refused by construction rather
      // than by preference: releasing a *correctly sized* buffer on elapsed
      // time makes a deterministic cache timing-dependent and needs a policy
      // input this library has no basis to own.
      //
      // **`capacity > 4 * n` is a consequence, not a tuning choice.**
      // `capacityFor` makes `n ≤ capacity < 2n` for any fitted buffer, so
      // `capacity > 2 * n` is already unreachable without a real collection
      // shrink; `4×` is one doubling looser, the cheapest hysteresis available,
      // and it keeps a collection wobbling around a power-of-two boundary from
      // resizing. A shrink therefore always allocates strictly less than it
      // frees, which is what separates this from a memory-for-allocations trade
      // — and exact-fit shrinking is refused for the same reason, since it
      // would recover a fitted buffer's legitimate slack and pay with a
      // reallocation on every single-item growth.
      if (list.length > capacity || capacity > 4 * list.length) {
        const fitted = capacityFor(list.length);

        // **The settle guard, and it earns its line at exactly one size.** For
        // any `n ≥ 1` a firing gate implies `fitted < capacity`, so this is
        // true by construction. At `n === 0` it is not: the gate reads
        // `capacity > 0`, which the one-slot buffer a previous empty refresh
        // just produced also satisfies — so without this an empty collection
        // reallocates 48 B on every scan instead of settling.
        if (fitted !== capacity) {
          capacity = fitted;
          index.values = new Float64Array(capacity * STRIDE);
        }
      }

      const { values, items } = index;
      let n = 0;

      for (const item of list) {
        if (item === dragged) {
          continue;
        }

        // The **box**, not the item and not the visual. The incumbent this
        // geometry is compared against is the placeholder, which is sized from
        // the box's removed footprint (`placement.ts`) — so the box is what
        // puts both sides of the comparison on one kind of rect. Measuring
        // items here, or visuals, would bias the hysteresis by the whole
        // distance between the two for any box that is not also the lifted
        // node. Under the default `box === visual` they coincide.
        let box = item;

        if (getBox) {
          box = getBox(item);

          // **The resolver barrier**, inside the branch because with no
          // resolver composed there is no call here for it to stand behind.
          if (!live()) {
            return abort();
          }
        }

        // **The geometry barrier**, covering indirect invocation, and it is
        // *outside* the branch: `box` is a consumer-owned element in every
        // composition — with no resolver composed the candidate item is its own
        // box — so an overridden `getBoundingClientRect()` is consumer code the
        // loop just ran. Everything after this line is a publication into the
        // cache, and the next iteration is another consumer call, so the
        // reading is taken before either.
        const rect = box.getBoundingClientRect();

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
