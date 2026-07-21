/**
 * The authoritative draggable root reducer. `transitionDraggable` classifies the
 * original event, obtains a phase decision from the shared kernel protocol, then
 * computes each semantic slice through a parallel pure projection over the same
 * immutable `from`, event, classification, and phase. Exactly one complete next
 * state is committed per meaningful transition; an event that changes nothing
 * returns `from`, preserving the session's no-effect guard.
 *
 * Effects never mutate these slices — they dispatch typed, currency-tagged result
 * events, which the reducer accepts or ignores against current state.
 */
import type { OperationIdentitySource } from '../kernel/operation-id.ts';
import type { LiftMode } from '../kernel/presentation.ts';
import {
  CANCEL_ESCAPE,
  type CancellationReason,
  type DragPhase,
  FAILURE_DROP_RESOLUTION,
  FAILURE_HOME_TARGET,
  FAILURE_PRESENTATION_READY,
  type FailureCause,
  isLandingSettled,
  LANDING_COMPLETING,
  LANDING_PREPARING,
  LANDING_RUNNING,
  LANDING_SETTLED,
  LANDING_SKIPPED,
  type LandingCurrency,
  sameLanding,
  type LandingPlan,
  type LandingState,
  LIFECYCLE_ACTIVATE,
  LIFECYCLE_ACTIVATION_FAILED,
  LIFECYCLE_ACTIVATION_READY,
  LIFECYCLE_ADMIT,
  LIFECYCLE_CANCEL,
  LIFECYCLE_DISARM,
  LIFECYCLE_IGNORE,
  LIFECYCLE_MOVE,
  LIFECYCLE_RELEASE,
  LIFECYCLE_RESOLVED,
  LIFECYCLE_SETTLE_COMPLETE,
  LIFECYCLE_SETTLE_PROGRESS,
  LIFECYCLE_START_SUCCEEDED,
  type LifecycleEvent,
  OPERATION_ACTIVE,
  OPERATION_ADMITTED,
  OPERATION_CANDIDATE,
  OUTCOME_ACCEPTED,
  OUTCOME_CANCELED,
  OUTCOME_FAILED,
  OUTCOME_REJECTED,
  PHASE_AWAITING_RESULT,
  PHASE_DRAGGING,
  PHASE_IDLE,
  PHASE_PENDING,
  PHASE_SETTLING,
  type PointerSample,
  type PointerState,
  PRESENTATION_PENDING,
  PRESENTATION_READY,
  type PresentationReadiness,
  RECOVERY_HOME,
  RECOVERY_IMMEDIATE,
  type ResolutionCurrency,
  type SettlementRecovery,
  type SettlementState,
  transitionKernelPhase,
} from '../kernel/protocol.ts';
import type { DOMRealm } from '../kernel/realm.ts';
import {
  AXIS_BOTH,
  type CoordinateMapper,
  type DragAxis,
  type DragSubject,
  ORIGIN,
  type Point,
} from '../kernel/types.ts';
import { pointerDelta } from './motion.ts';
import type {
  FreeDropProposal,
  FreeDropResolution,
  FreeDropResult,
} from './options.ts';
import { buildFreeDropProposal } from './request.ts';

export const INVALIDATE: unique symbol = Symbol('invalidate');
export const CONTROLLED: unique symbol = Symbol('controlled');
export const SET_POLICY: unique symbol = Symbol('set-policy');
export const EFFECT_FAILED: unique symbol = Symbol('effect-failed');
export const RESOLUTION_STARTED: unique symbol = Symbol('resolution-started');
export const DROP_RESOLVED: unique symbol = Symbol('drop-resolved');
export const DROP_RESOLUTION_FAILED: unique symbol = Symbol(
  'drop-resolution-failed',
);
export const LANDING_PLAN_READY: unique symbol = Symbol('landing-plan-ready');
export const LANDING_STARTED: unique symbol = Symbol('landing-started');
export const LANDING_FINISHED: unique symbol = Symbol('landing-finished');
export const LANDING_PINNED: unique symbol = Symbol('landing-pinned');
export const SETTLEMENT_FAILED: unique symbol = Symbol('settlement-failed');
export const SETTLEMENT_COMPLETED: unique symbol = Symbol(
  'settlement-completed',
);
export const HOME_INVALID: unique symbol = Symbol('home-invalid');
export const PRESENTATION_SETTLED: unique symbol = Symbol(
  'presentation-settled',
);
export const DROP_NONE: unique symbol = Symbol('none');
export const DROP_PROPOSAL_READY: unique symbol = Symbol('proposal-ready');
export const DROP_AWAITING_CONSUMER: unique symbol =
  Symbol('awaiting-consumer');

// --- Semantic slices -------------------------------------------------------

/** Immutable activation snapshot committed when acquisition succeeds. */
export type FreeCandidate = Readonly<{
  visual: HTMLElement;
  lift: LiftMode;
  originRect: DOMRectReadOnly;
  coordinateSpace: CoordinateMapper;
}>;

export type AdmittedFreeOperation = Readonly<{
  type: typeof OPERATION_ADMITTED;
  operationId: number;
  item: HTMLElement;
}>;

export type AcquiredFreeOperation = DragSubject &
  Readonly<{
    type: typeof OPERATION_CANDIDATE | typeof OPERATION_ACTIVE;
    operationId: number;
    lift: LiftMode;
    originRect: DOMRectReadOnly;
    coordinateSpace: CoordinateMapper;
  }>;

export type FreeOperation = AdmittedFreeOperation | AcquiredFreeOperation;

export type FreePolicy = Readonly<{
  axis: DragAxis;
  coordinateOverride: CoordinateMapper | null;
}>;

export type FreeMotion = Readonly<{ viewportDelta: Point }>;

export type NoneFreeDropState = Readonly<{ stage: typeof DROP_NONE }>;

export type ProposalReadyFreeDropState = Readonly<{
  stage: typeof DROP_PROPOSAL_READY;
  proposal: FreeDropProposal;
}>;

export type AwaitingConsumerFreeDropState = Readonly<{
  stage: typeof DROP_AWAITING_CONSUMER;
  proposal: FreeDropProposal;
  resolutionId: number;
}>;

export type FreeDropState =
  | NoneFreeDropState
  | ProposalReadyFreeDropState
  | AwaitingConsumerFreeDropState;

export type DraggableState = Readonly<{
  phase: DragPhase;
  pointer: PointerState | null;
  policy: FreePolicy;
  operation: FreeOperation | null;
  motion: FreeMotion | null;
  drop: FreeDropState;
  settlement: SettlementState<FreeDropResult> | null;
}>;

// --- Events ----------------------------------------------------------------

export type AdmitDraggableEvent = PointerSample &
  Readonly<{
    type: typeof LIFECYCLE_ADMIT;
    operationId: number;
    item: HTMLElement;
  }>;

export type MoveDraggableEvent = PointerSample &
  Readonly<{
    type: typeof LIFECYCLE_MOVE;
    bounds: DOMRectReadOnly | null;
  }>;

export type ReleaseDraggableEvent = PointerSample &
  Readonly<{
    type: typeof LIFECYCLE_RELEASE;
    bounds: DOMRectReadOnly | null;
  }>;

export type InvalidateDraggableEvent = Readonly<{
  type: typeof INVALIDATE;
  point: Point;
  bounds: DOMRectReadOnly | null;
}>;

export type ControlledDraggableEvent = Readonly<{
  type: typeof CONTROLLED;
  viewportDelta: Point;
}>;

export type CancelDraggableEvent = Readonly<{
  type: typeof LIFECYCLE_CANCEL;
  reason: CancellationReason;
}>;

export type SetPolicyDraggableEvent = Readonly<{
  type: typeof SET_POLICY;
  axis?: DragAxis;
  coordinateOverride?: CoordinateMapper | null;
}>;

export type ActivationReadyDraggableEvent = Readonly<{
  type: typeof LIFECYCLE_ACTIVATION_READY;
  operationId: number;
  candidate: FreeCandidate;
}>;

export type StartSucceededDraggableEvent = Readonly<{
  type: typeof LIFECYCLE_START_SUCCEEDED;
  operationId: number;
}>;

export type ActivationFailedDraggableEvent = Readonly<{
  type: typeof LIFECYCLE_ACTIVATION_FAILED;
  operationId: number;
}>;

export type EffectFailedDraggableEvent = Readonly<{
  type: typeof EFFECT_FAILED;
  operationId: number;
  stage: FailureCause['stage'];
  recovery: typeof RECOVERY_HOME | typeof RECOVERY_IMMEDIATE;
  error: unknown;
}>;

export type ResolutionStartedDraggableEvent = ResolutionCurrency &
  Readonly<{
    type: typeof RESOLUTION_STARTED;
  }>;

export type DropResolvedDraggableEvent = ResolutionCurrency &
  Readonly<{
    type: typeof DROP_RESOLVED;
    resolution: FreeDropResolution;
  }>;

export type DropResolutionFailedDraggableEvent = ResolutionCurrency &
  Readonly<{
    type: typeof DROP_RESOLUTION_FAILED;
    error: unknown;
  }>;

export type LandingPlanReadyDraggableEvent = LandingCurrency &
  Readonly<{
    type: typeof LANDING_PLAN_READY;
    plan: LandingPlan;
  }>;

export type LandingStartedDraggableEvent = LandingCurrency &
  Readonly<{
    type: typeof LANDING_STARTED;
  }>;

export type LandingFinishedDraggableEvent = LandingCurrency &
  Readonly<{
    type: typeof LANDING_FINISHED;
  }>;

export type LandingPinnedDraggableEvent = LandingCurrency &
  Readonly<{
    type: typeof LANDING_PINNED;
  }>;

export type SettlementFailedDraggableEvent = LandingCurrency &
  Readonly<{
    type: typeof SETTLEMENT_FAILED;
    stage: FailureCause['stage'];
    error: unknown;
  }>;

export type SettlementCompletedDraggableEvent = Readonly<{
  type: typeof SETTLEMENT_COMPLETED;
  operationId: number;
}>;

export type HomeInvalidDraggableEvent = LandingCurrency &
  Readonly<{
    type: typeof HOME_INVALID;
    error: unknown;
  }>;

/**
 * The consumer's authored presentation settled: `error` is `null` on success,
 * or the rejection/timeout that failed it.
 */
export type PresentationSettledDraggableEvent = ResolutionCurrency &
  Readonly<{
    type: typeof PRESENTATION_SETTLED;
    error: unknown;
  }>;

export type DraggableEvent =
  | AdmitDraggableEvent
  | MoveDraggableEvent
  | ReleaseDraggableEvent
  | InvalidateDraggableEvent
  | ControlledDraggableEvent
  | CancelDraggableEvent
  | SetPolicyDraggableEvent
  | ActivationReadyDraggableEvent
  | StartSucceededDraggableEvent
  | ActivationFailedDraggableEvent
  | EffectFailedDraggableEvent
  | ResolutionStartedDraggableEvent
  | DropResolvedDraggableEvent
  | DropResolutionFailedDraggableEvent
  | LandingPlanReadyDraggableEvent
  | LandingStartedDraggableEvent
  | LandingFinishedDraggableEvent
  | LandingPinnedDraggableEvent
  | SettlementFailedDraggableEvent
  | SettlementCompletedDraggableEvent
  | HomeInvalidDraggableEvent
  | PresentationSettledDraggableEvent;

export type DraggableConfig = Readonly<{
  threshold: number;
  hasHomeTarget: boolean;
  /**
   * The owning realm. The reducer reads no DOM, but it does construct the
   * release rect handed to the consumer, and that constructor must come from
   * the controller's own document rather than the ambient global.
   */
  realm: DOMRealm;
}>;

export const INITIAL_DRAGGABLE_STATE: DraggableState = {
  phase: PHASE_IDLE,
  pointer: null,
  policy: { axis: AXIS_BOTH, coordinateOverride: null },
  operation: null,
  motion: null,
  drop: { stage: DROP_NONE },
  settlement: null,
};

// --- Helpers ---------------------------------------------------------------

/** The shared "no drop in flight" value, reused to keep slice identity stable. */
const NO_FREE_DROP: FreeDropState = { stage: DROP_NONE };

/** Whether a landing-pinned report belongs to the landing currently running. */
function isActivePin(
  state: DraggableState,
  event: LandingCurrency & { operationId: number },
): boolean {
  const landing = state.settlement?.landing;

  if (!landing || landing.stage === LANDING_SKIPPED) {
    return false;
  }

  return landing.stage === LANDING_SETTLED
    ? false
    : sameLanding(landing.currency, event);
}

const crossed = (origin: Point, latest: Point, threshold: number): boolean =>
  Math.abs(latest.x - origin.x) >= threshold ||
  Math.abs(latest.y - origin.y) >= threshold;

const ownsPointer = (state: DraggableState, pointerId: number): boolean =>
  state.pointer?.id === pointerId;

const isActiveOp = (state: DraggableState, operationId: number): boolean =>
  state.operation?.operationId === operationId;

/** The effective coordinate mapper: a policy override wins over the derived one. */
function effectiveMapper(state: DraggableState): CoordinateMapper | null {
  if (state.policy.coordinateOverride) {
    return state.policy.coordinateOverride;
  }

  const op = state.operation;
  return op && op.type !== OPERATION_ADMITTED ? op.coordinateSpace : null;
}

// --- Lifecycle classification ---------------------------------------------

function classify(
  state: DraggableState,
  event: DraggableEvent,
): LifecycleEvent {
  switch (event.type) {
    case LIFECYCLE_ADMIT:
      return state.phase === PHASE_IDLE ? LIFECYCLE_ADMIT : LIFECYCLE_IGNORE;
    case LIFECYCLE_MOVE:
      // Pending threshold crossing is refined in the root (needs config); an
      // active move keeps the phase.
      return ownsPointer(state, event.pointerId)
        ? LIFECYCLE_MOVE
        : LIFECYCLE_IGNORE;
    case LIFECYCLE_RELEASE:
      if (!ownsPointer(state, event.pointerId)) {
        return LIFECYCLE_IGNORE;
      }
      // Releasing before the threshold is crossed ends the gesture: the press
      // was a click, not a drag. Ignoring it instead would leave the operation
      // armed with no pointer down, so the next button-less move crosses the
      // threshold and the item sticks to the cursor.
      if (state.phase === PHASE_PENDING) {
        return LIFECYCLE_DISARM;
      }
      return state.phase === PHASE_DRAGGING
        ? LIFECYCLE_RELEASE
        : LIFECYCLE_IGNORE;
    case INVALIDATE:
      return LIFECYCLE_IGNORE;
    case CONTROLLED:
      return LIFECYCLE_IGNORE;
    case LIFECYCLE_CANCEL:
      if (state.phase === PHASE_PENDING) {
        return LIFECYCLE_DISARM;
      }
      return LIFECYCLE_CANCEL;
    case SET_POLICY:
      return LIFECYCLE_IGNORE;
    case LIFECYCLE_ACTIVATION_READY:
      return isActiveOp(state, event.operationId)
        ? LIFECYCLE_ACTIVATION_READY
        : LIFECYCLE_IGNORE;
    case LIFECYCLE_START_SUCCEEDED:
      return isActiveOp(state, event.operationId)
        ? LIFECYCLE_START_SUCCEEDED
        : LIFECYCLE_IGNORE;
    case LIFECYCLE_ACTIVATION_FAILED:
      return isActiveOp(state, event.operationId)
        ? LIFECYCLE_ACTIVATION_FAILED
        : LIFECYCLE_IGNORE;
    case EFFECT_FAILED:
      return isActiveOp(state, event.operationId) &&
        (state.phase === PHASE_DRAGGING ||
          state.phase === PHASE_AWAITING_RESULT)
        ? LIFECYCLE_CANCEL
        : LIFECYCLE_IGNORE;
    case RESOLUTION_STARTED:
      return LIFECYCLE_IGNORE;
    case DROP_RESOLVED:
    case DROP_RESOLUTION_FAILED:
      return isActiveOp(state, event.operationId) &&
        state.phase === PHASE_AWAITING_RESULT &&
        state.drop.stage === DROP_AWAITING_CONSUMER &&
        state.drop.resolutionId === event.resolutionId
        ? LIFECYCLE_RESOLVED
        : LIFECYCLE_IGNORE;
    // Landing is done, but the operation only leaves `settling` once the
    // consumer's authored presentation is ready too — otherwise the temporary
    // presentation would be torn down before the authored DOM exists.
    case LANDING_PINNED:
      // A pin from a superseded landing must not complete the current
      // settlement. The settlement slice already rejects it by currency, so
      // without this the phase would advance while the slice stood still.
      return isActivePin(state, event)
        ? state.settlement?.presentation === PRESENTATION_PENDING
          ? LIFECYCLE_SETTLE_PROGRESS
          : LIFECYCLE_SETTLE_COMPLETE
        : LIFECYCLE_IGNORE;
    case SETTLEMENT_COMPLETED:
      return isActiveOp(state, event.operationId)
        ? state.settlement?.presentation === PRESENTATION_PENDING
          ? LIFECYCLE_SETTLE_PROGRESS
          : LIFECYCLE_SETTLE_COMPLETE
        : LIFECYCLE_IGNORE;
    // Completes the operation when it is the last of the two barriers to land.
    case PRESENTATION_SETTLED:
      return isActiveOp(state, event.operationId) &&
        state.settlement?.presentation === PRESENTATION_PENDING &&
        event.error === null &&
        isLandingSettled(state.settlement.landing)
        ? LIFECYCLE_SETTLE_COMPLETE
        : LIFECYCLE_SETTLE_PROGRESS;
    case LANDING_PLAN_READY:
    case LANDING_STARTED:
    case LANDING_FINISHED:
    case SETTLEMENT_FAILED:
    case HOME_INVALID:
      return LIFECYCLE_SETTLE_PROGRESS;
    default:
      return LIFECYCLE_IGNORE;
  }
}

// --- Root reducer factory --------------------------------------------------

/**
 * Refines the pending `move` classification: below-threshold moves keep the
 * phase (`ignore`), a crossing move activates. Kept in the root because it needs
 * `config.threshold`, which the pure protocol must not read.
 */
function classifyMove(
  from: DraggableState,
  event: DraggableEvent,
  config: DraggableConfig,
  base: LifecycleEvent,
): LifecycleEvent {
  if (
    event.type === LIFECYCLE_MOVE &&
    from.phase === PHASE_PENDING &&
    from.pointer &&
    // Ownership is re-checked rather than inherited from `base`: this refinement
    // replaces the base classification outright, and a foreign pointer must not
    // cross the threshold on behalf of the one that armed the press.
    ownsPointer(from, event.pointerId)
  ) {
    return crossed(from.pointer.origin, event.point, config.threshold)
      ? LIFECYCLE_ACTIVATE
      : LIFECYCLE_IGNORE;
  }

  return base;
}

function makeLanding(
  recovery: SettlementRecovery,
  ids: OperationIdentitySource,
  operationId: number,
): LandingState {
  if (recovery === RECOVERY_IMMEDIATE) {
    return { stage: LANDING_SKIPPED };
  }

  return {
    stage: LANDING_PREPARING,
    currency: { operationId, landingId: ids.next() },
    plan: null,
  };
}

function withRecovery(
  outcome: SettlementState<FreeDropResult>['outcome'],
  domain: FreeDropResult | null,
  config: DraggableConfig,
  ids: OperationIdentitySource,
  operationId: number,
  presentation: PresentationReadiness = PRESENTATION_READY,
): SettlementState<FreeDropResult> {
  const recovery: SettlementRecovery = config.hasHomeTarget
    ? RECOVERY_HOME
    : RECOVERY_IMMEDIATE;
  return {
    outcome,
    recovery,
    domain,
    presentation,
    landing: makeLanding(recovery, ids, operationId),
  };
}

/** Builds the settlement state on first entry into `settling`. */
function enterSettling(
  from: DraggableState,
  event: DraggableEvent,
  config: DraggableConfig,
  ids: OperationIdentitySource,
): SettlementState<FreeDropResult> {
  const operationId = from.operation?.operationId ?? 0;
  const proposal =
    from.drop.stage === DROP_PROPOSAL_READY ||
    from.drop.stage === DROP_AWAITING_CONSUMER
      ? from.drop.proposal
      : null;

  // A resolution carrying `presentationReady` holds the temporary presentation
  // until the consumer acknowledges; without one there is nothing to wait for.
  const presentation: PresentationReadiness =
    event.type === DROP_RESOLVED && event.resolution.presentationReady
      ? PRESENTATION_PENDING
      : PRESENTATION_READY;

  // Accepted free drop: immediate authored restoration (v1).
  if (
    event.type === DROP_RESOLVED &&
    event.resolution.type === OUTCOME_ACCEPTED &&
    proposal
  ) {
    return {
      outcome: { result: OUTCOME_ACCEPTED },
      recovery: RECOVERY_IMMEDIATE,
      domain: { type: OUTCOME_ACCEPTED, proposal },
      presentation,
      landing: { stage: LANDING_SKIPPED },
    };
  }

  if (
    event.type === DROP_RESOLVED &&
    event.resolution.type === OUTCOME_REJECTED &&
    proposal
  ) {
    return withRecovery(
      { result: OUTCOME_REJECTED },
      { type: OUTCOME_REJECTED, proposal, reason: event.resolution.reason },
      config,
      ids,
      operationId,
      presentation,
    );
  }

  if (event.type === DROP_RESOLUTION_FAILED) {
    return withRecovery(
      { result: OUTCOME_FAILED, failure: { stage: FAILURE_DROP_RESOLUTION } },
      null,
      config,
      ids,
      operationId,
    );
  }

  if (event.type === EFFECT_FAILED) {
    const recovery: SettlementRecovery =
      event.recovery === RECOVERY_HOME && config.hasHomeTarget
        ? RECOVERY_HOME
        : RECOVERY_IMMEDIATE;
    return {
      outcome: { result: OUTCOME_FAILED, failure: { stage: event.stage } },
      recovery,
      domain: from.settlement?.domain ?? null,
      presentation: PRESENTATION_READY,
      landing: makeLanding(recovery, ids, operationId),
    };
  }

  // Cancellation (escape / pointer-cancel / consumer / removal).
  const reason: CancellationReason =
    event.type === LIFECYCLE_CANCEL ? event.reason : { type: CANCEL_ESCAPE };
  return withRecovery(
    { result: OUTCOME_CANCELED, reason },
    null,
    config,
    ids,
    operationId,
  );
}

export function createDraggableReducer(
  config: DraggableConfig,
  ids: OperationIdentitySource,
): (from: DraggableState, event: DraggableEvent) => DraggableState {
  const reduceMotionSlice = (
    from: DraggableState,
    event: DraggableEvent,
    phase: DragPhase,
  ): FreeMotion | null => {
    if (phase === PHASE_IDLE) {
      return null;
    }

    const op = from.operation;

    if (
      event.type === LIFECYCLE_ACTIVATION_READY &&
      isActiveOp(from, event.operationId)
    ) {
      // The pointer has already travelled at least the activation threshold,
      // and `viewportDelta` is defined as `pointer - originPointer`. Committing
      // ORIGIN here would misreport the geometry handed to `onStart` and leave
      // the accumulated delta to be applied by the *next* move, popping the
      // visual by the whole activating distance. Bounds are not yet known at
      // activation; the following move clamps.
      return from.pointer
        ? {
            viewportDelta: pointerDelta(
              from.pointer.latest,
              from.pointer.origin,
              event.candidate.originRect,
              from.policy.axis,
              null,
            ),
          }
        : { viewportDelta: ORIGIN };
    }

    if (!op || op.type === OPERATION_ADMITTED || !from.pointer) {
      return from.motion;
    }

    if (event.type === CONTROLLED) {
      return { viewportDelta: event.viewportDelta };
    }

    if (
      (event.type === LIFECYCLE_MOVE && ownsPointer(from, event.pointerId)) ||
      (event.type === LIFECYCLE_RELEASE &&
        ownsPointer(from, event.pointerId)) ||
      event.type === INVALIDATE
    ) {
      const point =
        event.type === INVALIDATE ? from.pointer.latest : event.point;
      return {
        viewportDelta: pointerDelta(
          point,
          from.pointer.origin,
          op.originRect,
          from.policy.axis,
          event.bounds,
        ),
      };
    }

    return from.motion;
  };

  const reducePointerSlice = (
    from: DraggableState,
    event: DraggableEvent,
    phase: DragPhase,
  ): PointerState | null => {
    if (phase === PHASE_IDLE) {
      return null;
    }

    // Only an admit the classifier honoured may re-arm: a duplicate admit
    // while an operation is already armed is inert, so the slice must not
    // rewrite identity behind the unchanged phase.
    if (event.type === LIFECYCLE_ADMIT && from.phase === PHASE_IDLE) {
      return {
        id: event.pointerId,
        origin: event.point,
        latest: event.point,
        release: null,
      };
    }

    if (!from.pointer) {
      return from.pointer;
    }

    if (event.type === LIFECYCLE_MOVE && ownsPointer(from, event.pointerId)) {
      return { ...from.pointer, latest: event.point };
    }

    if (
      event.type === LIFECYCLE_RELEASE &&
      ownsPointer(from, event.pointerId)
    ) {
      return { ...from.pointer, latest: event.point, release: event.point };
    }

    return from.pointer;
  };

  const reduceOperationSlice = (
    from: DraggableState,
    event: DraggableEvent,
    phase: DragPhase,
  ): FreeOperation | null => {
    if (phase === PHASE_IDLE) {
      return null;
    }

    // Only an admit the classifier honoured may re-arm: a duplicate admit
    // while an operation is already armed is inert, so the slice must not
    // rewrite identity behind the unchanged phase.
    if (event.type === LIFECYCLE_ADMIT && from.phase === PHASE_IDLE) {
      return {
        type: OPERATION_ADMITTED,
        operationId: event.operationId,
        item: event.item,
      };
    }

    const op = from.operation;

    if (!op) {
      return op;
    }

    if (
      event.type === LIFECYCLE_ACTIVATION_READY &&
      isActiveOp(from, event.operationId)
    ) {
      return {
        type: OPERATION_CANDIDATE,
        operationId: op.operationId,
        item: op.item,
        visual: event.candidate.visual,
        lift: event.candidate.lift,
        originRect: event.candidate.originRect,
        coordinateSpace: event.candidate.coordinateSpace,
      };
    }

    if (
      event.type === LIFECYCLE_START_SUCCEEDED &&
      isActiveOp(from, event.operationId) &&
      op.type === OPERATION_CANDIDATE
    ) {
      return { ...op, type: OPERATION_ACTIVE };
    }

    return op;
  };

  const reducePolicySlice = (
    from: DraggableState,
    event: DraggableEvent,
  ): FreePolicy => {
    if (event.type === SET_POLICY) {
      return {
        axis: event.axis ?? from.policy.axis,
        coordinateOverride:
          event.coordinateOverride === undefined
            ? from.policy.coordinateOverride
            : event.coordinateOverride,
      };
    }

    return from.policy;
  };

  const reduceDropSlice = (
    from: DraggableState,
    event: DraggableEvent,
    phase: DragPhase,
    nextDelta: Point,
  ): FreeDropState => {
    if (phase !== PHASE_AWAITING_RESULT) {
      // Preserve identity when the drop is already absent: the root compares
      // slices by reference to return `from` unchanged, so allocating a fresh
      // equivalent here would defeat the no-effect guard for every ignored
      // event and allocate on the pointer-move hot path.
      return from.drop.stage === DROP_NONE ? from.drop : NO_FREE_DROP;
    }

    // Entering awaiting-result on release: commit one proposal-ready value.
    if (event.type === LIFECYCLE_RELEASE && from.phase === PHASE_DRAGGING) {
      const op = from.operation;

      if (op && op.type !== OPERATION_ADMITTED && from.pointer) {
        const mapper = effectiveMapper(from) ?? op.coordinateSpace;
        const proposal = buildFreeDropProposal(
          op.item,
          op.visual,
          event.point,
          nextDelta,
          op.originRect,
          mapper,
          config.realm,
        );
        return { stage: DROP_PROPOSAL_READY, proposal };
      }
    }

    if (
      event.type === RESOLUTION_STARTED &&
      from.drop.stage === DROP_PROPOSAL_READY &&
      isActiveOp(from, event.operationId)
    ) {
      return {
        stage: DROP_AWAITING_CONSUMER,
        proposal: from.drop.proposal,
        resolutionId: event.resolutionId,
      };
    }

    return from.drop;
  };

  const reduceSettlementSlice = (
    from: DraggableState,
    event: DraggableEvent,
    phase: DragPhase,
  ): SettlementState<FreeDropResult> | null => {
    if (phase === PHASE_IDLE) {
      return null;
    }

    if (phase !== PHASE_SETTLING) {
      return from.settlement;
    }

    // First entry into settling.
    if (from.phase !== PHASE_SETTLING) {
      return enterSettling(from, event, config, ids);
    }

    // Progress within settling.
    const { settlement } = from;

    if (!settlement) {
      return settlement;
    }

    const { landing } = settlement;

    if (
      event.type === LANDING_PLAN_READY &&
      landing.stage === LANDING_PREPARING &&
      sameLanding(landing.currency, event)
    ) {
      return {
        ...settlement,
        landing: {
          stage: LANDING_PREPARING,
          currency: landing.currency,
          plan: event.plan,
        },
      };
    }

    if (
      event.type === LANDING_STARTED &&
      landing.stage === LANDING_PREPARING &&
      landing.plan &&
      sameLanding(landing.currency, event)
    ) {
      return {
        ...settlement,
        landing: {
          stage: LANDING_RUNNING,
          currency: landing.currency,
          plan: landing.plan,
        },
      };
    }

    if (
      event.type === LANDING_FINISHED &&
      landing.stage === LANDING_RUNNING &&
      sameLanding(landing.currency, event)
    ) {
      return {
        ...settlement,
        landing: {
          stage: LANDING_COMPLETING,
          currency: landing.currency,
          plan: landing.plan,
        },
      };
    }

    // Landing pinned: it no longer holds the temporary presentation. Release
    // still waits on the authored-presentation half of the barrier.
    if (
      event.type === LANDING_PINNED &&
      landing.stage === LANDING_COMPLETING &&
      sameLanding(landing.currency, event)
    ) {
      return { ...settlement, landing: { stage: LANDING_SETTLED } };
    }

    if (
      event.type === PRESENTATION_SETTLED &&
      settlement.presentation === PRESENTATION_PENDING &&
      isActiveOp(from, event.operationId)
    ) {
      // A rejected or timed-out acknowledgement means the destination authored
      // presentation cannot be assumed to exist, so recover home instead of
      // revealing it. `withRecovery` issues a fresh landing when a home target
      // is configured, otherwise recovery is immediate.
      if (event.error !== null) {
        return withRecovery(
          {
            result: OUTCOME_FAILED,
            failure: { stage: FAILURE_PRESENTATION_READY },
          },
          settlement.domain,
          config,
          ids,
          from.operation?.operationId ?? 0,
        );
      }

      return { ...settlement, presentation: PRESENTATION_READY };
    }

    if (
      (event.type === SETTLEMENT_FAILED || event.type === HOME_INVALID) &&
      landing.stage !== LANDING_SKIPPED &&
      landing.stage !== LANDING_SETTLED &&
      sameLanding(landing.currency, event)
    ) {
      const stage: FailureCause['stage'] =
        event.type === HOME_INVALID ? FAILURE_HOME_TARGET : event.stage;
      return {
        outcome: { result: OUTCOME_FAILED, failure: { stage } },
        recovery: RECOVERY_IMMEDIATE,
        domain: settlement.domain,
        presentation: PRESENTATION_READY,
        landing: { stage: LANDING_SKIPPED },
      };
    }

    return settlement;
  };

  return (from, event) => {
    const lifecycle = classifyMove(from, event, config, classify(from, event));
    const phase = transitionKernelPhase(from.phase, lifecycle);

    // One motion projection per reduction: `reduceDropSlice` needs the committed
    // delta and the motion slice needs the same value, so compute it once.
    const motion = reduceMotionSlice(from, event, phase);
    const nextDelta =
      motion?.viewportDelta ?? from.motion?.viewportDelta ?? ORIGIN;

    const pointer = reducePointerSlice(from, event, phase);
    const policy = reducePolicySlice(from, event);
    const operation = reduceOperationSlice(from, event, phase);
    const drop = reduceDropSlice(from, event, phase, nextDelta);
    const settlement = reduceSettlementSlice(from, event, phase);

    if (
      phase === from.phase &&
      pointer === from.pointer &&
      policy === from.policy &&
      operation === from.operation &&
      motion === from.motion &&
      drop === from.drop &&
      settlement === from.settlement
    ) {
      return from;
    }

    return { phase, pointer, policy, operation, motion, drop, settlement };
  };
}
