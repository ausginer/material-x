/**
 * The flat slot record the behavior actually calls, and the consumer-declared
 * views features describe their inputs with (D-13).
 *
 * Phase 7's `assemble()` produces a `SortableSlots`; phase 6 takes one as an
 * argument. Nothing here knows what a feature is: by the time the behavior runs,
 * the contribution objects are gone and only these fields and their closures
 * exist.
 *
 * The shape is deliberately flat — `slots.resolveInsertion(...)` is one property
 * read and one call. `InsertionGeometry`'s `resolve`/`invalidate` pair is
 * flattened into two fields by the assembler, so the pairing is a construction
 * -time claim rather than a hot-path indirection.
 */
import type { Disposer } from '../kernel/lifetimes.ts';
import type { DOMRealm } from '../kernel/realm.ts';
import type { LandingStart } from '../kernel/spec.ts';
import type {
  CollectionSnapshot,
  DragErrorContext,
  Insertion,
  OnReorder,
  SortableCancelResult,
  SortableFinishResult,
} from './domain.ts';
import type { PlaceholderFactory } from './placement.ts';

/**
 * The fields an axis rule may read off the frame. **The behavior passes
 * whichever frame its seam was handed** — `Draft<Part>` inside a `prepare`,
 * `Readonly<Frame<Part>>` inside an `effect` — and structural typing does the
 * rest, so no view is ever materialized and neither `y.ts` nor `xy.ts` imports
 * the kernel slice or the behavior's part to say what it needs.
 *
 * **This is the widest view, not the required one.** A feature declares its own
 * narrower view in its own module and the behavior's frame satisfies both:
 * `y()` names `pointerY` and `item`, `xy()` names `pointerX` as well. The type
 * here is the ceiling the behavior guarantees to supply.
 */
export type InsertionFrameView = Readonly<{
  insertion: Insertion | null;
  /**
   * **Added in Phase 17**, for the two-dimensional rule (L-8). It is the second
   * widening of this view — 8a added `item` — and it was additive both times,
   * with the behavior's existing frame satisfying it structurally and no import
   * edge appearing back to the runtime. D-13's mechanism generalized; what the
   * two data points show is that the view is a *growing* structural contract
   * rather than a fixed one.
   */
  pointerX: number;
  pointerY: number;
  /**
   * The dragged item. **A deviation from the contract's two-field sketch**, and
   * a necessary one: the destination view is the collection minus the dragged
   * item, and an axis rule that cannot exclude it measures a lifted element
   * whose centre tracks the pointer — so it would win every search and pin the
   * gap to its own slot.
   *
   * Read off the frame rather than added to `InsertionRuntimeView`, because the
   * item is already committed frame state. Duplicating it onto the per-operation
   * view would create a second copy that a future seam could let drift.
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
   * The installed `visual()` resolver, or `null` when no `visual()` is composed.
   *
   * **The axis rule measures candidate visuals, not candidate items** (parity
   * D2). The reason is internal coherence rather than only parity: the incumbent
   * every candidate is compared against is the placeholder, which `placement.ts`
   * sizes from the visual's offset box. Measuring items on one side of that
   * comparison and a visual-derived box on the other biases the hysteresis for
   * any visual that is an inset or offset descendant.
   *
   * Nullable rather than normalized to identity, because the minimal
   * composition installs no `visual()` and would otherwise pay an identity call
   * per candidate per rebuild.
   */
  getVisual: ((item: HTMLElement) => HTMLElement) | null;
  /**
   * Whether the controller is still alive (I-36).
   *
   * **The fourth additive widening of a consumer-declared view** — 8a `item`,
   * 17 `pointerX`, D2 `getVisual`, now this — and the per-operation view is the
   * designated channel for exactly this kind of per-operation behavior
   * guarantee. An axis rule that calls `getVisual` per candidate is calling
   * consumer code in a loop, and a resolver may destroy the controller; the
   * loop is feature-private, so the reading has to arrive as data.
   *
   * Read only between resolver calls, never on a warm cache.
   */
  live(): boolean;
}>;

export type DisplacementView = Readonly<{
  realm: DOMRealm;
  snapshot: CollectionSnapshot;
  placeholder: HTMLElement;
  /**
   * The dragged item, so a displacement feature can exclude it.
   *
   * Membership in `snapshot` cannot do it — the dragged item *is* a member —
   * and nothing else identifies it: the element the lift owns is not reachable
   * from here. It matters because the placeholder is inserted immediately after
   * the item, so **the dragged item is the first sibling of every backward
   * span**; a displacement that animates it fights the lift for the element the
   * kernel owns. Same widening, same reason, as `InsertionFrameView.item`.
   */
  item: HTMLElement;
  /**
   * The gap the placeholder is moving **to**. Meaningful only inside the
   * bracket — the hooks are the only readers, and they run nowhere else.
   *
   * This is M-4's answer made expressible (`.plan/measurements/
   * q7.md`). Without it a displacement feature cannot know which elements the
   * move affects until after the write, so it has to measure the whole
   * destination view twice: 2.3ms per committed move at 800 rows, against
   * 0.16ms for the span the move actually touches. The endpoints are what turn
   * an O(list) bracket into an O(distance) one.
   */
  insertion: Insertion;
}>;

export type DisplacementHook = (view: DisplacementView) => void;

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
   * "Re-read your geometry **now**", or `null` when the axis feature offers no
   * eager path.
   *
   * The counterpart to the lazy invalidation above, and it exists for exactly
   * one instant: inside the committed-move bracket, after the placeholder has
   * been written and after every displacement feature has released its visual
   * offsets. That is the only window in an active drag in which a read yields
   * **settled presentation geometry**, and the axis rule is defined against
   * that (contract 03). Reading lazily on the next frame instead lands in the
   * middle of a displacement animation and measures items where they no longer
   * are.
   */
  measureInsertion:
    | ((frame: InsertionFrameView, runtime: InsertionRuntimeView) => void)
    | null;

  /* required, filled by callbacks() */
  onReorder: OnReorder;
  /**
   * Normalized to a shared no-op, so the call site needs no null check. It takes
   * an argument the behavior already has.
   */
  onStart(item: HTMLElement): void;

  /* optional; `null` when no feature filled them */
  createPlaceholder: PlaceholderFactory | null;
  getHandle: ((item: HTMLElement) => HTMLElement | null) | null;
  getVisual: ((item: HTMLElement) => HTMLElement) | null;
  startLanding: LandingStart | null;
  /**
   * These stay nullable rather than normalized: their arguments are result
   * objects that would otherwise be constructed only to be discarded.
   */
  onFinish: ((result: SortableFinishResult) => void) | null;
  onCancel: ((result: SortableCancelResult) => void) | null;
  onError: ((error: unknown, context: DragErrorContext) => void) | null;

  /**
   * Prebuilt and fixed-length after assembly, empty in the minimal composition,
   * and touched only around a committed placeholder move — never per pointer
   * move.
   */
  beforeMove: readonly DisplacementHook[];
  afterMove: readonly DisplacementHook[];
  /** Already reversed by the assembler: released in reverse install order. */
  retireHooks: readonly Disposer[];

  threshold: number;
  readinessTimeout: number;
}>;

/** The shared normalization target for an uninstalled `onStart`. */
export const NOOP_START = (): void => {};

export const DEFAULT_THRESHOLD = 8;
export const DEFAULT_READINESS_TIMEOUT = 500;
