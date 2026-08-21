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

/**
 * The development-build flag, read as the **bare global** rather than through
 * `kernel/dev.ts`.
 *
 * The substitution is the same one M-3 measured — `__DEV__` is replaced at
 * build time, `DEV` below is a literal, and every branch guarded by it is dead
 * code the minifier drops. What is deliberately absent is the import: contract
 * 02 §What stays internal governs every name the behavior tier reaches into
 * `kernel/` for, and adding one there is a decision about the tier boundary
 * rather than about this cache. A build-time literal is not vocabulary the
 * kernel hands over, so the honest form is not to reach across at all.
 *
 * This is the first dev assertion at the behavior tier. If a second wants one,
 * that is the moment to decide whether the tier gets a shared constant of its
 * own — not this one.
 */
const DEV: boolean = __DEV__;

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
   * `getBox` is the installed `box` resolver — already defaulted to `visual`
   * by the assembler (D-43) — or `null` when the config named neither, in which
   * case every candidate *is* its own box and the resolver would be an identity
   * call per item per rebuild.
   *
   * `live` reports whether the controller is still alive (I-36). It is read
   * **between every consumer-reachable call in the traversal**, which since
   * C4-01 includes the candidate's own `getBoundingClientRect()`: the candidate
   * is a consumer-owned element and an overridden `getBoundingClientRect()` is
   * a consumer call, not a layout read (contract 05 I-36, indirect-invocation
   * clause). So a composition with **no** resolver reads it too — there the
   * item is its own box and the geometry read is the only consumer call in the
   * loop, but it is still one.
   *
   * Returns `false` — and **only** then — when the rebuild aborted on the
   * terminal barrier. The caller owes the rest of I-36 for its own reads: it
   * must invoke no further consumer code, which includes measuring the
   * consumer-owned placeholder, whose `getBoundingClientRect()` a consumer may
   * have overridden. One shared channel rather than a per-axis `live()`
   * recheck: the recheck would cost a call per resolution in *every*
   * composition, where this costs one per candidate per **rebuild** only.
   *
   * `gap` is the **committed destination gap of the placeholder move this call
   * is servicing**, or omitted for every other caller (P-06, D-100). It is two
   * things at once and deliberately so:
   *
   * - it is the *reason signal*. `measure()` has exactly one call site — the
   *   committed-move bracket — so being called with a gap at all is what says
   *   "a placeholder move just happened", with no widening of
   *   `invalidateInsertion` and no reason argument anywhere else;
   * - it is one half of the **span hypothesis**. Paired with the gap this cache
   *   last serviced it proposes which rows moved. The proposal is never
   *   trusted: it is checked against four witness reads, and any refutation
   *   falls through to the full scan, in the same window.
   *
   * Omitting it — `resolve()`, and `xy()` at every call site — is the general
   * path and is what it was before P-06.
   */
  refresh(
    snapshot: CollectionSnapshot,
    dragged: HTMLElement,
    getBox: ((item: HTMLElement) => HTMLElement) | null,
    live: () => boolean,
    gap?: number,
  ): boolean;
  invalidate(): void;
  retire(): void;
};

/**
 * The re-synchronisation interval `k` (D-100 §4): a **full** rebuild every `k`
 * committed moves, however well the verification is going.
 *
 * It is not a tuning constant — it is the exchange rate the design makes
 * explicit. Verification cannot see a `transform` applied to a single non-witness
 * row (D-100 case 3), so `k` bounds how long such a drift can persist; and with
 * the incremental path near zero the average cost is `full / k`, so the same
 * number caps the payoff at `k×`. Raising it widens the drift window by exactly
 * as much as it improves the saving.
 *
 * `8` is D-100's recommended first landing and is deliberately not tuned here.
 */
export const RESYNC_INTERVAL = 8;

/**
 * Whether the equivalence instrument runs. `DEV`-only in every sense: the flag
 * is read inside a `DEV` branch, so the published bundle contains neither the
 * read nor this module-level binding.
 *
 * **It is not the measurement flag D-100 forbade, and the direction matters.**
 * The instrument is on by default and every suite run checks it; what this
 * exists for is the opposite case — the P-06 performance evidence, which has to
 * measure the code that *ships*. The instrument performs the full scan it
 * compares against, so leaving it on would time the general path and the fast
 * path together and report a number that exists in no build a consumer can
 * install. A measurement that turns it off is measuring the product; a suite
 * that turns it off would be measuring nothing, and nothing else may call this.
 */
let verifying = true;

/** @see verifying — used by `tests/perf`, and by nothing in `src`. */
export function setRefreshVerification(enabled: boolean): void {
  if (DEV) {
    verifying = enabled;
  }
}

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
  /**
   * How many `invalidate()` calls have landed since the cache was last made
   * clean — **not a boolean**, because `dirty` cannot distinguish "the
   * bracket's own invalidation and nothing else" from "the bracket's, plus a
   * scroll that is still outstanding" (D-100 condition 4). Exactly one is the
   * fast path's licence; anything else means an external reason is pending and
   * the span hypothesis does not cover it. A scroll that arrived earlier and
   * was already serviced by a `resolve()` has cleared this, so it does not
   * poison later moves.
   */
  let pending = 0;
  /**
   * The destination gap the packed buffer currently reflects, or `-1` when
   * nothing is known. **This is exactly the state D-98 warned about** — it can
   * silently disagree with the DOM — so it is never trusted: it only proposes
   * the span, which is then verified. Reset by `retire()`, so it never
   * survives an operation.
   */
  let last = -1;
  /** Fast-path refreshes since the last full scan (D-100 condition 7). */
  let moves = 0;

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

  // The three outcomes of an attempted incremental refresh. `REFUSED` is not an
  // error and is not reported: it is the ordinary path, taken for a frame,
  // exactly where the full rebuild runs today (D-100 §3).
  const REFUSED = 0;
  const APPLIED = 1;
  const ABORTED = 2;

  /**
   * One witness read: **is this row exactly where the cache says it is?**
   *
   * `1` unchanged, `0` moved, `-1` the controller died inside the read. The
   * read is a consumer call under I-36's indirect-invocation clause — the row
   * is a consumer-owned element and `getBoundingClientRect()` may be
   * overridden — so the liveness reading is taken between it and everything
   * after, exactly as the candidate loop does. Four of these per committed
   * move, against `n` for a full rebuild.
   *
   * All four edges are compared, not just the axis ones. The buffer is
   * dimension-neutral by construction and the equivalence instrument holds it
   * to a full scan on both axes, so a witness that ignored X would licence a
   * write the instrument then rejects.
   */
  const witnessed = (i: number, live: () => boolean): number => {
    const rect = index.items[i]!.getBoundingClientRect();

    if (!live()) {
      return -1;
    }

    const { values } = index;
    const offset = i * STRIDE;

    return values[offset + LEFT] === rect.left &&
      values[offset + TOP] === rect.top &&
      values[offset + RIGHT] === rect.right &&
      values[offset + BOTTOM] === rect.bottom
      ? 1
      : 0;
  };

  /**
   * **The equivalence instrument** (D-100 §5.4), and the thing that makes the
   * fast path admissible rather than merely plausible.
   *
   * Whenever the incremental path runs, the packed buffer must equal what a
   * full scan of the same tree would have produced. That is asserted here, on
   * every suite run, and it is *not* behind any measurement flag: `DEV` is
   * `true` in this repository's vite and vitest configs and folds to `false` in
   * the published bundle, so every test that drives a real drag through `y()`
   * checks it and no consumer pays for it.
   *
   * **It heals before it throws.** The scan it performs to compare is the same
   * scan the full path would have run, so it writes the authoritative values
   * back as it goes and only then reports. A mismatch therefore leaves the
   * cache *correct* and the drag classified, rather than correct in the message
   * and wrong in the buffer.
   *
   * It takes no liveness readings of its own. It runs only after the fast path
   * has already completed, which took one within the same synchronous window,
   * and it exists in no build a consumer can reach.
   */
  const verify = (snapshot: CollectionSnapshot, dragged: HTMLElement): void => {
    const { values, items } = index;
    let n = 0;
    let mismatch = '';

    for (const item of snapshot.items) {
      if (item === dragged) {
        continue;
      }

      const rect = item.getBoundingClientRect();
      const offset = n * STRIDE;
      const centreX = (rect.left + rect.right) * 0.5;
      const centreY = (rect.top + rect.bottom) * 0.5;

      if (
        mismatch === '' &&
        (items[n] !== item ||
          values[offset + LEFT] !== rect.left ||
          values[offset + TOP] !== rect.top ||
          values[offset + RIGHT] !== rect.right ||
          values[offset + BOTTOM] !== rect.bottom ||
          values[offset + CENTRE_X] !== centreX ||
          values[offset + CENTRE_Y] !== centreY)
      ) {
        mismatch = `slot ${n}`;
      }

      values[offset + LEFT] = rect.left;
      values[offset + TOP] = rect.top;
      values[offset + RIGHT] = rect.right;
      values[offset + BOTTOM] = rect.bottom;
      values[offset + CENTRE_X] = centreX;
      values[offset + CENTRE_Y] = centreY;
      items[n] = item;
      n += 1;
    }

    if (mismatch === '' && n !== index.count) {
      mismatch = `count ${index.count}, full scan ${n}`;
    }

    index.count = n;
    items.length = n;

    if (mismatch !== '') {
      throw new Error(
        `drag: the incremental insertion refresh disagreed with a full scan at ${mismatch}; the span hypothesis does not hold for this list`,
      );
    }
  };

  /**
   * The span hypothesis, verified in a constant number of reads (D-100 §3).
   *
   * With the placeholder moved from gap `from` to gap `to`, the rows whose
   * geometry changed should be exactly `[lo, hi)`, each by the same scalar `δ`,
   * and nothing outside it. Four witnesses check that:
   *
   * - **the in-span witness**, row `lo`, *yields* `δ` — measured, never
   *   modelled, which is what keeps margins, `gap` and box-sizing out of this
   *   module entirely. A `δ` of zero refutes;
   * - **the after-witness**, row `hi`, must be unchanged;
   * - **the suffix witness**, row `count − 1`, must be unchanged. In a linear
   *   flow any change to any row's contribution shifts every row below it, so
   *   flow drift is suffix-shaped and this is what catches collapsing margins
   *   and scroll anchoring;
   * - **the before-witness**, row `lo − 1`, when one exists.
   *
   * Nothing is written until all four agree, so a refusal leaves the buffer
   * untouched for the full scan that follows.
   */
  const shift = (from: number, to: number, live: () => boolean): number => {
    const { count } = index;
    const lo = from < to ? from : to;
    const hi = from < to ? to : from;

    // **The named degradation** (D-100 condition 6). A span reaching the end of
    // the list has neither an after-witness nor a suffix witness outside it, so
    // the hypothesis cannot be checked at all. Dragging to the last slot pays
    // the old cost, and that is accepted rather than worked around.
    if (hi >= count) {
      return REFUSED;
    }

    const anchor = index.items[lo]!.getBoundingClientRect();

    if (!live()) {
      return ABORTED;
    }

    const { values } = index;
    const base = lo * STRIDE;
    const delta = anchor.top - values[base + TOP]!;

    if (
      delta === 0 ||
      anchor.bottom - values[base + BOTTOM]! !== delta ||
      anchor.left !== values[base + LEFT]! ||
      anchor.right !== values[base + RIGHT]!
    ) {
      return REFUSED;
    }

    const after = witnessed(hi, live);

    if (after !== 1) {
      return after === -1 ? ABORTED : REFUSED;
    }

    const tail = count - 1;

    if (tail !== hi) {
      const suffix = witnessed(tail, live);

      if (suffix !== 1) {
        return suffix === -1 ? ABORTED : REFUSED;
      }
    }

    if (lo > 0) {
      const before = witnessed(lo - 1, live);

      if (before !== 1) {
        return before === -1 ? ABORTED : REFUSED;
      }
    }

    for (let i = lo; i < hi; i += 1) {
      const offset = i * STRIDE;
      const top = values[offset + TOP]! + delta;
      const bottom = values[offset + BOTTOM]! + delta;

      values[offset + TOP] = top;
      values[offset + BOTTOM] = bottom;
      // Recomputed from the shifted edges rather than shifted itself, so the
      // arithmetic is the one the full scan performs and the equivalence
      // instrument compares like with like.
      values[offset + CENTRE_Y] = (top + bottom) * 0.5;
    }

    return APPLIED;
  };

  index = {
    values: new Float64Array(0),
    items: [],
    count: 0,

    refresh(snapshot, dragged, getBox, live, gap = -1): boolean {
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
      // `getBox` of that rebuild would be a consumer call after `destroy()`
      // returned.
      if (!live()) {
        return abort();
      }

      // **The invariant boundary** (D-100). Conditions 1 and 2 are the accepted
      // case — `y()` is the only caller that passes a gap, and a `null`
      // resolver is the only shape in which every candidate *is* its own box
      // and is in the list's own flow. Condition 3 is the packed order: a moved
      // version means membership changed and the slots no longer line up.
      // Conditions 4, 5 and 7 are the reason signal, the outstanding-reason
      // count and the re-synchronisation policy. Conditions 6 and 8 live inside
      // `shift`, because they are properties of the span rather than of the
      // call.
      //
      // The last conjunct is not one of the eight: a gap equal to the one the
      // buffer already reflects proposes an empty span, which has no in-span
      // witness and therefore yields no `δ` to verify.
      if (
        gap >= 0 &&
        getBox === null &&
        pending === 1 &&
        moves < RESYNC_INTERVAL &&
        measured === snapshot.version &&
        last >= 0 &&
        last !== gap
      ) {
        const outcome = shift(last, gap, live);

        if (outcome === ABORTED) {
          return abort();
        }

        if (outcome === APPLIED) {
          last = gap;
          moves += 1;
          pending = 0;
          dirty = false;

          if (DEV && verifying) {
            verify(snapshot, dragged);
          }

          return true;
        }
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

        // The **box**, not the item and not the visual (D-58). The incumbent
        // this geometry is compared against is the placeholder, which is sized
        // from the box's removed footprint (`placement.ts`, D-43) — so the box
        // is what puts both sides of the comparison on one kind of rect.
        // Measuring items here, or visuals, would bias the hysteresis for any
        // box that is not also the lifted node; api-1 measured the two 30 px
        // apart. Under the default `box === visual` this is D2's behavior
        // unchanged.
        let box = item;

        if (getBox !== null) {
          box = getBox(item);

          // **The resolver barrier** (I-36), inside the branch because with no
          // resolver composed there is no call here for it to stand behind.
          if (!live()) {
            return abort();
          }
        }

        // **The geometry barrier** (I-36, indirect-invocation clause), and it
        // is *outside* the branch: `box` is a consumer-owned element in every
        // composition — with no resolver composed the candidate item is its own
        // box — so an overridden `getBoundingClientRect()` is
        // consumer code the loop just ran. Everything after this line is a
        // publication into the cache, and the next iteration is another
        // consumer call, so the reading is taken before either.
        //
        // This is the barrier C2-01 and C3-01 placed one call too early
        // (C4-01): they stood between the resolver and the geometry read and
        // then let the geometry read itself cross.
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
      // Every outstanding reason has just been serviced, and this *is* the full
      // scan the re-synchronisation policy counts to.
      pending = 0;
      moves = 0;

      // Recorded on the full path too, not only the fast one: the buffer this
      // scan just produced reflects the placeholder at `gap`, so the next
      // committed move has a span to propose. A `resolve()` leaves it alone —
      // the placeholder has not moved since, so what the buffer reflects has
      // not changed either.
      if (gap >= 0) {
        last = gap;
      }

      return true;
    },

    /**
     * The behavior owns the events that make geometry stale — activation,
     * scroll, resize, a committed placeholder move, collection publication,
     * release — and the feature owns the cache.
     *
     * **A flag and a count, and the count is P-06's whole reason signal**
     * (D-100). The flag still says *something* is stale, and every reason still
     * forces the same rebuild by default. What the count adds is the one
     * distinction the flag cannot express: whether the only outstanding reason
     * is the committed move `measure()` is about to service. It is the
     * behavior's own call pattern read back, not a new argument and not a
     * widened signature.
     */
    invalidate(): void {
      dirty = true;
      // Counted rather than latched, so `measure()` can tell the bracket's own
      // invalidation from the bracket's plus an outstanding external one
      // (D-100 condition 4). Saturating, because only "exactly one" is a
      // licence and the arithmetic must not wrap on a long-lived controller
      // that never resolves.
      if (pending < 2) {
        pending += 1;
      }
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
      // The span hypothesis is per-operation. A gap recorded for the list this
      // operation dragged in would propose a span in the next operation's
      // index space, and `items` is empty here anyway.
      pending = 0;
      last = -1;
      moves = 0;
    },
  };

  return index;
}
