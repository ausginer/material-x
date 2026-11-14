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
 * A resolution measures a window of slots, not every slot. It grows the window
 * from the slots next to the placeholder's gap toward the pointer, until the window
 * holds the two slots whose centers bracket the pointer, or reaches the list's end
 * on that side. Under the term that centers increase along y in the collection's
 * order, the nearest center in that window is the nearest in the list, and the
 * slots on the other side of the placeholder are no nearer than its own center. A
 * committed move crosses only slots between the old gap and the nearest center, so
 * the shift rule writes only slots in the window.
 *
 * `xy()` wraps, so its displacement is neither scalar nor uniform, and its centers
 * are not ordered along one axis. This is a module and not a branch in `RectIndex`
 * so that an `xy()` composition does not carry the rule or the window's growth.
 */
import type { AxisContext, DisplacementSink } from './axis.ts';
import type { CollectionSnapshot } from './domain.ts';
import type { Invalidatable } from './invalidatable.ts';
import {
  CENTER_Y,
  LEFT,
  PLACEHOLDER,
  type RectIndex,
  RIGHT,
  verifyEquivalence,
} from './rect-index.ts';
import type { Retirable } from './retirable.ts';

/**
 * One `RectIndex` under the linear shift rule, along y. The index was constructed
 * with `TOP` as its axis.
 */
export class LinearShift implements Invalidatable, Retirable {
  readonly #index: RectIndex;

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

  /**
   * The placeholder's left and right as the cache held them before the re-read,
   * or `NaN` when no re-read followed the last committed move. Written only inside
   * `__DEV__` branches.
   */
  #heldLeft = Number.NaN;
  #heldRight = Number.NaN;

  constructor(index: RectIndex) {
    this.#index = index;

    if (__DEV__) {
      // @ts-expect-error: dev-only expression
      this.advanceUnchecked = false;
    }
  }

  /**
   * Prepares the cache for a scan at `pointerY`: collects the slots when the cache
   * is stale, and grows the window until it brackets the pointer. `gap` is the gap
   * the placeholder occupies at the moment of the scan, which only the caller
   * knows. The stale placeholder is read first, because the
   * development check compares it against the tree. That check runs here, one frame
   * after the move, because at the move's own instant the animations it started
   * have no resolved timing yet.
   */
  refresh(
    snapshot: CollectionSnapshot,
    dragged: HTMLElement,
    getBox: ((item: HTMLElement) => HTMLElement) | null | undefined,
    placeholder: HTMLElement,
    displacement: DisplacementSink | null | undefined,
    gap: number,
    pointerY: number,
  ): void {
    if (this.#placeholderIsStale) {
      this.#placeholderIsStale = false;

      if (
        __DEV__ &&
        // @ts-expect-error: dev-only expression
        this.advanceUnchecked
      ) {
        // The rule predicts that a relocation leaves both x coordinates where
        // the rebuild measured them, and the check compares that prediction.
        this.#heldLeft = this.#index.at(PLACEHOLDER, LEFT);
        this.#heldRight = this.#index.at(PLACEHOLDER, RIGHT);
      }

      this.#index.measurePlaceholder(placeholder);
    }

    if (
      __DEV__ &&
      // @ts-expect-error: dev-only expression
      this.advanceUnchecked &&
      !this.#dirty &&
      this.#snapshotVersion === snapshot.version
    ) {
      // @ts-expect-error: dev-only expression
      this.advanceUnchecked = false;
      verifyEquivalence(
        this.#index,
        snapshot,
        dragged,
        getBox,
        placeholder,
        displacement,
        this.#heldLeft,
        this.#heldRight,
      );
      this.#heldLeft = Number.NaN;
      this.#heldRight = Number.NaN;
    }

    this.#index.collect(snapshot, dragged, placeholder, gap);

    // Read once, outside the loops.

    // Toward the pointer only: under the order term, a slot on the other side of
    // the placeholder is never nearer than the placeholder's own center.
    if (pointerY > this.#index.at(PLACEHOLDER, CENTER_Y)) {
      while (
        this.#index.end < this.#index.count &&
        (this.#index.first === this.#index.end ||
          this.#index.at(this.#index.end - 1, CENTER_Y) < pointerY)
      ) {
        this.#index.measure(
          this.#index.end,
          this.#index.end + 1,
          getBox,
          displacement,
        );
      }
    } else {
      while (
        this.#index.first > 0 &&
        (this.#index.first === this.#index.end ||
          this.#index.at(this.#index.first, CENTER_Y) > pointerY)
      ) {
        this.#index.measure(
          this.#index.first - 1,
          this.#index.first,
          getBox,
          displacement,
        );
      }
    }

    this.#snapshotVersion = snapshot.version;
    this.#dirty = false;
    this.#lastGap = gap;
  }

  /**
   * After a committed move: has the cache shift the crossed slots to the geometry
   * the DOM write just produced, marks the placeholder stale, and reports the span
   * when a sink is installed. Reads one crossed row when the constant is not
   * established.
   */
  moved(gap: number, snapshot: CollectionSnapshot, context: AxisContext): void {
    // A dirty buffer describes a tree that has already changed under it, an empty
    // one is a single-item collection, and an unknown or unchanged gap proposes no
    // span at all.
    if (
      this.#dirty ||
      this.#snapshotVersion !== snapshot.version ||
      this.#index.count === 0 ||
      this.#lastGap < 0 ||
      this.#lastGap === gap
    ) {
      this.#dirty = true;
      this.#lastGap = -1;
      this.#placeholderIsStale = false;
      this.#index.invalidate();
      return;
    }

    const lastGap = this.#lastGap;
    const lo = lastGap < gap ? lastGap : gap;
    const hi = lastGap < gap ? gap : lastGap;

    let delta = lastGap < gap ? -this.#rowDistance : this.#rowDistance;

    if (this.#rowDistance < 0) {
      // Any crossed row works, because they all traveled the same constant. The
      // row may be mid-flight from an earlier move, so the cache settles it.
      delta = this.#index.travel(lo, context.box, context.displacement);
      this.#rowDistance = delta < 0 ? -delta : delta;
    }

    this.#index.shift(lo, hi, delta);

    if (context.displacement) {
      for (let i = lo; i < hi; i += 1) {
        context.displacement.report(
          this.#index.item(i),
          0,
          -delta,
          context.space,
        );
      }
    }

    this.#lastGap = gap;
    this.#placeholderIsStale = true;

    if (__DEV__) {
      // @ts-expect-error: dev-only expression
      this.advanceUnchecked = true;
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
