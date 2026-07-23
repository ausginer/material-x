import type { InvalidationSource } from '../../kernel/invalidation.ts';
import type { PointerSource } from '../../kernel/pointer.ts';
import type { FailureCause, LandingPlan } from '../../kernel/protocol.ts';
import type { DOMRealm } from '../../kernel/realm.ts';
import type { Decision } from '../../kernel/session.ts';
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
  LiftMode,
  OnDrop,
  ResolveFreeHomeTarget,
} from '../options.ts';
import type {
  DraggableState,
  LandingCurrency,
  MotionCurrency,
  OperationCurrency,
  ResolutionCurrency,
  TerminalOutcome,
} from './state.ts';

export const BEGIN_POINTER_OPERATION = 260;
export const DISARM_OPERATION = 261;
export const ACQUIRE_FREE_ACTIVATION = 262;
export const INVOKE_START = 263;
export const OBSERVE_FREE_MOTION = 264;
export const OBSERVE_CONTROLLED_POSITION = 265;
export const RESOLVE_FREE_RELEASE = 266;
export const PRESENT_MOTION = 267;
export const INVOKE_MOVE = 268;
export const OPEN_DROP_RESOLUTION = 269;
export const STOP_INTERACTION = 270;
export const WATCH_PRESENTATION = 271;
export const PREPARE_FREE_LANDING = 272;
export const START_LANDING = 273;
export const PIN_LANDING = 274;
export const REPORT_FAILURE = 275;
export const FINALIZE_OPERATION = 276;
export const RETIRE_OPERATION = 277;

export type GeometryRequest = Readonly<{
  pointer: Point;
  originPointer: Point;
  viewportDelta: Point;
  originRect: DOMRectReadOnly;
  coordinateSpace: CoordinateMapper;
}>;

export type BeginPointerOperationEffect = OperationCurrency &
  Readonly<{ type: typeof BEGIN_POINTER_OPERATION; pointerId: number }>;

export type DisarmOperationEffect = OperationCurrency &
  Readonly<{ type: typeof DISARM_OPERATION }>;

export type AcquireFreeActivationEffect = OperationCurrency &
  Readonly<{
    type: typeof ACQUIRE_FREE_ACTIVATION;
    pointerId: number;
    originPointer: Point;
    latestPointer: Point;
    coordinateSpace: CoordinateMapper | null;
  }>;

export type InvokeStartEffect = OperationCurrency &
  Readonly<{
    type: typeof INVOKE_START;
    geometry: GeometryRequest;
    callback: DraggableOptions['onStart'];
  }>;

export type ObserveFreeMotionEffect = MotionCurrency &
  Readonly<{
    type: typeof OBSERVE_FREE_MOTION;
    bounds: DragBounds | undefined;
    boundsVersion: number;
    refresh: boolean;
  }>;

export type ObserveControlledPositionEffect = MotionCurrency &
  Readonly<{
    type: typeof OBSERVE_CONTROLLED_POSITION;
    position: Point;
    originRect: DOMRectReadOnly;
    coordinateSpace: CoordinateMapper;
  }>;

export type ResolveFreeReleaseEffect = MotionCurrency &
  Readonly<{
    type: typeof RESOLVE_FREE_RELEASE;
    item: HTMLElement;
    visual: HTMLElement;
    point: Point;
    originPointer: Point;
    originRect: DOMRectReadOnly;
    coordinateSpace: CoordinateMapper;
    axis: DragAxis;
    bounds: DragBounds | undefined;
    boundsVersion: number;
  }>;

export type PresentMotionEffect = MotionCurrency &
  Readonly<{ type: typeof PRESENT_MOTION; viewportDelta: Point }>;

export type InvokeMoveEffect = MotionCurrency &
  Readonly<{
    type: typeof INVOKE_MOVE;
    callback: NonNullable<DraggableOptions['onMove']>;
    geometry: GeometryRequest;
  }>;

export type OpenDropResolutionEffect = ResolutionCurrency &
  Readonly<{
    type: typeof OPEN_DROP_RESOLUTION;
    request: FreeDropRequest;
    callback: OnDrop;
  }>;

export type StopInteractionEffect = OperationCurrency &
  Readonly<{ type: typeof STOP_INTERACTION }>;

export type WatchPresentationEffect = ResolutionCurrency &
  Readonly<{ type: typeof WATCH_PRESENTATION; ready: PromiseLike<void> }>;

export type PrepareFreeLandingEffect = LandingCurrency &
  Readonly<{
    type: typeof PREPARE_FREE_LANDING;
    item: HTMLElement;
    visual: HTMLElement;
    viewportDelta: Point;
    originRect: DOMRectReadOnly;
    resolve: ResolveFreeHomeTarget;
  }>;

export type StartLandingEffect = LandingCurrency &
  Readonly<{
    type: typeof START_LANDING;
    plan: LandingPlan;
    timing: (() => AnimationTiming) | undefined;
  }>;

export type PinLandingEffect = LandingCurrency &
  Readonly<{ type: typeof PIN_LANDING }>;

export type ReportFailureEffect = OperationCurrency &
  Readonly<{
    type: typeof REPORT_FAILURE;
    cause: FailureCause;
    error: unknown;
    domain: FreeDropResult | null;
    callback: DraggableOptions['onError'];
  }>;

export type FinalizeOperationEffect = OperationCurrency &
  Readonly<{
    type: typeof FINALIZE_OPERATION;
    terminal: TerminalOutcome;
    onFinish: DraggableOptions['onFinish'];
    onCancel: DraggableOptions['onCancel'];
  }>;

export type RetireOperationEffect = OperationCurrency &
  Readonly<{ type: typeof RETIRE_OPERATION }>;

export type DraggableEffect =
  | BeginPointerOperationEffect
  | DisarmOperationEffect
  | AcquireFreeActivationEffect
  | InvokeStartEffect
  | ObserveFreeMotionEffect
  | ObserveControlledPositionEffect
  | ResolveFreeReleaseEffect
  | PresentMotionEffect
  | InvokeMoveEffect
  | OpenDropResolutionEffect
  | StopInteractionEffect
  | WatchPresentationEffect
  | PrepareFreeLandingEffect
  | StartLandingEffect
  | PinLandingEffect
  | ReportFailureEffect
  | FinalizeOperationEffect
  | RetireOperationEffect;

export type DraggableDecision = Decision<DraggableState, DraggableEffect>;

export type DraggableMachineConfig = Readonly<{
  threshold: number;
  hasHomeTarget: boolean;
  resolveHomeTarget: ResolveFreeHomeTarget | undefined;
  onStart: DraggableOptions['onStart'];
  onDrop: OnDrop;
  onFinish: DraggableOptions['onFinish'];
  onCancel: DraggableOptions['onCancel'];
  onError: DraggableOptions['onError'];
}>;

export type DraggableEffectDeps = Readonly<{
  item: HTMLElement;
  visual: HTMLElement;
  realm: DOMRealm;
  pointerSource: PointerSource;
  invalidation: InvalidationSource;
  lift: LiftMode | undefined;
}>;
