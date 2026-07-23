import type {
  OUTCOME_ACCEPTED,
  OUTCOME_CANCELED,
  OUTCOME_FAILED,
  OUTCOME_REJECTED,
  RECOVERY_HOME,
  RECOVERY_IMMEDIATE,
  FailureCause,
  LandingPlan,
} from '../../kernel/protocol.ts';
import type {
  AnimationTiming,
  CoordinateMapper,
  DragAxis,
  FreeDropRequest,
  Point,
} from '../../kernel/types.ts';
import type {
  DragBounds,
  DraggableOptions,
  FreeDropResult,
} from '../options.ts';

export const DRAG_IDLE = 200;
export const DRAG_PENDING_ARMING = 201;
export const DRAG_PENDING = 202;
export const DRAG_ACQUIRING = 203;
export const DRAG_STARTING = 204;
export const DRAGGING = 205;
export const DRAG_RESOLVING_RELEASE = 206;
export const DRAG_AWAITING_CONSUMER = 207;
export const DRAG_SETTLING = 208;
export const DRAG_REPORTING_FAILURE = 209;
export const DRAG_FINALIZING = 210;

export const LANDING_ABSENT = 0;
export const LANDING_PREPARING = 1;
export const LANDING_STARTING = 2;
export const LANDING_RUNNING = 3;
export const LANDING_COMPLETING = 4;
export const LANDING_TERMINAL = 5;

export const PRESENTATION_ABSENT = 0;
export const PRESENTATION_WATCHING = 1;
export const PRESENTATION_TERMINAL = 2;

export type OperationCurrency = Readonly<{
  operationId: number;
}>;

export type MotionCurrency = Readonly<{
  operationId: number;
  motionId: number;
}>;

export type ResolutionCurrency = Readonly<{
  operationId: number;
  resolutionId: number;
}>;

export type LandingCurrency = Readonly<{
  operationId: number;
  landingId: number;
}>;

export type DraggablePolicy = Readonly<{
  axis: DragAxis;
  bounds: DragBounds | undefined;
  boundsVersion: number;
  coordinateSpace: CoordinateMapper | null;
  landingTiming: (() => AnimationTiming) | undefined;
  onMove: DraggableOptions['onMove'];
}>;

export type PendingOperation = OperationCurrency &
  Readonly<{
    item: HTMLElement;
    visual: HTMLElement;
    pointerId: number;
    originPointer: Point;
    latestPointer: Point;
    nextMotionId: number;
    nextResolutionId: number;
    nextLandingId: number;
  }>;

export type ActiveOperation = PendingOperation &
  Readonly<{
    originRect: DOMRectReadOnly;
    coordinateSpace: CoordinateMapper;
    viewportDelta: Point;
  }>;

export type IdleLifecycle = Readonly<{
  phase: typeof DRAG_IDLE;
}>;

export type PendingLifecycle = Readonly<{
  phase: typeof DRAG_PENDING_ARMING | typeof DRAG_PENDING;
  operation: PendingOperation;
}>;

export type AcquiringLifecycle = Readonly<{
  phase: typeof DRAG_ACQUIRING;
  operation: PendingOperation;
}>;

export type StartingLifecycle = Readonly<{
  phase: typeof DRAG_STARTING;
  operation: ActiveOperation;
}>;

export type PendingMotion = Readonly<{
  currency: MotionCurrency;
  point: Point;
  refresh: boolean;
  axis: DragAxis;
  coordinateSpace: CoordinateMapper;
  callback: DraggableOptions['onMove'];
}>;

export type DraggingLifecycle = Readonly<{
  phase: typeof DRAGGING;
  operation: ActiveOperation;
  pendingMotion: PendingMotion | null;
}>;

export type ResolvingReleaseLifecycle = Readonly<{
  phase: typeof DRAG_RESOLVING_RELEASE;
  operation: ActiveOperation;
  currency: MotionCurrency;
  point: Point;
}>;

export type DropProposal = Readonly<{
  request: FreeDropRequest;
  coordinateSpace: CoordinateMapper;
}>;

export type AwaitingConsumerLifecycle = Readonly<{
  phase: typeof DRAG_AWAITING_CONSUMER;
  operation: ActiveOperation;
  currency: ResolutionCurrency;
  proposal: DropProposal;
}>;

export type LandingGate =
  | Readonly<{ stage: typeof LANDING_ABSENT }>
  | Readonly<{
      stage: typeof LANDING_PREPARING;
      currency: LandingCurrency;
    }>
  | Readonly<{
      stage: typeof LANDING_STARTING;
      currency: LandingCurrency;
      plan: LandingPlan;
    }>
  | Readonly<{
      stage: typeof LANDING_RUNNING;
      currency: LandingCurrency;
      plan: LandingPlan;
    }>
  | Readonly<{
      stage: typeof LANDING_COMPLETING;
      currency: LandingCurrency;
      plan: LandingPlan;
    }>
  | Readonly<{ stage: typeof LANDING_TERMINAL }>;

export type PresentationGate =
  | Readonly<{ stage: typeof PRESENTATION_ABSENT }>
  | Readonly<{
      stage: typeof PRESENTATION_WATCHING;
      currency: ResolutionCurrency;
    }>
  | Readonly<{ stage: typeof PRESENTATION_TERMINAL }>;

export type TerminalOutcome = Readonly<{
  result:
    | typeof OUTCOME_ACCEPTED
    | typeof OUTCOME_REJECTED
    | typeof OUTCOME_CANCELED
    | typeof OUTCOME_FAILED;
  domain: FreeDropResult | null;
}>;

export type SettlingLifecycle = Readonly<{
  phase: typeof DRAG_SETTLING;
  operation: ActiveOperation;
  outcome: TerminalOutcome;
  recovery: typeof RECOVERY_HOME | typeof RECOVERY_IMMEDIATE;
  interactionStopped: boolean;
  landing: LandingGate;
  presentation: PresentationGate;
}>;

export type FinalizingLifecycle = Readonly<{
  phase: typeof DRAG_FINALIZING;
  operation: ActiveOperation;
  terminal: TerminalOutcome;
}>;

export type FailureContinuation = IdleLifecycle | SettlingLifecycle;

export type ReportingFailureLifecycle = Readonly<{
  phase: typeof DRAG_REPORTING_FAILURE;
  operation: ActiveOperation | PendingOperation;
  cause: FailureCause;
  error: unknown;
  domain: FreeDropResult | null;
  continuation: FailureContinuation;
}>;

export type DraggableLifecycle =
  | IdleLifecycle
  | PendingLifecycle
  | AcquiringLifecycle
  | StartingLifecycle
  | DraggingLifecycle
  | ResolvingReleaseLifecycle
  | AwaitingConsumerLifecycle
  | SettlingLifecycle
  | ReportingFailureLifecycle
  | FinalizingLifecycle;

type DraggableStateCore = Readonly<{
  policy: DraggablePolicy;
  nextOperationId: number;
}>;

export type PhaseDraggableState<Lifecycle extends DraggableLifecycle> =
  DraggableStateCore & Lifecycle;

export type IdleDraggableState = PhaseDraggableState<IdleLifecycle>;
export type PendingDraggableState = PhaseDraggableState<PendingLifecycle>;
export type AcquiringDraggableState = PhaseDraggableState<AcquiringLifecycle>;
export type StartingDraggableState = PhaseDraggableState<StartingLifecycle>;
export type ActiveDraggableState = PhaseDraggableState<DraggingLifecycle>;
export type ResolvingReleaseDraggableState =
  PhaseDraggableState<ResolvingReleaseLifecycle>;
export type AwaitingConsumerDraggableState =
  PhaseDraggableState<AwaitingConsumerLifecycle>;
export type SettlingDraggableState = PhaseDraggableState<SettlingLifecycle>;
export type ReportingDraggableState =
  PhaseDraggableState<ReportingFailureLifecycle>;
export type FinalizingDraggableState = PhaseDraggableState<FinalizingLifecycle>;

export type DraggableState =
  | IdleDraggableState
  | PendingDraggableState
  | AcquiringDraggableState
  | StartingDraggableState
  | ActiveDraggableState
  | ResolvingReleaseDraggableState
  | AwaitingConsumerDraggableState
  | SettlingDraggableState
  | ReportingDraggableState
  | FinalizingDraggableState;

export type ActivationCandidate = Readonly<{
  originRect: DOMRectReadOnly;
  coordinateSpace: CoordinateMapper;
}>;
