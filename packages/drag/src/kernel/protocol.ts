/** Shared immutable protocol values used by both drag feature machines. */
import type { Point } from './types.ts';

// Pointer events are discriminated by realm-neutral names rather than
// `instanceof PointerEvent`.
export const POINTER_DOWN = 'pointerdown';
export const POINTER_MOVE = 'pointermove';
export const POINTER_UP = 'pointerup';
export const POINTER_CANCEL = 'pointercancel';
export const LOST_POINTER_CAPTURE = 'lostpointercapture';
export const KEY_DOWN = 'keydown';
export const KEY_ESCAPE = 'Escape';

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

/** One realm-neutral pointer position reading. */
export type PointerSample = Readonly<{
  pointerId: number;
  point: Point;
}>;

/** A committed landing animation's endpoints, viewport-space deltas. */
export type LandingPlan = Readonly<{
  from: Point;
  target: Point;
}>;

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

export const RECOVERY_DESTINATION = 53;
export const RECOVERY_HOME = 54;
export const RECOVERY_IMMEDIATE = 55;

/** How a settling operation recovers its presentation. */
export type SettlementRecovery =
  | typeof RECOVERY_DESTINATION
  | typeof RECOVERY_HOME
  | typeof RECOVERY_IMMEDIATE;

/** Context handed to a public `onError` callback. */
export type DragErrorContext<DomainResult> = Readonly<{
  cause: FailureCause;
  domain: DomainResult | null;
}>;
