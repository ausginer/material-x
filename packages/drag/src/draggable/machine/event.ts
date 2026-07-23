import type { CancellationReason, LandingPlan } from '../../kernel/protocol.ts';
import type { Point } from '../../kernel/types.ts';
import type { FreeDropResolution } from '../options.ts';
import type {
  ActivationCandidate,
  DropProposal,
  DraggablePolicy,
  LandingCurrency,
  MotionCurrency,
  OperationCurrency,
  ResolutionCurrency,
} from './state.ts';

export const ADMIT_POINTER = 211;
export const OPERATION_ARMED = 212;
export const OPERATION_ARM_FAILED = 213;
export const POINTER_MOVED = 214;
export const POINTER_RELEASED = 215;
export const OPERATION_CANCELED = 216;
export const POLICY_UPDATED = 217;
export const CONTROLLED_POSITION = 218;
export const INVALIDATED = 219;
export const ACTIVATION_READY = 220;
export const ACTIVATION_FAILED = 221;
export const START_SUCCEEDED = 222;
export const START_FAILED = 223;
export const MOTION_OBSERVED = 224;
export const MOTION_OBSERVATION_FAILED = 225;
export const CONTROLLED_POSITION_RESOLVED = 226;
export const CONTROLLED_POSITION_FAILED = 227;
export const RELEASE_RESOLVED = 228;
export const RELEASE_FAILED = 229;
export const DROP_RESOLVED = 230;
export const DROP_RESOLUTION_FAILED = 231;
export const INTERACTION_STOPPED = 232;
export const PRESENTATION_SETTLED = 233;
export const LANDING_PLAN_RESOLVED = 234;
export const LANDING_PLAN_FAILED = 235;
export const LANDING_STARTED = 236;
export const LANDING_ANIMATION_FAILED = 237;
export const LANDING_FINISHED = 238;
export const LANDING_FAILED = 239;
export const LANDING_PINNED = 240;
export const LANDING_PIN_FAILED = 241;
export const MOTION_PRESENTATION_FAILED = 242;
export const MOVE_CALLBACK_FAILED = 244;
export const FAILURE_REPORTED = 245;
export const FINALIZATION_COMPLETED = 246;
export const FINALIZATION_FAILED = 247;
export const LANDING_TIMING_FAILED = 248;

type BasePointerEvent = Readonly<{
  pointerId: number;
  point: Point;
}>;

export type AdmitPointerDraggableEvent = BasePointerEvent &
  Readonly<{
    type: typeof ADMIT_POINTER;
    item: HTMLElement;
    visual: HTMLElement;
  }>;

export type OperationArmedDraggableEvent = OperationCurrency &
  Readonly<{ type: typeof OPERATION_ARMED }>;

export type OperationArmFailedDraggableEvent = OperationCurrency &
  Readonly<{ type: typeof OPERATION_ARM_FAILED; error: unknown }>;

export type PointerMovedDraggableEvent = BasePointerEvent &
  Readonly<{ type: typeof POINTER_MOVED }>;

export type PointerReleasedDraggableEvent = BasePointerEvent &
  Readonly<{ type: typeof POINTER_RELEASED }>;

export type OperationCanceledDraggableEvent = Readonly<{
  type: typeof OPERATION_CANCELED;
  reason: CancellationReason;
}>;

export type PolicyUpdatedDraggableEvent = Readonly<{
  type: typeof POLICY_UPDATED;
  policy: DraggablePolicy;
}>;

export type ControlledPositionDraggableEvent = Readonly<{
  type: typeof CONTROLLED_POSITION;
  position: Point;
}>;

export type InvalidatedDraggableEvent = Readonly<{
  type: typeof INVALIDATED;
}>;

export type ActivationReadyDraggableEvent = OperationCurrency &
  Readonly<{ type: typeof ACTIVATION_READY; candidate: ActivationCandidate }>;

export type ActivationFailedDraggableEvent = OperationCurrency &
  Readonly<{ type: typeof ACTIVATION_FAILED; error: unknown }>;

export type StartSucceededDraggableEvent = OperationCurrency &
  Readonly<{ type: typeof START_SUCCEEDED }>;

export type StartFailedDraggableEvent = OperationCurrency &
  Readonly<{ type: typeof START_FAILED; error: unknown }>;

export type MotionObservedDraggableEvent = MotionCurrency &
  Readonly<{ type: typeof MOTION_OBSERVED; bounds: DOMRectReadOnly | null }>;

export type MotionObservationFailedDraggableEvent = MotionCurrency &
  Readonly<{ type: typeof MOTION_OBSERVATION_FAILED; error: unknown }>;

export type ControlledPositionResolvedDraggableEvent = MotionCurrency &
  Readonly<{
    type: typeof CONTROLLED_POSITION_RESOLVED;
    viewportDelta: Point;
  }>;

export type ControlledPositionFailedDraggableEvent = MotionCurrency &
  Readonly<{ type: typeof CONTROLLED_POSITION_FAILED; error: unknown }>;

export type ReleaseResolvedDraggableEvent = MotionCurrency &
  Readonly<{
    type: typeof RELEASE_RESOLVED;
    viewportDelta: Point;
    proposal: DropProposal;
  }>;

export type ReleaseFailedDraggableEvent = MotionCurrency &
  Readonly<{ type: typeof RELEASE_FAILED; error: unknown }>;

export type DropResolvedDraggableEvent = ResolutionCurrency &
  Readonly<{ type: typeof DROP_RESOLVED; resolution: FreeDropResolution }>;

export type DropResolutionFailedDraggableEvent = ResolutionCurrency &
  Readonly<{ type: typeof DROP_RESOLUTION_FAILED; error: unknown }>;

export type InteractionStoppedDraggableEvent = OperationCurrency &
  Readonly<{ type: typeof INTERACTION_STOPPED }>;

export type PresentationSettledDraggableEvent = ResolutionCurrency &
  Readonly<{ type: typeof PRESENTATION_SETTLED; error: unknown }>;

export type LandingPlanResolvedDraggableEvent = LandingCurrency &
  Readonly<{ type: typeof LANDING_PLAN_RESOLVED; plan: LandingPlan }>;

export type LandingPlanFailedDraggableEvent = LandingCurrency &
  Readonly<{ type: typeof LANDING_PLAN_FAILED; error: unknown }>;

export type LandingStartedDraggableEvent = LandingCurrency &
  Readonly<{ type: typeof LANDING_STARTED }>;

export type LandingAnimationFailedDraggableEvent = LandingCurrency &
  Readonly<{ type: typeof LANDING_ANIMATION_FAILED; error: unknown }>;

export type LandingTimingFailedDraggableEvent = LandingCurrency &
  Readonly<{ type: typeof LANDING_TIMING_FAILED; error: unknown }>;

export type LandingFinishedDraggableEvent = LandingCurrency &
  Readonly<{ type: typeof LANDING_FINISHED }>;

export type LandingFailedDraggableEvent = LandingCurrency &
  Readonly<{ type: typeof LANDING_FAILED; error: unknown }>;

export type LandingPinnedDraggableEvent = LandingCurrency &
  Readonly<{ type: typeof LANDING_PINNED }>;

export type LandingPinFailedDraggableEvent = LandingCurrency &
  Readonly<{ type: typeof LANDING_PIN_FAILED; error: unknown }>;

export type MotionPresentationFailedDraggableEvent = MotionCurrency &
  Readonly<{ type: typeof MOTION_PRESENTATION_FAILED; error: unknown }>;

export type MoveCallbackFailedDraggableEvent = MotionCurrency &
  Readonly<{ type: typeof MOVE_CALLBACK_FAILED; error: unknown }>;

export type FailureReportedDraggableEvent = OperationCurrency &
  Readonly<{ type: typeof FAILURE_REPORTED }>;

export type FinalizationCompletedDraggableEvent = OperationCurrency &
  Readonly<{ type: typeof FINALIZATION_COMPLETED }>;

export type FinalizationFailedDraggableEvent = OperationCurrency &
  Readonly<{ type: typeof FINALIZATION_FAILED; error: unknown }>;

export type DraggableEvent =
  | AdmitPointerDraggableEvent
  | OperationArmedDraggableEvent
  | OperationArmFailedDraggableEvent
  | PointerMovedDraggableEvent
  | PointerReleasedDraggableEvent
  | OperationCanceledDraggableEvent
  | PolicyUpdatedDraggableEvent
  | ControlledPositionDraggableEvent
  | InvalidatedDraggableEvent
  | ActivationReadyDraggableEvent
  | ActivationFailedDraggableEvent
  | StartSucceededDraggableEvent
  | StartFailedDraggableEvent
  | MotionObservedDraggableEvent
  | MotionObservationFailedDraggableEvent
  | ControlledPositionResolvedDraggableEvent
  | ControlledPositionFailedDraggableEvent
  | ReleaseResolvedDraggableEvent
  | ReleaseFailedDraggableEvent
  | DropResolvedDraggableEvent
  | DropResolutionFailedDraggableEvent
  | InteractionStoppedDraggableEvent
  | PresentationSettledDraggableEvent
  | LandingPlanResolvedDraggableEvent
  | LandingPlanFailedDraggableEvent
  | LandingStartedDraggableEvent
  | LandingAnimationFailedDraggableEvent
  | LandingTimingFailedDraggableEvent
  | LandingFinishedDraggableEvent
  | LandingFailedDraggableEvent
  | LandingPinnedDraggableEvent
  | LandingPinFailedDraggableEvent
  | MotionPresentationFailedDraggableEvent
  | MoveCallbackFailedDraggableEvent
  | FailureReportedDraggableEvent
  | FinalizationCompletedDraggableEvent
  | FinalizationFailedDraggableEvent;
