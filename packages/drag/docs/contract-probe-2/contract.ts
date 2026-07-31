/**
 * Typechecked **contract fixture** for `.agents/docs/drag/contract-probe-2`.
 *
 * ## What this is, and what it is not
 *
 * This is a *type* fixture with a compiled reference behavior. It is **not** an
 * executable lifecycle reference and must not be read as one (review 5, §15).
 *
 * It proves, by compiling:
 *
 * - every seam signature the documents state;
 * - that the reference sortable behavior can implement all of them together;
 * - that each seam's continuation rules are expressible over `SeamOutcome`;
 * - the tier-A negative assertions in section 9 — `tsc` errors on an unused
 *   `@ts-expect-error`, so a green build means each still fails to compile.
 *
 * It deliberately does **not** contain: the queue and drain, the cancellation
 * state machine, the failure checkpoint, operation identity minting, the
 * readiness watch and timeout, or landing completion dispatch. Where a driver
 * needs one of those it has an inert stub (`openResolution`, the landing `done`
 * callback). **Typecheck cannot catch a lifecycle error here** — the executable
 * cases live in the test matrix in `05-lifecycle-invariants.md` and belong to
 * the implementation.
 *
 * This file is not shipped and is not imported by `@ydinjs/drag`. It is included
 * in this package's `tsconfig.json` through `./docs/**\/*`, so `npx just
 * typecheck` covers it. Everything a real implementation would import from the
 * kernel is stubbed under "ambient stand-ins", so it cannot drift into being a
 * second implementation.
 *
 * **The documents are the source of truth.** Where this file and the prose
 * disagree, the prose is authoritative and this file is a bug.
 *
 * Sections map onto the documents:
 *   1  ambient stand-ins
 *   2  the frame              → 04-frame-slicing.md
 *   3  transitions            → 02-kernel-behavior-contract.md §Tri-phase
 *   4  capabilities           → 02 §Capabilities
 *   5  BehaviorSpec + host    → 02 §BehaviorSpec, 01 §KernelHost
 *   6  features               → 03-feature-composition.md
 *   7  the reference behavior → 06-vertical-sortable-trace.md
 *   8  the kernel drivers     → 02 §Tri-phase, §Settlement, §Landing
 *   9  negative assertions    — the claims that must NOT compile
 */

/* ------------------------------------------------------ 1. ambient stand-ins */

/** Build-time constant; `false` in production bundles. */
declare const __DEV__: boolean;

export type Disposer = () => void;

export type DOMRealm = Readonly<{ document: Document; window: Window }>;

export type OperationIdentity = Readonly<{ id: number }>;

export type Point = Readonly<{ x: number; y: number }>;

export type Lifetime = Readonly<{
  signal: AbortSignal;
  use(disposer: Disposer): void;
  useWhile(guard: () => boolean, disposer: Disposer): void;
  dispose(): void;
}>;

/**
 * What a seam receives (review 4, §15). Same physical `Lifetime`; `dispose` is
 * projected away, so the behavior cannot desynchronize the kernel's release
 * ordering. A `Pick` costs nothing at runtime.
 */
export type LifetimeScope = Readonly<
  Pick<Lifetime, 'signal' | 'use' | 'useWhile'>
>;

export type VisualLiftSession = Readonly<{
  visual: HTMLElement;
  composeXY(x: number, y: number): string;
  /** The kernel's authoritative pin. Not reachable from a landing runner. */
  write(dx: number, dy: number): void;
  dispose: Disposer;
}>;

export type FrameTask<T> = Readonly<{
  schedule(value: T): void;
  cancel(): void;
}>;

export type CollectionSnapshot = Readonly<{
  items: readonly HTMLElement[];
  version: number;
}>;

export type Insertion = Readonly<{
  version: number;
  index: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;

/**
 * Public, and restored to probe 1's shape (review 6, §9). An earlier fixture
 * reduced this to `{ from, to }`, which drops the identity neighbours the
 * consumer needs to apply a reorder against its own list and the version that
 * makes a stale proposal detectable.
 */
export type ReorderProposal = Readonly<{
  version: number;
  from: number;
  to: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;

export type ReorderRequest = ReorderProposal;

/** Where a cancellation happened. Part of the public cancel result. */
export const CANCEL_AT_PROPOSAL = 0;
export const CANCEL_AT_CONSUMER = 1;
export type CancelStage = typeof CANCEL_AT_PROPOSAL | typeof CANCEL_AT_CONSUMER;

/**
 * Public results are **narrowed unions**, not one numeric record (review 6, §9).
 * A consumer must be able to discriminate accepted from no-op, and rejected
 * from canceled, without importing an internal outcome constant.
 */
export type SortableFinishResult =
  | Readonly<{ type: 'accepted'; proposal: ReorderProposal }>
  | Readonly<{ type: 'noop'; proposal: ReorderProposal | null }>;

export type SortableCancelResult =
  | Readonly<{ type: 'rejected'; reason: unknown; proposal: ReorderProposal }>
  | Readonly<{
      type: 'canceled';
      reason: unknown;
      stage: CancelStage;
      proposal: ReorderProposal | null;
    }>;

export type ReorderTransactionResult =
  | SortableFinishResult
  | SortableCancelResult;

export type AcceptedReorderResolution = Readonly<{
  accepted: true;
  presentationReady: PromiseLike<void> | undefined;
}>;

export type RejectedReorderResolution = Readonly<{
  accepted: false;
  reason: unknown;
  presentationReady: PromiseLike<void> | undefined;
}>;

export type ReorderResolution =
  | AcceptedReorderResolution
  | RejectedReorderResolution;

/**
 * **A runtime export, not only a type** (review 6, §10). The documented consumer
 * calls `ReorderResolution.accept(...)`, so shipping only the union would make
 * every example in these documents fail to run.
 */
export const ReorderResolution = {
  accept: (
    presentationReady?: PromiseLike<void>,
  ): AcceptedReorderResolution => ({
    accepted: true,
    presentationReady,
  }),
  reject: (
    reason?: unknown,
    presentationReady?: PromiseLike<void>,
  ): RejectedReorderResolution => ({
    accepted: false,
    reason,
    presentationReady,
  }),
} as const;

/* --- failure stages: a closed union, so a feature cannot forge one (§14) --- */

export const FAILURE_ADMISSION = 0;
export const FAILURE_ACTIVATION = 1;
export const FAILURE_RENDERER_WRITE = 2;
export const FAILURE_INSERTION = 3;
export const FAILURE_PLACEHOLDER_MOVE = 4;
export const FAILURE_INVALIDATION = 5;
export const FAILURE_SCHEDULED_FRAME = 6;
export const FAILURE_REORDER_RESOLUTION = 7;
export const FAILURE_RELEASE = 8;
export const FAILURE_LANDING_CREATE = 9;
export const FAILURE_LANDING_INTERRUPTED = 10;
export const FAILURE_LANDING_TARGET = 11;
export const FAILURE_PRESENTATION_READY = 12;
export const FAILURE_TERMINAL_CALLBACK = 13;

export type FailureStage =
  | typeof FAILURE_ADMISSION
  | typeof FAILURE_ACTIVATION
  | typeof FAILURE_RENDERER_WRITE
  | typeof FAILURE_INSERTION
  | typeof FAILURE_PLACEHOLDER_MOVE
  | typeof FAILURE_INVALIDATION
  | typeof FAILURE_SCHEDULED_FRAME
  | typeof FAILURE_REORDER_RESOLUTION
  | typeof FAILURE_RELEASE
  | typeof FAILURE_LANDING_CREATE
  | typeof FAILURE_LANDING_INTERRUPTED
  | typeof FAILURE_LANDING_TARGET
  | typeof FAILURE_PRESENTATION_READY
  | typeof FAILURE_TERMINAL_CALLBACK;

export const OUTCOME_ACCEPTED = 0;
export const OUTCOME_REJECTED = 1;
/** A release with nothing to propose. Never a rejection (review 5, §4). */
export const OUTCOME_NOOP = 2;
export const OUTCOME_CANCELED = 3;
export const OUTCOME_FAILED = 4;

export type Outcome =
  | typeof OUTCOME_ACCEPTED
  | typeof OUTCOME_REJECTED
  | typeof OUTCOME_NOOP
  | typeof OUTCOME_CANCELED
  | typeof OUTCOME_FAILED;
export const RECOVERY_IMMEDIATE = 0;
export const RECOVERY_DESTINATION = 1;
export const RECOVERY_HOME = 2;

/**
 * All five reach `settlement.prepare`.
 *
 * An earlier revision removed `canceled` and `failed` on the grounds that they
 * are kernel-*triggered*. That created an ownership hole (review 6, §1):
 * `outcome`, `recovery` and `domain` live in the behavior's frame part, which
 * the kernel cannot name or write, and `BehaviorSpec` has no other terminal
 * classification hook — so a kernel `CANCEL` could commit `SETTLING` and then
 * had no way to produce a canceled result for `onCancel`.
 *
 * **Ownership of the trigger and ownership of the resulting domain state are
 * different things.** The original defect was the open numeric status and the
 * missing mapping, not that the behavior classified behavior-owned state.
 */
export const SETTLED_FULFILLED = 0;
export const SETTLED_REJECTED = 1;
export const SETTLED_SKIPPED = 2;
export const SETTLED_CANCELED = 3;
export const SETTLED_FAILED = 4;

export const CANCEL_ITEM_REMOVED = 'item-removed';
export const CANCEL_COLLECTION_INVALIDATED = 'collection-invalidated';

export const IDLE = 0;
export const PENDING = 1;
export const ACTIVATING = 2;
export const ACTIVE = 3;
export const RELEASING = 4;
export const SETTLING = 5;
export const REPORTING = 6;
export const FINALIZING = 7;

/**
 * Identity-based, pure, ported unchanged. `null` means the exact gap did not
 * survive — intent is never recomputed from a later pointer position.
 */
export function reconcileInsertion(
  insertion: Insertion,
  next: CollectionSnapshot,
): Insertion | null {
  const { before, after } = insertion;
  const bi = before === null ? -1 : next.items.indexOf(before);
  const ai = after === null ? next.items.length : next.items.indexOf(after);
  if ((before !== null && bi < 0) || (after !== null && ai < 0)) {
    return null;
  }
  if (ai !== bi + 1) {
    return null;
  }
  return { version: next.version, index: ai, before, after };
}

/* ------------------------------------------------------------- 2. the frame */

export type KernelFrame = {
  phase: number;
  operation: OperationIdentity | null;
  pointerId: number;
  originX: number;
  originY: number;
  pointerX: number;
  pointerY: number;
};

export const KERNEL_FRAME_KEYS: readonly string[] = [
  'phase',
  'operation',
  'pointerId',
  'originX',
  'originY',
  'pointerX',
  'pointerY',
];

export type Frame<Part extends object> = KernelFrame & Part;

/**
 * What a `prepare` may write. `Omit` is defence in depth (review 4, §7): a part
 * that declares `phase` cannot make it writable by intersecting a mutable
 * property into the readonly kernel slice.
 */
export type Draft<Part extends object> = Omit<Part, keyof KernelFrame> &
  Readonly<KernelFrame>;

/** Carried only to make the collision unrepresentable; never constructed. */
export type FrameKeyCollision<K> = Readonly<{
  __kernelFrameKeyCollision: K;
}>;

/**
 * The authoring boundary for a frame part. A part with no kernel key is itself;
 * one with a collision gains an uninhabitable member, so `createFramePart`
 * cannot return a literal for it.
 *
 * **It rejects explicitly declared literal collisions only** (review 6, §19).
 * `FramePartOf<Record<string, unknown>>` is `Record<string, unknown>`, because
 * `Extract<string, keyof KernelFrame>` is `never` — a broad index signature
 * declares no colliding key even though a runtime `phase` property is entirely
 * possible. Production `validateFramePart` remains the authoritative check.
 */
export type FramePartOf<Part> = [
  Extract<keyof Part, keyof KernelFrame>,
] extends [never]
  ? Part
  : Part & FrameKeyCollision<Extract<keyof Part, keyof KernelFrame>>;

export function createKernelFrame(): KernelFrame {
  return {
    phase: 0,
    operation: null,
    pointerId: -1,
    originX: 0,
    originY: 0,
    pointerX: 0,
    pointerY: 0,
  };
}

export function resetKernelFields(frame: KernelFrame): void {
  frame.phase = 0;
  frame.operation = null;
  frame.pointerId = -1;
  frame.originX = 0;
  frame.originY = 0;
  frame.pointerX = 0;
  frame.pointerY = 0;
}

/* ------------------------------------------------------- 3. the transitions */

/**
 * `Prepared extends {}` excludes `null`/`undefined` while admitting the `true`
 * sentinel, so `Prepared | null` stays an unambiguous discard signal.
 */
export type Transition<
  Part extends object,
  Prepared extends {} = true,
  Capability = void,
> = Readonly<{
  prepare(draft: Draft<Part>, capability: Capability): Prepared | null;
  effect(
    current: Readonly<Frame<Part>>,
    prepared: Prepared,
    capability: Capability,
  ): void;
  rollback?(prepared: Prepared): void;
}>;

/* --- the seam outcome algebra (review 5, §1) --------------------------------
 *
 * A `boolean` conflated five outcomes, and every caller needed a different
 * continuation for each. Worse, it conflated "discarded" with "failed", so a
 * classified failure was followed by success work: activation retired the
 * operation out from under its own queued failure, release invoked `onReorder`
 * after its effect threw, settlement armed a half-requested gate plan, and the
 * join emitted `onFinish` for a failed drop.
 *
 * Classification is not enough on its own. **A classified failure must also
 * stop incompatible continuation.**
 */

export const SEAM_DISCARDED = 0; // `prepare` returned null — nothing happened
export const SEAM_INVALIDATED = 1; // reentrant cancel/destroy after prepare
export const SEAM_PREPARE_FAILED = 2; // classified; nothing committed
export const SEAM_COMMITTED = 3; // committed, effect returned normally
export const SEAM_EFFECT_FAILED = 4; // classified, from the committed state

export type SeamOutcome =
  | typeof SEAM_DISCARDED
  | typeof SEAM_INVALIDATED
  | typeof SEAM_PREPARE_FAILED
  | typeof SEAM_COMMITTED
  | typeof SEAM_EFFECT_FAILED;

/** True when a failure checkpoint is queued and owns the operation's fate. */
export const seamFailed = (o: SeamOutcome): boolean =>
  o === SEAM_PREPARE_FAILED || o === SEAM_EFFECT_FAILED;

/**
 * Arming the settlement gate plan has three outcomes, and the caller must
 * distinguish them (review 6, §3). `ARM_FAILED` is consequential: a
 * landing-create failure replaces the settlement with `OUTCOME_FAILED`, so
 * `advanceSettlement` must **not** run and the original accepted/rejected
 * settlement must never reach `finalized`. Simply returning from the arm
 * helper let a zero-hold settlement finalize before the queued checkpoint.
 */
export const ARM_ARMED = 0;
export const ARM_STALE = 1;
export const ARM_FAILED = 2;

export type ArmOutcome =
  | typeof ARM_ARMED
  | typeof ARM_STALE
  | typeof ARM_FAILED;

/**
 * Release cannot discard (review 4, §8): motion is already closed, so there is
 * no legal "changed my mind". The resolution choice is the staged value, which
 * makes it exactly-once by construction rather than by gate discipline (§9).
 *
 * `invoke: null` asserts a **proven semantic no-op**. A broken invariant is not
 * a no-op and must be returned as a `SeamRejection` instead (review 5, §4).
 */
export type ResolutionCommand = Readonly<{
  type: 'resolution-command';
  /** `null` settles immediately with no consumer round-trip (the old `skip()`). */
  invoke: ((signal: AbortSignal) => unknown) | null;
}>;

export type ReleaseTransition<Part extends object> = Readonly<{
  prepare(draft: Draft<Part>): ResolutionCommand | SeamRejection;
  effect(current: Readonly<Frame<Part>>, prepared: ResolutionCommand): void;
}>;

/**
 * A typed rejection, so the kernel never depends on a preceding side call.
 * Shared by release and settlement — both are non-discardable seams that still
 * need a way to say "this is a failure, at this stage".
 */
export type SeamRejection = Readonly<{
  /**
   * An explicit discriminant, not a structural `'stage' in v` probe
   * (review 6, §15). A staged success value can legitimately carry an unrelated
   * `stage` property, and a proxy can make an `in` test throw.
   */
  type: 'seam-rejection';
  stage: FailureStage;
  error: unknown;
}>;

export const isSeamRejection = (v: { type?: unknown }): v is SeamRejection =>
  v.type === 'seam-rejection';

/**
 * The readiness promise travels through `Prepared`, not through a private
 * runtime write inside `prepare` (review 4, §4 applied to every seam).
 */
export type PreparedSettlement = Readonly<{
  type: 'prepared-settlement';
  ready: PromiseLike<void> | null;
}>;

/**
 * A discriminated settlement input (review 5, §4). Only these three reach the
 * behavior. `canceled` and `failed` are kernel-owned paths that never call
 * `settlement.prepare` at all, so there is no second behavior interpretation of
 * them — which is what an open `number` status invited.
 */
export type SettlementInput =
  | Readonly<{ type: typeof SETTLED_FULFILLED; value: unknown }>
  | Readonly<{ type: typeof SETTLED_REJECTED; error: unknown }>
  | Readonly<{ type: typeof SETTLED_SKIPPED }>
  | Readonly<{
      type: typeof SETTLED_CANCELED;
      reason: unknown;
      stage: CancelStage;
    }>
  | Readonly<{
      type: typeof SETTLED_FAILED;
      stage: FailureStage;
      error: unknown;
    }>;

export type SettlementTransition<Part extends object> = Readonly<{
  prepare(
    draft: Draft<Part>,
    input: SettlementInput,
  ): PreparedSettlement | SeamRejection;
  effect(
    current: Readonly<Frame<Part>>,
    prepared: PreparedSettlement,
    scope: SettlementScope,
  ): void;
}>;

export type ActionTransition<Part extends object> = Readonly<{
  prepare(tag: number, argument: unknown, draft: Draft<Part>): {} | null;
  effect(
    tag: number,
    argument: unknown,
    current: Readonly<Frame<Part>>,

    prepared: {},
  ): void;

  rollback?(tag: number, prepared: {}): void;
}>;

/* ------------------------------------------------------- 4. the capabilities */

export type ActivationScope = Readonly<{
  visual: HTMLElement;
  originRect: DOMRectReadOnly;
  lift: VisualLiftSession;
  motion: LifetimeScope;
  presentation: LifetimeScope;
}>;

/**
 * Holds are *requested* here and armed after the scope seals (review 4, §6,
 * §10), so the complete gate plan is known before a runner can complete.
 */
export type SettlementScope = Readonly<{
  holdForReadiness(ready: PromiseLike<void>): void;
  holdForLanding(start: LandingStart): void;
}>;

export type LandingContext = Readonly<{
  visual: HTMLElement;
  compose(x: number, y: number): string;
  from: Point;
  /** Provisional. Correctness comes from the kernel's join pin, not from this. */
  target: Point;
  realm: DOMRealm;
}>;

export type LandingHandle = Readonly<{
  destroy(): void;
  retarget?(target: Point): void;
}>;

export type LandingStart = (
  context: LandingContext,
  done: () => void,
  fail: (error: unknown) => void,
) => LandingHandle;

/* -------------------------------------------------- 5. BehaviorSpec and host */

export type KernelHost = Readonly<{
  realm: DOMRealm;
  root: HTMLElement;
  dispatch(tag: number, argument: unknown): void;
  /** Valid only inside a kernel-driven seam of the current operation. */
  fail(stage: FailureStage, error: unknown): void;
  cancel(reason?: unknown): void;
  destroy(): void;
}>;

export type BehaviorSpec<Part extends object> = Readonly<{
  createFramePart(): FramePartOf<Part>;
  resetFramePart(frame: Part): void;

  config: Readonly<{
    threshold: number;
    liftMode: number;
    readinessTimeout: number;
    /**
     * How many behavior action tags this spec uses; valid tags are
     * `0 .. actionTags - 1`. Declared statically because there is otherwise
     * nothing for `arm()` to validate (review 5, §13) — `dispatch` takes an
     * arbitrary number, and the kernel computes `BEHAVIOR_BASE + tag`.
     * `arm()` checks this value once; `dispatch` bounds-checks each tag.
     */
    actionTags: number;
  }>;

  admit(event: PointerEvent, draft: Draft<Part>): HTMLElement | null;

  activation: Transition<Part, HTMLElement, ActivationScope>;
  release: ReleaseTransition<Part>;
  settlement: SettlementTransition<Part>;
  action: ActionTransition<Part>;

  moved(current: Readonly<Frame<Part>>, lift: VisualLiftSession): void;

  /**
   * `authoredReady` says whether the consumer's authored presentation is final
   * *now* — true when no readiness promise was supplied, true after one
   * resolves, false while one is pending and after it rejects or times out. It
   * does not say whether to re-anchor; that follows the recovery (review 4, §6).
   */
  anchorTarget(current: Readonly<Frame<Part>>, authoredReady: boolean): Point;

  finalized(current: Readonly<Frame<Part>>): void;
  retire(): void;
}>;

export type BehaviorInstall<Controller, Part extends object> = Readonly<{
  spec: BehaviorSpec<Part>;
  controller: Controller;
}>;

export type Behavior<Controller, Part extends object> = (
  host: KernelHost,
) => BehaviorInstall<Controller, Part>;

/* --------------------------------------------------------------- 6. features */

export type FeatureContext = Readonly<{
  realm: DOMRealm;
  root: HTMLElement;
  /**
   * Best-effort platform report. Deliberately *not* `fail(stage, error)`: a
   * long-lived feature callback cannot know which operation is current, so it
   * must not be able to classify a failure against one (review 4, §14).
   */
  report(error: unknown): void;
}>;

/* Consumer-declared views: each feature names only what it reads (D-13). */

export type InsertionFrameView = Readonly<{
  insertion: Insertion | null;
  pointerY: number;
}>;

export type InsertionRuntimeView = Readonly<{
  snapshot: CollectionSnapshot;
  placeholder: HTMLElement;
}>;

export type DisplacementView = Readonly<{
  realm: DOMRealm;
  snapshot: CollectionSnapshot;
  placeholder: HTMLElement;
}>;

/**
 * Paired because the behavior must be able to invalidate the geometry it reads
 * (review 4, §1) without reaching into the feature's private cache.
 */
export type InsertionGeometry = Readonly<{
  resolve(
    frame: InsertionFrameView,
    runtime: InsertionRuntimeView,
  ): Insertion | null;
  invalidate(): void;
  retire(): void;
}>;

export type PlaceholderFactory = (
  request: Readonly<{
    item: HTMLElement;
    visual: HTMLElement;
    rect: DOMRectReadOnly;
  }>,
) => HTMLElement;

export type DisplacementHook = (view: DisplacementView) => void;

export type OnReorder = (
  request: ReorderRequest,
  context: Readonly<{ signal: AbortSignal }>,
) => ReorderResolution | PromiseLike<ReorderResolution>;

export type DragErrorContext = Readonly<{ stage: FailureStage }>;

export type SortableCallbacks = Readonly<{
  onReorder: OnReorder;
  onStart?(item: HTMLElement): void;
  onFinish?(result: SortableFinishResult): void;
  onCancel?(result: SortableCancelResult): void;
  onError?(error: unknown, context: DragErrorContext): void;
  /** The single consumer-facing home for the activation threshold (§30). */
  threshold?: number;
}>;

export type SortableContribution = Readonly<{
  insertion?: InsertionGeometry;
  createPlaceholder?: PlaceholderFactory;
  getHandle?(item: HTMLElement): HTMLElement | null;
  getVisual?(item: HTMLElement): HTMLElement;
  startLanding?: LandingStart;
  callbacks?: SortableCallbacks;
  beforeInsertionMove?: DisplacementHook;
  afterInsertionMove?: DisplacementHook;
  retire?: Disposer;
}>;

declare const FEATURE_BRAND: unique symbol;

/**
 * **Opaque.** Public and stable as a *value* type; its authoring shape is not
 * part of the contract (review 6, §11).
 *
 * The previous boundary — "`SortableFeature` is public and stable,
 * `FeatureContext` and `SortableContribution` are internal and unstable" — was
 * incoherent, because `SortableFeature` was *defined* as a function between the
 * two unstable types, so any change to either changed the public type's
 * assignability and emitted declaration. Branding closes it for real: a
 * consumer can hold and pass a feature but cannot fabricate one, so the
 * authoring types stay genuinely internal and third-party authoring is
 * prevented rather than merely discouraged.
 *
 * The brand is declaration-only. It costs nothing at runtime.
 */
export type SortableFeature = Readonly<{ [FEATURE_BRAND]: true }>;

/** Internal. What a built-in factory actually returns, before branding. */
export type SortableFeatureImpl = (
  context: FeatureContext,
) => SortableContribution;

/** Internal. The one place the brand is applied. */
export const brandFeature = (impl: SortableFeatureImpl): SortableFeature =>
  impl as unknown as SortableFeature;

/** Internal. The one place it is removed. */
export const unbrandFeature = (f: SortableFeature): SortableFeatureImpl =>
  f as unknown as SortableFeatureImpl;

export type SortableSlots = Readonly<{
  /* required, filled by the axis feature */
  resolveInsertion: InsertionGeometry['resolve'];
  invalidateInsertion: InsertionGeometry['invalidate'];

  /* required, filled by `callbacks()` */
  onReorder: OnReorder;
  /** Normalized to a shared no-op, so the call site needs no null check. */
  onStart(item: HTMLElement): void;

  /* optional: `null` when unfilled, because their arguments cost something */
  createPlaceholder: PlaceholderFactory | null;
  getHandle: ((item: HTMLElement) => HTMLElement | null) | null;
  getVisual: ((item: HTMLElement) => HTMLElement) | null;
  startLanding: LandingStart | null;
  onFinish: ((result: SortableFinishResult) => void) | null;
  onCancel: ((result: SortableCancelResult) => void) | null;
  onError: ((error: unknown, context: DragErrorContext) => void) | null;

  /* prebuilt pipelines; `retireHooks` is reverse installation order */
  beforeMove: readonly DisplacementHook[];
  afterMove: readonly DisplacementHook[];
  retireHooks: readonly Disposer[];

  threshold: number;
}>;

export const DEFAULT_THRESHOLD = 8;

const NOOP_START = (_item: HTMLElement): void => {};

const claim = <T>(
  current: T | null,
  next: T | undefined,
  label: string,
): T | null => {
  if (next === undefined) {
    return current;
  }
  if (current !== null) {
    throw new TypeError(`sortable: ${label} contributed by two features`);
  }
  return next;
};

/**
 * Runs once, in declaration order. Contributions are dropped on return.
 *
 * Feature factories are externally inert (review 4, §13): they may allocate
 * private state but may not attach listeners or touch the DOM. If a later
 * factory or validation throws, the retire hooks collected so far are unwound
 * in reverse before rethrowing.
 */
export function assemble(
  features: readonly SortableFeature[],
  ctx: FeatureContext,
): SortableSlots {
  let insertion: InsertionGeometry | null = null;
  let createPlaceholder: PlaceholderFactory | null = null;
  let getHandle: ((item: HTMLElement) => HTMLElement | null) | null = null;
  let getVisual: ((item: HTMLElement) => HTMLElement) | null = null;
  let startLanding: LandingStart | null = null;
  let callbacks: SortableCallbacks | null = null;
  const beforeMove: DisplacementHook[] = [];
  const afterMove: DisplacementHook[] = [];
  const retireHooks: Disposer[] = [];

  try {
    for (const feature of features) {
      const c = unbrandFeature(feature)(ctx);

      // Recorded HERE, before any claim can throw (review 5, §10 and 6, §16).
      // Appending the axis retire hook after the loop put it FIRST after the
      // reverse — the opposite of the documented order. Recording it after the
      // claim instead leaked the private state of a contribution whose own
      // claim collided, because the unwind only saw earlier contributions.
      if (c.insertion) {
        retireHooks.push(c.insertion.retire);
      }
      if (c.retire) {
        retireHooks.push(c.retire);
      }

      insertion = claim(insertion, c.insertion, 'insertion geometry');
      createPlaceholder = claim(
        createPlaceholder,
        c.createPlaceholder,
        'placeholder factory',
      );
      getHandle = claim(getHandle, c.getHandle, 'handle resolver');
      getVisual = claim(getVisual, c.getVisual, 'visual resolver');
      startLanding = claim(startLanding, c.startLanding, 'landing runner');
      callbacks = claim(callbacks, c.callbacks, 'callbacks');

      if (c.beforeInsertionMove) {
        beforeMove.push(c.beforeInsertionMove);
      }
      if (c.afterInsertionMove) {
        afterMove.push(c.afterInsertionMove);
      }
    }

    if (insertion === null) {
      throw new TypeError('sortable: vertical() is required');
    }
    if (callbacks === null) {
      throw new TypeError('sortable: callbacks({ onReorder }) is required');
    }
    if (typeof callbacks.onReorder !== 'function') {
      throw new TypeError('sortable: onReorder must be a function');
    }
  } catch (error) {
    for (let i = retireHooks.length - 1; i >= 0; i -= 1) {
      try {
        retireHooks[i]!();
      } catch (nested) {
        ctx.report(nested);
      }
    }
    throw error;
  }

  retireHooks.reverse(); // release in reverse acquisition order

  return {
    resolveInsertion: insertion.resolve,
    invalidateInsertion: insertion.invalidate,
    onReorder: callbacks.onReorder,
    onStart: callbacks.onStart ?? NOOP_START,
    createPlaceholder,
    getHandle,
    getVisual,
    startLanding,
    onFinish: callbacks.onFinish ?? null,
    onCancel: callbacks.onCancel ?? null,
    onError: callbacks.onError ?? null,
    beforeMove,
    afterMove,
    retireHooks,
    threshold: callbacks.threshold ?? DEFAULT_THRESHOLD,
  };
}

/** The only module containing vertical axis geometry. */
export function vertical(): SortableFeature {
  return brandFeature((_ctx) => {
    // private runtime: nobody else can name it, reach it, or type it
    let rects = new Float64Array(0);
    let elements: readonly HTMLElement[] = [];
    let dirty = true;
    let seenVersion = -1;

    const refresh = (runtime: InsertionRuntimeView): void => {
      const { items } = runtime.snapshot;
      if (rects.length < items.length * 6) {
        rects = new Float64Array(items.length * 6);
      }
      elements = items.slice();
      seenVersion = runtime.snapshot.version;
      dirty = false;
    };

    return {
      insertion: {
        resolve: (frame, runtime) => {
          if (dirty || seenVersion !== runtime.snapshot.version) {
            refresh(runtime);
          }
          // nearest centre over `elements`/`rects`, with the placeholder as the
          // incumbent candidate — the scan itself is not what this fixture checks
          return elements.length > 0 && frame.pointerY >= 0
            ? frame.insertion
            : null;
        },
        invalidate: () => {
          dirty = true;
        },
        retire: () => {
          elements = [];
          dirty = true;
        },
      },
    };
  });
}

export function callbacks(options: SortableCallbacks): SortableFeature {
  return brandFeature(() => ({ callbacks: options }));
}

/* --------------------------------------------------- 7. the reference behavior */

export type SortableFramePart = {
  item: HTMLElement | null;
  visual: HTMLElement | null;
  snapshot: CollectionSnapshot | null;
  insertion: Insertion | null;
  proposal: ReorderProposal | null;
  outcome: number;
  recovery: number;
  domain: ReorderTransactionResult | null;
};

export function createSortableFramePart(): FramePartOf<SortableFramePart> {
  return {
    item: null,
    visual: null,
    snapshot: null,
    insertion: null,
    proposal: null,
    outcome: OUTCOME_ACCEPTED,
    recovery: RECOVERY_IMMEDIATE,
    domain: null,
  };
}

export function resetSortableFramePart(frame: SortableFramePart): void {
  frame.item = null;
  frame.visual = null;
  frame.snapshot = null;
  frame.insertion = null;
  frame.proposal = null;
  frame.outcome = OUTCOME_ACCEPTED;
  frame.recovery = RECOVERY_IMMEDIATE;
  frame.domain = null;
}

/**
 * One object per *operation*, satisfying `InsertionRuntimeView` and
 * `DisplacementView` structurally. It exists because both views need a non-null
 * `placeholder`, which the controller-lifetime runtime cannot promise before
 * activation (review 4, §2). It is written twice per operation, never per call.
 */
export type PresentationView = {
  readonly realm: DOMRealm;
  readonly placeholder: HTMLElement;
  /** Where the placeholder lives. Needed to express an end gap by appending. */
  readonly container: HTMLElement;
  snapshot: CollectionSnapshot;
};

export type SortableRuntime = {
  readonly host: KernelHost;
  readonly slots: SortableSlots;
  readonly frame: FrameTask<number>;
  snapshot: CollectionSnapshot;
  view: PresentationView | null;
  placeholder: HTMLElement | null;
  lift: VisualLiftSession | null;
  spatialSeq: number;
  pendingSpatial: number;
};

export const TAG_SPATIAL = 0;
export const TAG_COLLECTION = 1;
/** How many behavior tags this spec uses. Bounds-checks every dispatch. */
export const SORTABLE_ACTION_TAGS = 2;

/**
 * Staged by the collection action so a discard touches no private state.
 *
 * `cancelReason` is what makes an *invalidating* replacement safe (review 5,
 * §2): the earlier shape had `prepare` call `host.cancel()` and return `null`,
 * which skipped `effect` and therefore threw away the consumer's collection
 * update. An invalid collection ends the current drag; it must not lose the
 * update that ended it, or the next press starts against stale items.
 */
export type PreparedCollection = Readonly<{
  snapshot: CollectionSnapshot;
  rebased: Insertion | null;
  /** Non-null ends the operation — dispatched by `effect`, after publication. */
  cancelReason: unknown;
  /** False at IDLE and from RELEASING on: the frame snapshot is not rebound. */
  bindsFrame: boolean;
}>;

export type SortableController = Readonly<{
  updateItems(items: readonly HTMLElement[]): void;
  cancel(reason?: unknown): void;
  destroy(): void;
}>;

/**
 * The **single** placeholder writer. Both the action effect and the release
 * effect route through it (review 5, §6).
 *
 * An earlier reference wrote `insertion.before?.after(placeholder)`, which is a
 * silent no-op for a start gap — where `before` is `null` — so the placeholder
 * could never reach the head of the list. Anchoring on `after` instead makes
 * the start gap the ordinary case and the end gap the single fallback.
 */
export function movePlaceholder(
  view: PresentationView,
  insertion: Insertion,
): boolean {
  const { placeholder, container } = view;

  // The unchanged guard (review 6, §13). `Node.before()` and `append()` on an
  // already-correct position are a remove-and-reinsert: they reset CSS
  // transitions on the placeholder, force layout, and disturb an in-flight
  // displacement animation. Release invokes this helper unconditionally,
  // including for an incumbent/no-op release, so the guard is not optional.
  if (insertion.after !== null) {
    if (placeholder.nextSibling === insertion.after) {
      return false;
    }
    insertion.after.before(placeholder);
    return true;
  }
  if (
    placeholder.parentNode === container &&
    container.lastChild === placeholder
  ) {
    return false;
  }
  container.append(placeholder);
  return true;
}

/** Real identity neighbours — an all-`null` home insertion is not a home. */
export function homeInsertion(
  snapshot: CollectionSnapshot,
  item: HTMLElement,
): Insertion {
  const index = snapshot.items.indexOf(item);
  return {
    version: snapshot.version,
    index,
    before: index > 0 ? (snapshot.items[index - 1] ?? null) : null,
    after: snapshot.items[index + 1] ?? null,
  };
}

export function createSortableSpec(
  rt: SortableRuntime,
): BehaviorSpec<SortableFramePart> {
  const { slots } = rt;

  return {
    createFramePart: createSortableFramePart,
    resetFramePart: resetSortableFramePart,

    config: {
      threshold: slots.threshold,
      liftMode: 0,
      readinessTimeout: 500,
      actionTags: SORTABLE_ACTION_TAGS,
    },

    /**
     * Resolves the **semantic item** from the published snapshot along the
     * composed path, then applies the handle slot as a *predicate* on that item
     * (review 6, §12).
     *
     * An earlier reference took `event.target` as the item and, when a handle
     * resolver existed, replaced the item with the returned **handle element**.
     * That broke semantic identity everywhere downstream: snapshot membership,
     * home insertion, `onStart(item)`, and the D-16 re-anchor all name the
     * item. It also used a global-realm `instanceof`, which fails across a
     * shadow boundary or an iframe.
     */
    admit: (event, draft) => {
      const { items } = rt.snapshot;
      const path = event.composedPath();
      let item: HTMLElement | null = null;
      for (const node of path) {
        if (items.includes(node as HTMLElement)) {
          item = node as HTMLElement;
          break;
        }
        if (node === rt.host.root) {
          break; // left the collection without matching
        }
      }
      if (item === null) {
        return null;
      }

      // The handle slot narrows *where* the press is admissible. It never
      // replaces the item.
      if (slots.getHandle !== null) {
        const handle = slots.getHandle(item);
        if (handle === null || !path.includes(handle)) {
          return null;
        }
      }

      draft.item = item;
      draft.snapshot = rt.snapshot;
      const visual = slots.getVisual ? slots.getVisual(item) : item;
      draft.visual = visual;
      event.preventDefault();
      return visual;
    },

    activation: {
      // Externally inert: creates a detached element and measures it.
      prepare: (draft, scope) => {
        const { item } = draft;
        const { snapshot } = draft;
        if (item === null || snapshot === null) {
          return null;
        }
        const placeholder = slots.createPlaceholder
          ? slots.createPlaceholder({
              item,
              visual: scope.visual,
              rect: scope.originRect,
            })
          : rt.host.realm.document.createElement('div');
        placeholder.style.width = `${scope.visual.offsetWidth}px`;
        placeholder.style.height = `${scope.visual.offsetHeight}px`;
        draft.insertion = homeInsertion(snapshot, item);
        return placeholder;
      },

      // I-30 ordering: register, make visible, publish, then call the consumer.
      effect: (current, placeholder, scope) => {
        scope.presentation.use(() => {
          placeholder.remove();
        });
        current.item?.after(placeholder);

        scope.motion.use(() => {
          rt.frame.cancel();
        });

        rt.placeholder = placeholder;
        rt.lift = scope.lift;
        rt.view = {
          realm: rt.host.realm,
          placeholder,
          container: placeholder.parentElement ?? rt.host.root,
          snapshot: current.snapshot ?? rt.snapshot,
        };
        slots.invalidateInsertion();

        if (current.item !== null) {
          slots.onStart(current.item);
        }
      },
    },

    release: {
      prepare: (draft) => {
        slots.invalidateInsertion();
        const { view } = rt;
        // Missing state is a broken invariant, NOT a semantic no-op: skipping
        // here would report a successful no-op drop for a corrupt operation
        // (review 5, §4).
        if (view === null || draft.item === null || draft.snapshot === null) {
          return {
            type: 'seam-rejection',
            stage: FAILURE_RELEASE,
            error: new Error('drag: release with no published presentation'),
          };
        }
        const resolved = slots.resolveInsertion(
          { insertion: draft.insertion, pointerY: draft.pointerY },
          view,
        );
        const insertion = resolved ?? draft.insertion;
        if (insertion === null) {
          return {
            type: 'seam-rejection',
            stage: FAILURE_RELEASE,
            error: new Error('drag: release with no insertion'),
          };
        }
        draft.insertion = insertion;
        const proposal: ReorderProposal = {
          version: draft.snapshot.version,
          from: draft.snapshot.items.indexOf(draft.item),
          to: insertion.index,
          before: insertion.before,
          after: insertion.after,
        };
        draft.proposal = proposal;
        // The one legitimate skip: a proven no-op proposal.
        if (proposal.from === proposal.to) {
          return { type: 'resolution-command', invoke: null };
        }
        return {
          type: 'resolution-command',
          invoke: (signal) => slots.onReorder(proposal, { signal }),
        };
      },

      /**
       * Moves the placeholder to the final gap **and renders the lift at the
       * committed pointerup sample** (review 6, §7).
       *
       * The final render is normative, not a trace embellishment. `pointerup`
       * need not carry the same coordinates as the last processed
       * `pointermove`, and the proposal is computed from the committed release
       * point — so omitting this leaves the visual and the whole landing
       * trajectory starting from a stale position while the transaction
       * describes a newer one.
       */
      effect: (current, _prepared) => {
        const { view, lift } = rt;
        if (view !== null && current.insertion !== null) {
          movePlaceholder(view, current.insertion);
        }
        if (lift !== null) {
          lift.visual.style.transform = lift.composeXY(
            current.pointerX - current.originX,
            current.pointerY - current.originY,
          );
        }
      },
    },

    settlement: {
      /**
       * Exhaustive over all five `SettlementInput` cases. Cancellation and
       * kernel failure are kernel-*triggered* but produce behavior-*owned*
       * state, so they must land here — there is nowhere else that can write
       * `outcome`, `recovery` and `domain` (review 6, §1).
       */
      prepare: (draft, input) => {
        switch (input.type) {
          case SETTLED_SKIPPED: {
            // A proven no-op. NOT a rejection, and NOT a home recovery: the
            // placeholder is already where the item belongs.
            draft.outcome = OUTCOME_NOOP;
            draft.recovery = RECOVERY_IMMEDIATE;
            draft.domain = { type: 'noop', proposal: draft.proposal };
            return { type: 'prepared-settlement', ready: null };
          }

          case SETTLED_CANCELED: {
            draft.outcome = OUTCOME_CANCELED;
            draft.recovery = RECOVERY_HOME;
            draft.domain = {
              type: 'canceled',
              reason: input.reason,
              stage: input.stage,
              proposal: draft.proposal,
            };
            return { type: 'prepared-settlement', ready: null };
          }

          case SETTLED_FAILED: {
            // No domain result: a failed operation reports through `onError`
            // only, and `finalized` is never called for it.
            draft.outcome = OUTCOME_FAILED;
            draft.recovery = RECOVERY_IMMEDIATE;
            draft.domain = null;
            return { type: 'prepared-settlement', ready: null };
          }

          case SETTLED_REJECTED: {
            // A rejected thenable is a resolver malfunction, not a considered
            // consumer verdict. It must not be reported as `onCancel`.
            return {
              type: 'seam-rejection',
              stage: FAILURE_REORDER_RESOLUTION,
              error: input.error,
            };
          }

          case SETTLED_FULFILLED: {
            const { value } = input;
            if (
              typeof value !== 'object' ||
              value === null ||
              !('accepted' in value)
            ) {
              return {
                type: 'seam-rejection',
                stage: FAILURE_REORDER_RESOLUTION,
                error: value,
              };
            }
            const resolution = value as ReorderResolution;
            if (resolution.accepted) {
              draft.outcome = OUTCOME_ACCEPTED;
              draft.recovery = RECOVERY_DESTINATION;
              draft.domain =
                draft.proposal === null
                  ? null
                  : { type: 'accepted', proposal: draft.proposal };
            } else {
              draft.outcome = OUTCOME_REJECTED;
              draft.recovery = RECOVERY_HOME;
              draft.domain =
                draft.proposal === null
                  ? null
                  : {
                      type: 'rejected',
                      reason: resolution.reason,
                      proposal: draft.proposal,
                    };
            }
            return {
              type: 'prepared-settlement',
              ready: resolution.presentationReady ?? null,
            };
          }
          default: {
            // Unreachable: `SettlementInput` is closed and every case returns.
            return {
              type: 'seam-rejection',
              stage: FAILURE_REORDER_RESOLUTION,
              error: new Error('drag: unknown settlement input'),
            };
          }
        }
      },

      // Requests holds only. The kernel arms them after the scope seals.
      effect: (current, prepared, scope) => {
        if (prepared.ready !== null) {
          scope.holdForReadiness(prepared.ready);
        }
        if (
          slots.startLanding !== null &&
          current.recovery !== RECOVERY_IMMEDIATE
        ) {
          scope.holdForLanding(slots.startLanding);
        }
      },
    },

    action: {
      prepare: (tag, argument, draft) => {
        if (tag === TAG_SPATIAL) {
          if (rt.pendingSpatial !== argument || rt.view === null) {
            return null;
          }
          const resolved = slots.resolveInsertion(
            { insertion: draft.insertion, pointerY: draft.pointerY },
            rt.view,
          );
          if (resolved === null) {
            return null;
          }
          draft.insertion = resolved;
          return true;
        }

        // TAG_COLLECTION — everything is staged; nothing private is written,
        // and the action is NEVER discarded, so the consumer's update always
        // reaches `effect` even when it ends the drag (review 5, §2).
        const snapshot = argument as CollectionSnapshot;
        const { phase } = draft;

        // IDLE, and RELEASING onward: publish only. The operation's semantic
        // snapshot is either absent or frozen, so the frame is not rebound —
        // at IDLE that also keeps item elements out of an idle frame (I-20).
        if (phase === IDLE || phase >= RELEASING) {
          return {
            snapshot,
            rebased: null,
            cancelReason: null,
            bindsFrame: false,
          };
        }

        if (draft.item !== null && !snapshot.items.includes(draft.item)) {
          draft.snapshot = snapshot;
          return {
            snapshot,
            rebased: null,
            cancelReason: CANCEL_ITEM_REMOVED,
            bindsFrame: true,
          };
        }

        // PENDING / ACTIVATING / ACTIVE: rebind, and rebase where there is an
        // insertion to rebase. ACTIVATING is handled here rather than deferred
        // — see the note on `onStart` reentrancy (review 5, §5).
        const rebased =
          draft.insertion === null
            ? null
            : reconcileInsertion(draft.insertion, snapshot);
        if (draft.insertion !== null && rebased === null) {
          draft.snapshot = snapshot;
          return {
            snapshot,
            rebased: null,
            cancelReason: CANCEL_COLLECTION_INVALIDATED,
            bindsFrame: true,
          };
        }
        draft.snapshot = snapshot;
        draft.insertion = rebased;
        return { snapshot, rebased, cancelReason: null, bindsFrame: true };
      },

      effect: (tag, _argument, current, prepared) => {
        if (tag === TAG_SPATIAL) {
          const { view } = rt;
          if (view === null) {
            return;
          }
          for (const hook of slots.beforeMove) {
            hook(view);
          }
          // Invalidate geometry only when a move actually occurred.
          if (
            current.insertion !== null &&
            movePlaceholder(view, current.insertion)
          ) {
            slots.invalidateInsertion();
          }
          for (const hook of slots.afterMove) {
            hook(view);
          }
          return;
        }

        const staged = prepared as PreparedCollection;
        rt.snapshot = staged.snapshot;
        if (rt.view !== null) {
          rt.view.snapshot = staged.snapshot;
        }
        slots.invalidateInsertion();
        // Cancellation goes last, after the update is safely published. FIFO
        // then runs the cancel transition next.
        if (staged.cancelReason !== null) {
          rt.host.cancel(staged.cancelReason);
        }
      },
    },

    /**
     * The hot path. The kernel wraps this call and classifies a throw as
     * `FAILURE_RENDERER_WRITE` (review 6, §8) — it is not a transition, so
     * without a wrapper a CSSOM or scheduling throw escaped the handler and
     * became a panic, contradicting the existence of both renderer and
     * scheduled-frame stages.
     *
     * Rendering and scheduling are **one callback with two stages**, narrowed
     * from the inside rather than split into two seams: splitting would add an
     * indirect call to the one path that counts them. The `host.fail` latch
     * makes the narrowing observable to the driver.
     */
    moved: (current, lift) => {
      lift.visual.style.transform = lift.composeXY(
        current.pointerX - current.originX,
        current.pointerY - current.originY,
      );
      rt.spatialSeq += 1;
      rt.pendingSpatial = rt.spatialSeq;
      try {
        rt.frame.schedule(rt.spatialSeq);
      } catch (error) {
        // The committed pointer and the rendered visual are still truthful;
        // only the coalesced follow-up is lost.
        rt.host.fail(FAILURE_SCHEDULED_FRAME, error);
      }
    },

    anchorTarget: (current, authoredReady) => {
      const { placeholder } = rt;
      if (placeholder === null) {
        return { x: 0, y: 0 };
      }
      const { item } = current;
      // Re-anchor only for an accepted destination whose authored DOM is final,
      // and only when the item is still a connected sibling (review 4, §16).
      if (
        authoredReady &&
        current.recovery === RECOVERY_DESTINATION &&
        item !== null &&
        item.isConnected &&
        item.parentElement === placeholder.parentElement &&
        placeholder.nextElementSibling !== item
      ) {
        item.before(placeholder);
      }
      const rect = placeholder.getBoundingClientRect();
      return { x: rect.x, y: rect.y };
    },

    /**
     * An exhaustive switch on the **domain result**, not a binary
     * accepted-versus-everything-else predicate (review 6, §5). There are four
     * non-failure outcomes, and the earlier predicate sent the no-op result
     * that D-24 exists to distinguish straight to `onCancel` — reintroducing
     * the exact semantic error at the terminal callback boundary.
     *
     * `OUTCOME_FAILED` produces no domain result and never reaches here.
     */
    finalized: (current) => {
      const { domain } = current;
      if (domain === null) {
        return;
      }
      switch (domain.type) {
        case 'accepted':
        case 'noop':
          slots.onFinish?.(domain);
          break;
        case 'rejected':
        case 'canceled':
          slots.onCancel?.(domain);
          break;
        default:
          break; // unreachable: the domain union is closed
      }
    },

    retire: () => {
      rt.frame.cancel();
      rt.pendingSpatial = 0;
      rt.placeholder = null;
      rt.lift = null;
      rt.view = null;
      // Reverse installation order, and each hook is wrapped: one throwing
      // hook must not stop the rest from restoring their DOM (review 4, §12).
      for (const hook of slots.retireHooks) {
        try {
          hook();
        } catch (error) {
          rt.host.realm.window.reportError(error);
        }
      }
    },
  };
}

/* --------------------------------------------------------- 8. kernel drivers */

export type SettlementAttempt = {
  holds: number;
  readiness: PromiseLike<void> | null;
  readinessHeld: boolean;
  start: LandingStart | null;
  landing: LandingHandle | null;
  landingHeld: boolean;
  /** True when the authored presentation is final. See `anchorTarget`. */
  authoredReady: boolean;
  /** False once a `destroy()` throw leaves runner control unrelinquished. */
  relinquished: boolean;
  /** Once-only latch: the first `done()`/`fail()` wins. */
  completed: boolean;
  /** Set when landing creation or the runner reported a consequential failure. */
  failed: boolean;
  sealed: boolean;
};

/**
 * The kernel. Only the pieces the documents make claims about; enough for the
 * seam drivers to typecheck against the real signatures.
 */
export function createKernel<Part extends object>(
  root: HTMLElement,
): Readonly<{
  host: KernelHost;
  arm(spec: BehaviorSpec<Part>): void;
  /** Exposed only so the fixture exercises every seam driver. */
  seams: Readonly<{
    admission(event: PointerEvent): HTMLElement | null;
    activation(scope: ActivationScope): void;
    moved(lift: VisualLiftSession): boolean;
    action(tag: number, argument: unknown, stage: FailureStage): SeamOutcome;
    settlement(
      input: SettlementInput,
      attempt: SettlementAttempt,
      scope: SettlementScope,
    ): SeamOutcome;
    release(): void;
    armSettlement(
      attempt: SettlementAttempt,
      spec: BehaviorSpec<Part>,
      effectOk: boolean,
    ): ArmOutcome;
    finalize(
      attempt: SettlementAttempt,
      spec: BehaviorSpec<Part>,
      presentation: Lifetime,
      lift: VisualLiftSession,
      origin: DOMRectReadOnly,
    ): void;
  }>;
}> {
  let current: Frame<Part> | null = null;
  let draft: Frame<Part> | null = null;
  let spec: BehaviorSpec<Part> | null = null;
  let operation: OperationIdentity | null = null;
  let inSeam = false;
  const closed = false;
  let actionTags = 0;
  /**
   * Set by `host.fail` while a seam is open, cleared when the seam opens
   * (review 6, §2). Without it, a behavior that classifies *without throwing* —
   * `host.fail(stage, e); return normally;` — left `runCore` returning
   * `SEAM_COMMITTED`, so every continuation D-23 forbids ran anyway: activation
   * queued `START_COMMITTED`, release invoked `onReorder`, settlement armed its
   * gates. Classification has to be observable to the driver, not only to the
   * queue.
   */
  let seamFailureRequested = false;

  // The realm is derived from the root's OWN document, never mixed with the
  // global `window` — an iframe root paired with the top-level window breaks
  // every realm-sensitive check downstream (review 6, §12).
  const view = root.ownerDocument.defaultView;
  if (view === null) {
    throw new TypeError('drag: root is not in a rendered document');
  }
  const realm: DOMRealm = { document: root.ownerDocument, window: view };

  const report = (error: unknown): void => {
    realm.window.reportError(error);
  };

  const failStage = (stage: FailureStage, error: unknown): void => {
    void stage;
    report(error);
  };

  /** No operation exists yet, so this cannot be a classified failure. */
  const reportAdmission = (error: unknown): void => {
    void FAILURE_ADMISSION;
    report(error);
  };

  const host: KernelHost = {
    realm,
    root,
    dispatch: (tag) => {
      // One comparison. A negative or fractional tag would otherwise alias a
      // kernel action through `BEHAVIOR_BASE + tag`.
      if (!Number.isInteger(tag) || tag < 0 || tag >= actionTags) {
        report(new TypeError(`drag: invalid behavior action tag ${tag}`));
      }
    },
    fail: (stage, error) => {
      // Tier B: a stale async producer cannot classify against a live operation.
      if (!inSeam) {
        report(error);
        return;
      }
      seamFailureRequested = true; // latch, so the driver stops continuing
      failStage(stage, error);
    },
    cancel: () => {},
    destroy: () => {},
  };

  /**
   * The behavior's part must be a plain, own, enumerable, writable,
   * string-keyed data record that does not shadow a kernel field. Validated in
   * production, once per controller, before the first `Object.assign` — the
   * type-level guard is defeatable by `any`, and the runtime consequence is a
   * silently overwritten kernel field (review 4, §7, §28).
   */
  // Runs on EACH factory result, so twice per controller: the factory is not
  // proven deterministic, and validating only the first would let the second
  // introduce a collision.
  const validateFramePart = (part: object): void => {
    if (Object.getPrototypeOf(part) !== Object.prototype) {
      throw new TypeError('drag: a frame part must be a plain object');
    }
    if (Object.getOwnPropertySymbols(part).length > 0) {
      throw new TypeError('drag: a frame part may not carry symbol keys');
    }
    const descriptors = Object.getOwnPropertyDescriptors(part);
    for (const key of Object.keys(descriptors)) {
      const d = descriptors[key]!;
      if (d.get !== undefined || d.set !== undefined) {
        throw new TypeError(`drag: frame part key "${key}" is an accessor`);
      }
      if (!d.enumerable || !d.writable) {
        throw new TypeError(
          `drag: frame part key "${key}" must be enumerable and writable`,
        );
      }
      // An own enumerable writable `__proto__` DATA property (only creatable
      // through defineProperty) passes every check above, and then
      // `Object.assign` invokes the TARGET's inherited `__proto__` setter and
      // mutates the frame's prototype instead of adding a field (review 5,
      // §11). The fixed-record model depends on an ordinary prototype.
      if (key === '__proto__') {
        throw new TypeError('drag: a frame part may not declare "__proto__"');
      }
      if (KERNEL_FRAME_KEYS.includes(key)) {
        throw new TypeError(
          `drag: frame part key "${key}" shadows a kernel frame field`,
        );
      }
    }
  };

  const composeFrame = (s: BehaviorSpec<Part>): Frame<Part> => {
    const part = s.createFramePart();
    validateFramePart(part);
    return Object.assign(createKernelFrame(), part);
  };

  /**
   * Best-effort, per frame (review 6, §4). `resetFramePart` is behavior code the
   * API permits to throw, and an unwrapped throw on the *first* frame could
   * skip the second scrub and the ingress abort — leaving `destroy()`
   * non-terminal, which I-6 forbids. The first reset error is reported, never
   * substituted for the initiating destroy/panic error.
   */
  const scrub = (frame: Frame<Part>, s: BehaviorSpec<Part>): void => {
    resetKernelFields(frame);
    try {
      s.resetFramePart(frame);
    } catch (error) {
      report(error);
    }
  };

  const begin = (): void => {
    Object.assign(draft!, current!);
  };

  const commit = (): void => {
    const t = current;
    current = draft;
    draft = t;
  };

  const preparationValid = (): boolean => operation !== null;

  /**
   * The shared core. Every seam wraps it; none of them *is* it — the discard
   * and failure policies differ per seam (review 4, §8), and each caller needs
   * to distinguish *which* non-success outcome happened (review 5, §1).
   */
  const runCore = <P extends object | true, C>(
    t: Transition<Part, P, C>,
    capability: C,
    stage: FailureStage,
  ): SeamOutcome => {
    begin();
    let prepared: P | null;
    seamFailureRequested = false;
    inSeam = true;
    try {
      prepared = t.prepare(draft as unknown as Draft<Part>, capability);
    } catch (error) {
      failStage(stage, error);
      return SEAM_PREPARE_FAILED;
    } finally {
      inSeam = false;
    }
    // An explicit `host.fail` counts exactly like a throw.
    if (seamFailureRequested) {
      return SEAM_PREPARE_FAILED;
    }
    if (prepared === null) {
      return SEAM_DISCARDED;
    }
    if (!preparationValid()) {
      inSeam = true;
      try {
        t.rollback?.(prepared);
      } catch (error) {
        report(error); // a rollback failure is never classified
      } finally {
        inSeam = false;
      }
      return SEAM_INVALIDATED;
    }
    commit();
    seamFailureRequested = false;
    inSeam = true;
    try {
      t.effect(current!, prepared, capability);
    } catch (error) {
      failStage(stage, error); // classified, from the committed state
      return SEAM_EFFECT_FAILED;
    } finally {
      inSeam = false;
    }
    return seamFailureRequested ? SEAM_EFFECT_FAILED : SEAM_COMMITTED;
  };

  /** Wraps a non-transition seam so `host.fail` and throws behave alike. */
  const runLeaf = (stage: FailureStage, body: () => void): boolean => {
    seamFailureRequested = false;
    inSeam = true;
    try {
      body();
    } catch (error) {
      failStage(stage, error);
      return false;
    } finally {
      inSeam = false;
    }
    return !seamFailureRequested;
  };

  const openResolution = (_command: ResolutionCommand): void => {};

  /**
   * Admission. `admit` runs consumer-supplied handle/visual resolvers during
   * native dispatch, and a resolver can close over the already-returned
   * controller and synchronously `destroy()` it (review 5, §7).
   *
   * So terminal state is rechecked **after** `admit` returns and before any
   * identity is minted or any resource acquired — the same post-callback rule
   * as the landing start, applied at the other end of the lifecycle.
   */
  const runAdmission = (event: PointerEvent): HTMLElement | null => {
    if (closed || operation !== null) {
      return null;
    }
    begin();
    let visual: HTMLElement | null;
    inSeam = true;
    try {
      visual = spec!.admit(event, draft as unknown as Draft<Part>);
    } catch (error) {
      /**
       * A **controller-level** report, not an operation-scoped classified
       * failure (review 6, §17). Admission runs before identity is minted, so
       * there is no operation for a failure checkpoint to settle and no
       * `REPORTING` phase to enter; minting one purely to report would create
       * an operation that never existed. The consumer still gets the
       * diagnostic through `onError` with `FAILURE_ADMISSION`, and the
       * controller stays idle and usable. This closes Q-1.
       */
      reportAdmission(error);
      return null;
    } finally {
      inSeam = false;
    }
    if (visual === null || closed || operation !== null) {
      return null; // draft abandoned; the controller stays idle or terminal
    }
    return visual;
  };

  const retireOperation = (): void => {
    operation = null;
  };

  /**
   * Activation. A discard is not "nothing happened" — there is no committed
   * operation without presentation, so it retires. A *classified failure* must
   * NOT retire: the queued failure checkpoint owns the operation, and retiring
   * here would make that entry stale and swallow the `onError` (review 5, §1).
   */
  const runActivation = (scope: ActivationScope): void => {
    const outcome = runCore(spec!.activation, scope, FAILURE_ACTIVATION);
    if (seamFailed(outcome)) {
      return; // the failure checkpoint decides
    }
    if (outcome !== SEAM_COMMITTED) {
      retireOperation();
      return;
    }
    if (preparationValid()) {
      host.dispatch(-1, operation); // START_COMMITTED
    }
  };

  /**
   * Release cannot discard. The staged command is executed after `effect` —
   * but ONLY when the effect committed cleanly. Invoking `onReorder` for a
   * release whose presentation effect threw would race a classified failure
   * against a consumer resolution through the same queue (review 5, §1).
   */
  const runRelease = (): void => {
    begin();
    let result: ResolutionCommand | SeamRejection;
    inSeam = true;
    try {
      result = spec!.release.prepare(draft as unknown as Draft<Part>);
    } catch (error) {
      failStage(FAILURE_RELEASE, error);
      return;
    } finally {
      inSeam = false;
    }
    if (isSeamRejection(result)) {
      failStage(result.stage, result.error);
      return;
    }
    if (!preparationValid()) {
      return;
    }
    const command = result;
    commit();
    inSeam = true;
    try {
      spec!.release.effect(current!, command);
    } catch (error) {
      failStage(FAILURE_RELEASE, error);
      return; // never invoke the consumer after a failed release effect
    } finally {
      inSeam = false;
    }
    if (preparationValid()) {
      openResolution(command);
    }
  };

  /**
   * Holds are requested during `effect`, then armed once the plan is complete,
   * so a synchronous `done()` from a `duration: 0` runner always finds its hold.
   *
   * `effectOk` is false when `settlement.effect` threw. A partially requested
   * gate plan must never be armed: starting readiness or a runner for an
   * already-failed settlement is exactly the incompatible continuation
   * review 5 §1 is about.
   */
  /**
   * The landing completion latch. **First completion wins**; every later
   * `done()` or `fail()` is inert, including one that arrives during `start`
   * before a handle exists (review 6, §3).
   */
  const completeLanding = (
    attempt: SettlementAttempt,
    error: unknown,
  ): void => {
    if (attempt.completed) {
      return; // duplicate, or done-after-fail
    }
    attempt.completed = true;
    if (error !== null) {
      attempt.failed = true;
      failStage(FAILURE_LANDING_INTERRUPTED, error);
      return;
    }
    // Producer-side validation, then a queued LANDING_SETTLED. The queued
    // action revalidates the attempt again when it is applied (I-4).
    if (preparationValid() && attempt.landingHeld) {
      host.dispatch(-2, attempt); // LANDING_SETTLED
    }
  };

  const armSettlement = (
    attempt: SettlementAttempt,
    s: BehaviorSpec<Part>,
    effectOk: boolean,
  ): ArmOutcome => {
    attempt.sealed = true;

    const dropRequests = (): void => {
      attempt.holds = 0;
      attempt.readiness = null;
      attempt.readinessHeld = false;
      attempt.start = null;
      attempt.landingHeld = false;
    };

    if (!effectOk || !preparationValid()) {
      dropRequests();
      return ARM_STALE;
    }

    attempt.authoredReady = attempt.readiness === null;

    const { start } = attempt;
    if (start === null) {
      return ARM_ARMED;
    }

    let target: Point;
    seamFailureRequested = false;
    inSeam = true;
    try {
      target = s.anchorTarget(current!, attempt.authoredReady);
    } catch (error) {
      failStage(FAILURE_LANDING_CREATE, error);
      attempt.holds -= 1; // roll the reserved hold back deterministically
      attempt.landingHeld = false;
      return ARM_FAILED;
    } finally {
      inSeam = false;
    }
    if (seamFailureRequested) {
      attempt.holds -= 1;
      attempt.landingHeld = false;
      return ARM_FAILED;
    }

    /**
     * Revalidation BEFORE `start`, not only after it (review 6, §6).
     * `anchorTarget` is behavior code and can synchronously
     * `controller.destroy()`. Calling the consumer's runner afterwards would
     * violate I-6's "no callback fires afterwards", and destroying the handle
     * later does not un-call it.
     */
    if (!preparationValid()) {
      attempt.holds -= 1;
      attempt.landingHeld = false;
      return ARM_STALE;
    }

    let handle: LandingHandle;
    try {
      handle = start(
        {
          visual: root,
          compose: (x, y) => `translate(${x}px, ${y}px)`,
          from: target,
          target,
          realm,
        },
        () => {
          completeLanding(attempt, null);
        },
        (error) => {
          completeLanding(attempt, error);
        },
      );
    } catch (error) {
      failStage(FAILURE_LANDING_CREATE, error);
      attempt.holds -= 1;
      attempt.landingHeld = false;
      return ARM_FAILED;
    }

    /**
     * Post-callback revalidation (review 5, §3). Reserving the hold before
     * `start` protects resources that already exist; it does nothing for a
     * resource the callback *returns*. A custom `start` can synchronously
     * `destroy()` the controller — or call `fail()`, which latches
     * `completed` — after which this live runner would be stored on an attempt
     * nothing owns.
     *
     * The general rule: **any resource returned from a reentrancy-capable
     * callback needs a stale-return disposal path.**
     */
    if (!preparationValid() || !attempt.landingHeld || attempt.failed) {
      try {
        handle.destroy();
      } catch (error) {
        report(error);
      }
      return attempt.failed ? ARM_FAILED : ARM_STALE;
    }
    attempt.landing = handle;
    return ARM_ARMED;
  };

  /** The hot path, wrapped. A throw is `FAILURE_RENDERER_WRITE`, not a panic. */
  const runMoved = (lift: VisualLiftSession): boolean =>
    runLeaf(FAILURE_RENDERER_WRITE, () => {
      spec!.moved(current!, lift);
    });

  /** Behavior actions discard normally; only the stage differs per tag. */
  const runAction = (
    tag: number,
    argument: unknown,
    stage: FailureStage,
  ): SeamOutcome => {
    const t = spec!.action;
    begin();
    let prepared: {} | null;
    seamFailureRequested = false;
    inSeam = true;
    try {
      prepared = t.prepare(tag, argument, draft as unknown as Draft<Part>);
    } catch (error) {
      failStage(stage, error);
      return SEAM_PREPARE_FAILED;
    } finally {
      inSeam = false;
    }
    if (seamFailureRequested) {
      return SEAM_PREPARE_FAILED;
    }
    if (prepared === null) {
      return SEAM_DISCARDED;
    }
    if (!preparationValid()) {
      inSeam = true;
      try {
        t.rollback?.(tag, prepared);
      } catch (error) {
        report(error);
      } finally {
        inSeam = false;
      }
      return SEAM_INVALIDATED;
    }
    commit();
    seamFailureRequested = false;
    inSeam = true;
    try {
      t.effect(tag, argument, current!, prepared);
    } catch (error) {
      failStage(stage, error);
      return SEAM_EFFECT_FAILED;
    } finally {
      inSeam = false;
    }
    return seamFailureRequested ? SEAM_EFFECT_FAILED : SEAM_COMMITTED;
  };

  /**
   * Settlement cannot discard: `prepare` returns a staged value or a typed
   * rejection. On an effect failure the gate plan is sealed and dropped
   * unarmed, and `advanceSettlement` does not run.
   */
  const runSettlement = (
    input: SettlementInput,
    attempt: SettlementAttempt,
    scope: SettlementScope,
  ): SeamOutcome => {
    const t = spec!.settlement;
    begin();
    let result: PreparedSettlement | SeamRejection;
    seamFailureRequested = false;
    inSeam = true;
    try {
      result = t.prepare(draft as unknown as Draft<Part>, input);
    } catch (error) {
      failStage(FAILURE_REORDER_RESOLUTION, error);
      return SEAM_PREPARE_FAILED;
    } finally {
      inSeam = false;
    }
    if (isSeamRejection(result)) {
      failStage(result.stage, result.error);
      return SEAM_PREPARE_FAILED;
    }
    if (seamFailureRequested || !preparationValid()) {
      return seamFailureRequested ? SEAM_PREPARE_FAILED : SEAM_INVALIDATED;
    }
    commit();
    const effectOk = runLeaf(FAILURE_REORDER_RESOLUTION, () => {
      t.effect(current!, result, scope);
    });
    const armed = armSettlement(attempt, spec!, effectOk);
    if (!effectOk || armed === ARM_FAILED) {
      // The settlement is replaced by the queued failure; the original
      // accepted/rejected outcome must never reach `finalized`.
      return SEAM_EFFECT_FAILED;
    }
    return SEAM_COMMITTED;
  };

  /**
   * The join. Presentation release is unconditional (review 4, §12), but the
   * *terminal callback* is not: after a consequential failure the committed
   * frame still says `OUTCOME_ACCEPTED`, so calling `finalized` would emit
   * `onFinish` for a drop that is about to be reported through `onError`
   * (review 5, §1).
   */
  const finalize = (
    attempt: SettlementAttempt,
    s: BehaviorSpec<Part>,
    presentation: Lifetime,
    lift: VisualLiftSession,
    origin: DOMRectReadOnly,
  ): void => {
    let failed = false;
    try {
      let target: Point | null = null;
      try {
        target = s.anchorTarget(current!, attempt.authoredReady);
      } catch (error) {
        failStage(FAILURE_LANDING_TARGET, error);
        failed = true;
      }
      try {
        attempt.landing?.destroy();
      } catch (error) {
        // Best-effort: a custom runner must not strand presentation. But the
        // runner may still own the transform, so the pin is no longer known to
        // be authoritative — I-24 is conditional on this succeeding.
        report(error);
        attempt.relinquished = false;
      }
      if (target !== null) {
        try {
          lift.write(target.x - origin.x, target.y - origin.y);
        } catch (error) {
          failStage(FAILURE_RENDERER_WRITE, error);
          failed = true;
        }
      }
    } finally {
      presentation.dispose();
    }
    if (failed) {
      return; // the failure checkpoint drives REPORTING, then retirement
    }
    try {
      s.finalized(current!);
    } catch (error) {
      failStage(FAILURE_TERMINAL_CALLBACK, error);
    }
  };

  /** F-2, `__DEV__` only: the two frames must share a key set and order. */
  const assertSameShape = (a: object, b: object): void => {
    if (!__DEV__) {
      return;
    }
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) {
      throw new TypeError(
        'drag: the two frames have different shapes — a part factory is not deterministic',
      );
    }
  };

  return {
    host,
    seams: {
      admission: runAdmission,
      activation: runActivation,
      moved: runMoved,
      action: runAction,
      release: runRelease,
      settlement: runSettlement,
      armSettlement,
      finalize,
    },
    arm: (armed) => {
      spec = armed;
      const { actionTags: declaredTags } = armed.config;
      if (!Number.isInteger(declaredTags) || declaredTags < 0) {
        throw new TypeError(
          'drag: config.actionTags must be a non-negative integer',
        );
      }
      actionTags = declaredTags;
      try {
        current = composeFrame(armed);
        draft = composeFrame(armed);
        assertSameShape(current, draft);
      } catch (error) {
        // arm() owns its own unwind (review 4, §13)
        try {
          armed.retire();
        } catch (nested) {
          report(nested);
        }
        if (current !== null) {
          scrub(current, armed);
        }
        throw error;
      }
    },
  };
}

export function draggable<Controller, Part extends object>(
  root: HTMLElement,
  behavior: Behavior<Controller, Part>,
): Controller {
  const kernel = createKernel<Part>(root);
  const { spec, controller } = behavior(kernel.host);
  kernel.arm(spec);
  return controller;
}

/* -------------------------------------------------- 9. negative assertions */

/* These are the claims the documents make about what does NOT compile. If any
 * `@ts-expect-error` below stops erroring, a Tier-A claim has silently become
 * discipline and the corresponding document must be corrected. */

declare const anyDraft: Draft<SortableFramePart>;
declare const anyCurrent: Readonly<Frame<SortableFramePart>>;

// I-5 (tier A): the behavior cannot write kernel frame fields.
// @ts-expect-error — `phase` is readonly through `Draft`
anyDraft.phase = 3;
// @ts-expect-error — `pointerY` is readonly through `Draft`
anyDraft.pointerY = 10;

// I-2 (tier A, top-level slots only): an effect cannot assign a frame slot.
// @ts-expect-error — `current` is `Readonly<Frame<Part>>`
anyCurrent.insertion = null;
// @ts-expect-error — the kernel slice is readonly there too
anyCurrent.phase = 0;

// The behavior's part may not shadow a kernel field (review 4, §7).
type CollidingPart = { phase: number; item: HTMLElement | null };
// @ts-expect-error — `FramePartOf` makes a colliding part unconstructible
export const collidingPart: FramePartOf<CollidingPart> = {
  phase: 0,
  item: null,
};

// A non-colliding part is unaffected.
export const validPart: FramePartOf<SortableFramePart> =
  createSortableFramePart();

// I-10 (tier A): a displacement hook cannot reach `SettlementScope`.
declare const displacementView: DisplacementView;
export const noGateFromDisplacement: unknown =
  // @ts-expect-error — `DisplacementView` has no gate members
  displacementView.holdForLanding;

// Release cannot discard (review 4, §8).
declare const releaseSeam: ReleaseTransition<SortableFramePart>;
// @ts-expect-error — `ResolutionCommand` is not nullable
export const releaseDiscard: null = releaseSeam.prepare(anyDraft);

// A feature context cannot classify a failure against the current operation
// (review 4, §14).
declare const featureCtx: FeatureContext;
export const noFeatureFail: unknown =
  // @ts-expect-error — `FeatureContext` exposes `report`, never `fail`
  featureCtx.fail;

// `Prepared extends {}` keeps `null` out of the staged channel.
// @ts-expect-error — `null` is not assignable to a `Prepared` type parameter
export type NullPrepared = Transition<SortableFramePart, null>;
