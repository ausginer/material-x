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
export const PHASE_IDLE: unique symbol = Symbol('idle');
export const PHASE_PENDING: unique symbol = Symbol('pending');
export const PHASE_ACTIVATING: unique symbol = Symbol('activating');
export const PHASE_DRAGGING: unique symbol = Symbol('dragging');
export const PHASE_AWAITING_RESULT: unique symbol = Symbol('awaiting-result');
export const PHASE_SETTLING: unique symbol = Symbol('settling');

export type DragPhase =
  | typeof PHASE_IDLE
  | typeof PHASE_PENDING
  | typeof PHASE_ACTIVATING
  | typeof PHASE_DRAGGING
  | typeof PHASE_AWAITING_RESULT
  | typeof PHASE_SETTLING;

// `LifecycleEvent.kind` vocabulary. The phase graph reacts to `kind` alone;
// feature-specific payloads never reach it.
export const LIFECYCLE_ADMIT: unique symbol = Symbol('admit'); // idle -> pending
export const LIFECYCLE_DISARM: unique symbol = Symbol('disarm'); // pending -> idle
export const LIFECYCLE_ACTIVATE: unique symbol = Symbol('activate'); // pending -> activating
export const LIFECYCLE_ACTIVATION_READY: unique symbol =
  Symbol('activation-ready'); // activating -> activating (commit candidate)
export const LIFECYCLE_START_SUCCEEDED: unique symbol =
  Symbol('start-succeeded'); // activating -> dragging
export const LIFECYCLE_ACTIVATION_FAILED: unique symbol =
  Symbol('activation-failed'); // activating -> idle
export const LIFECYCLE_MOVE: unique symbol = Symbol('move'); // dragging -> dragging
export const LIFECYCLE_RELEASE: unique symbol = Symbol('release'); // dragging -> awaiting-result
export const LIFECYCLE_RESOLVED: unique symbol = Symbol('resolved'); // awaiting-result -> settling
export const LIFECYCLE_CANCEL: unique symbol = Symbol('cancel'); // dragging | awaiting-result -> settling
export const LIFECYCLE_SETTLE_PROGRESS: unique symbol =
  Symbol('settle-progress'); // settling -> settling
export const LIFECYCLE_SETTLE_COMPLETE: unique symbol =
  Symbol('settle-complete'); // settling -> idle
export const LIFECYCLE_IGNORE: unique symbol = Symbol('ignore'); // no phase edge

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

export const LANDING_PREPARING: unique symbol = Symbol('preparing');
export const LANDING_RUNNING: unique symbol = Symbol('running');
export const LANDING_COMPLETING: unique symbol = Symbol('completing');
export const LANDING_SKIPPED: unique symbol = Symbol('skipped');

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

/** The landing sub-state of settlement. */
export type LandingState =
  | PreparingLandingState
  | RunningLandingState
  | CompletingLandingState
  | SkippedLandingState;

export const FAILURE_MOVE: unique symbol = Symbol('move');
export const FAILURE_CONTROLLED_UPDATE: unique symbol =
  Symbol('controlled-update');
export const FAILURE_INVALIDATION: unique symbol = Symbol('invalidation');
export const FAILURE_SCHEDULED_FRAME: unique symbol = Symbol('scheduled-frame');
export const FAILURE_LANDING_TIMING: unique symbol = Symbol('landing-timing');
export const FAILURE_ANIMATION_CREATE: unique symbol =
  Symbol('animation-create');
export const FAILURE_LANDING_PIN: unique symbol = Symbol('landing-pin');
export const FAILURE_LANDING_INTERRUPTED: unique symbol = Symbol(
  'landing-interrupted',
);
export const FAILURE_HOME_TARGET: unique symbol = Symbol('home-target');
export const FAILURE_PLACEHOLDER_TARGET: unique symbol =
  Symbol('placeholder-target');
export const FAILURE_RENDERER_WRITE: unique symbol = Symbol('renderer-write');
export const FAILURE_PRESENTATION_LEASE: unique symbol =
  Symbol('presentation-lease');
export const FAILURE_DROP_RESOLUTION: unique symbol = Symbol('drop-resolution');
export const FAILURE_REORDER_RESOLUTION: unique symbol =
  Symbol('reorder-resolution');
export const FAILURE_FINISH_CALLBACK: unique symbol = Symbol('finish-callback');
export const FAILURE_CANCEL_CALLBACK: unique symbol = Symbol('cancel-callback');
export const FAILURE_ACTIVATION: unique symbol = Symbol('activation');

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
    | typeof FAILURE_ACTIVATION;
}>;

export const CANCEL_POINTER: unique symbol = Symbol('pointer-canceled');
export const CANCEL_ESCAPE: unique symbol = Symbol('escape');
export const CANCEL_CONSUMER: unique symbol = Symbol('consumer');
export const CANCEL_ITEM_REMOVED: unique symbol = Symbol('item-removed');
export const CANCEL_COLLECTION_INVALIDATED: unique symbol = Symbol(
  'collection-invalidated',
);

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

export const OUTCOME_ACCEPTED: unique symbol = Symbol('accepted');
export const OUTCOME_REJECTED: unique symbol = Symbol('rejected');
export const OUTCOME_NO_OP: unique symbol = Symbol('no-op');
export const OUTCOME_CANCELED: unique symbol = Symbol('canceled');
export const OUTCOME_FAILED: unique symbol = Symbol('failed');

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

export const RECOVERY_DESTINATION: unique symbol = Symbol('destination');
export const RECOVERY_HOME: unique symbol = Symbol('home');
export const RECOVERY_IMMEDIATE: unique symbol = Symbol('immediate');

/** How a settling operation recovers its presentation. */
export type SettlementRecovery =
  | typeof RECOVERY_DESTINATION
  | typeof RECOVERY_HOME
  | typeof RECOVERY_IMMEDIATE;

/** The complete settlement slice, parameterised by feature domain result. */
export type SettlementState<DomainResult> = Readonly<{
  outcome: SettlementOutcome;
  recovery: SettlementRecovery;
  domain: DomainResult | null;
  landing: LandingState;
}>;

// Shared operation-identity lifecycle vocabulary: both features carry an
// admitted/candidate/active operation through activation the same way.
export const OPERATION_ADMITTED: unique symbol = Symbol('admitted');
export const OPERATION_CANDIDATE: unique symbol = Symbol('candidate');
export const OPERATION_ACTIVE: unique symbol = Symbol('active');

export type OperationStage =
  | typeof OPERATION_ADMITTED
  | typeof OPERATION_CANDIDATE
  | typeof OPERATION_ACTIVE;

/** Context handed to a public `onError` callback. */
export type DragErrorContext<DomainResult> = Readonly<{
  cause: FailureCause;
  domain: DomainResult | null;
}>;
