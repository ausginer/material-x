/**
 * G3-linear: the shift rule for a one-dimensional axis. `y()`, and a future
 * `x()`, use this module.
 *
 * A committed move relocates exactly one hole from gap `A` to gap `B` (G2). In
 * a linear flow, that displaces the slots in `[min, max)` by one constant along
 * the axis and changes nothing else, including both cross-axis coordinates.
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
 * The constant is measured, never derived, because of G5. It is a flow
 * quantity, the displacement of one crossed row, while the cache holds
 * presented geometry, which includes any authored `translate`, `rotate` or
 * `scale` on a row. A difference between the presented positions of two
 * different elements includes the difference of their authored contributions,
 * so it is not a flow quantity. A difference of one element's presented
 * position across two instants is a flow quantity, because its own authored
 * contribution cancels. So the constant is observed as one crossed row's
 * displacement across one committed move, and every later move on the same
 * geometry is predicted from it with no DOM read.
 *
 * The hole is measured too, and cannot be predicted. Where the hole lands
 * depends on the crossed rows' flow footprints. The cache holds presented
 * extents, which are not that quantity: a row with `rotate` or `scale` presents
 * a bounding rect wider than its border box. The placeholder's own footprint is
 * not that quantity either: the placeholder is sized from
 * `offsetWidth`/`offsetHeight` and has no margin, while the rows it displaces
 * may have one. No same-element temporal difference yields it, so G5 admits no
 * prediction. A committed move marks the hole stale, and the next spatial frame
 * reads the placeholder once. That frame is post-paint, so the read finds a
 * tree already laid out and forces nothing. A frame with no committed move
 * before it still reads nothing at all.
 *
 * The advance happens after the DOM write. Advancing a cache arithmetically
 * does not depend on the DOM, so running it afterwards collapses the two
 * instants into one. So a single hook can carry both the predicted and the
 * measured path.
 *
 * This is a module and not a branch because the rule is `y()`-only by contract:
 * `xy()` wraps, so its displacement is neither scalar nor uniform. Code that
 * only one feature may execute belongs in that feature's module graph. In the
 * shared cache, it would cost an `xy()` composition machinery that composition
 * can never reach. `bench/size` asserts the absence.
 *
 * This module lets `RectIndex` stay dimension-neutral. `RectIndex` holds the
 * full scan and no rule. The operations this module drives, a span advance and
 * a hole re-read, interpret nothing: each is told which three packed fields to
 * move. The rule about when, over what span and by how much is here, and this
 * module holds no writable handle into the cache's storage.
 */
import type { InheritedSpace } from '../draggable.ts';
import type { DisplacementReport } from './axis.ts';
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

/**
 * What the rule reads from the behavior's per-operation view. It is declared in
 * this consuming module so the dependency points the right way: the behavior's
 * view satisfies it structurally, with no wrapper and no allocation.
 *
 * The collection is not here. The frame commits it, so both entry points take
 * it as an argument from the frame they received and do not read a second copy.
 */
export type LinearRuntime = Readonly<{
  placeholder: HTMLElement;
  box: ((item: HTMLElement) => HTMLElement) | null;
  settle: DisplacementSettle | null;
  /**
   * The projection the reported vector is expressed in, or `null` for an
   * untransformed ancestry. Read once per span and passed on unexamined.
   */
  space: InheritedSpace;
}>;

/**
 * One {@link RectIndex} under the linear shift rule.
 *
 * `start`, `end` and `centre` are the axis's stride offsets: `TOP`, `BOTTOM`,
 * `CENTRE_Y` for `y()`, and `LEFT`, `RIGHT`, `CENTRE_X` for a future `x()`.
 * `ux` and `uy` are the axis unit vector, which turns the scalar displacement
 * into two components with no branch. With these parameters, a second linear
 * axis is a rule module and a subpath, not a rewrite of this one.
 *
 * Every field is private and no outside code writes one. This class reaches the
 * cache through the operations the cache declares, never through its storage.
 */
export class LinearShift {
  readonly #index: RectIndex;

  /**
   * The same cache under the reader's type. This module drives the cache's
   * operations and also reads its contents, so it holds both bindings. Reading
   * code uses this one, where the packed slots and the element array are not
   * writable.
   */
  readonly #view: RectIndexView;

  readonly #start: number;

  readonly #end: number;

  readonly #centre: number;

  readonly #unitX: number;

  readonly #unitY: number;

  /**
   * Whether an invalidation is outstanding. A prediction is valid only against
   * a buffer that currently describes the DOM.
   */
  #dirty = true;

  /**
   * The destination gap the packed buffer reflects, or `-1` when nothing is
   * known. This value is authoritative: every exit before a completed advance
   * invalidates, so the buffer either describes the tree or is dirty.
   */
  #lastGap = -1;

  /** The collection version the packed buffer holds, or `-1` for nothing. */
  #snapshotVersion = -1;

  /**
   * The distance one crossed row travels along the axis when the hole passes
   * it, or `-1` while unmeasured. G3-linear says it is the same for every
   * crossed row.
   *
   * Every invalidation discards it, because the layout that produced it may not
   * be the layout of the next move: a zoom, a resize or a replaced collection
   * all change it, and the cache has one staleness flag with no reason
   * attached. The cost is one row read on the next committed move.
   */
  #rowDistance = -1;

  /**
   * Whether a committed move has left the cached hole out of date. One read
   * clears it, at the head of the next rebuild.
   */
  #holeIsStale = false;

  /**
   * Whether an advance has happened that the equivalence check has not checked
   * yet. Written only inside `DEV` branches, so it folds away with them.
   */
  #advanceUnchecked = false;

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
    this.#unitX = ux;
    this.#unitY = uy;
  }

  /**
   * {@link RectIndex.refresh}, plus the gap the placeholder occupies in the DOM
   * at the moment of the scan. The resulting buffer reflects that gap, and
   * {@link LinearShift.moved} advances from it.
   *
   * This is also where a hole left stale by a committed move is re-read, and
   * where the development check runs on the previous move's prediction. This is
   * the first instant at which both the cache and the tree can be compared, one
   * frame after that move started its animations. The re-read comes before the
   * check, because the check inspects the hole.
   */
  refresh(
    snapshot: CollectionSnapshot,
    dragged: HTMLElement,
    getBox: ((item: HTMLElement) => HTMLElement) | null,
    placeholder: HTMLElement,
    settle: DisplacementSettle | null,
    gap: number,
  ): void {
    const index = this.#index;

    // Re-read a stale hole before anything reads it, including the check.
    // `verifyEquivalence` below rebuilds and compares the cached placeholder
    // against the tree. If the hole is still stale when it runs, every correct
    // list reports a mismatch at the placeholder on every move.
    //
    // Every path that dirties the cache clears this flag, including `retire`.
    // What remains is one redundant read when the collection version moves
    // under a clean cache, inside a frame already paying a full rebuild.
    if (this.#holeIsStale) {
      this.#holeIsStale = false;
      index.remeasureHole(placeholder, this.#start, this.#end, this.#centre);
    }

    // The check on the previous move's prediction. It scans, which is the
    // forced layout this model exists to remove, so it is `DEV` only. It runs
    // here and not inside the move, for the reason `verifyEquivalence` gives.
    if (
      DEV &&
      this.#advanceUnchecked &&
      !this.#dirty &&
      this.#snapshotVersion === snapshot.version
    ) {
      this.#advanceUnchecked = false;
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

    index.refresh(snapshot, dragged, getBox, placeholder, settle);

    this.#snapshotVersion = snapshot.version;
    this.#dirty = false;

    // The buffer this scan produced reflects the placeholder where it stands,
    // and only the caller knows that gap.
    if (gap >= 0) {
      this.#lastGap = gap;
    }
  }

  /**
   * Call this after a committed move. It advances the crossed slots to the
   * geometry the DOM write just produced, marks the hole stale, and reports the
   * span to `report` when a sink is installed.
   *
   * When the constant is not established, on the first committed move of an
   * operation and the first after any invalidation, this reads one crossed row.
   * The signed difference against the value the cache already held for that
   * same row, the one form G5 admits, establishes the constant. Every later
   * move on the same geometry reads nothing here. The stale hole costs one
   * placeholder read on the next rebuild, from a tree already laid out.
   */
  moved(
    gap: number,
    snapshot: CollectionSnapshot,
    runtime: LinearRuntime,
    report: DisplacementReport | null,
  ): void {
    const from = this.#lastGap;

    // Each rejection is a real degenerate case: a dirty buffer describes a
    // tree that has already changed under it, `count === 0` is a single-item
    // collection with no destination slot to displace, and an unknown or
    // unchanged gap proposes no span at all.
    if (
      this.#dirty ||
      this.#snapshotVersion !== snapshot.version ||
      this.#view.count === 0 ||
      from < 0 ||
      from === gap
    ) {
      this.#abandonCache();
      return;
    }

    const lo = from < gap ? from : gap;
    const hi = from < gap ? gap : from;
    let delta = from < gap ? -this.#rowDistance : this.#rowDistance;

    if (this.#rowDistance < 0) {
      const { values, items } = this.#view;
      // Any crossed row works, because they all travelled the same constant.
      // Measure its box, which is what the cache holds.
      const probe = items[lo]!;
      const rect = (
        runtime.box ? runtime.box(probe) : probe
      ).getBoundingClientRect();
      let observed = this.#start === TOP ? rect.top : rect.left;

      if (runtime.settle) {
        // The row may be mid-flight from an earlier move. Both sides of the
        // difference must be settled geometry, and the cache already is. Settle
        // through the sink's own walk over a one-slot scratch buffer, so there
        // is one way to ask.
        const scratch = new Float64Array(STRIDE);

        scratch[this.#start] = observed;
        runtime.settle(scratch, [probe], 1);
        observed = scratch[this.#start]!;
      }

      // The one difference G5 admits: one element at two instants. Anything
      // this row carries, such as an authored `translate` or an ancestor's
      // transform, is in both terms identically and cancels.
      delta = observed - values[lo * STRIDE + this.#start]!;
      this.#rowDistance = delta < 0 ? -delta : delta;
    }

    this.#shiftSpan(lo, hi, delta, runtime, report);

    this.#lastGap = gap;
    this.#holeIsStale = true;

    if (DEV) {
      this.#advanceUnchecked = true;
    }
  }

  invalidate(): void {
    this.#dirty = true;
    this.#rowDistance = -1;
    this.#holeIsStale = false;
    this.#index.invalidate();
  }

  retire(): void {
    this.#resetCache();
    this.#index.retire();
  }

  #resetCache(): void {
    this.#dirty = true;
    this.#lastGap = -1;
    this.#snapshotVersion = -1;
    this.#rowDistance = -1;
    this.#holeIsStale = false;
  }

  /** Nothing can be advanced safely, and the DOM write has already happened. */
  #abandonCache(): void {
    this.#dirty = true;
    this.#lastGap = -1;
    this.#holeIsStale = false;
    this.#index.invalidate();
  }

  /**
   * Advances the crossed span by an established `delta` and reports each
   * element it crosses. The predicted and the measured path share this method
   * and differ only in where `delta` came from.
   *
   * The hole is not advanced here, and no arithmetic over this span yields it:
   * these are presented extents, and where the hole lands is a flow quantity.
   * The caller marks it stale instead.
   */
  #shiftSpan(
    lo: number,
    hi: number,
    delta: number,
    runtime: LinearRuntime,
    report: DisplacementReport | null,
  ): void {
    const index = this.#index;

    // The axis passes offsets and a scalar, never access. The cache owns its
    // buffer and interprets none of the three fields it moves. So the cache
    // stays dimension-neutral, and G3-linear and G5 stay here.
    index.advance(lo, hi, delta, this.#start, this.#end, this.#centre);

    if (!report) {
      return;
    }

    // This is a second walk and not a shared one. Sharing would put
    // displacement vocabulary into a dimension-neutral cache, or add an
    // indirect call per element inside its operation. This walk adds no call at
    // all and allocates nothing, and it covers the span one hole crossing
    // passes on a gesture-rate event, not a frame-rate one.
    //
    // Every element in the span carries the same vector, so the two components
    // are computed once per move, outside the walk.
    const { items } = this.#view;
    const dx = -delta * this.#unitX;
    const dy = -delta * this.#unitY;

    for (let i = lo; i < hi; i += 1) {
      report(items[i]!, dx, dy, runtime.space);
    }
  }
}
