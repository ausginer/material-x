/**
 * What a feature *is*: a function factory run once at construction, and the
 * flat contribution object it hands back (contract 03 §A feature is a function
 * factory, §The contribution).
 *
 * This is **construction-time composition of a closed set of seams**, not an
 * open plugin architecture. Every new semantic seam is a coordinated edit to
 * `SortableContribution`, `SortableSlots`, `assemble`, the behavior's call
 * sites and the exports — and that closed world is what buys direct slot calls,
 * prebuilt pipelines, and no runtime descriptor interpretation.
 */
import type { Disposer } from '../kernel/lifetimes.ts';
import type { DOMRealm } from '../kernel/realm.ts';
import type { LandingStart } from '../kernel/spec.ts';
import type {
  DragErrorContext,
  Insertion,
  OnReorder,
  SortableCancelResult,
  SortableFinishResult,
} from './domain.ts';
import type { PlaceholderFactory } from './placement.ts';
import type {
  DisplacementHook,
  InsertionFrameView,
  InsertionRuntimeView,
} from './slots.ts';

export type FeatureContext = Readonly<{
  realm: DOMRealm;
  root: HTMLElement;
  /**
   * Best-effort platform report. Deliberately **not** `fail(stage, error)`: a
   * feature closure created at construction cannot know which operation is
   * live, so letting it classify a failure would let a late continuation from
   * one operation settle another. A synchronous throw inside a seam is caught
   * and classified by the kernel's driver at that seam's stage; a landing
   * runner that must fail an operation gets an attempt-scoped `fail` argument.
   */
  report(error: unknown): void;
}>;

/**
 * Geometry is a **paired capability, not a lone read**. The behavior owns the
 * events that make geometry stale — activation, scroll, resize, a committed
 * placeholder move, collection publication, release — and the feature owns the
 * cache. Neither can do the other's half, so installing a resolver without its
 * invalidator has to be impossible rather than merely discouraged.
 *
 * The assembler flattens the pair into two direct slot fields, so the call
 * sites stay one property read and one call.
 */
export type InsertionGeometry = Readonly<{
  resolve(
    frame: InsertionFrameView,
    runtime: InsertionRuntimeView,
  ): Insertion | null;
  /** The behavior's only way to say "the geometry you cached is stale". */
  invalidate(): void;
  retire(): void;
}>;

/**
 * The one consumer-facing surface for callbacks, and the **sole owner of the
 * `threshold` default**. Carrying `threshold` as contribution metadata as well
 * would immediately raise the question of which one wins.
 */
export type SortableCallbacks = Readonly<{
  onReorder: OnReorder;
  onStart?(item: HTMLElement): void;
  onFinish?(result: SortableFinishResult): void;
  onCancel?(result: SortableCancelResult): void;
  onError?(error: unknown, context: DragErrorContext): void;
  threshold?: number;
}>;

/**
 * One flat type, fixed key names, **no discriminator**. There is deliberately
 * no `type`, `kind` or `phase` field: a discriminator invites a runtime
 * `switch`, which is exactly what the composition model exists to avoid.
 *
 * There is no member for transactional frame state (D-10). A frame field is
 * committed state, so only a `prepare` may write it — and both pipelines here
 * run post-commit, in `action.effect`. Admitting feature frame state would mean
 * designing a prepare-phase pipeline as well, and no feature needs either.
 */
export type SortableContribution = Readonly<{
  /* single-writer slots */
  insertion?: InsertionGeometry;
  createPlaceholder?: PlaceholderFactory;
  getHandle?(item: HTMLElement): HTMLElement | null;
  getVisual?(item: HTMLElement): HTMLElement;
  startLanding?: LandingStart;
  callbacks?: SortableCallbacks;

  /* multi-writer pipelines */
  beforeInsertionMove?: DisplacementHook;
  afterInsertionMove?: DisplacementHook;
  /** Run in **reverse** installation order — see `assemble`. */
  retire?: Disposer;
}>;

/**
 * The authoring shape — internal and unstable, and unexported from the package
 * for that reason. A factory is **externally inert**: it may allocate and
 * capture, but it may not attach a listener, write the DOM, or acquire anything
 * needing release. Every acquisition happens inside a kernel-owned operation
 * lifetime.
 */
export type FeatureFactory = (context: FeatureContext) => SortableContribution;

declare const FEATURE_BRAND: unique symbol;

/**
 * What a consumer holds: **opaque** (D-30). A feature can be named and passed
 * to `sortable()`, and cannot be constructed outside this package, because the
 * brand is declaration-only and unexported.
 *
 * The two earlier attempts at this boundary were both incoherent. Naming the
 * authoring types "internal and unstable" while exporting `SortableFeature` as
 * "public and stable" is not a third state: the public type was *defined* as a
 * function between the two unstable ones, so any change to either changed its
 * assignability. Branding closes the world for real, at zero runtime cost.
 */
export type SortableFeature = Readonly<{ [FEATURE_BRAND]: true }>;

/** Declaration-only cast. Every first-party feature module ends in this call. */
export function brandFeature(factory: FeatureFactory): SortableFeature {
  return factory as unknown as SortableFeature;
}

export function unbrandFeature(feature: SortableFeature): FeatureFactory {
  return feature as unknown as FeatureFactory;
}
