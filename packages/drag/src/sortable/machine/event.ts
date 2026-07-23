import type { CancellationReason, LandingPlan } from '../../kernel/protocol.ts';
import type { Point } from '../../kernel/types.ts';
import type {
  CollectionSnapshot,
  Insertion,
  ReorderResolution,
} from '../options.ts';
import type {
  LandingCurrency,
  MotionCurrency,
  ResolutionCurrency,
  SpatialCurrency,
} from './state.ts';

export const ADMIT_POINTER = 320;
export const ADMIT_KEYBOARD = 321;
export const POINTER_MOVED = 322;
export const POINTER_RELEASED = 323;
export const OPERATION_CANCELED = 324;
export const COLLECTION_UPDATED = 325;
export const ACTIVATION_READY = 326;
export const ACTIVATION_FAILED = 327;
export const START_SUCCEEDED = 328;
export const START_FAILED = 329;
export const ACTIVE_INSERTION_RESOLVED = 330;
export const ACTIVE_INSERTION_FAILED = 331;
export const PROPOSAL_INSERTION_RESOLVED = 332;
export const PROPOSAL_INSERTION_FAILED = 333;
export const REORDER_RESOLVED = 334;
export const REORDER_RESOLUTION_FAILED = 335;
export const INTERACTION_STOPPED = 336;
export const PRESENTATION_SETTLED = 337;
export const LANDING_PLAN_RESOLVED = 338;
export const LANDING_PLAN_FAILED = 339;
export const LANDING_STARTED = 340;
export const LANDING_FINISHED = 342;
export const LANDING_FAILED = 343;
export const LANDING_PINNED = 344;
export const LANDING_PIN_FAILED = 345;
export const FAILURE_REPORTED = 346;
export const FINALIZATION_COMPLETED = 347;
export const FINALIZATION_FAILED = 348;
export const OPERATION_ARMED = 349;
export const OPERATION_ARM_FAILED = 350;
export const MOTION_PRESENTATION_FAILED = 351;
export const PLACEHOLDER_WRITE_FAILED = 352;
export const LANDING_TIMING_FAILED = 353;
export const LANDING_ANIMATION_CREATE_FAILED = 354;

type Admission = Readonly<{
  item: HTMLElement;
  visual: HTMLElement;
  point: Point;
  snapshot: CollectionSnapshot;
}>;

export type AdmitPointerSortableEvent = Admission &
  Readonly<{ type: typeof ADMIT_POINTER; pointerId: number }>;
export type AdmitKeyboardSortableEvent = Admission &
  Readonly<{ type: typeof ADMIT_KEYBOARD; insertion: Insertion }>;
export type PointerMovedSortableEvent = Readonly<{
  type: typeof POINTER_MOVED;
  operationId: number;
  pointerId: number;
  point: Point;
}>;
export type PointerReleasedSortableEvent = Readonly<{
  type: typeof POINTER_RELEASED;
  operationId: number;
  pointerId: number;
  point: Point;
}>;
export type OperationCanceledSortableEvent = Readonly<{
  type: typeof OPERATION_CANCELED;
  reason: CancellationReason;
}>;
export type CollectionUpdatedSortableEvent = Readonly<{
  type: typeof COLLECTION_UPDATED;
  operationId: number;
  snapshot: CollectionSnapshot;
}>;
export type OperationArmedSortableEvent = Readonly<{
  type: typeof OPERATION_ARMED;
  operationId: number;
}>;
export type OperationArmFailedSortableEvent = Readonly<{
  type: typeof OPERATION_ARM_FAILED;
  operationId: number;
  error: unknown;
}>;
export type ActivationReadySortableEvent = Readonly<{
  type: typeof ACTIVATION_READY;
  operationId: number;
  activationVersion: number;
  activationIndex: number;
  insertion: Insertion;
}>;
export type ActivationFailedSortableEvent = Readonly<{
  type: typeof ACTIVATION_FAILED;
  operationId: number;
  error: unknown;
}>;
export type StartSucceededSortableEvent = Readonly<{
  type: typeof START_SUCCEEDED;
  operationId: number;
}>;
export type StartFailedSortableEvent = Readonly<{
  type: typeof START_FAILED;
  operationId: number;
  error: unknown;
}>;
export type ActiveInsertionResolvedSortableEvent = SpatialCurrency &
  Readonly<{ type: typeof ACTIVE_INSERTION_RESOLVED; insertion: Insertion }>;
export type ActiveInsertionFailedSortableEvent = SpatialCurrency &
  Readonly<{ type: typeof ACTIVE_INSERTION_FAILED; error: unknown }>;
export type ProposalInsertionResolvedSortableEvent = SpatialCurrency &
  Readonly<{ type: typeof PROPOSAL_INSERTION_RESOLVED; insertion: Insertion }>;
export type ProposalInsertionFailedSortableEvent = SpatialCurrency &
  Readonly<{ type: typeof PROPOSAL_INSERTION_FAILED; error: unknown }>;
export type ReorderResolvedSortableEvent = ResolutionCurrency &
  Readonly<{ type: typeof REORDER_RESOLVED; resolution: ReorderResolution }>;
export type ReorderResolutionFailedSortableEvent = ResolutionCurrency &
  Readonly<{ type: typeof REORDER_RESOLUTION_FAILED; error: unknown }>;
export type InteractionStoppedSortableEvent = Readonly<{
  type: typeof INTERACTION_STOPPED;
  operationId: number;
}>;
export type PresentationSettledSortableEvent = ResolutionCurrency &
  Readonly<{ type: typeof PRESENTATION_SETTLED; error?: unknown }>;
export type LandingPlanResolvedSortableEvent = LandingCurrency &
  Readonly<{ type: typeof LANDING_PLAN_RESOLVED; plan: LandingPlan }>;
export type LandingPlanFailedSortableEvent = LandingCurrency &
  Readonly<{ type: typeof LANDING_PLAN_FAILED; error: unknown }>;
export type LandingStartedSortableEvent = LandingCurrency &
  Readonly<{ type: typeof LANDING_STARTED }>;
export type LandingTimingFailedSortableEvent = LandingCurrency &
  Readonly<{ type: typeof LANDING_TIMING_FAILED; error: unknown }>;
export type LandingAnimationCreateFailedSortableEvent = LandingCurrency &
  Readonly<{ type: typeof LANDING_ANIMATION_CREATE_FAILED; error: unknown }>;
export type LandingFinishedSortableEvent = LandingCurrency &
  Readonly<{ type: typeof LANDING_FINISHED }>;
export type LandingFailedSortableEvent = LandingCurrency &
  Readonly<{ type: typeof LANDING_FAILED; error: unknown }>;
export type LandingPinnedSortableEvent = LandingCurrency &
  Readonly<{ type: typeof LANDING_PINNED }>;
export type LandingPinFailedSortableEvent = LandingCurrency &
  Readonly<{ type: typeof LANDING_PIN_FAILED; error: unknown }>;
export type MotionPresentationFailedSortableEvent = MotionCurrency &
  Readonly<{
    type: typeof MOTION_PRESENTATION_FAILED;
    error: unknown;
  }>;
export type PlaceholderWriteFailedSortableEvent = Readonly<{
  type: typeof PLACEHOLDER_WRITE_FAILED;
  operationId: number;
  error: unknown;
}>;
export type FailureReportedSortableEvent = Readonly<{
  type: typeof FAILURE_REPORTED;
  operationId: number;
}>;
export type FinalizationCompletedSortableEvent = Readonly<{
  type: typeof FINALIZATION_COMPLETED;
  operationId: number;
}>;
export type FinalizationFailedSortableEvent = Readonly<{
  type: typeof FINALIZATION_FAILED;
  operationId: number;
  error: unknown;
}>;

export type SortableEvent =
  | AdmitPointerSortableEvent
  | AdmitKeyboardSortableEvent
  | PointerMovedSortableEvent
  | PointerReleasedSortableEvent
  | OperationCanceledSortableEvent
  | CollectionUpdatedSortableEvent
  | OperationArmedSortableEvent
  | OperationArmFailedSortableEvent
  | ActivationReadySortableEvent
  | ActivationFailedSortableEvent
  | StartSucceededSortableEvent
  | StartFailedSortableEvent
  | ActiveInsertionResolvedSortableEvent
  | ActiveInsertionFailedSortableEvent
  | ProposalInsertionResolvedSortableEvent
  | ProposalInsertionFailedSortableEvent
  | ReorderResolvedSortableEvent
  | ReorderResolutionFailedSortableEvent
  | InteractionStoppedSortableEvent
  | PresentationSettledSortableEvent
  | LandingPlanResolvedSortableEvent
  | LandingPlanFailedSortableEvent
  | LandingStartedSortableEvent
  | LandingTimingFailedSortableEvent
  | LandingAnimationCreateFailedSortableEvent
  | LandingFinishedSortableEvent
  | LandingFailedSortableEvent
  | LandingPinnedSortableEvent
  | LandingPinFailedSortableEvent
  | MotionPresentationFailedSortableEvent
  | PlaceholderWriteFailedSortableEvent
  | FailureReportedSortableEvent
  | FinalizationCompletedSortableEvent
  | FinalizationFailedSortableEvent;
