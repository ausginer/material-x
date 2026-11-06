/**
 * The flat slot record that the behavior calls, and the consumer-declared views
 * that features use to describe their inputs.
 *
 * The assembler produces a `SortableSlots` and the behavior takes one as an
 * argument. Nothing here knows what a feature is. When the behavior runs, the
 * contribution objects are gone and only these fields and their closures exist.
 *
 * The shape is flat so that `slots.resolveInsertion(...)` is one property read
 * and one call. The assembler flattens every member of `InsertionGeometry`:
 * `resolve`, `invalidate`, `moved`, and `retire` into `retireHooks`. So the
 * pairing exists at construction and adds no hot-path indirection.
 */
import type { DraggableError, DraggableWarning } from '../kernel/errors.ts';
import type { Disposer } from '../kernel/lifetimes.ts';
import type { InheritedSpace } from '../kernel/presentation.ts';
import type { LandingTiming } from '../shared/composition.ts';
import type { ItemSource, SortableOnEnd } from './config.ts';
import type { CollectionSnapshot, Insertion, OnReorder } from './domain.ts';
import type { PlaceholderFactory } from './placement.ts';
import type { DisplacementSettle } from './rect-index.ts';

/**
 * Reports one element that a committed move displaced, and the vector that the
 * element travelled, negated.
 *
 * This callback is passed into the axis and is not returned from it, so a
 * composition with no displacement sink constructs nothing on a committed move:
 * the axis receives `null` and never enters the walk. The vector is negated
 * because an inverse-FLIP contribution starts from that value: the element
 * jumped by `+v`, so a contribution of `-v` decaying to zero shows the element
 * travelling.
 *
 * `space` gives the units of the vector, so each report states its own units.
 * The vector is a viewport quantity and a `translate` is not, so a sink that
 * writes a `translate` has to project. `space` is the inverse of the linear
 * part that the collection inherits, or `null` when that part is the identity
 * and the two units coincide. `space` travels with the vector and is not read
 * once and held, so there is no interval over which it must stay valid, and
 * nothing for the sink to invalidate.
 */
export type DisplacementReport = (
  element: HTMLElement,
  dx: number,
  dy: number,
  space: InheritedSpace,
) => void;

/**
 * The fields that an axis rule may read from the frame. The behavior passes
 * whichever frame it was given: a draft inside a `prepare`, a readonly frame
 * inside an `effect`. Structural typing does the rest, so no view is ever
 * materialized.
 *
 * This is the widest view, not the required one. A feature declares its own
 * narrower view in its own module, and the behavior's frame satisfies both:
 * `y()` names `pointerY` and `item`, and `xy()` also names `pointerX`. This
 * type is the most that the behavior guarantees to supply.
 */
export type InsertionFrameView = Readonly<{
  insertion: Insertion | null;
  /**
   * The collection that the gap indexes into, or `null` before a lift.
   *
   * This is the frame's own committed snapshot: a value that a gap may be
   * resolved and version-stamped against, and that does not change while a rule
   * holds it.
   */
  snapshot: CollectionSnapshot | null;
  /** Read by the two-dimensional rule; `y()` ignores it. */
  pointerX: number;
  pointerY: number;
  /**
   * The dragged item, or `null` before a lift. The destination view is the
   * collection minus this item. An axis rule that cannot exclude this item
   * measures a lifted element whose centre tracks the pointer. That element
   * would win every search and pin the gap to its own slot.
   *
   * The item is read from the frame and not from {@link InsertionRuntimeView}:
   * the item is already committed frame state, and a second copy on the
   * per-operation view could drift.
   */
  item: HTMLElement | null;
}>;

/**
 * Non-frame state arrives as a second argument, because frame state and runtime
 * state have separate owners and separate lifetimes. It is one small
 * per-operation object. It is per-operation and not per-controller because of
 * `placeholder`, which cannot be non-null before activation.
 */
export type InsertionRuntimeView = Readonly<{
  placeholder: HTMLElement;
  /**
   * The installed `box` resolver, or `null` when the config names neither `box`
   * nor `visual`.
   *
   * The axis rule measures candidate boxes, not candidate visuals. Every
   * candidate is compared against the placeholder, and the placeholder occupies
   * the box's removed footprint, so both sides of the comparison are the same
   * kind of rect. Measuring candidates as visuals would measure the placeholder
   * one way and the candidates another, which is a hysteresis defect and not a
   * rounding error.
   *
   * Under the default `box === visual` the two coincide, so the common case
   * does not change.
   *
   * Nullable and not normalized to identity, because the minimal composition
   * names neither slot and would otherwise pay an identity call per candidate
   * per rebuild.
   */
  box: ((item: HTMLElement) => HTMLElement) | null;
  /**
   * The installed displacement sink's settle walk, or `null` when no
   * displacement feature is composed.
   *
   * An axis passes this function the buffer that a rebuild has just measured
   * and gets settled geometry back, not where an animation currently draws each
   * row. The function reads no layout, so a rebuild that runs mid-flight costs
   * one call and nothing per candidate. No contribution ever has to be released
   * so that something can measure.
   */
  settle: DisplacementSettle | null;
  /**
   * The inverse of the linear part that the collection inherits, or `null` for
   * an untransformed ancestry. This projection turns a viewport displacement
   * into the `translate` that a sink writes.
   *
   * Passed directly to {@link DisplacementReport}. The axis owns the vector and
   * never the units. The value describes the ancestry at grab, and is captured
   * once at activation from the measurement that the lift already took.
   */
  space: InheritedSpace;
}>;

export type SortableSlots = Readonly<{
  /* required, filled by the axis feature */
  resolveInsertion(
    frame: InsertionFrameView,
    runtime: InsertionRuntimeView,
  ): Insertion | null;
  /**
   * The behavior's only way to say "the geometry you cached is stale". Lazy by
   * contract: scroll and resize call this member many times a second, so it may
   * not read geometry.
   */
  invalidateInsertion(): void;
  /**
   * The committed move has landed: leave the cache describing the tree, and
   * tell `report` what moved. Required, because an axis that reports nothing
   * still has to keep its own cache correct.
   */
  movedInsertion(
    frame: InsertionFrameView,
    runtime: InsertionRuntimeView,
    report: DisplacementReport | null,
  ): void;

  /* required */
  /**
   * The collection as a pull source. Called by `action.prepare(COLLECTION)` on
   * every `controller.invalidate()`, and once at construction for the initial
   * snapshot. Never memoized, because the library must re-read it.
   */
  items: ItemSource;
  onReorder: OnReorder;
  /**
   * Normalized to a shared no-op, so the call site needs no null check. It
   * takes an argument the behavior already has.
   */
  onStart(item: HTMLElement): void;

  /* optional; `null` when no feature filled them */
  placeholder: PlaceholderFactory | null;
  handle: ((item: HTMLElement) => HTMLElement | null) | null;
  /** The node that is faithfully lifted. Resolved once, at admission. */
  visual: ((item: HTMLElement) => HTMLElement) | null;
  /**
   * The geometry source. The assembler has already defaulted it to `visual`, so
   * this is `null` only when neither slot was written. So both the admission
   * path and the candidate loop can skip the call and do not pay an identity
   * call per item.
   */
  box: ((item: HTMLElement) => HTMLElement) | null;
  /**
   * The landing animation's timing, or `null` when no landing is installed. In
   * that case the visual stays where the drop put it.
   */
  landingTiming: LandingTiming | null;
  /**
   * These stay nullable and are not normalized: their arguments are result
   * objects that would otherwise be constructed only to be discarded.
   */
  onEnd: SortableOnEnd | null;
  onError: ((error: DraggableError | DraggableWarning) => void) | null;

  /**
   * The displacement sink's visitor, or `null` when no displacement feature is
   * composed. The axis receives this value as an argument, and passing it is
   * all that a non-animating composition pays.
   */
  report: DisplacementReport | null;
  /**
   * The sink's settle walk, or `null` when nothing displaces. Copied onto the
   * per-operation view so that an axis reads one field and does not reach the
   * slot record.
   */
  settle: DisplacementSettle | null;
  /** Installation order; every reader walks it backwards. */
  retireHooks: readonly Disposer[];

  threshold: number;
}>;

/** The shared normalization target for an uninstalled `onStart`. */
export const NOOP_START = (): void => {};

export const DEFAULT_THRESHOLD = 8;
