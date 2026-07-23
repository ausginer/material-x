import type { InvalidationSource } from '../../kernel/invalidation.ts';
import type { PointerSource } from '../../kernel/pointer.ts';
import type { FailureCause, LandingPlan } from '../../kernel/protocol.ts';
import type { DOMRealm } from '../../kernel/realm.ts';
import type { Decision } from '../../kernel/session.ts';
import type { AnimationTiming, Point } from '../../kernel/types.ts';
import type {
  CollectionSnapshot,
  Insertion,
  ReorderProposal,
  ReorderTransactionResult,
  SortableOptions,
} from '../options.ts';
import type {
  ActiveSortableOperation,
  LandingCurrency,
  MotionCurrency,
  OperationCurrency,
  ResolutionCurrency,
  SortableOperation,
  SortableState,
  SpatialCurrency,
} from './state.ts';

export const BEGIN_POINTER_OPERATION = 360;
export const BEGIN_KEYBOARD_OPERATION = 361;
export const DISARM_OPERATION = 362;
export const ACQUIRE_SORTABLE_ACTIVATION = 363;
export const INVOKE_START = 364;
export const PRESENT_MOTION = 365;
export const RESOLVE_ACTIVE_INSERTION = 366;
export const PLACE_COMMITTED_INSERTION = 367;
export const RESOLVE_PROPOSAL_INSERTION = 368;
export const OPEN_REORDER_RESOLUTION = 369;
export const STOP_INTERACTION = 370;
export const WATCH_PRESENTATION = 371;
export const PREPARE_SORTABLE_LANDING = 372;
export const START_LANDING = 373;
export const PIN_LANDING = 374;
export const REPORT_FAILURE = 375;
export const FINALIZE_OPERATION = 376;
export const RETIRE_OPERATION = 377;

export type SpatialRequest = SpatialCurrency &
  Readonly<{
    snapshot: CollectionSnapshot;
    item: HTMLElement;
    point: Point;
    incumbent: Insertion | null;
    keyboard: boolean;
  }>;

export type SortableEffect =
  | (OperationCurrency &
      Readonly<{
        type: typeof BEGIN_POINTER_OPERATION;
        pointerId: number;
      }>)
  | (OperationCurrency & Readonly<{ type: typeof BEGIN_KEYBOARD_OPERATION }>)
  | (OperationCurrency & Readonly<{ type: typeof DISARM_OPERATION }>)
  | (OperationCurrency &
      Readonly<{
        type: typeof ACQUIRE_SORTABLE_ACTIVATION;
        operation: SortableOperation;
      }>)
  | (OperationCurrency &
      Readonly<{
        type: typeof INVOKE_START;
        item: HTMLElement;
        callback: SortableOptions['onStart'];
      }>)
  | (MotionCurrency &
      Readonly<{
        type: typeof PRESENT_MOTION;
        origin: Point;
        point: Point;
      }>)
  | Readonly<{ type: typeof RESOLVE_ACTIVE_INSERTION; request: SpatialRequest }>
  | (OperationCurrency &
      Readonly<{
        type: typeof PLACE_COMMITTED_INSERTION;
        insertion: Insertion;
      }>)
  | Readonly<{
      type: typeof RESOLVE_PROPOSAL_INSERTION;
      request: SpatialRequest;
    }>
  | (ResolutionCurrency &
      Readonly<{
        type: typeof OPEN_REORDER_RESOLUTION;
        proposal: ReorderProposal;
        callback: SortableOptions['onReorder'];
      }>)
  | (OperationCurrency & Readonly<{ type: typeof STOP_INTERACTION }>)
  | (ResolutionCurrency &
      Readonly<{
        type: typeof WATCH_PRESENTATION;
        ready: PromiseLike<void>;
      }>)
  | (LandingCurrency &
      Readonly<{
        type: typeof PREPARE_SORTABLE_LANDING;
        operation: ActiveSortableOperation;
        recovery: number;
      }>)
  | (LandingCurrency &
      Readonly<{
        type: typeof START_LANDING;
        plan: LandingPlan;
        timing: (() => AnimationTiming) | undefined;
      }>)
  | (LandingCurrency & Readonly<{ type: typeof PIN_LANDING }>)
  | (OperationCurrency &
      Readonly<{
        type: typeof REPORT_FAILURE;
        cause: FailureCause;
        error: unknown;
        domain: ReorderTransactionResult | null;
        callback: SortableOptions['onError'];
      }>)
  | (OperationCurrency &
      Readonly<{
        type: typeof FINALIZE_OPERATION;
        callback: (() => void) | undefined;
        failureCause: FailureCause;
      }>)
  | (OperationCurrency & Readonly<{ type: typeof RETIRE_OPERATION }>);

export type BeginPointerOperationEffect = Extract<
  SortableEffect,
  Readonly<{ type: typeof BEGIN_POINTER_OPERATION }>
>;
export type BeginKeyboardOperationEffect = Extract<
  SortableEffect,
  Readonly<{ type: typeof BEGIN_KEYBOARD_OPERATION }>
>;
export type DisarmOperationEffect = Extract<
  SortableEffect,
  Readonly<{ type: typeof DISARM_OPERATION }>
>;
export type AcquireSortableActivationEffect = Extract<
  SortableEffect,
  Readonly<{ type: typeof ACQUIRE_SORTABLE_ACTIVATION }>
>;
export type InvokeStartEffect = Extract<
  SortableEffect,
  Readonly<{ type: typeof INVOKE_START }>
>;
export type PresentMotionEffect = Extract<
  SortableEffect,
  Readonly<{ type: typeof PRESENT_MOTION }>
>;
export type ResolveActiveInsertionEffect = Extract<
  SortableEffect,
  Readonly<{ type: typeof RESOLVE_ACTIVE_INSERTION }>
>;
export type PlaceCommittedInsertionEffect = Extract<
  SortableEffect,
  Readonly<{ type: typeof PLACE_COMMITTED_INSERTION }>
>;
export type ResolveProposalInsertionEffect = Extract<
  SortableEffect,
  Readonly<{ type: typeof RESOLVE_PROPOSAL_INSERTION }>
>;
export type OpenReorderResolutionEffect = Extract<
  SortableEffect,
  Readonly<{ type: typeof OPEN_REORDER_RESOLUTION }>
>;
export type StopInteractionEffect = Extract<
  SortableEffect,
  Readonly<{ type: typeof STOP_INTERACTION }>
>;
export type WatchPresentationEffect = Extract<
  SortableEffect,
  Readonly<{ type: typeof WATCH_PRESENTATION }>
>;
export type PrepareSortableLandingEffect = Extract<
  SortableEffect,
  Readonly<{ type: typeof PREPARE_SORTABLE_LANDING }>
>;
export type StartLandingEffect = Extract<
  SortableEffect,
  Readonly<{ type: typeof START_LANDING }>
>;
export type PinLandingEffect = Extract<
  SortableEffect,
  Readonly<{ type: typeof PIN_LANDING }>
>;
export type ReportFailureEffect = Extract<
  SortableEffect,
  Readonly<{ type: typeof REPORT_FAILURE }>
>;
export type FinalizeOperationEffect = Extract<
  SortableEffect,
  Readonly<{ type: typeof FINALIZE_OPERATION }>
>;
export type RetireOperationEffect = Extract<
  SortableEffect,
  Readonly<{ type: typeof RETIRE_OPERATION }>
>;

export type SortableDecision = Decision<SortableState, SortableEffect>;

export type SortableMachineConfig = Readonly<{
  threshold: number;
  onStart: SortableOptions['onStart'];
  onReorder: SortableOptions['onReorder'];
  onFinish: SortableOptions['onFinish'];
  onCancel: SortableOptions['onCancel'];
  onError: SortableOptions['onError'];
  landingTiming: SortableOptions['landingTiming'];
}>;

export type SortableEffectDeps = Readonly<{
  realm: DOMRealm;
  pointerSource: PointerSource;
  invalidation: InvalidationSource;
  getVisual(item: HTMLElement): HTMLElement;
  createPlaceholder: SortableOptions['createPlaceholder'];
}>;
