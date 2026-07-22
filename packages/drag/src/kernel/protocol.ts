/**
 * The reusable, DOM-free lifecycle protocol shared by both features.
 *
 * {@link transitionKernelPhase} is the pure phase graph. It owns no current
 * state and performs no DOM work: given the previous phase and a lifecycle event
 * already classified by a feature, it returns the next phase. A feature root
 * reducer composes this with parallel semantic projections to build one complete
 * next state atomically.
 *
 * Pointer events are discriminated structurally (by known event-name / signal
 * strings), never via `instanceof PointerEvent`, so input originating in another
 * DOM realm remains valid.
 */
import type { Point } from './types.ts';

// Pointer event-name constants live here, in a neutral value module, so the
// protocol and the platform pointer source do not depend on each other.
export const POINTER_DOWN = 'pointerdown';
export const POINTER_MOVE = 'pointermove';
export const POINTER_UP = 'pointerup';
export const POINTER_CANCEL = 'pointercancel';
export const LOST_POINTER_CAPTURE = 'lostpointercapture';
export const KEY_DOWN = 'keydown';
export const KEY_ESCAPE = 'Escape';

/** The common lifecycle phase of one operation. */
export const PHASE_IDLE = 1;
export const PHASE_PENDING = 2;
export const PHASE_ACTIVATING = 3;
export const PHASE_DRAGGING = 4;
export const PHASE_AWAITING_RESULT = 5;
export const PHASE_SETTLING = 6;

export type DragPhase =
  | typeof PHASE_IDLE
  | typeof PHASE_PENDING
  | typeof PHASE_ACTIVATING
  | typeof PHASE_DRAGGING
  | typeof PHASE_AWAITING_RESULT
  | typeof PHASE_SETTLING;

// `LifecycleEvent.kind` vocabulary. The phase graph reacts to `kind` alone;
// feature-specific payloads never reach it.
export const LIFECYCLE_ADMIT = 7; // idle -> pending
export const LIFECYCLE_DISARM = 8; // pending -> idle
export const LIFECYCLE_ACTIVATE = 9; // pending -> activating
export const LIFECYCLE_ACTIVATION_READY = 10; // activating -> activating (commit candidate)
export const LIFECYCLE_START_SUCCEEDED = 11; // activating -> dragging
export const LIFECYCLE_ACTIVATION_FAILED = 12; // activating -> idle
export const LIFECYCLE_MOVE = 13; // dragging -> dragging
export const LIFECYCLE_RELEASE = 14; // dragging -> awaiting-result
export const LIFECYCLE_RESOLVED = 15; // awaiting-result -> settling
export const LIFECYCLE_CANCEL = 16; // dragging | awaiting-result -> settling
export const LIFECYCLE_SETTLE_PROGRESS = 17; // settling -> settling
export const LIFECYCLE_SETTLE_COMPLETE = 18; // settling -> idle
export const LIFECYCLE_IGNORE = 19; // no phase edge

/**
 * A lifecycle event, already classified by a feature from a raw event. The phase
 * graph reacts to `kind` alone; feature-specific payloads never reach it.
 */
export type LifecycleEvent =
  | typeof LIFECYCLE_ADMIT
  | typeof LIFECYCLE_DISARM
  | typeof LIFECYCLE_ACTIVATE
  | typeof LIFECYCLE_ACTIVATION_READY
  | typeof LIFECYCLE_START_SUCCEEDED
  | typeof LIFECYCLE_ACTIVATION_FAILED
  | typeof LIFECYCLE_MOVE
  | typeof LIFECYCLE_RELEASE
  | typeof LIFECYCLE_RESOLVED
  | typeof LIFECYCLE_CANCEL
  | typeof LIFECYCLE_SETTLE_PROGRESS
  | typeof LIFECYCLE_SETTLE_COMPLETE
  | typeof LIFECYCLE_IGNORE;

/**
 * The pure phase graph. An event whose kind defines no edge from `from` leaves
 * the phase unchanged, keeping foreign, duplicate, and stale events safe.
 *
 * ```text
 * idle -> pending -> activating -> dragging -> awaiting-result -> settling -> idle
 *           |            |
 *           +--> idle    +--> idle
 * ```
 */
export function transitionKernelPhase(
  from: DragPhase,
  event: LifecycleEvent,
): DragPhase {
  switch (event) {
    case LIFECYCLE_ADMIT:
      return from === PHASE_IDLE ? PHASE_PENDING : from;
    case LIFECYCLE_DISARM:
      return from === PHASE_PENDING ? PHASE_IDLE : from;
    case LIFECYCLE_ACTIVATE:
      return from === PHASE_PENDING ? PHASE_ACTIVATING : from;
    case LIFECYCLE_ACTIVATION_READY:
      // Commits candidate data while remaining in `activating`.
      return from;
    case LIFECYCLE_START_SUCCEEDED:
      return from === PHASE_ACTIVATING ? PHASE_DRAGGING : from;
    case LIFECYCLE_ACTIVATION_FAILED:
      return from === PHASE_ACTIVATING ? PHASE_IDLE : from;
    case LIFECYCLE_RELEASE:
      return from === PHASE_DRAGGING ? PHASE_AWAITING_RESULT : from;
    case LIFECYCLE_RESOLVED:
      return from === PHASE_AWAITING_RESULT ? PHASE_SETTLING : from;
    case LIFECYCLE_CANCEL:
      return from === PHASE_DRAGGING || from === PHASE_AWAITING_RESULT
        ? PHASE_SETTLING
        : from;
    case LIFECYCLE_SETTLE_COMPLETE:
      return from === PHASE_SETTLING ? PHASE_IDLE : from;
    case LIFECYCLE_MOVE:
    case LIFECYCLE_SETTLE_PROGRESS:
    case LIFECYCLE_IGNORE:
    default:
      return from;
  }
}

// ---------------------------------------------------------------------------
// Shared semantic value contracts. These are immutable value types, not one
// shared mutable "drag context".
// ---------------------------------------------------------------------------

/** The dedicated signal handed to a consumer resolver. */
export type ResolutionContext = Readonly<{
  signal: AbortSignal;
}>;

/** Currency identifying one consumer-resolution invocation. */
export type ResolutionCurrency = Readonly<{
  operationId: number;
  resolutionId: number;
}>;

/** Currency identifying one landing attempt. */
export type LandingCurrency = Readonly<{
  operationId: number;
  landingId: number;
}>;

/**
 * Whether two currencies name the same landing attempt. Landing events are
 * themselves `LandingCurrency`, so a reducer can pass one straight in against
 * the currency held in settlement state.
 *
 * Both halves are compared deliberately. Matching `landingId` alone is
 * sufficient *today* — ids come from one controller-wide counter and are never
 * reused — but that invariant lives in `operation-id.ts`, not here, and scoping
 * the counter per operation would silently turn a half-check into a stale-event
 * match.
 */
export function sameLanding(a: LandingCurrency, b: LandingCurrency): boolean {
  return a.operationId === b.operationId && a.landingId === b.landingId;
}

/**
 * One pointer position reading, tagged with the pointer it came from. The unit
 * of raw input: a press, a move, a release. Distinct from {@link PointerState},
 * which is the accumulated history the reducer owns.
 */
export type PointerSample = Readonly<{
  pointerId: number;
  point: Point;
}>;

/** Pointer identity and history, owned from admission until idle. */
export type PointerState = Readonly<{
  id: number;
  origin: Point;
  latest: Point;
  release: Point | null;
}>;

/** A committed landing animation's endpoints, viewport-space deltas. */
export type LandingPlan = Readonly<{
  from: Point;
  target: Point;
}>;

export const LANDING_PREPARING = 20;
export const LANDING_RUNNING = 21;
export const LANDING_COMPLETING = 22;
export const LANDING_SKIPPED = 23;
export const LANDING_SETTLED = 24;

export type PreparingLandingState = Readonly<{
  stage: typeof LANDING_PREPARING;
  currency: LandingCurrency;
  plan: LandingPlan | null;
}>;

export type RunningLandingState = Readonly<{
  stage: typeof LANDING_RUNNING;
  currency: LandingCurrency;
  plan: LandingPlan;
}>;

export type CompletingLandingState = Readonly<{
  stage: typeof LANDING_COMPLETING;
  currency: LandingCurrency;
  plan: LandingPlan;
}>;

export type SkippedLandingState = Readonly<{
  stage: typeof LANDING_SKIPPED;
}>;

/**
 * Landing ran to completion and the visual is pinned at its landed transform.
 * Terminal, like {@link SkippedLandingState}: neither still holds the temporary
 * presentation, so both satisfy the landing half of the release barrier.
 */
export type SettledLandingState = Readonly<{
  stage: typeof LANDING_SETTLED;
}>;

/** The landing sub-state of settlement. */
export type LandingState =
  | PreparingLandingState
  | RunningLandingState
  | CompletingLandingState
  | SkippedLandingState
  | SettledLandingState;

/** Whether landing no longer holds the temporary presentation. */
export function isLandingSettled(landing: LandingState): boolean {
  return landing.stage === LANDING_SKIPPED || landing.stage === LANDING_SETTLED;
}

export const FAILURE_MOVE = 25;
export const FAILURE_CONTROLLED_UPDATE = 26;
export const FAILURE_INVALIDATION = 27;
export const FAILURE_SCHEDULED_FRAME = 28;
export const FAILURE_LANDING_TIMING = 29;
export const FAILURE_ANIMATION_CREATE = 30;
export const FAILURE_LANDING_PIN = 31;
export const FAILURE_LANDING_INTERRUPTED = 32;
export const FAILURE_HOME_TARGET = 33;
export const FAILURE_PLACEHOLDER_TARGET = 34;
export const FAILURE_RENDERER_WRITE = 35;
export const FAILURE_PRESENTATION_LEASE = 36;
export const FAILURE_DROP_RESOLUTION = 37;
export const FAILURE_REORDER_RESOLUTION = 38;
export const FAILURE_FINISH_CALLBACK = 39;
export const FAILURE_CANCEL_CALLBACK = 40;
export const FAILURE_ACTIVATION = 41;
export const FAILURE_PRESENTATION_READY = 42;

/** Stable classification of where a real execution failure occurred. */
export type FailureCause = Readonly<{
  stage:
    | typeof FAILURE_MOVE
    | typeof FAILURE_CONTROLLED_UPDATE
    | typeof FAILURE_INVALIDATION
    | typeof FAILURE_SCHEDULED_FRAME
    | typeof FAILURE_LANDING_TIMING
    | typeof FAILURE_ANIMATION_CREATE
    | typeof FAILURE_LANDING_PIN
    | typeof FAILURE_LANDING_INTERRUPTED
    | typeof FAILURE_HOME_TARGET
    | typeof FAILURE_PLACEHOLDER_TARGET
    | typeof FAILURE_RENDERER_WRITE
    | typeof FAILURE_PRESENTATION_LEASE
    | typeof FAILURE_DROP_RESOLUTION
    | typeof FAILURE_REORDER_RESOLUTION
    | typeof FAILURE_FINISH_CALLBACK
    | typeof FAILURE_CANCEL_CALLBACK
    | typeof FAILURE_ACTIVATION
    | typeof FAILURE_PRESENTATION_READY;
}>;

export const CANCEL_POINTER = 43;
export const CANCEL_ESCAPE = 44;
export const CANCEL_CONSUMER = 45;
export const CANCEL_ITEM_REMOVED = 46;
export const CANCEL_COLLECTION_INVALIDATED = 47;

/** Why an operation was cancelled. */
export type CancellationReason = Readonly<{
  type:
    | typeof CANCEL_POINTER
    | typeof CANCEL_ESCAPE
    | typeof CANCEL_CONSUMER
    | typeof CANCEL_ITEM_REMOVED
    | typeof CANCEL_COLLECTION_INVALIDATED;
  detail?: unknown;
}>;

export const OUTCOME_ACCEPTED = 48;
export const OUTCOME_REJECTED = 49;
export const OUTCOME_NO_OP = 50;
export const OUTCOME_CANCELED = 51;
export const OUTCOME_FAILED = 52;

export type AcceptedSettlementOutcome = Readonly<{
  result: typeof OUTCOME_ACCEPTED;
}>;

export type RejectedSettlementOutcome = Readonly<{
  result: typeof OUTCOME_REJECTED;
}>;

export type NoOpSettlementOutcome = Readonly<{
  result: typeof OUTCOME_NO_OP;
}>;

export type CanceledSettlementOutcome = Readonly<{
  result: typeof OUTCOME_CANCELED;
  reason: CancellationReason;
}>;

export type FailedSettlementOutcome = Readonly<{
  result: typeof OUTCOME_FAILED;
  failure: FailureCause;
}>;

/** The common settlement outcome, independent of feature domain result. */
export type SettlementOutcome =
  | AcceptedSettlementOutcome
  | RejectedSettlementOutcome
  | NoOpSettlementOutcome
  | CanceledSettlementOutcome
  | FailedSettlementOutcome;

export const RECOVERY_DESTINATION = 53;
export const RECOVERY_HOME = 54;
export const RECOVERY_IMMEDIATE = 55;

/** How a settling operation recovers its presentation. */
export type SettlementRecovery =
  | typeof RECOVERY_DESTINATION
  | typeof RECOVERY_HOME
  | typeof RECOVERY_IMMEDIATE;

export const PRESENTATION_PENDING = 56;
export const PRESENTATION_READY = 57;

/**
 * Whether the consumer's *authored* (persistent) presentation is ready to be
 * revealed. A resolution that carries no `presentationReady` is
 * {@link PRESENTATION_READY} from the start — the barrier is opt-in.
 */
export type PresentationReadiness =
  | typeof PRESENTATION_PENDING
  | typeof PRESENTATION_READY;

/** The complete settlement slice, parameterised by feature domain result. */
export type SettlementState<DomainResult> = Readonly<{
  outcome: SettlementOutcome;
  recovery: SettlementRecovery;
  domain: DomainResult | null;
  landing: LandingState;
  presentation: PresentationReadiness;
}>;

/**
 * The release barrier. The temporary presentation (lift, placeholder) may only
 * be torn down once landing no longer needs it *and* the consumer's authored
 * presentation is ready to take over.
 *
 * The two run concurrently and are joined here rather than serialized: a
 * consumer that commits quickly overlaps the landing animation, and whichever
 * finishes first waits for the other. Serializing them — by awaiting the commit
 * inside the resolution callback before returning `accepted` — would delay the
 * landing animation behind the consumer's render and make every drop feel
 * laggy. That is the whole reason `presentationReady` is a separate field on the
 * resolution rather than something the callback can simply `await`; do not
 * "simplify" it away.
 */
export function canReleasePresentation(
  settlement: SettlementState<unknown>,
): boolean {
  return (
    isLandingSettled(settlement.landing) &&
    settlement.presentation === PRESENTATION_READY
  );
}

// Shared operation-identity lifecycle vocabulary: both features carry an
// admitted/candidate/active operation through activation the same way.
export const OPERATION_ADMITTED = 58;
export const OPERATION_CANDIDATE = 59;
export const OPERATION_ACTIVE = 60;

export type OperationStage =
  | typeof OPERATION_ADMITTED
  | typeof OPERATION_CANDIDATE
  | typeof OPERATION_ACTIVE;

/** Context handed to a public `onError` callback. */
export type DragErrorContext<DomainResult> = Readonly<{
  cause: FailureCause;
  domain: DomainResult | null;
}>;
