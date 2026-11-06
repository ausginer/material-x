/**
 * The shift rule for a one-dimensional axis, used by `y()`.
 *
 * A committed move relocates the placeholder between two gaps. In a linear flow,
 * that displaces the slots between them by one constant along the axis and
 * changes nothing else, including both cross-axis coordinates.
 *
 * The constant is measured, never derived. The cache holds presented geometry,
 * which includes any authored `translate`, `rotate` or `scale` on a row, so a
 * difference between two different elements is not a flow quantity. A difference
 * of one element's position across two instants is, because its own authored
 * contribution cancels. So one crossed row's displacement across one committed
 * move establishes the constant, and every later move on the same geometry is
 * predicted with no DOM read.
 *
 * The placeholder is measured too, and cannot be predicted: where it lands depends
 * on the crossed rows' flow footprints, and neither their presented extents nor
 * the placeholder's own size give that. A committed move marks it stale, and the
 * next frame reads it once, from a tree already laid out.
 *
 * `xy()` wraps, so its displacement is neither scalar nor uniform. This is a module
 * and not a branch in `RectIndex` so that an `xy()` composition does not carry it.
 */
import type { DisplacementReport, AxisContext } from './axis.ts';
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
 * One `RectIndex` under the linear shift rule. `start`, `end` and `center` are the
 * axis's stride offsets, and `ux`/`uy` its unit vector.
 */
export class LinearShift {
  readonly #index: RectIndex;

  /** The same cache under the reader's type, where its contents are read-only. */
  readonly #view: RectIndexView;

  readonly #start: number;
  readonly #end: number;
  readonly #center: number;
  readonly #unitX: number;
  readonly #unitY: number;

  /** A prediction is valid only against a buffer that describes the DOM. */
  #dirty = true;

  /** The destination gap the buffer reflects, or `-1` when nothing is known. */
  #lastGap = -1;

  /** The collection version the buffer holds, or `-1` for nothing. */
  #snapshotVersion = -1;

  /**
   * The distance one crossed row travels along the axis, or `-1` while unmeasured.
   * Every invalidation discards it, because a zoom, a resize or a replaced
   * collection all change it, and the cache has one staleness flag with no reason
   * attached. The cost is one row read on the next committed move.
   */
  #rowDistance = -1;

  /** A committed move left the cached placeholder rect out of date. */
  #placeholderIsStale = false;

  /** Written only inside `DEV` branches, so it folds away with them. */
  #advanceUnchecked = false;

  constructor(
    index: RectIndex,
    start: number,
    end: number,
    center: number,
    ux: number,
    uy: number,
  ) {
    this.#index = index;
    this.#view = index;
    this.#start = start;
    this.#end = end;
    this.#center = center;
    this.#unitX = ux;
    this.#unitY = uy;
  }

  /**
   * `RectIndex.refresh`, plus the gap the placeholder occupies at the moment of the
   * scan, which only the caller knows. The stale placeholder is read first, because
   * the development check compares it against the tree. That check runs here, one
   * frame after the move, because at the move's own instant the animations it
   * started have no resolved timing yet.
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

    if (this.#placeholderIsStale) {
      this.#placeholderIsStale = false;
      index.remeasurePlaceholder(
        placeholder,
        this.#start,
        this.#end,
        this.#center,
      );
    }

    if (
      DEV &&
      this.#advanceUnchecked &&
      !this.#dirty &&
      this.#snapshotVersion === snapshot.version
    ) {
      this.#advanceUnchecked = false;
      verifyEquivalence(index, snapshot, dragged, getBox, placeholder, settle);
    }

    index.refresh(snapshot, dragged, getBox, placeholder, settle);

    this.#snapshotVersion = snapshot.version;
    this.#dirty = false;

    if (gap >= 0) {
      this.#lastGap = gap;
    }
  }

  /**
   * After a committed move: advances the crossed slots to the geometry the DOM write
   * just produced, marks the placeholder stale, and reports the span when a sink is
   * installed. Reads one crossed row when the constant is not established.
   */
  moved(
    gap: number,
    snapshot: CollectionSnapshot,
    context: AxisContext,
    report: DisplacementReport | null,
  ): void {
    const from = this.#lastGap;

    // A dirty buffer describes a tree that has already changed under it, an empty
    // one is a single-item collection, and an unknown or unchanged gap proposes no
    // span at all.
    if (
      this.#dirty ||
      this.#snapshotVersion !== snapshot.version ||
      this.#view.count === 0 ||
      from < 0 ||
      from === gap
    ) {
      this.#dirty = true;
      this.#lastGap = -1;
      this.#placeholderIsStale = false;
      this.#index.invalidate();
      return;
    }

    const lo = from < gap ? from : gap;
    const hi = from < gap ? gap : from;
    let delta = from < gap ? -this.#rowDistance : this.#rowDistance;

    if (this.#rowDistance < 0) {
      const { values, items } = this.#view;
      // Any crossed row works, because they all traveled the same constant.
      const probe = items[lo]!;
      const rect = (
        context.box ? context.box(probe) : probe
      ).getBoundingClientRect();
      let observed = this.#start === TOP ? rect.top : rect.left;

      if (context.settle) {
        // The row may be mid-flight from an earlier move, and both sides of the
        // difference must be settled geometry.
        const scratch = new Float64Array(STRIDE);

        scratch[this.#start] = observed;
        context.settle(scratch, [probe], 1);
        observed = scratch[this.#start]!;
      }

      delta = observed - values[lo * STRIDE + this.#start]!;
      this.#rowDistance = delta < 0 ? -delta : delta;
    }

    this.#index.advance(lo, hi, delta, this.#start, this.#end, this.#center);

    if (report) {
      const { items } = this.#view;
      const dx = -delta * this.#unitX;
      const dy = -delta * this.#unitY;

      for (let i = lo; i < hi; i += 1) {
        report(items[i]!, dx, dy, context.space);
      }
    }

    this.#lastGap = gap;
    this.#placeholderIsStale = true;

    if (DEV) {
      this.#advanceUnchecked = true;
    }
  }

  invalidate(): void {
    this.#dirty = true;
    this.#rowDistance = -1;
    this.#placeholderIsStale = false;
    this.#index.invalidate();
  }

  retire(): void {
    this.#dirty = true;
    this.#lastGap = -1;
    this.#snapshotVersion = -1;
    this.#rowDistance = -1;
    this.#placeholderIsStale = false;
    this.#index.retire();
  }
}
