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
 * project(B)   the constant is known -> advance the cache, return the plan
 *              the constant is unknown -> `null`, meaning "measure me"
 * (behavior)   one DOM write
 * measure(B)   read one crossed row, establish the constant, return the plan
 * (sink)       one additive `translate` per element
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
  type DisplacementProbe,
  type RectIndex,
  STRIDE,
  TOP,
  verifyEquivalence,
} from './rect-index.ts';

/**
 * **The displacement plan**: the elements a committed move moved, and the
 * vector each of them travelled, **negated**.
 *
 * A visitor rather than a packed buffer. For this rule every entry in the span
 * carries the *same* number, so a parallel array would store one derivable
 * value `span` times; and a visitor lets each axis write the loop natural to it
 * while the sink passes one hoisted closure, so a committed move allocates
 * nothing.
 *
 * The vector is negated because that is what an inverse-FLIP contribution
 * starts from: the element jumped by `+v`, so a contribution of `-v` decaying
 * to zero shows it travelling.
 *
 * **A composition with no displacement feature pays one returned reference.**
 * The visitor is simply never called — no flag, no branch, and no arrangement
 * between the axis and a feature that may not be installed.
 */
export type DisplacementPlan = (
  visit: (element: HTMLElement, dx: number, dy: number) => void,
) => void;

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
  contribution: DisplacementProbe | null;
}>;

export type LinearShift = Readonly<{
  /**
   * {@link RectIndex.refresh}, plus the gap the placeholder occupies in the DOM
   * at the moment of the scan. The buffer this produces reflects that gap, and
   * both {@link LinearShift.project} and {@link LinearShift.measure} advance
   * from it.
   */
  refresh(
    snapshot: CollectionSnapshot,
    dragged: HTMLElement,
    getBox: ((item: HTMLElement) => HTMLElement) | null,
    live: () => boolean,
    placeholder: HTMLElement,
    contribution: DisplacementProbe | null,
    gap: number,
  ): boolean;
  /**
   * **The prediction**, run immediately before the one DOM write.
   *
   * Advances the cache to describe the tree as it will be once the placeholder
   * sits at `gap`, and returns the plan for the elements that move. Performs no
   * DOM read and calls no consumer code **in a shipped build**, so it takes no
   * `live()` and has no abort outcome.
   *
   * Returns `null` when the constant is not established — the first committed
   * move of an operation, and the first after any invalidation. The behavior
   * then performs the write and calls {@link LinearShift.measure}.
   */
  project(
    gap: number,
    dragged: HTMLElement,
    runtime: LinearRuntime,
  ): DisplacementPlan | null;
  /**
   * **The establishing move**, run immediately *after* the DOM write.
   *
   * Reads one crossed row, takes the signed difference against the value the
   * cache already held for **that same row** — the one form G5 admits —
   * advances the whole span by it, and returns the plan from the same reading.
   * The constant it establishes stands until the next invalidation.
   */
  measure(gap: number, runtime: LinearRuntime): DisplacementPlan;
  invalidate(): void;
  retire(): void;
}>;

/** The empty plan: nothing moved, so the visitor is never invoked. */
const NOTHING: DisplacementPlan = (): void => {};

/**
 * Wraps one {@link RectIndex} in the linear shift rule.
 *
 * `start`, `end` and `centre` are **the axis's own stride offsets** — `TOP`,
 * `BOTTOM`, `CENTRE_Y` for `y()`; `LEFT`, `RIGHT`, `CENTRE_X` for a future
 * `x()` — and `ux`/`uy` are the axis unit vector, which turns the scalar
 * displacement into the plan's two components with no branch. Passing them is
 * what makes a second linear axis a rule module and a subpath rather than a
 * rewrite of this one.
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
   * known. **Authoritative**: every exit between a projection and the completed
   * write invalidates, so the buffer either describes the tree or is dirty.
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

  const forget = (): void => {
    dirty = true;
    last = -1;
    seen = -1;
    constant = -1;
  };

  /**
   * Advance the span and the hole by an established `delta`, and return the
   * plan. Shared by the predicted and the measured path, which differ only in
   * where `delta` came from.
   */
  const shiftSpan = (
    lo: number,
    hi: number,
    delta: number,
  ): DisplacementPlan => {
    const { values, hole, items } = index;
    // The hole's flow footprint splits into its own extent and the one flow gap
    // it introduces; the slots it crosses close up by the whole footprint,
    // while the hole itself travels the sum of what those slots occupy plus one
    // gap each.
    const width = hole[end]! - hole[start]!;
    const spacing = (delta < 0 ? -delta : delta) - width;
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
    }

    // **The hole advances by its own displacement**, which is what it crossed —
    // a sum over the slots' own extents, never a difference against one of
    // their positions. It moves against the slots, so the sign is inverted.
    const holeStart = hole[start]! + (delta < 0 ? travelled : -travelled);

    hole[start] = holeStart;
    hole[end] = holeStart + width;
    hole[centre] = holeStart + width * 0.5;

    // Hoisted out of the walk: every element in the span carries the same
    // vector, so the two components are computed once per move rather than
    // once per element.
    const dx = -delta * ux;
    const dy = -delta * uy;

    return (visit): void => {
      for (let i = lo; i < hi; i += 1) {
        visit(items[i]!, dx, dy);
      }
    };
  };

  /**
   * Whether the buffer is in a state either path can advance from, and the span
   * it would advance. Each rejection is a real degenerate case: a dirty buffer
   * describes a tree that has already changed under it, `count === 0` is a
   * single-item collection with no destination slot to displace, and an unknown
   * gap proposes no span at all.
   */
  const spanFor = (gap: number, runtime: LinearRuntime): number => {
    if (
      dirty ||
      seen !== runtime.snapshot.version ||
      index.count === 0 ||
      last < 0 ||
      last === gap
    ) {
      return -1;
    }

    return last;
  };

  return {
    refresh(
      snapshot,
      dragged,
      getBox,
      live,
      placeholder,
      contribution,
      gap,
    ): boolean {
      if (
        !index.refresh(
          snapshot,
          dragged,
          getBox,
          live,
          placeholder,
          contribution,
        )
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

    project(gap, dragged, runtime): DisplacementPlan | null {
      // **The instrument, on the claim the previous projection made.** It scans,
      // which is the forced layout this model exists to remove, so it is `DEV`
      // only. It is checked here rather than after the projection that made the
      // claim, because a prediction describes a tree the write has not produced
      // yet — this is the first instant at which it has.
      if (DEV && !dirty && last >= 0) {
        verifyEquivalence(
          index,
          runtime.snapshot,
          dragged,
          runtime.box,
          runtime.placeholder,
          runtime.contribution,
          'G3-linear',
        );
      }

      if (constant < 0 || spanFor(gap, runtime) < 0) {
        return null;
      }

      const from = last;
      const delta = from < gap ? -constant : constant;
      const plan = shiftSpan(
        from < gap ? from : gap,
        from < gap ? gap : from,
        delta,
      );

      last = gap;

      return plan;
    },

    measure(gap, runtime): DisplacementPlan {
      const from = spanFor(gap, runtime);

      if (from < 0) {
        // Nothing sound to advance, and the write has already landed — so the
        // buffer now describes a tree that no longer exists.
        dirty = true;
        last = -1;
        index.invalidate();

        return NOTHING;
      }

      const lo = from < gap ? from : gap;
      const hi = from < gap ? gap : from;
      const { values, items } = index;
      // Any crossed row answers, because they all travelled the same constant.
      // Measured as its **box**, which is what the cache holds.
      const probe = items[lo]!;
      const rect = (
        runtime.box ? runtime.box(probe) : probe
      ).getBoundingClientRect();

      if (!runtime.live()) {
        dirty = true;
        last = -1;
        index.invalidate();

        return NOTHING;
      }

      let held = 0;

      if (runtime.contribution) {
        // The row may be mid-flight from an earlier move. Both sides of the
        // difference have to be settled geometry, and the cache already is.
        const out = new Float64Array(2);

        runtime.contribution(probe, out);
        held = start === TOP ? out[1]! : out[0]!;
      }

      // **The one difference G5 admits**: one element, two instants. Whatever
      // this row wears — an authored `translate`, an ancestor's transform —
      // sits in both terms identically and cancels.
      const observed = (start === TOP ? rect.top : rect.left) - held;
      const delta = observed - values[lo * STRIDE + start]!;

      constant = delta < 0 ? -delta : delta;

      const plan = shiftSpan(lo, hi, delta);

      last = gap;

      return plan;
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
