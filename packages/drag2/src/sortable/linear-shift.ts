/**
 * **G3-linear**: the shift rule for a one-dimensional axis, and the module
 * `y()` — and a future `x()` — reaches for it.
 *
 * A committed move relocates exactly one hole from gap `A` to gap `B` (G2). In
 * a linear flow that displaces the slots in `[min, max)` by **one constant**
 * along the axis and changes nothing else, including both cross-axis
 * coordinates.
 *
 * ```text
 * (behavior)   one DOM write
 * moved(B)     the constant is known -> advance the slots, report the span
 *              the constant is unknown -> read one crossed row, then the same
 *              either way -> the hole is now stale
 * refresh      a stale hole -> read the placeholder once, off a clean tree
 * (sink)       one additive `translate` per reported element
 * ```
 *
 * **The constant is measured, never derived, and G5 is why.** It is a *flow*
 * quantity — the displacement one crossed row takes — while the cache holds
 * **presented** geometry, which carries whatever authored `translate`, `rotate`
 * or `scale` a row wears. A difference between two *different* elements'
 * presented positions therefore carries the difference of their authored
 * contributions and is not a flow quantity at all. A difference of one
 * element's presented position across two instants **is**: its own authored
 * contribution cancels. So the constant is observed as one crossed row's
 * displacement across one committed move, and every later move on the same
 * geometry is predicted from it with no DOM read.
 *
 * **The hole is measured too, and it cannot be anything else.** Where the hole
 * lands is a function of the crossed rows' **flow** footprints. The cache holds
 * presented extents, which are not that quantity — a row wearing `rotate` or
 * `scale` presents a bounding rect wider than its border box — and the
 * placeholder's own footprint is not it either, since the placeholder is sized
 * from `offsetWidth`/`offsetHeight` and carries no margin while the rows it
 * displaces may. No same-element temporal difference yields it, so under G5
 * there is no admissible prediction: a committed move marks the hole stale and
 * the next spatial frame reads the placeholder once. That frame is post-paint,
 * so the read finds a tree already laid out and forces nothing, and a frame
 * with no committed move before it still reads nothing at all.
 *
 * **The advance happens after the write.** Advancing a cache arithmetically
 * does not depend on the DOM, so running it afterwards collapses the two
 * instants into one, which is what lets a single hook carry both the predicted
 * and the measured path.
 *
 * **Why it is a module and not a branch.** The rule is `y()`-only *by contract*
 * — `xy()` wraps, so the displacement is neither scalar nor uniform — and code
 * only one feature may execute belongs in that feature's module graph. Folded
 * into the shared cache it would cost an `xy()` composition machinery that
 * composition can never reach, and `bench/size` asserts the absence.
 *
 * **`RectIndex` stays dimension-neutral, and this module is why it can.** It
 * keeps the full scan and gained no rule: what it gained is two operations that
 * interpret nothing — a span advance and a hole re-read, each told which three
 * packed fields to move. The rule about when, over what span and by how much
 * lives here, and this module holds no writable handle into the cache's
 * storage.
 */
import type { InheritedSpace } from '../kernel/presentation.ts';
import type { CollectionSnapshot } from './domain.ts';
import {
  DEV,
  type DisplacementSettle,
  type RectIndex,
  type RectIndexView,
  STRIDE,
  TOP,
  verifyEquivalence,
} from './rect-index.ts';
import type { DisplacementReport } from './slots.ts';

/**
 * What the rule reads off the behavior's per-operation view. Declared here, in
 * the module that consumes it, so the dependency points the right way: the
 * behavior's view satisfies it structurally with no wrapper and no allocation.
 */
export type LinearRuntime = Readonly<{
  snapshot: CollectionSnapshot;
  placeholder: HTMLElement;
  box: ((item: HTMLElement) => HTMLElement) | null;
  live(): boolean;
  settle: DisplacementSettle | null;
  /**
   * The projection the reported vector is expressed in, or `null` for an
   * untransformed ancestry. Read once per span and passed on unexamined.
   */
  space: InheritedSpace;
}>;

/**
 * **One {@link RectIndex} under the linear shift rule.**
 *
 * `start`, `end` and `centre` are **the axis's own stride offsets** — `TOP`,
 * `BOTTOM`, `CENTRE_Y` for `y()`; `LEFT`, `RIGHT`, `CENTRE_X` for a future
 * `x()` — and `ux`/`uy` are the axis unit vector, which turns the scalar
 * displacement into two components with no branch. Passing them is what makes a
 * second linear axis a rule module and a subpath rather than a rewrite of this
 * one.
 *
 * **It reads no liveness latch anywhere**, and that is a property rather than
 * an omission: `live` is forwarded into the cache's rebuild and `runtime.live`
 * is forwarded into `report`, because the party that must take the reading is
 * the one performing the act, and in this module that party is never this
 * class. So there is no `#live` field and no liveness member to acquire.
 *
 * **Every field is private and nothing outside writes one.** The cache it
 * holds is reached through the operations that cache declares, never through
 * its storage.
 */
export class LinearShift {
  readonly #index: RectIndex;

  /**
   * The same cache under the reader's type. This module drives the cache's
   * operations and also reads its contents, so it holds both — and the binding
   * the reading code names is this one, where the packed slots and the element
   * array stop being writable from outside their owner.
   */
  readonly #view: RectIndexView;

  readonly #start: number;

  readonly #end: number;

  readonly #centre: number;

  readonly #ux: number;

  readonly #uy: number;

  /**
   * Whether an invalidation is outstanding. The prediction is licensed only
   * against a buffer that currently describes the DOM.
   */
  #dirty = true;

  /**
   * The destination gap the packed buffer reflects, or `-1` when nothing is
   * known. **Authoritative**: every exit before a completed advance
   * invalidates, so the buffer either describes the tree or is dirty.
   */
  #last = -1;

  /** The collection version the packed buffer holds, or `-1` for nothing. */
  #seen = -1;

  /**
   * The distance one crossed row travels along the axis when the hole passes
   * it, or `-1` while unmeasured. It is the same for every crossed row, which
   * is what G3-linear says.
   *
   * **Discarded by every invalidation**, because the layout that produced it
   * may not be the layout the next move happens in: a zoom, a resize or a
   * replaced collection all change it, and the cache has one staleness flag
   * with no reason attached. The cost of that bluntness is one row read on the
   * next committed move.
   */
  #constant = -1;

  /**
   * Whether a committed move has left the cached hole describing where the
   * placeholder no longer stands. One read clears it, at the head of the next
   * rebuild.
   */
  #hollow = false;

  /**
   * Whether an advance has been made that the instrument has not checked yet.
   * Written only inside `DEV` branches, so it folds away with them.
   */
  #claimed = false;

  constructor(
    index: RectIndex,
    start: number,
    end: number,
    centre: number,
    ux: number,
    uy: number,
  ) {
    this.#index = index;
    this.#view = index;
    this.#start = start;
    this.#end = end;
    this.#centre = centre;
    this.#ux = ux;
    this.#uy = uy;
  }

  /**
   * {@link RectIndex.refresh}, plus the gap the placeholder occupies in the DOM
   * at the moment of the scan. The buffer this produces reflects that gap, and
   * {@link LinearShift.moved} advances from it.
   *
   * It is also where the hole a committed move left stale is re-read, and
   * where the development instrument runs on the claim the previous move made
   * — the first instant at which both the cache and the tree are answerable,
   * one frame after the animations that move started. The re-read precedes the
   * instrument, because the instrument checks the hole.
   */
  refresh(
    snapshot: CollectionSnapshot,
    dragged: HTMLElement,
    getBox: ((item: HTMLElement) => HTMLElement) | null,
    live: () => boolean,
    placeholder: HTMLElement,
    settle: DisplacementSettle | null,
    gap: number,
  ): boolean {
    const index = this.#index;

    // **The stale hole, re-read before anything reads it — the instrument
    // included.** `verifyEquivalence` below rebuilds and compares the cached
    // placeholder against the tree, so a hole left deliberately stale has to be
    // current by the time it runs or every correct list reports a mismatch at
    // the placeholder on every move.
    //
    // Only the axis's own three fields are written: a hole relocation moves
    // the placeholder along this axis and leaves both cross-axis coordinates
    // where they were, which is the same G2 clause the slot advance rests on.
    //
    // Every path that dirties the cache clears this — `retire` included. What
    // survives is one redundant read when the collection version moves under a
    // clean cache, inside a frame already paying a full rebuild.
    if (this.#hollow) {
      this.#hollow = false;
      // The read moves in with the write, because measuring is the cache's own
      // act: the operation takes the placeholder and the three offsets this
      // axis moves, and cannot fail — a consumer-owned node's
      // `getBoundingClientRect` is a platform member rather than a declared
      // slot, and a close raised from inside it is caught by the reading
      // before the next `getBox`.
      index.remeasureHole(placeholder, this.#start, this.#end, this.#centre);
    }

    // **The instrument, on the claim the previous move made.** It scans,
    // which is the forced layout this model exists to remove, so it is `DEV`
    // only. Here rather than inside the move that made the claim: at that
    // instant the sink has just been handed vectors whose animations have no
    // resolved timing yet, and a scan would compare a settled cache against a
    // tree in an indeterminate state. By the next rebuild both answer.
    if (
      DEV &&
      this.#claimed &&
      !this.#dirty &&
      this.#seen === snapshot.version
    ) {
      this.#claimed = false;
      verifyEquivalence(
        index,
        snapshot,
        dragged,
        getBox,
        placeholder,
        settle,
        'G3-linear',
      );
    }

    if (!index.refresh(snapshot, dragged, getBox, live, placeholder, settle)) {
      this.#forget();
      index.retire();

      return false;
    }

    this.#seen = snapshot.version;
    this.#dirty = false;

    // The buffer this scan produced reflects the placeholder where it stands,
    // which the caller is the one that knows.
    if (gap >= 0) {
      this.#last = gap;
    }

    return true;
  }

  /**
   * **The committed move has landed.**
   *
   * Advances the crossed slots to the geometry the write just produced, marks
   * the hole stale, and reports the span to `report` when a sink is installed.
   *
   * When the constant is not established — the first committed move of an
   * operation, and the first after any invalidation — one crossed row is read
   * and the signed difference against the value the cache already held for
   * **that same row**, the one form G5 admits, establishes it. Every later move
   * on the same geometry reads nothing here; the stale hole costs one
   * placeholder read on the next rebuild, off a tree already laid out.
   */
  moved(
    gap: number,
    runtime: LinearRuntime,
    report: DisplacementReport | null,
  ): void {
    const from = this.#last;

    // Each rejection is a real degenerate case: a dirty buffer describes a
    // tree that has already changed under it, `count === 0` is a single-item
    // collection with no destination slot to displace, and an unknown or
    // unchanged gap proposes no span at all.
    if (
      this.#dirty ||
      this.#seen !== runtime.snapshot.version ||
      this.#view.count === 0 ||
      from < 0 ||
      from === gap
    ) {
      this.#drop();
      return;
    }

    const lo = from < gap ? from : gap;
    const hi = from < gap ? gap : from;
    let delta = from < gap ? -this.#constant : this.#constant;

    if (this.#constant < 0) {
      const { values, items } = this.#view;
      // Any crossed row answers, because they all travelled the same
      // constant. Measured as its **box**, which is what the cache holds.
      const probe = items[lo]!;
      // **No liveness reading here**, and its absence is the placement rule
      // rather than an omission: one would sit *after* the slot call it could
      // never have protected. The genuine obligation — `box` invoked per
      // candidate in one seam's prepare and once more in its effect — is
      // carried upstream, immediately before the call that follows.
      const rect = (
        runtime.box ? runtime.box(probe) : probe
      ).getBoundingClientRect();
      let observed = this.#start === TOP ? rect.top : rect.left;

      if (runtime.settle) {
        // The row may be mid-flight from an earlier move. Both sides of the
        // difference have to be settled geometry, and the cache already is.
        // Settled through the sink's own walk over a one-slot scratch, so
        // there is one way to ask and not two.
        const scratch = new Float64Array(STRIDE);

        scratch[this.#start] = observed;
        runtime.settle(scratch, [probe], 1);
        observed = scratch[this.#start]!;
      }

      // **The one difference G5 admits**: one element, two instants. Whatever
      // this row wears — an authored `translate`, an ancestor's transform —
      // sits in both terms identically and cancels.
      delta = observed - values[lo * STRIDE + this.#start]!;
      this.#constant = delta < 0 ? -delta : delta;
    }

    this.#shiftSpan(lo, hi, delta, runtime, report);

    this.#last = gap;
    this.#hollow = true;

    if (DEV) {
      this.#claimed = true;
    }
  }

  invalidate(): void {
    this.#dirty = true;
    this.#constant = -1;
    this.#hollow = false;
    this.#index.invalidate();
  }

  retire(): void {
    this.#forget();
    this.#index.retire();
  }

  #forget(): void {
    this.#dirty = true;
    this.#last = -1;
    this.#seen = -1;
    this.#constant = -1;
    this.#hollow = false;
  }

  /** Nothing sound to advance, and the write has already landed. */
  #drop(): void {
    this.#dirty = true;
    this.#last = -1;
    this.#hollow = false;
    this.#index.invalidate();
  }

  /**
   * Advance the crossed span by an established `delta`, reporting each element
   * it crosses. Shared by the predicted and the measured path, which differ
   * only in where `delta` came from.
   *
   * **The hole is not advanced here**, and no arithmetic over this span yields
   * it: these are presented extents and the hole's landing place is a flow
   * quantity. The caller marks it stale instead.
   */
  #shiftSpan(
    lo: number,
    hi: number,
    delta: number,
    runtime: LinearRuntime,
    report: DisplacementReport | null,
  ): void {
    const index = this.#index;

    // **The axis passes offsets and a scalar, never access.** The cache owns
    // its buffer and interprets none of the three fields it is told to move,
    // which is what keeps it dimension-neutral while G3-linear and G5 stay
    // here.
    index.advance(lo, hi, delta, this.#start, this.#end, this.#centre);

    if (!report) {
      return;
    }

    // **A second walk rather than a shared one**, because sharing would put
    // displacement vocabulary into a dimension-neutral cache or add an
    // indirect call per element inside its operation. This adds no call at
    // all and allocates nothing, and it walks the span one hole crossing
    // passes on a gesture-rate event rather than a frame-rate one.
    //
    // Hoisted out of the walk: every element in the span carries the same
    // vector, so the two components are computed once per move rather than
    // once per element.
    const { items } = this.#view;
    const dx = -delta * this.#ux;
    const dy = -delta * this.#uy;

    for (let i = lo; i < hi; i += 1) {
      report(items[i]!, dx, dy, runtime.live, runtime.space);
    }
  }
}
