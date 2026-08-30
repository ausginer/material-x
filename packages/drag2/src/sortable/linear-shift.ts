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
 * moved(B)     the constant is known -> advance the cache, report the span
 *              the constant is unknown -> read one crossed row, then the same
 * (sink)       one additive `translate` per reported element
 * ```
 *
 * **The constant is measured, never derived, and G5 is why.** It is a *flow*
 * quantity — the hole's own outer footprint along the axis — while the cache
 * holds **presented** geometry, which carries whatever authored `translate`,
 * `rotate` or `scale` a row wears. A difference between two *different*
 * elements' presented positions therefore carries the difference of their
 * authored contributions and is not a flow quantity at all. A difference of one
 * element's presented position across two instants **is**: its own authored
 * contribution cancels. So the constant is observed as one crossed row's
 * displacement across one committed move, and every later move on the same
 * geometry is predicted from it with no DOM read.
 *
 * **The advance happens after the write, not before it.** Advancing a cache
 * arithmetically does not depend on the DOM, so the projection had no reason to
 * precede the write it described — and running it afterwards collapses the two
 * instants into one, which is what lets a single hook carry both the predicted
 * and the measured path.
 *
 * **Why it is a module and not a branch.** The rule is `y()`-only *by contract*
 * — `xy()` wraps, so the displacement is neither scalar nor uniform — and code
 * only one feature may execute belongs in that feature's module graph. Folded
 * into the shared cache it would cost an `xy()` composition machinery that
 * composition can never reach, and `bench/size` asserts the absence.
 *
 * **`RectIndex` is untouched by this file's existence.** It stays
 * dimension-neutral, keeps the full scan, and gained no hook: this module wraps
 * it, mirrors the two state bits it would otherwise have had to expose, and
 * writes through the fields the record already publishes.
 */
import type { CollectionSnapshot } from './domain.ts';
import {
  DEV,
  type DisplacementSettle,
  type RectIndex,
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
}>;

export type LinearShift = Readonly<{
  /**
   * {@link RectIndex.refresh}, plus the gap the placeholder occupies in the DOM
   * at the moment of the scan. The buffer this produces reflects that gap, and
   * `moved` advances from it.
   *
   * It is also where the development instrument runs, on the claim the previous
   * move made — the first instant at which both the cache and the tree are
   * answerable, one frame after the animations that move started.
   */
  refresh(
    snapshot: CollectionSnapshot,
    dragged: HTMLElement,
    getBox: ((item: HTMLElement) => HTMLElement) | null,
    live: () => boolean,
    placeholder: HTMLElement,
    settle: DisplacementSettle | null,
    gap: number,
  ): boolean;
  /**
   * **The committed move has landed.**
   *
   * Advances the cache and the placeholder slot to the geometry the write just
   * produced, and reports the span to `report` when a sink is installed.
   *
   * When the constant is not established — the first committed move of an
   * operation, and the first after any invalidation — one crossed row is read
   * and the signed difference against the value the cache already held for
   * **that same row**, the one form G5 admits, establishes it. Every later move
   * on the same geometry performs no DOM read at all.
   */
  moved(
    gap: number,
    runtime: LinearRuntime,
    report: DisplacementReport | null,
  ): void;
  invalidate(): void;
  retire(): void;
}>;

/**
 * Wraps one {@link RectIndex} in the linear shift rule.
 *
 * `start`, `end` and `centre` are **the axis's own stride offsets** — `TOP`,
 * `BOTTOM`, `CENTRE_Y` for `y()`; `LEFT`, `RIGHT`, `CENTRE_X` for a future
 * `x()` — and `ux`/`uy` are the axis unit vector, which turns the scalar
 * displacement into two components with no branch. Passing them is what makes a
 * second linear axis a rule module and a subpath rather than a rewrite of this
 * one.
 */
export function createLinearShift(
  index: RectIndex,
  start: number,
  end: number,
  centre: number,
  ux: number,
  uy: number,
): LinearShift {
  /**
   * Whether an invalidation is outstanding. The prediction is licensed only
   * against a buffer that currently describes the DOM.
   */
  let dirty = true;
  /**
   * The destination gap the packed buffer reflects, or `-1` when nothing is
   * known. **Authoritative**: every exit before a completed advance
   * invalidates, so the buffer either describes the tree or is dirty.
   */
  let last = -1;
  /** The collection version the packed buffer holds, or `-1` for nothing. */
  let seen = -1;
  /**
   * The hole's own flow footprint along the axis — its extent plus the one flow
   * gap it introduces — or `-1` while unmeasured.
   *
   * **Discarded by every invalidation**, because the layout that produced it
   * may not be the layout the next move happens in: a zoom, a resize or a
   * replaced collection all change it, and the cache has one staleness flag
   * with no reason attached. The cost of that bluntness is one row read on the
   * next committed move.
   */
  let constant = -1;
  /**
   * Whether an advance has been made that the instrument has not checked yet.
   * Written only inside `DEV` branches, so it folds away with them.
   */
  let claimed = false;

  const forget = (): void => {
    dirty = true;
    last = -1;
    seen = -1;
    constant = -1;
  };

  /** Nothing sound to advance, and the write has already landed. */
  const drop = (): void => {
    dirty = true;
    last = -1;
    index.invalidate();
  };

  /**
   * Advance the span and the hole by an established `delta`, reporting each
   * element it crosses. Shared by the predicted and the measured path, which
   * differ only in where `delta` came from.
   *
   * **The report shares the walk rather than following it**, so a committed
   * move costs one traversal and allocates nothing — no plan closure, no
   * buffer, and nothing at all in a composition that passes `null`.
   */
  const shiftSpan = (
    lo: number,
    hi: number,
    delta: number,
    runtime: LinearRuntime,
    report: DisplacementReport | null,
  ): void => {
    const { values, hole, items } = index;
    // The hole's flow footprint splits into its own extent and the one flow gap
    // it introduces; the slots it crosses close up by the whole footprint,
    // while the hole itself travels the sum of what those slots occupy plus one
    // gap each.
    const width = hole[end]! - hole[start]!;
    const spacing = (delta < 0 ? -delta : delta) - width;
    // Hoisted out of the walk: every element in the span carries the same
    // vector, so the two components are computed once per move rather than
    // once per element.
    const dx = -delta * ux;
    const dy = -delta * uy;
    let travelled = 0;

    for (let i = lo; i < hi; i += 1) {
      const offset = i * STRIDE;
      const a = values[offset + start]!;
      const b = values[offset + end]!;

      travelled += b - a + spacing;

      const shiftedA = a + delta;
      const shiftedB = b + delta;

      values[offset + start] = shiftedA;
      values[offset + end] = shiftedB;
      // Recomputed from the shifted edges rather than shifted itself, so the
      // arithmetic is the one a full scan performs and the instrument compares
      // like with like.
      values[offset + centre] = (shiftedA + shiftedB) * 0.5;

      if (report) {
        report(items[i]!, dx, dy, runtime.live);
      }
    }

    // **The hole advances by its own displacement**, which is what it crossed —
    // a sum over the slots' own extents, never a difference against one of
    // their positions. It moves against the slots, so the sign is inverted.
    const holeStart = hole[start]! + (delta < 0 ? travelled : -travelled);

    hole[start] = holeStart;
    hole[end] = holeStart + width;
    hole[centre] = holeStart + width * 0.5;
  };

  return {
    refresh(
      snapshot,
      dragged,
      getBox,
      live,
      placeholder,
      settle,
      gap,
    ): boolean {
      // **The instrument, on the claim the previous move made.** It scans,
      // which is the forced layout this model exists to remove, so it is `DEV`
      // only. Here rather than inside the move that made the claim: at that
      // instant the sink has just been handed vectors whose animations have no
      // resolved timing yet, and a scan would compare a settled cache against a
      // tree in an indeterminate state. By the next rebuild both answer.
      if (DEV && claimed && !dirty && seen === snapshot.version) {
        claimed = false;
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

      if (
        !index.refresh(snapshot, dragged, getBox, live, placeholder, settle)
      ) {
        forget();
        index.retire();

        return false;
      }

      seen = snapshot.version;
      dirty = false;

      // The buffer this scan produced reflects the placeholder where it stands,
      // which the caller is the one that knows.
      if (gap >= 0) {
        last = gap;
      }

      return true;
    },

    moved(gap, runtime, report): void {
      const from = last;

      // Each rejection is a real degenerate case: a dirty buffer describes a
      // tree that has already changed under it, `count === 0` is a single-item
      // collection with no destination slot to displace, and an unknown or
      // unchanged gap proposes no span at all.
      if (
        dirty ||
        seen !== runtime.snapshot.version ||
        index.count === 0 ||
        from < 0 ||
        from === gap
      ) {
        drop();
        return;
      }

      const lo = from < gap ? from : gap;
      const hi = from < gap ? gap : from;
      let delta = from < gap ? -constant : constant;

      if (constant < 0) {
        const { values, items } = index;
        // Any crossed row answers, because they all travelled the same
        // constant. Measured as its **box**, which is what the cache holds.
        const probe = items[lo]!;
        const rect = (
          runtime.box ? runtime.box(probe) : probe
        ).getBoundingClientRect();

        if (!runtime.live()) {
          drop();
          return;
        }

        let observed = start === TOP ? rect.top : rect.left;

        if (runtime.settle) {
          // The row may be mid-flight from an earlier move. Both sides of the
          // difference have to be settled geometry, and the cache already is.
          // Settled through the sink's own walk over a one-slot scratch, so
          // there is one way to ask and not two.
          const scratch = new Float64Array(STRIDE);

          scratch[start] = observed;
          runtime.settle(scratch, [probe], 1);
          observed = scratch[start]!;
        }

        // **The one difference G5 admits**: one element, two instants. Whatever
        // this row wears — an authored `translate`, an ancestor's transform —
        // sits in both terms identically and cancels.
        delta = observed - values[lo * STRIDE + start]!;
        constant = delta < 0 ? -delta : delta;
      }

      shiftSpan(lo, hi, delta, runtime, report);

      last = gap;

      if (DEV) {
        claimed = true;
      }
    },

    invalidate(): void {
      dirty = true;
      constant = -1;
      index.invalidate();
    },

    retire(): void {
      forget();
      index.retire();
    },
  };
}
