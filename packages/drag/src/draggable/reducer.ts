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

export const INVALIDATE = 64;
export const CONTROLLED = 65;
export const SET_POLICY = 66;
export const EFFECT_FAILED = 67;
export const RESOLUTION_STARTED = 68;
export const DROP_RESOLVED = 69;
export const DROP_RESOLUTION_FAILED = 70;
export const LANDING_PLAN_READY = 71;
export const LANDING_STARTED = 72;
export const LANDING_FINISHED = 73;
export const LANDING_PINNED = 74;
export const SETTLEMENT_FAILED = 75;
export const SETTLEMENT_COMPLETED = 76;
export const HOME_INVALID = 77;
export const PRESENTATION_SETTLED = 78;
export const DROP_NONE = 79;
export const DROP_PROPOSAL_READY = 80;
export const DROP_AWAITING_CONSUMER = 81;

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

// Events are discriminated tuples: element 0 is the integer tag, element 1 is
// the event's subject (a shared `PointerSample` or branded currency object where
// it has one, otherwise the first scalar), and later elements are the remaining
// payload. Positional over named to drop the repeated key strings from every
// construct and read site; narrowing still flows from the literal tag at [0].

export type AdmitDraggableEvent = readonly [
  tag: typeof LIFECYCLE_ADMIT,
  sample: PointerSample,
  operationId: number,
  item: HTMLElement,
];

export type MoveDraggableEvent = readonly [
  tag: typeof LIFECYCLE_MOVE,
  sample: PointerSample,
  bounds: DOMRectReadOnly | null,
];

export type ReleaseDraggableEvent = readonly [
  tag: typeof LIFECYCLE_RELEASE,
  sample: PointerSample,
  bounds: DOMRectReadOnly | null,
];

export type InvalidateDraggableEvent = readonly [
  tag: typeof INVALIDATE,
  point: Point,
  bounds: DOMRectReadOnly | null,
];

export type ControlledDraggableEvent = readonly [
  tag: typeof CONTROLLED,
  viewportDelta: Point,
];

export type CancelDraggableEvent = readonly [
  tag: typeof LIFECYCLE_CANCEL,
  reason: CancellationReason,
];

export type SetPolicyDraggableEvent = readonly [
  tag: typeof SET_POLICY,
  axis: DragAxis | undefined,
  coordinateOverride: CoordinateMapper | null | undefined,
];

export type ActivationReadyDraggableEvent = readonly [
  tag: typeof LIFECYCLE_ACTIVATION_READY,
  operationId: number,
  candidate: FreeCandidate,
];

export type StartSucceededDraggableEvent = readonly [
  tag: typeof LIFECYCLE_START_SUCCEEDED,
  operationId: number,
];

export type ActivationFailedDraggableEvent = readonly [
  tag: typeof LIFECYCLE_ACTIVATION_FAILED,
  operationId: number,
];

export type EffectFailedDraggableEvent = readonly [
  tag: typeof EFFECT_FAILED,
  operationId: number,
  stage: FailureCause['stage'],
  recovery: typeof RECOVERY_HOME | typeof RECOVERY_IMMEDIATE,
  error: unknown,
];

export type ResolutionStartedDraggableEvent = readonly [
  tag: typeof RESOLUTION_STARTED,
  currency: ResolutionCurrency,
];

export type DropResolvedDraggableEvent = readonly [
  tag: typeof DROP_RESOLVED,
  currency: ResolutionCurrency,
  resolution: FreeDropResolution,
];

export type DropResolutionFailedDraggableEvent = readonly [
  tag: typeof DROP_RESOLUTION_FAILED,
  currency: ResolutionCurrency,
  error: unknown,
];

export type LandingPlanReadyDraggableEvent = readonly [
  tag: typeof LANDING_PLAN_READY,
  currency: LandingCurrency,
  plan: LandingPlan,
];

export type LandingStartedDraggableEvent = readonly [
  tag: typeof LANDING_STARTED,
  currency: LandingCurrency,
];

export type LandingFinishedDraggableEvent = readonly [
  tag: typeof LANDING_FINISHED,
  currency: LandingCurrency,
];

export type LandingPinnedDraggableEvent = readonly [
  tag: typeof LANDING_PINNED,
  currency: LandingCurrency,
];

export type SettlementFailedDraggableEvent = readonly [
  tag: typeof SETTLEMENT_FAILED,
  currency: LandingCurrency,
  stage: FailureCause['stage'],
  error: unknown,
];

export type SettlementCompletedDraggableEvent = readonly [
  tag: typeof SETTLEMENT_COMPLETED,
  operationId: number,
];

export type HomeInvalidDraggableEvent = readonly [
  tag: typeof HOME_INVALID,
  currency: LandingCurrency,
  error: unknown,
];

/**
 * The consumer's authored presentation settled: the error slot is `null` on
 * success, or the rejection/timeout that failed it.
 */
export type PresentationSettledDraggableEvent = readonly [
  tag: typeof PRESENTATION_SETTLED,
  currency: ResolutionCurrency,
  error: unknown,
];

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

/** The error an event carries in its error slot, or `undefined` if it has none. */
export function eventError(event: DraggableEvent): unknown {
  switch (event[0]) {
    case EFFECT_FAILED:
      return event[4];
    case SETTLEMENT_FAILED:
      return event[3];
    case DROP_RESOLUTION_FAILED:
    case HOME_INVALID:
    case PRESENTATION_SETTLED:
      return event[2];
    default:
      return undefined;
  }
}

/** Whether a landing-pinned report belongs to the landing currently running. */
function isActivePin(state: DraggableState, currency: LandingCurrency): boolean {
  const landing = state.settlement?.landing;

  if (!landing || landing.stage === LANDING_SKIPPED) {
    return false;
  }

  return landing.stage === LANDING_SETTLED
    ? false
    : sameLanding(landing.currency, currency);
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
  switch (event[0]) {
    case LIFECYCLE_ADMIT:
      return state.phase === PHASE_IDLE ? LIFECYCLE_ADMIT : LIFECYCLE_IGNORE;
    case LIFECYCLE_MOVE:
      // Pending threshold crossing is refined in the root (needs config); an
      // active move keeps the phase.
      return ownsPointer(state, event[1].pointerId)
        ? LIFECYCLE_MOVE
        : LIFECYCLE_IGNORE;
    case LIFECYCLE_RELEASE:
      if (!ownsPointer(state, event[1].pointerId)) {
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
      return isActiveOp(state, event[1])
        ? LIFECYCLE_ACTIVATION_READY
        : LIFECYCLE_IGNORE;
    case LIFECYCLE_START_SUCCEEDED:
      return isActiveOp(state, event[1])
        ? LIFECYCLE_START_SUCCEEDED
        : LIFECYCLE_IGNORE;
    case LIFECYCLE_ACTIVATION_FAILED:
      return isActiveOp(state, event[1])
        ? LIFECYCLE_ACTIVATION_FAILED
        : LIFECYCLE_IGNORE;
    case EFFECT_FAILED:
      return isActiveOp(state, event[1]) &&
        (state.phase === PHASE_DRAGGING ||
          state.phase === PHASE_AWAITING_RESULT)
        ? LIFECYCLE_CANCEL
        : LIFECYCLE_IGNORE;
    case RESOLUTION_STARTED:
      return LIFECYCLE_IGNORE;
    case DROP_RESOLVED:
    case DROP_RESOLUTION_FAILED:
      return isActiveOp(state, event[1].operationId) &&
        state.phase === PHASE_AWAITING_RESULT &&
        state.drop.stage === DROP_AWAITING_CONSUMER &&
        state.drop.resolutionId === event[1].resolutionId
        ? LIFECYCLE_RESOLVED
        : LIFECYCLE_IGNORE;
    // Landing is done, but the operation only leaves `settling` once the
    // consumer's authored presentation is ready too — otherwise the temporary
    // presentation would be torn down before the authored DOM exists.
    case LANDING_PINNED:
      // A pin from a superseded landing must not complete the current
      // settlement. The settlement slice already rejects it by currency, so
      // without this the phase would advance while the slice stood still.
      return isActivePin(state, event[1])
        ? state.settlement?.presentation === PRESENTATION_PENDING
          ? LIFECYCLE_SETTLE_PROGRESS
          : LIFECYCLE_SETTLE_COMPLETE
        : LIFECYCLE_IGNORE;
    case SETTLEMENT_COMPLETED:
      return isActiveOp(state, event[1])
        ? state.settlement?.presentation === PRESENTATION_PENDING
          ? LIFECYCLE_SETTLE_PROGRESS
          : LIFECYCLE_SETTLE_COMPLETE
        : LIFECYCLE_IGNORE;
    // Completes the operation when it is the last of the two barriers to land.
    case PRESENTATION_SETTLED:
      return isActiveOp(state, event[1].operationId) &&
        state.settlement?.presentation === PRESENTATION_PENDING &&
        event[2] === null &&
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
    event[0] === LIFECYCLE_MOVE &&
    from.phase === PHASE_PENDING &&
    from.pointer &&
    // Ownership is re-checked rather than inherited from `base`: this refinement
    // replaces the base classification outright, and a foreign pointer must not
    // cross the threshold on behalf of the one that armed the press.
    ownsPointer(from, event[1].pointerId)
  ) {
    return crossed(from.pointer.origin, event[1].point, config.threshold)
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
    event[0] === DROP_RESOLVED && event[2].presentationReady
      ? PRESENTATION_PENDING
      : PRESENTATION_READY;

  // Accepted free drop: immediate authored restoration (v1).
  if (
    event[0] === DROP_RESOLVED &&
    event[2].type === OUTCOME_ACCEPTED &&
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
    event[0] === DROP_RESOLVED &&
    event[2].type === OUTCOME_REJECTED &&
    proposal
  ) {
    return withRecovery(
      { result: OUTCOME_REJECTED },
      { type: OUTCOME_REJECTED, proposal, reason: event[2].reason },
      config,
      ids,
      operationId,
      presentation,
    );
  }

  if (event[0] === DROP_RESOLUTION_FAILED) {
    return withRecovery(
      { result: OUTCOME_FAILED, failure: { stage: FAILURE_DROP_RESOLUTION } },
      null,
      config,
      ids,
      operationId,
    );
  }

  if (event[0] === EFFECT_FAILED) {
    const recovery: SettlementRecovery =
      event[3] === RECOVERY_HOME && config.hasHomeTarget
        ? RECOVERY_HOME
        : RECOVERY_IMMEDIATE;
    return {
      outcome: { result: OUTCOME_FAILED, failure: { stage: event[2] } },
      recovery,
      domain: from.settlement?.domain ?? null,
      presentation: PRESENTATION_READY,
      landing: makeLanding(recovery, ids, operationId),
    };
  }

  // Cancellation (escape / pointer-cancel / consumer / removal).
  const reason: CancellationReason =
    event[0] === LIFECYCLE_CANCEL ? event[1] : { type: CANCEL_ESCAPE };
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
      event[0] === LIFECYCLE_ACTIVATION_READY &&
      isActiveOp(from, event[1])
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
              event[2].originRect,
              from.policy.axis,
              null,
            ),
          }
        : { viewportDelta: ORIGIN };
    }

    if (!op || op.type === OPERATION_ADMITTED || !from.pointer) {
      return from.motion;
    }

    if (event[0] === CONTROLLED) {
      return { viewportDelta: event[1] };
    }

    if (
      (event[0] === LIFECYCLE_MOVE && ownsPointer(from, event[1].pointerId)) ||
      (event[0] === LIFECYCLE_RELEASE &&
        ownsPointer(from, event[1].pointerId)) ||
      event[0] === INVALIDATE
    ) {
      const point =
        event[0] === INVALIDATE ? from.pointer.latest : event[1].point;
      return {
        viewportDelta: pointerDelta(
          point,
          from.pointer.origin,
          op.originRect,
          from.policy.axis,
          event[2],
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
    if (event[0] === LIFECYCLE_ADMIT && from.phase === PHASE_IDLE) {
      return {
        id: event[1].pointerId,
        origin: event[1].point,
        latest: event[1].point,
        release: null,
      };
    }

    if (!from.pointer) {
      return from.pointer;
    }

    if (event[0] === LIFECYCLE_MOVE && ownsPointer(from, event[1].pointerId)) {
      // A still-pending move is sub-threshold: `latest` is unused until the
      // crossing move (which sets it from its own `event.point`) and the
      // threshold test reads `event.point`, not `latest`. Committing fresh
      // pointer state here would defeat the no-effect guard and route effects
      // for a move that changes nothing, so keep identity while pending.
      if (phase === PHASE_PENDING) {
        return from.pointer;
      }
      return { ...from.pointer, latest: event[1].point };
    }

    if (
      event[0] === LIFECYCLE_RELEASE &&
      ownsPointer(from, event[1].pointerId)
    ) {
      return {
        ...from.pointer,
        latest: event[1].point,
        release: event[1].point,
      };
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
    if (event[0] === LIFECYCLE_ADMIT && from.phase === PHASE_IDLE) {
      return {
        type: OPERATION_ADMITTED,
        operationId: event[2],
        item: event[3],
      };
    }

    const op = from.operation;

    if (!op) {
      return op;
    }

    if (
      event[0] === LIFECYCLE_ACTIVATION_READY &&
      isActiveOp(from, event[1])
    ) {
      return {
        type: OPERATION_CANDIDATE,
        operationId: op.operationId,
        item: op.item,
        visual: event[2].visual,
        lift: event[2].lift,
        originRect: event[2].originRect,
        coordinateSpace: event[2].coordinateSpace,
      };
    }

    if (
      event[0] === LIFECYCLE_START_SUCCEEDED &&
      isActiveOp(from, event[1]) &&
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
    if (event[0] === SET_POLICY) {
      return {
        axis: event[1] ?? from.policy.axis,
        coordinateOverride:
          event[2] === undefined ? from.policy.coordinateOverride : event[2],
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
    if (event[0] === LIFECYCLE_RELEASE && from.phase === PHASE_DRAGGING) {
      const op = from.operation;

      if (op && op.type !== OPERATION_ADMITTED && from.pointer) {
        const mapper = effectiveMapper(from) ?? op.coordinateSpace;
        const proposal = buildFreeDropProposal(
          op.item,
          op.visual,
          event[1].point,
          nextDelta,
          op.originRect,
          mapper,
          config.realm,
        );
        return { stage: DROP_PROPOSAL_READY, proposal };
      }
    }

    if (
      event[0] === RESOLUTION_STARTED &&
      from.drop.stage === DROP_PROPOSAL_READY &&
      isActiveOp(from, event[1].operationId)
    ) {
      return {
        stage: DROP_AWAITING_CONSUMER,
        proposal: from.drop.proposal,
        resolutionId: event[1].resolutionId,
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
      event[0] === LANDING_PLAN_READY &&
      landing.stage === LANDING_PREPARING &&
      sameLanding(landing.currency, event[1])
    ) {
      return {
        ...settlement,
        landing: {
          stage: LANDING_PREPARING,
          currency: landing.currency,
          plan: event[2],
        },
      };
    }

    if (
      event[0] === LANDING_STARTED &&
      landing.stage === LANDING_PREPARING &&
      landing.plan &&
      sameLanding(landing.currency, event[1])
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
      event[0] === LANDING_FINISHED &&
      landing.stage === LANDING_RUNNING &&
      sameLanding(landing.currency, event[1])
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
      event[0] === LANDING_PINNED &&
      landing.stage === LANDING_COMPLETING &&
      sameLanding(landing.currency, event[1])
    ) {
      return { ...settlement, landing: { stage: LANDING_SETTLED } };
    }

    if (
      event[0] === PRESENTATION_SETTLED &&
      settlement.presentation === PRESENTATION_PENDING &&
      isActiveOp(from, event[1].operationId)
    ) {
      // A rejected or timed-out acknowledgement means the destination authored
      // presentation cannot be assumed to exist, so recover home instead of
      // revealing it. `withRecovery` issues a fresh landing when a home target
      // is configured, otherwise recovery is immediate.
      if (event[2] !== null) {
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
      (event[0] === SETTLEMENT_FAILED || event[0] === HOME_INVALID) &&
      landing.stage !== LANDING_SKIPPED &&
      landing.stage !== LANDING_SETTLED &&
      sameLanding(landing.currency, event[1])
    ) {
      const stage: FailureCause['stage'] =
        event[0] === HOME_INVALID ? FAILURE_HOME_TARGET : event[2];
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
