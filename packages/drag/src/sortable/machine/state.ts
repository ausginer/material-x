import type {
  FailureCause,
  LandingPlan,
  OUTCOME_ACCEPTED,
  OUTCOME_CANCELED,
  OUTCOME_FAILED,
  OUTCOME_NO_OP,
  OUTCOME_REJECTED,
  RECOVERY_DESTINATION,
  RECOVERY_HOME,
  RECOVERY_IMMEDIATE,
} from '../../kernel/protocol.ts';
import type { Point } from '../../kernel/types.ts';
import type {
  CollectionSnapshot,
  Insertion,
  ReorderProposal,
  ReorderTransactionResult,
} from '../options.ts';

export const SORTABLE_IDLE = 300;
export const SORTABLE_PENDING = 301;
export const SORTABLE_ACTIVATING = 302;
export const SORTABLE_ACTIVE = 303;
export const SORTABLE_SPATIAL = 304;
export const SORTABLE_RESOLVING = 305;
export const SORTABLE_SETTLING = 306;
export const SORTABLE_REPORTING = 307;
export const SORTABLE_FINALIZING = 308;

export const INPUT_POINTER = 0;
export const INPUT_KEYBOARD = 1;

export const LANDING_ABSENT = 0;
export const LANDING_PREPARING = 1;
export const LANDING_STARTING = 2;
export const LANDING_RUNNING = 3;
export const LANDING_COMPLETING = 4;
export const LANDING_TERMINAL = 5;

export const PRESENTATION_ABSENT = 0;
export const PRESENTATION_WATCHING = 1;
export const PRESENTATION_TERMINAL = 2;

export type OperationCurrency = Readonly<{ operationId: number }>;
export type SpatialCurrency = Readonly<{
  operationId: number;
  collectionVersion: number;
  spatialId: number;
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

export type PointerInput = Readonly<{
  type: typeof INPUT_POINTER;
  pointerId: number;
}>;

export type KeyboardInput = Readonly<{ type: typeof INPUT_KEYBOARD }>;

export type SortableOperation = OperationCurrency &
  Readonly<{
    input: PointerInput | KeyboardInput;
    item: HTMLElement;
    visual: HTMLElement;
    snapshot: CollectionSnapshot;
    originPoint: Point;
    latestPoint: Point;
    insertion: Insertion | null;
    nextSpatialId: number;
    nextMotionId: number;
    nextResolutionId: number;
    nextLandingId: number;
  }>;

export type ActiveSortableOperation = SortableOperation &
  Readonly<{
    activationVersion: number;
    activationIndex: number;
  }>;

export type TerminalOutcome = Readonly<{
  result:
    | typeof OUTCOME_ACCEPTED
    | typeof OUTCOME_REJECTED
    | typeof OUTCOME_CANCELED
    | typeof OUTCOME_NO_OP
    | typeof OUTCOME_FAILED;
  domain: ReorderTransactionResult | null;
}>;

export type LandingGate =
  | Readonly<{ stage: typeof LANDING_ABSENT }>
  | Readonly<{ stage: typeof LANDING_PREPARING; currency: LandingCurrency }>
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

export type IdleSortableState = Readonly<{
  phase: typeof SORTABLE_IDLE;
  nextOperationId: number;
}>;

export type PendingSortableState = Readonly<{
  phase: typeof SORTABLE_PENDING;
  nextOperationId: number;
  operation: SortableOperation;
}>;

export type ActivatingSortableState = Readonly<{
  phase: typeof SORTABLE_ACTIVATING;
  nextOperationId: number;
  operation: SortableOperation | ActiveSortableOperation;
  stage: 'acquiring' | 'starting';
}>;

export type ActiveSortableState = Readonly<{
  phase: typeof SORTABLE_ACTIVE;
  nextOperationId: number;
  operation: ActiveSortableOperation;
  pendingSpatial: SpatialCurrency | null;
  latestMotion: MotionCurrency;
}>;

export type SpatialSortableState = Readonly<{
  phase: typeof SORTABLE_SPATIAL;
  nextOperationId: number;
  operation: ActiveSortableOperation;
  currency: SpatialCurrency;
  incumbent: Insertion | null;
}>;

export type ResolvingSortableState = Readonly<{
  phase: typeof SORTABLE_RESOLVING;
  nextOperationId: number;
  operation: ActiveSortableOperation;
  currency: ResolutionCurrency;
  proposal: ReorderProposal;
}>;

export type SettlingSortableState = Readonly<{
  phase: typeof SORTABLE_SETTLING;
  nextOperationId: number;
  operation: ActiveSortableOperation;
  outcome: TerminalOutcome;
  recovery:
    | typeof RECOVERY_DESTINATION
    | typeof RECOVERY_HOME
    | typeof RECOVERY_IMMEDIATE;
  interactionStopped: boolean;
  landing: LandingGate;
  presentation: PresentationGate;
}>;

export type FailureContinuation = IdleSortableState | SettlingSortableState;

export type ReportingSortableState = Readonly<{
  phase: typeof SORTABLE_REPORTING;
  nextOperationId: number;
  operation: SortableOperation | ActiveSortableOperation;
  cause: FailureCause;
  error: unknown;
  domain: ReorderTransactionResult | null;
  continuation: FailureContinuation;
}>;

export type FinalizingSortableState = Readonly<{
  phase: typeof SORTABLE_FINALIZING;
  nextOperationId: number;
  operation: ActiveSortableOperation;
  terminal: TerminalOutcome;
  failureCause: FailureCause;
}>;

export type SortableState =
  | IdleSortableState
  | PendingSortableState
  | ActivatingSortableState
  | ActiveSortableState
  | SpatialSortableState
  | ResolvingSortableState
  | SettlingSortableState
  | ReportingSortableState
  | FinalizingSortableState;
