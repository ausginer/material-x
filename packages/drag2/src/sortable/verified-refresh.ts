/**
 * P-06 — the **verified** incremental refresh (D-100), and it lives here rather
 * than inside {@link createRectIndex} because of D-102.
 *
 * A committed placeholder move from gap `A` to gap `B` should change only the
 * rows in `[min, max)`, each by the same scalar `δ`. That is a *hypothesis*,
 * not tracked state: the previous gap is this module's own record and can
 * silently disagree with the DOM, so it never gets to be right on its own. It
 * proposes a span, four reads check the proposal, and any refutation falls
 * through to the full rebuild — in the same window, exactly where it runs
 * today.
 *
 * **Why it is a module and not a branch** (D-102). The fast path is `y()`-only
 * *by contract* — `xy()` wraps, so `δ` is neither scalar nor uniform — and code
 * that only one feature may ever execute belongs in that feature's module
 * graph, which is the rule every other optional feature in this package is held
 * to. Folded into the shared cache it cost an `xy()` composition **+135 B** of
 * machinery D-100's condition 1 makes unreachable for it. `bench/size` asserts
 * the absence.
 *
 * **`RectIndex` is untouched by this file's existence.** It stays
 * dimension-neutral, it keeps the full scan, and it gained **no hook**: this
 * module wraps it, mirrors the two state bits it would otherwise have had to
 * expose (`dirty`, and the version the buffer holds), and mutates the packed
 * values through the fields the record already publishes. A cache that has to
 * know about the optimization is a cache the optimization has re-coupled.
 */
import type { CollectionSnapshot } from './domain.ts';
import {
  BOTTOM,
  CENTRE_X,
  CENTRE_Y,
  LEFT,
  type RectIndex,
  RIGHT,
  STRIDE,
  TOP,
} from './rect-index.ts';

/**
 * The development-build flag, read as the **bare global** (D-101).
 *
 * `__DEV__` is declared in `src/globals.d.ts` at **package** scope, so it is
 * package vocabulary rather than kernel vocabulary and the behavior tier binds
 * it directly. `kernel/dev.ts`'s `DEV` is the kernel's own local binding of the
 * same ambient, not a name this tier reaches for — importing it would assert a
 * behavior-tier reach into `kernel/` that contract 02 §What stays internal says
 * must not exist. The substitution and the folding are identical either way:
 * `__DEV__` is replaced at build time, `DEV` is a literal, and every branch
 * guarded by it is dead code the minifier drops.
 *
 * **This is the behavior tier's one binding**, and
 * `tests/kernel/vocabulary.node.test.ts` asserts that — one per tier, and
 * `__DEV__` read at no other site. A second dev assertion in a second module of
 * this tier is the trigger for a tier-local `sortable/dev.ts`, which would
 * still import nothing from `kernel/`.
 */
const DEV: boolean = __DEV__;

/**
 * The re-synchronisation interval `k` (D-100 §4): a **full** rebuild every `k`
 * committed moves, however well the verification is going.
 *
 * It is not a tuning constant — it bounds how long a drift the verification
 * cannot see can persist, because verification cannot see a `transform` applied
 * to a single **strictly interior** row (D-100 case 3, radius corrected by
 * D-103): one that is neither end of the span, so neither in-span witness reads
 * it. At spans of 1 or 2 there is no such row and no exposure at all, and one
 * row is exactly what the general rebuild would have got wrong too.
 *
 * **What it does *not* do is cap the payoff at `k×`** — D-100 said that, and
 * the run corrected it. `k×` is a ceiling that would bind only if a verified
 * move cost approximately nothing; it costs ≈1.0 ms of the general path's
 * 3.5 ms at 800 rows, because the rebuild's dominant term in the deployed
 * regime is the **forced layout after the placeholder write** and not the
 * per-row reads. The binding ceiling is `full / verified` ≈ 3.5×, and `k` only
 * decides how close the mean lands: `k = 8` measures 2.67×, 76% of what is
 * achievable, against ~12% more for `k = 16` and ~24% less for `k = 4`. **So
 * raising it buys little and spends drift tolerance for it**, and D-100's
 * invitation to raise it once the instrument had run is withdrawn.
 */
export const RESYNC_INTERVAL = 8;

/**
 * Whether the equivalence instrument runs. `DEV`-only in every sense: the read
 * sits inside a `DEV` branch, so the published bundle contains neither it nor
 * this binding.
 *
 * **It is not a measurement flag, and the direction is the whole of why.** The
 * instrument is on by default and every suite run checks it; this exists for
 * the opposite case — the P-06 performance evidence, which has to measure the
 * code that *ships*. The instrument performs the full scan it compares against,
 * so leaving it on would time the general path and the fast path together and
 * report a number that exists in no build a consumer can install. A measurement
 * that turns it off is measuring the product; a suite that turned it off would
 * be measuring nothing, and nothing else may call this.
 */
let verifying = true;

/** @see verifying — used by `tests/perf`, and by nothing in `src`. */
export function setRefreshVerification(enabled: boolean): void {
  if (DEV) {
    verifying = enabled;
  }
}

export type VerifiedRefresh = Readonly<{
  /**
   * {@link RectIndex.refresh} with one argument added: `gap`, the **committed
   * destination gap of the placeholder move this call is servicing**, or `-1`
   * for every other caller.
   *
   * It is two things at once, deliberately. It is the *reason signal* —
   * `measure()` has exactly one call site, the committed-move bracket, so being
   * called with a gap at all is what says a placeholder move just happened,
   * with no widening of `invalidateInsertion` and no reason argument anywhere.
   * And it is one half of the **span hypothesis**, paired with the gap this
   * cache last serviced.
   */
  refresh(
    snapshot: CollectionSnapshot,
    dragged: HTMLElement,
    getBox: ((item: HTMLElement) => HTMLElement) | null,
    live: () => boolean,
    gap: number,
  ): boolean;
  invalidate(): void;
  retire(): void;
}>;

// The three outcomes of an attempted incremental refresh. `REFUSED` is not an
// error and is not reported: it is the ordinary path, taken for a frame,
// exactly where the full rebuild runs today (D-100 §3).
const REFUSED = 0;
const APPLIED = 1;
const ABORTED = 2;

/**
 * The sentinel {@link translation} returns when the controller died inside its
 * read. `Infinity` rather than a fourth constant because a `δ` is a difference
 * of two viewport scalars and can never be one.
 */
const DEAD = Infinity;

/**
 * One witness read: **is this row exactly where the cache says it is?**
 *
 * `1` unchanged, `0` moved, `-1` the controller died inside the read. The read
 * is a consumer call under I-36's indirect-invocation clause — the row is a
 * consumer-owned element and `getBoundingClientRect()` may be overridden — so
 * the liveness reading is taken between it and everything after, exactly as the
 * candidate loop does. Four of these per committed move, against `n` for a full
 * rebuild.
 *
 * All four edges are compared, not just the axis ones. The buffer is
 * dimension-neutral by construction and the equivalence instrument holds it to
 * a full scan on both axes, so a witness that ignored X would licence a write
 * the instrument then rejects.
 *
 * **It returns the outcome triple**, because a per-witness verdict *is* the
 * hypothesis's outcome so far: a witness that agrees leaves the span appliable,
 * one that disagrees refuses it, and one that dies inside its own read aborts.
 * Three of these run per committed move and the caller forwards the verdict
 * unchanged, so a mapping ternary at each site would say nothing the constants
 * do not.
 */
const unchanged = (
  index: RectIndex,
  i: number,
  live: () => boolean,
): number => {
  const rect = index.items[i]!.getBoundingClientRect();

  if (!live()) {
    return ABORTED;
  }

  const { values } = index;
  const offset = i * STRIDE;

  return values[offset + LEFT] === rect.left &&
    values[offset + TOP] === rect.top &&
    values[offset + RIGHT] === rect.right &&
    values[offset + BOTTOM] === rect.bottom
    ? APPLIED
    : REFUSED;
};

/**
 * **The equivalence instrument** (D-100 §5.4), and the thing that makes the
 * fast path admissible rather than merely plausible.
 *
 * Whenever the incremental path runs, the packed buffer must equal what a full
 * scan of the same tree would have produced. That is asserted here, on every
 * suite run, and it is *not* behind any measurement flag: `DEV` is `true` in
 * this repository's vite and vitest configs and folds to `false` in the
 * published bundle, so every test that drives a real drag through `y()` checks
 * it and no consumer pays for it.
 *
 * **It heals before it throws.** The scan it performs to compare is the same
 * scan the full path would have run, so it writes the authoritative values back
 * as it goes and only then reports. A mismatch therefore leaves the cache
 * *correct* and the drag classified, rather than correct in the message and
 * wrong in the buffer.
 *
 * **It threads `live()` exactly as the candidate loop does** (I-36, C4-01,
 * P06-02). Each `getBoundingClientRect()` here is a consumer call on a
 * consumer-owned element, and a reading taken *before* this scan starts says
 * nothing about the `n` calls inside it — that is the same one-call-too-early
 * placement C4-01 corrected in `RectIndex.refresh`. _It is `DEV`-only_ is not a
 * waiver: this repository builds `__DEV__` as `true`, so every in-repo fixture
 * runs this path, and an instrument that skipped I-36 would make the `DEV`
 * build violate an invariant the shipped build holds.
 *
 * **On abort it stops and reports nothing**, returning `false` for the caller
 * to retire on. Two reasons, and the second is the sharper: a partially
 * completed scan legitimately differs from the fast-path buffer, so comparing
 * one would turn a correct teardown into a spurious mismatch that blames the
 * span hypothesis for a destroy; and the trailing `count`/`length` bookkeeping
 * below is exactly what `RectIndex`'s own `abort()` refuses to run after a
 * retire, on the grounds that it resurrects a retired cache and pins every row
 * of the list in a destroyed controller.
 */
const verify = (
  index: RectIndex,
  snapshot: CollectionSnapshot,
  dragged: HTMLElement,
  live: () => boolean,
): boolean => {
  const { values, items } = index;
  let n = 0;
  let mismatch = '';

  for (const item of snapshot.items) {
    if (item === dragged) {
      continue;
    }

    const rect = item.getBoundingClientRect();

    if (!live()) {
      return false;
    }

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

  return true;
};

/**
 * The span hypothesis, verified in a constant number of reads (D-100 §3).
 *
 * With the placeholder moved from gap `from` to gap `to`, the rows whose
 * geometry changed should be exactly `[lo, hi)`, each by the same scalar `δ`,
 * and nothing outside it. Four witnesses check that:
 *
 * - **the in-span witnesses**, rows `lo` and `hi − 1`, which *yield* `δ` —
 *   measured, never modelled, which is what keeps margins, `gap` and
 *   box-sizing out of this module entirely. A `δ` of zero refutes, and so does
 *   the two of them disagreeing. The second is skipped when the span is one
 *   row, where they would be the same row;
 * - **the after-witness**, row `hi`, must be unchanged;
 * - **the suffix witness**, row `count − 1`, must be unchanged. In a linear
 *   flow any change to any row's contribution shifts every row below it, so
 *   flow drift is suffix-shaped and this is what catches collapsing margins and
 *   scroll anchoring;
 * - **the before-witness**, row `lo − 1`, when one exists.
 *
 * Nothing is written until all of them agree, so a refusal leaves the buffer
 * untouched for the full scan that follows.
 *
 * **The second in-span witness is D-103, and it restores parity rather than
 * buying a new property.** With only row `lo` measured, a row carrying an
 * unexpected offset that *is* the witness makes `δ` wrong by that offset and
 * the error is applied to the whole span, while every other witness honestly
 * agrees — up to `hi − lo − 1` rows wrong for up to `k` moves, where D-100
 * accepted one. The escape is narrow and that sharpens it: the four-quantity
 * comparison already catches horizontal movement and size change, so what
 * survives is a **pure vertical translation** — precisely the shape of a
 * running FLIP offset, which contract 03 §The bracket already names as enough
 * to corrupt the rebuild, and which a third-party `beforeMove` releasing less
 * than the first-party one produces in this very window. Under the general
 * path that corrupts one row; under a single-witness fast path it corrupts the
 * span. **P-06 claims to be a smaller rebuild in the same window, not a
 * behaviourally different one**, so the amplification falsifies the claim
 * however rare the trigger.
 *
 * **What remains, and it is the acceptance criterion.** At spans of 1 or 2
 * there is no exposure at all — both ends are witnesses. At spans of 3 or more
 * exactly one strictly interior row can be wrong, for at most `k` moves, which
 * **equals the general path's exposure**. Span-wide corruption needs both
 * witnesses to carry an identical pure vertical offset in the same frame; that
 * is named and accepted, not guarded against.
 */
/**
 * The δ an in-span witness yields, or a refutation.
 *
 * A finite number is the measured translation; `NaN` means the row refutes the
 * hypothesis outright — it did not move, or it moved horizontally, or it
 * changed size — and {@link DEAD} means the controller died inside the read.
 * Encoded as three numbers rather than a record because this runs twice per
 * committed move and allocates nothing.
 *
 * The same four quantities the design names, and all four matter: `top` gives
 * `δ`, `bottom` proves the row translated rather than grew, and `left`/`right`
 * prove it did not travel across the axis the packed buffer also holds.
 */
const translation = (
  index: RectIndex,
  i: number,
  live: () => boolean,
): number => {
  const rect = index.items[i]!.getBoundingClientRect();

  if (!live()) {
    return DEAD;
  }

  const { values } = index;
  const offset = i * STRIDE;
  const delta = rect.top - values[offset + TOP]!;

  // The `bottom` test is written as "the cached bottom, shifted" rather than as
  // "the measured difference equals `δ`" — the same equation either way, and
  // the same exactness, since both sides are sums of viewport scalars the
  // engine produces as multiples of a layout unit.
  return delta !== 0 &&
    values[offset + BOTTOM] === rect.bottom - delta &&
    values[offset + LEFT] === rect.left &&
    values[offset + RIGHT] === rect.right
    ? delta
    : Number.NaN;
};

const shift = (
  index: RectIndex,
  from: number,
  to: number,
  live: () => boolean,
): number => {
  const { count } = index;
  const lo = from < to ? from : to;
  const hi = from < to ? to : from;

  // **The named degradation** (D-100 condition 6). A span reaching the end of
  // the list has neither an after-witness nor a suffix witness outside it, so
  // the hypothesis cannot be checked at all. Dragging to the last slot pays the
  // old cost, and that is accepted rather than worked around.
  if (hi >= count) {
    return REFUSED;
  }

  const delta = translation(index, lo, live);

  if (delta === DEAD) {
    return ABORTED;
  }

  if (Number.isNaN(delta)) {
    return REFUSED;
  }

  // **The second in-span witness** (D-103), at the far end of the span and
  // required to agree on the same `δ`. Skipped for a one-row span, where it
  // would be row `lo` again and the blast radius is zero either way.
  //
  // The comparison is `!==` rather than a NaN test, because it has to decide
  // two things at once and one operator decides both: a refuted second witness
  // yields `NaN`, which is unequal to every `δ`, and an honest one that
  // disagrees is unequal too. Either way the span hypothesis is false.
  if (hi - lo > 1) {
    const second = translation(index, hi - 1, live);

    if (second === DEAD) {
      return ABORTED;
    }

    if (second !== delta) {
      return REFUSED;
    }
  }

  const after = unchanged(index, hi, live);

  if (after !== APPLIED) {
    return after;
  }

  const tail = count - 1;

  if (tail !== hi) {
    const suffix = unchanged(index, tail, live);

    if (suffix !== APPLIED) {
      return suffix;
    }
  }

  if (lo > 0) {
    const before = unchanged(index, lo - 1, live);

    if (before !== APPLIED) {
      return before;
    }
  }

  const { values } = index;

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

/**
 * Wraps one `RectIndex` in the verified fast path.
 *
 * **It mirrors rather than reaches.** The two bits the fast path needs from the
 * cache — is it clean, and which collection version does the buffer hold — are
 * derived here from the calls this wrapper already intercepts, so `RectIndex`
 * needs no accessor, no `settle()` and no P-06 residue at all. The mirror
 * cannot drift: both bits are cleared by `invalidate()` and by `retire()` and
 * set by a successful refresh, and every one of those three arrives through
 * this object.
 *
 * The one place the two states legitimately differ is after a fast path, where
 * the wrapper is clean and the cache still thinks it is dirty. That is the
 * intended shape: the buffer *is* current, and the next full scan the cache is
 * asked for will happen only when this wrapper decides to ask.
 */
export function createVerifiedRefresh(index: RectIndex): VerifiedRefresh {
  /**
   * How many `invalidate()` calls have landed since the cache was last made
   * clean — **not a boolean**, because "dirty" cannot distinguish the bracket's
   * own invalidation from the bracket's plus a scroll that is still outstanding
   * (D-100 condition 4). Exactly one is the fast path's licence. A scroll that
   * arrived earlier and was already serviced by a `resolve()` has cleared this,
   * so it does not poison later moves.
   */
  let pending = 0;
  /**
   * The destination gap the packed buffer reflects, or `-1` when nothing is
   * known. **This is exactly the state D-98 warned about** — it can silently
   * disagree with the DOM — so it is never trusted: it only proposes the span,
   * which is then verified.
   */
  let last = -1;
  /** Fast-path refreshes since the last full scan (D-100 condition 7). */
  let moves = 0;
  /**
   * The collection version the packed buffer holds, or `-1` for nothing.
   *
   * With `pending` this is the whole mirror of the cache's `dirty`/`measured`
   * pair, and **`dirty` needs no variable of its own**: `pending === 0` is
   * exactly "clean", because both are cleared by a successful refresh and both
   * are raised by `invalidate()`. Retirement and an aborted refresh clear this
   * to `-1`, which no real snapshot version can equal, so a stale mirror cannot
   * report warm.
   */
  let seen = -1;

  const forget = (): void => {
    pending = 0;
    last = -1;
    moves = 0;
    seen = -1;
  };

  /**
   * The shared exit for every way a refresh can end on a dead controller — the
   * entry barrier, a witness read, and the delegated full scan's own barriers.
   * `RectIndex.retire()` is idempotent, so the one site that reaches this after
   * the cache already retired itself costs a second call and no second meaning.
   */
  const abort = (): boolean => {
    index.retire();
    forget();

    return false;
  };

  return {
    refresh(snapshot, dragged, getBox, live, gap): boolean {
      // The warm cache, answered here rather than delegated: after a fast path
      // the buffer is current while the cache still reads dirty, so the cache's
      // own warm test would rescan a buffer that needs nothing. It reads no
      // geometry and calls no resolver, so it needs no barrier.
      if (pending === 0 && seen === snapshot.version) {
        return true;
      }

      // **The entry barrier** (I-36), and it has to be here rather than only
      // inside `RectIndex.refresh`: the first witness read below is a consumer
      // call, and a caller can reach a dirty cache with the controller already
      // closed. The delegated path re-takes it one call later, which is one
      // predicate on the fallback and the price of not moving the barrier out
      // of the cache that also needs it.
      if (!live()) {
        return abort();
      }

      // **The invariant boundary** (D-100). Conditions 1 and 2 are the accepted
      // case — this module is only reachable from `y()`, and a `null` resolver
      // is the only shape in which every candidate *is* its own box and is in
      // the list's own flow. Condition 3 is the packed order: a moved version
      // means membership changed and the slots no longer line up. Conditions 4,
      // 5 and 7 are the outstanding-reason count, the reason signal and the
      // re-synchronisation policy. Conditions 6 and 8 live inside `shift`,
      // because they are properties of the span rather than of the call.
      //
      // The last conjunct is not one of the eight: a gap equal to the one the
      // buffer already reflects proposes an empty span, which has no in-span
      // witness and therefore yields no `δ` to verify.
      if (
        gap >= 0 &&
        getBox === null &&
        pending === 1 &&
        moves < RESYNC_INTERVAL &&
        seen === snapshot.version &&
        last >= 0 &&
        last !== gap
      ) {
        const outcome = shift(index, last, gap, live);

        if (outcome === ABORTED) {
          return abort();
        }

        if (outcome === APPLIED) {
          last = gap;
          moves += 1;
          pending = 0;

          // On abort the instrument reports nothing and the cache retires
          // (P06-02): a partial scan legitimately differs, so comparing one
          // would blame the span hypothesis for a teardown.
          if (DEV && verifying && !verify(index, snapshot, dragged, live)) {
            return abort();
          }

          return true;
        }
      }

      if (!index.refresh(snapshot, dragged, getBox, live)) {
        return abort();
      }

      seen = snapshot.version;
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

    invalidate(): void {
      // Counted rather than latched, so `measure()` can tell the bracket's own
      // invalidation from the bracket's plus an outstanding external one
      // (D-100 condition 4). Saturating, because only "exactly one" is a
      // licence and the arithmetic must not wrap on a long-lived controller
      // that never resolves.
      if (pending < 2) {
        pending += 1;
      }

      index.invalidate();
    },

    retire(): void {
      // The span hypothesis is per-operation. A gap recorded for the list this
      // operation dragged in would propose a span in the next operation's index
      // space.
      forget();
      index.retire();
    },
  };
}
