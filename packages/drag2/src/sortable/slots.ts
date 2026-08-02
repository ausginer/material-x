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
 * The two fields the axis rule reads off the frame. **The behavior passes
 * whichever frame its seam was handed** — `Draft<Part>` inside a `prepare`,
 * `Readonly<Frame<Part>>` inside an `effect` — and structural typing does the
 * rest, so no view is ever materialized and `vertical.ts` imports neither the
 * kernel slice nor the behavior's part to say what it needs.
 */
export type InsertionFrameView = Readonly<{
  insertion: Insertion | null;
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
}>;

export type DisplacementView = Readonly<{
  realm: DOMRealm;
  snapshot: CollectionSnapshot;
  placeholder: HTMLElement;
  /**
   * The gap the placeholder is moving **to**. Meaningful only inside the
   * bracket — the hooks are the only readers, and they run nowhere else.
   *
   * This is M-4's answer made expressible (`.agents/docs/drag/measurements/
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
  /** The behavior's only way to say "the geometry you cached is stale". */
  invalidateInsertion(): void;

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
}>;

/** The shared normalization target for an uninstalled `onStart`. */
export const NOOP_START = (): void => {};

export const DEFAULT_THRESHOLD = 8;
