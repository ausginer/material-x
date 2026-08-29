/**
 * The flat slot record the behavior actually calls, and the consumer-declared
 * views features describe their inputs with.
 *
 * The assembler produces a `SortableSlots` and the behavior takes one as an
 * argument. Nothing here knows what a feature is: by the time the behavior
 * runs, the contribution objects are gone and only these fields and their
 * closures exist.
 *
 * The shape is deliberately flat — `slots.resolveInsertion(...)` is one
 * property read and one call. The assembler flattens every member of
 * `InsertionGeometry` — `resolve`, `invalidate`, the optional `project`,
 * `measure`, and `retire` into the unwind list — so the pairing is a
 * construction-time claim rather than a hot-path indirection.
 */
import type { DraggableError, DraggableWarning } from '../kernel/errors.ts';
import type { Disposer } from '../kernel/lifetimes.ts';
import type { LandingStart } from '../kernel/spec.ts';
import type { ItemSource, SortableOnEnd } from './config.ts';
import type { CollectionSnapshot, Insertion, OnReorder } from './domain.ts';
import type { DisplacementPlan } from './linear-shift.ts';
import type { PlaceholderFactory } from './placement.ts';
import type { DisplacementProbe } from './rect-index.ts';

/**
 * The fields an axis rule may read off the frame. **The behavior passes
 * whichever frame its seam was handed** — a draft inside a `prepare`, a
 * readonly frame inside an `effect` — and structural typing does the rest, so
 * no view is ever materialized.
 *
 * **This is the widest view, not the required one.** A feature declares its own
 * narrower view in its own module and the behavior's frame satisfies both:
 * `y()` names `pointerY` and `item`, `xy()` names `pointerX` as well. The type
 * here is the ceiling the behavior guarantees to supply.
 */
export type InsertionFrameView = Readonly<{
  insertion: Insertion | null;
  /** Read by the two-dimensional rule; `y()` ignores it. */
  pointerX: number;
  pointerY: number;
  /**
   * The dragged item, or `null` before a lift. The destination view is the
   * collection minus this item, and an axis rule that cannot exclude it
   * measures a lifted element whose centre tracks the pointer — so it would win
   * every search and pin the gap to its own slot.
   *
   * It is read off the frame rather than off {@link InsertionRuntimeView}: the
   * item is already committed frame state, and duplicating it onto the
   * per-operation view would create a second copy that could drift.
   */
  item: HTMLElement | null;
}>;

/**
 * Non-frame state travels as a **second argument**, because frame state and
 * runtime state have separate owners and separate lifetimes. It is one small
 * per-operation object — the reason it is per-operation rather than
 * per-controller is `placeholder`, which cannot be non-null before activation.
 */
export type InsertionRuntimeView = Readonly<{
  snapshot: CollectionSnapshot;
  placeholder: HTMLElement;
  /**
   * The installed `box` resolver, or `null` when the config names neither `box`
   * nor `visual`.
   *
   * **The axis rule measures candidate boxes, not candidate visuals.** The
   * incumbent every candidate is compared against is the placeholder, and the
   * placeholder occupies the **box's** removed footprint, so both sides of the
   * comparison are the same kind of rect. Measuring candidates as visuals
   * instead measures the incumbent one way and its challengers another, which
   * is a hysteresis defect rather than a rounding one.
   *
   * Under the default `box === visual` the two coincide, so the common case is
   * untouched.
   *
   * Nullable rather than normalized to identity, because the minimal
   * composition names neither slot and would otherwise pay an identity call per
   * candidate per rebuild.
   */
  box: ((item: HTMLElement) => HTMLElement) | null;
  /**
   * Whether the controller is still alive.
   *
   * An axis rule that resolves a box per candidate is calling consumer code in
   * a loop, and such a call may destroy the controller; the loop is
   * feature-private, so the reading has to arrive as data. Read only between
   * resolver calls, never on a warm cache.
   */
  live(): boolean;
  /**
   * **The gap the placeholder occupies**, or `null` before one exists.
   *
   * A rule reads it in two places and means the same thing in both: `resolve`
   * records which gap the buffer it just measured reflects, and `project` is
   * told which gap the write about to happen will move it to. It is the frame's
   * own committed insertion, republished here so a rule needs no second view.
   */
  insertion: Insertion | null;
  /**
   * **What the installed displacement sink is currently holding for an
   * element**, or `null` when no displacement feature is composed.
   *
   * An axis subtracts it per candidate so a rebuild yields *settled* geometry
   * rather than where an animation currently draws a row. It reads no layout,
   * so a rebuild that runs mid-flight costs one call per candidate and nothing
   * else — and no contribution ever has to be released so that something can
   * measure.
   */
  contribution: DisplacementProbe | null;
}>;

export type SortableSlots = Readonly<{
  /* required, filled by the axis feature */
  resolveInsertion(
    frame: InsertionFrameView,
    runtime: InsertionRuntimeView,
  ): Insertion | null;
  /**
   * The behavior's only way to say "the geometry you cached is stale". **Lazy
   * by contract**: scroll and resize call it many times a second, so it may not
   * read geometry.
   */
  invalidateInsertion(): void;
  /**
   * **Predict the committed move**, immediately before the one DOM write, and
   * return what it displaces — or `null` for "measure me instead".
   *
   * The slot itself is `null` when the axis contributed no prediction at all,
   * which is one null test at one call site rather than a required member every
   * rule has to fill with a refusal.
   */
  projectInsertion:
    | ((
        frame: InsertionFrameView,
        runtime: InsertionRuntimeView,
      ) => DisplacementPlan | null)
    | null;
  /**
   * **Say what the committed move displaced**, measured, immediately after the
   * write, and only when the prediction was absent or declined. Required: an
   * axis that can do neither still has to leave its cache describing the tree.
   */
  measureInsertion(
    frame: InsertionFrameView,
    runtime: InsertionRuntimeView,
  ): DisplacementPlan;

  /* required */
  /**
   * **The collection as a pull source.** Called by `action.prepare(COLLECTION)`
   * on every `controller.invalidate()`, and once at construction for the
   * initial snapshot — never memoized, because the whole point is that the
   * library re-reads it.
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
  /** The node faithfully lifted. Resolved once, at admission. */
  visual: ((item: HTMLElement) => HTMLElement) | null;
  /**
   * The geometry source. **Already defaulted to `visual` by the assembler**, so
   * this is `null` only when neither slot was written — which is what lets both
   * the admission path and the candidate loop skip the call entirely rather
   * than pay an identity per item.
   */
  box: ((item: HTMLElement) => HTMLElement) | null;
  startLanding: LandingStart | null;
  /**
   * These stay nullable rather than normalized: their arguments are result
   * objects that would otherwise be constructed only to be discarded.
   */
  onEnd: SortableOnEnd | null;
  onError: ((error: DraggableError | DraggableWarning) => void) | null;

  /**
   * The displacement sink, or `null` when no displacement feature is composed —
   * which is a null check at one call site rather than an empty array walked on
   * every committed move.
   */
  displace: ((plan: DisplacementPlan, live: () => boolean) => void) | null;
  /**
   * Cancel every contribution in flight. Called by release **before** it
   * measures, so the rebuild reads flow positions rather than rows mid-transit.
   */
  settleDisplacement: (() => void) | null;
  /**
   * The sink's own reading of what it currently holds per element, or `null`
   * when nothing displaces. Copied onto the per-operation view so an axis reads
   * one field rather than reaching the slot record.
   */
  contribution: DisplacementProbe | null;
  /** Installation order; every reader walks it backwards. */
  retireHooks: readonly Disposer[];

  threshold: number;
}>;

/** The shared normalization target for an uninstalled `onStart`. */
export const NOOP_START = (): void => {};

export const DEFAULT_THRESHOLD = 8;
