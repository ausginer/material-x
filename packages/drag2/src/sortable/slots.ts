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
 * `InsertionGeometry` — `resolve`, `invalidate`, `moved`, and `retire` into the
 * unwind list — so the pairing is a construction-time claim rather than a
 * hot-path indirection.
 */
import type { DraggableError, DraggableWarning } from '../kernel/errors.ts';
import type { Disposer } from '../kernel/lifetimes.ts';
import type { LandingStart } from '../kernel/spec.ts';
import type { ItemSource, SortableOnEnd } from './config.ts';
import type { CollectionSnapshot, Insertion, OnReorder } from './domain.ts';
import type { PlaceholderFactory } from './placement.ts';
import type { DisplacementSettle } from './rect-index.ts';

/**
 * **One element a committed move displaced, and the vector it travelled,
 * negated.**
 *
 * Passed *into* the axis rather than returned from it, so a composition with no
 * displacement sink constructs nothing on a committed move: the axis takes
 * `null` and never enters the walk. The vector is negated because that is what
 * an inverse-FLIP contribution starts from — the element jumped by `+v`, so a
 * contribution of `-v` decaying to zero shows it travelling.
 *
 * `live` reports whether the controller is still alive, and the sink reads it
 * at the head of every call. Starting a contribution is a consumer call — both
 * `animate()` and the `finished` accessor on what it returns are overridable —
 * so a reading taken before the walk says nothing about the calls inside it,
 * and only the party making those calls can take the readings between them.
 */
export type DisplacementReport = (
  element: HTMLElement,
  dx: number,
  dy: number,
  live: () => boolean,
) => void;

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
   * records which gap the buffer it just measured reflects, and `moved` is told
   * which gap the write that just happened moved it to. It is the frame's own
   * committed insertion, republished here so a rule needs no second view.
   */
  insertion: Insertion | null;
  /**
   * **The installed displacement sink's settle walk**, or `null` when no
   * displacement feature is composed.
   *
   * An axis hands it the buffer a rebuild has just measured and gets *settled*
   * geometry back, rather than where an animation currently draws each row. It
   * reads no layout, so a rebuild that runs mid-flight costs one call and
   * nothing per candidate — and no contribution ever has to be released so that
   * something can measure.
   */
  settle: DisplacementSettle | null;
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
   * **The committed move has landed**: leave the cache describing the tree, and
   * tell `report` what moved. Required — an axis that reports nothing still has
   * to answer for its own cache.
   */
  movedInsertion(
    frame: InsertionFrameView,
    runtime: InsertionRuntimeView,
    report: DisplacementReport | null,
  ): void;

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
   * The displacement sink's visitor, or `null` when no displacement feature is
   * composed — which is the argument the axis is handed and the whole of what
   * a non-animating composition pays.
   */
  report: DisplacementReport | null;
  /**
   * The sink's settle walk, or `null` when nothing displaces. Copied onto the
   * per-operation view so an axis reads one field rather than reaching the slot
   * record.
   */
  settle: DisplacementSettle | null;
  /** Installation order; every reader walks it backwards. */
  retireHooks: readonly Disposer[];

  threshold: number;
}>;

/** The shared normalization target for an uninstalled `onStart`. */
export const NOOP_START = (): void => {};

export const DEFAULT_THRESHOLD = 8;
