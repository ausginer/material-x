/**
 * The shift rule for a column, used by `y()`.
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
import type { AxisContext, DisplacementSink } from './axis.ts';
import type { CollectionSnapshot } from './domain.ts';
import {
  type RectIndex,
  STRIDE,
  TOP,
  verifyEquivalence,
} from './rect-index.ts';

/** One `RectIndex` under the linear shift rule, along y. */
export interface LinearShift {
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
    displacement: DisplacementSink | null,
    gap: number,
  ): void;

  /**
   * After a committed move: advances the crossed slots to the geometry the DOM write
   * just produced, marks the placeholder stale, and reports the span when a sink is
   * installed. Reads one crossed row when the constant is not established.
   */
  moved(gap: number, snapshot: CollectionSnapshot, context: AxisContext): void;

  invalidate(): void;

  retire(): void;
}

export function linearShift(index: RectIndex): LinearShift {
  /** A prediction is valid only against a buffer that describes the DOM. */
  let dirty = true;

  /** The destination gap the buffer reflects, or `-1` when nothing is known. */
  let lastGap = -1;

  /** The collection version the buffer holds, or `-1` for nothing. */
  let snapshotVersion = -1;

  /**
   * The distance one crossed row travels along the axis, or `-1` while unmeasured.
   * Every invalidation discards it, because a zoom, a resize or a replaced
   * collection all change it, and the cache has one staleness flag with no reason
   * attached. The cost is one row read on the next committed move.
   */
  let rowDistance = -1;

  /** A committed move left the cached placeholder rect out of date. */
  let placeholderIsStale = false;

  /** Written only inside `__DEV__` branches, so it folds away with them. */
  let advanceUnchecked = false;

  return {
    refresh(snapshot, dragged, getBox, placeholder, displacement, gap) {
      if (placeholderIsStale) {
        placeholderIsStale = false;
        index.remeasurePlaceholder(placeholder);
      }

      if (
        __DEV__ &&
        advanceUnchecked &&
        !dirty &&
        snapshotVersion === snapshot.version
      ) {
        advanceUnchecked = false;
        verifyEquivalence(
          index,
          snapshot,
          dragged,
          getBox,
          placeholder,
          displacement,
        );
      }

      index.refresh(snapshot, dragged, getBox, placeholder, displacement);

      snapshotVersion = snapshot.version;
      dirty = false;

      if (gap >= 0) {
        lastGap = gap;
      }
    },

    moved(gap, snapshot, context) {
      // A dirty buffer describes a tree that has already changed under it, an empty
      // one is a single-item collection, and an unknown or unchanged gap proposes no
      // span at all.
      if (
        dirty ||
        snapshotVersion !== snapshot.version ||
        index.count === 0 ||
        lastGap < 0 ||
        lastGap === gap
      ) {
        dirty = true;
        lastGap = -1;
        placeholderIsStale = false;
        index.invalidate();
        return;
      }

      const lo = lastGap < gap ? lastGap : gap;
      const hi = lastGap < gap ? gap : lastGap;
      let delta = lastGap < gap ? -rowDistance : rowDistance;

      if (rowDistance < 0) {
        const { values, items } = index;
        // Any crossed row works, because they all traveled the same constant.
        const probe = items[lo]!;
        let observed = (
          context.box ? context.box(probe) : probe
        ).getBoundingClientRect().top;

        if (context.displacement) {
          // The row may be mid-flight from an earlier move, and both sides of the
          // difference must be settled geometry.
          const scratch = new Float64Array(STRIDE);

          scratch[TOP] = observed;
          context.displacement.settle(scratch, [probe], 1);
          observed = scratch[TOP]!;
        }

        delta = observed - values[lo * STRIDE + TOP]!;
        rowDistance = delta < 0 ? -delta : delta;
      }

      index.advance(lo, hi, delta);

      if (context.displacement) {
        const { items } = index;

        for (let i = lo; i < hi; i += 1) {
          context.displacement.report(items[i]!, 0, -delta, context.space);
        }
      }

      lastGap = gap;
      placeholderIsStale = true;

      if (__DEV__) {
        advanceUnchecked = true;
      }
    },

    invalidate() {
      dirty = true;
      rowDistance = -1;
      placeholderIsStale = false;
      index.invalidate();
    },

    retire() {
      dirty = true;
      lastGap = -1;
      snapshotVersion = -1;
      rowDistance = -1;
      placeholderIsStale = false;
      index.retire();
    },
  };
}
