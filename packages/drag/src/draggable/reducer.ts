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
  transitionKernelPhase,
  type CancellationReason,
  type DragPhase,
  type FailureCause,
  type LandingPlan,
  type LandingState,
  type LifecycleEvent,
  type PointerState,
  type SettlementRecovery,
  type SettlementState,
} from '../kernel/protocol.ts';
import {
  ORIGIN,
  type CoordinateMapper,
  type DragAxis,
  type Point,
} from '../kernel/types.ts';
import { pointerDelta } from './motion.ts';
import type {
  FreeDropProposal,
  FreeDropResolution,
  FreeDropResult,
} from './options.ts';
import { buildFreeDropProposal } from './request.ts';

// --- Semantic slices -------------------------------------------------------

/** Immutable activation snapshot committed when acquisition succeeds. */
export type FreeCandidate = Readonly<{
  visual: HTMLElement;
  lift: LiftMode;
  originRect: DOMRectReadOnly;
  coordinateSpace: CoordinateMapper;
}>;

export type FreeOperation =
  | Readonly<{ type: 'admitted'; operationId: number; item: HTMLElement }>
  | Readonly<{
      type: 'candidate' | 'active';
      operationId: number;
      item: HTMLElement;
      visual: HTMLElement;
      lift: LiftMode;
      originRect: DOMRectReadOnly;
      coordinateSpace: CoordinateMapper;
    }>;

export type FreePolicy = Readonly<{
  axis: DragAxis;
  coordinateOverride: CoordinateMapper | null;
}>;

export type FreeMotion = Readonly<{ viewportDelta: Point }>;

export type FreeDropState =
  | Readonly<{ stage: 'none' }>
  | Readonly<{ stage: 'proposal-ready'; proposal: FreeDropProposal }>
  | Readonly<{
      stage: 'awaiting-consumer';
      proposal: FreeDropProposal;
      resolutionId: number;
    }>;

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

export type DraggableEvent =
  | Readonly<{
      type: 'admit';
      operationId: number;
      item: HTMLElement;
      pointerId: number;
      point: Point;
    }>
  | Readonly<{
      type: 'move';
      pointerId: number;
      point: Point;
      bounds: DOMRectReadOnly | null;
    }>
  | Readonly<{
      type: 'release';
      pointerId: number;
      point: Point;
      bounds: DOMRectReadOnly | null;
    }>
  | Readonly<{
      type: 'invalidate';
      point: Point;
      bounds: DOMRectReadOnly | null;
    }>
  | Readonly<{ type: 'controlled'; viewportDelta: Point }>
  | Readonly<{ type: 'cancel'; reason: CancellationReason }>
  | Readonly<{
      type: 'set-policy';
      axis?: DragAxis;
      coordinateOverride?: CoordinateMapper | null;
    }>
  | Readonly<{
      type: 'activation-ready';
      operationId: number;
      candidate: FreeCandidate;
    }>
  | Readonly<{ type: 'start-succeeded'; operationId: number }>
  | Readonly<{ type: 'activation-failed'; operationId: number }>
  | Readonly<{
      type: 'effect-failed';
      operationId: number;
      stage: FailureCause['stage'];
      recovery: 'home' | 'immediate';
      error: unknown;
    }>
  | Readonly<{
      type: 'resolution-started';
      operationId: number;
      resolutionId: number;
    }>
  | Readonly<{
      type: 'drop-resolved';
      operationId: number;
      resolutionId: number;
      resolution: FreeDropResolution;
    }>
  | Readonly<{
      type: 'drop-resolution-failed';
      operationId: number;
      resolutionId: number;
      error: unknown;
    }>
  | Readonly<{
      type: 'landing-plan-ready';
      operationId: number;
      landingId: number;
      plan: LandingPlan;
    }>
  | Readonly<{
      type: 'landing-started';
      operationId: number;
      landingId: number;
    }>
  | Readonly<{
      type: 'landing-finished';
      operationId: number;
      landingId: number;
    }>
  | Readonly<{ type: 'landing-pinned'; operationId: number; landingId: number }>
  | Readonly<{
      type: 'settlement-failed';
      operationId: number;
      landingId: number;
      stage: FailureCause['stage'];
      error: unknown;
    }>
  | Readonly<{ type: 'settlement-completed'; operationId: number }>
  | Readonly<{
      type: 'home-invalid';
      operationId: number;
      landingId: number;
      error: unknown;
    }>;

export type DraggableConfig = Readonly<{
  threshold: number;
  hasHomeTarget: boolean;
}>;

export const INITIAL_DRAGGABLE_STATE: DraggableState = {
  phase: 'idle',
  pointer: null,
  policy: { axis: 'both', coordinateOverride: null },
  operation: null,
  motion: null,
  drop: { stage: 'none' },
  settlement: null,
};

// --- Helpers ---------------------------------------------------------------

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
  return op && op.type !== 'admitted' ? op.coordinateSpace : null;
}

// --- Lifecycle classification ---------------------------------------------

function classify(
  state: DraggableState,
  event: DraggableEvent,
): LifecycleEvent {
  switch (event.type) {
    case 'admit':
      return { kind: state.phase === 'idle' ? 'admit' : 'ignore' };
    case 'move':
      // Pending threshold crossing is refined in the root (needs config); an
      // active move keeps the phase.
      return ownsPointer(state, event.pointerId)
        ? { kind: 'move' }
        : { kind: 'ignore' };
    case 'release':
      return ownsPointer(state, event.pointerId)
        ? { kind: state.phase === 'dragging' ? 'release' : 'ignore' }
        : { kind: 'ignore' };
    case 'invalidate':
      return { kind: 'ignore' };
    case 'controlled':
      return { kind: 'ignore' };
    case 'cancel':
      if (state.phase === 'pending') {
        return { kind: 'disarm' };
      }
      return { kind: 'cancel' };
    case 'set-policy':
      return { kind: 'ignore' };
    case 'activation-ready':
      return isActiveOp(state, event.operationId)
        ? { kind: 'activation-ready' }
        : { kind: 'ignore' };
    case 'start-succeeded':
      return isActiveOp(state, event.operationId)
        ? { kind: 'start-succeeded' }
        : { kind: 'ignore' };
    case 'activation-failed':
      return isActiveOp(state, event.operationId)
        ? { kind: 'activation-failed' }
        : { kind: 'ignore' };
    case 'effect-failed':
      return isActiveOp(state, event.operationId) &&
        (state.phase === 'dragging' || state.phase === 'awaiting-result')
        ? { kind: 'cancel' }
        : { kind: 'ignore' };
    case 'resolution-started':
      return { kind: 'ignore' };
    case 'drop-resolved':
    case 'drop-resolution-failed':
      return isActiveOp(state, event.operationId) &&
        state.phase === 'awaiting-result' &&
        state.drop.stage === 'awaiting-consumer' &&
        state.drop.resolutionId === event.resolutionId
        ? { kind: 'resolved' }
        : { kind: 'ignore' };
    case 'landing-pinned':
    case 'settlement-completed':
      return { kind: 'settle-complete' };
    case 'landing-plan-ready':
    case 'landing-started':
    case 'landing-finished':
    case 'settlement-failed':
    case 'home-invalid':
      return { kind: 'settle-progress' };
    default:
      return { kind: 'ignore' };
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
  if (event.type === 'move' && from.phase === 'pending' && from.pointer) {
    return crossed(from.pointer.origin, event.point, config.threshold)
      ? { kind: 'activate' }
      : { kind: 'ignore' };
  }

  return base;
}

function makeLanding(
  recovery: SettlementRecovery,
  ids: OperationIdentitySource,
  operationId: number,
): LandingState {
  if (recovery === 'immediate') {
    return { stage: 'skipped' };
  }

  return {
    stage: 'preparing',
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
): SettlementState<FreeDropResult> {
  const recovery: SettlementRecovery = config.hasHomeTarget
    ? 'home'
    : 'immediate';
  return {
    outcome,
    recovery,
    domain,
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
    from.drop.stage === 'proposal-ready' ||
    from.drop.stage === 'awaiting-consumer'
      ? from.drop.proposal
      : null;

  // Accepted free drop: immediate authored restoration (v1).
  if (
    event.type === 'drop-resolved' &&
    event.resolution.type === 'accepted' &&
    proposal
  ) {
    return {
      outcome: { result: 'accepted' },
      recovery: 'immediate',
      domain: { type: 'accepted', proposal },
      landing: { stage: 'skipped' },
    };
  }

  if (
    event.type === 'drop-resolved' &&
    event.resolution.type === 'rejected' &&
    proposal
  ) {
    return withRecovery(
      { result: 'rejected' },
      { type: 'rejected', proposal, reason: event.resolution.reason },
      config,
      ids,
      operationId,
    );
  }

  if (event.type === 'drop-resolution-failed') {
    return withRecovery(
      { result: 'failed', failure: { stage: 'drop-resolution' } },
      null,
      config,
      ids,
      operationId,
    );
  }

  if (event.type === 'effect-failed') {
    const recovery: SettlementRecovery =
      event.recovery === 'home' && config.hasHomeTarget ? 'home' : 'immediate';
    return {
      outcome: { result: 'failed', failure: { stage: event.stage } },
      recovery,
      domain: from.settlement?.domain ?? null,
      landing: makeLanding(recovery, ids, operationId),
    };
  }

  // Cancellation (escape / pointer-cancel / consumer / removal).
  const reason: CancellationReason =
    event.type === 'cancel' ? event.reason : { type: 'escape' };
  return withRecovery(
    { result: 'canceled', reason },
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
    if (phase === 'idle') {
      return null;
    }

    const op = from.operation;

    if (
      event.type === 'activation-ready' &&
      isActiveOp(from, event.operationId)
    ) {
      return { viewportDelta: ORIGIN };
    }

    if (!op || op.type === 'admitted' || !from.pointer) {
      return from.motion;
    }

    if (event.type === 'controlled') {
      return { viewportDelta: event.viewportDelta };
    }

    if (
      (event.type === 'move' && ownsPointer(from, event.pointerId)) ||
      (event.type === 'release' && ownsPointer(from, event.pointerId)) ||
      event.type === 'invalidate'
    ) {
      const point =
        event.type === 'invalidate' ? from.pointer.latest : event.point;
      const bounds = event.type === 'invalidate' ? event.bounds : event.bounds;
      return {
        viewportDelta: pointerDelta(
          point,
          from.pointer.origin,
          op.originRect,
          from.policy.axis,
          bounds,
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
    if (phase === 'idle') {
      return null;
    }

    if (event.type === 'admit') {
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

    if (event.type === 'move' && ownsPointer(from, event.pointerId)) {
      return { ...from.pointer, latest: event.point };
    }

    if (event.type === 'release' && ownsPointer(from, event.pointerId)) {
      return { ...from.pointer, latest: event.point, release: event.point };
    }

    return from.pointer;
  };

  const reduceOperationSlice = (
    from: DraggableState,
    event: DraggableEvent,
    phase: DragPhase,
  ): FreeOperation | null => {
    if (phase === 'idle') {
      return null;
    }

    if (event.type === 'admit') {
      return {
        type: 'admitted',
        operationId: event.operationId,
        item: event.item,
      };
    }

    const op = from.operation;

    if (!op) {
      return op;
    }

    if (
      event.type === 'activation-ready' &&
      isActiveOp(from, event.operationId)
    ) {
      return {
        type: 'candidate',
        operationId: op.operationId,
        item: op.item,
        visual: event.candidate.visual,
        lift: event.candidate.lift,
        originRect: event.candidate.originRect,
        coordinateSpace: event.candidate.coordinateSpace,
      };
    }

    if (
      event.type === 'start-succeeded' &&
      isActiveOp(from, event.operationId) &&
      op.type === 'candidate'
    ) {
      return { ...op, type: 'active' };
    }

    return op;
  };

  const reducePolicySlice = (
    from: DraggableState,
    event: DraggableEvent,
  ): FreePolicy => {
    if (event.type === 'set-policy') {
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
    if (phase !== 'awaiting-result') {
      return { stage: 'none' };
    }

    // Entering awaiting-result on release: commit one proposal-ready value.
    if (event.type === 'release' && from.phase === 'dragging') {
      const op = from.operation;

      if (op && op.type !== 'admitted' && from.pointer) {
        const mapper = effectiveMapper(from) ?? op.coordinateSpace;
        const proposal = buildFreeDropProposal(
          op.item,
          op.visual,
          event.point,
          nextDelta,
          op.originRect,
          mapper,
        );
        return { stage: 'proposal-ready', proposal };
      }
    }

    if (
      event.type === 'resolution-started' &&
      from.drop.stage === 'proposal-ready' &&
      isActiveOp(from, event.operationId)
    ) {
      return {
        stage: 'awaiting-consumer',
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
    if (phase === 'idle') {
      return null;
    }

    if (phase !== 'settling') {
      return from.settlement;
    }

    // First entry into settling.
    if (from.phase !== 'settling') {
      return enterSettling(from, event, config, ids);
    }

    // Progress within settling.
    const { settlement } = from;

    if (!settlement) {
      return settlement;
    }

    const { landing } = settlement;

    if (
      event.type === 'landing-plan-ready' &&
      landing.stage === 'preparing' &&
      landing.currency.landingId === event.landingId
    ) {
      return {
        ...settlement,
        landing: {
          stage: 'preparing',
          currency: landing.currency,
          plan: event.plan,
        },
      };
    }

    if (
      event.type === 'landing-started' &&
      landing.stage === 'preparing' &&
      landing.plan &&
      landing.currency.landingId === event.landingId
    ) {
      return {
        ...settlement,
        landing: {
          stage: 'running',
          currency: landing.currency,
          plan: landing.plan,
        },
      };
    }

    if (
      event.type === 'landing-finished' &&
      landing.stage === 'running' &&
      landing.currency.landingId === event.landingId
    ) {
      return {
        ...settlement,
        landing: {
          stage: 'completing',
          currency: landing.currency,
          plan: landing.plan,
        },
      };
    }

    if (
      (event.type === 'settlement-failed' || event.type === 'home-invalid') &&
      landing.stage !== 'skipped' &&
      landing.currency.landingId === event.landingId
    ) {
      const stage: FailureCause['stage'] =
        event.type === 'home-invalid' ? 'home-target' : event.stage;
      return {
        outcome: { result: 'failed', failure: { stage } },
        recovery: 'immediate',
        domain: settlement.domain,
        landing: { stage: 'skipped' },
      };
    }

    return settlement;
  };

  return (from, event) => {
    const lifecycle = classifyMove(from, event, config, classify(from, event));
    const phase = transitionKernelPhase(from.phase, lifecycle);

    const nextDelta =
      reduceMotionSlice(from, event, phase)?.viewportDelta ??
      from.motion?.viewportDelta ??
      ORIGIN;

    const pointer = reducePointerSlice(from, event, phase);
    const policy = reducePolicySlice(from, event);
    const operation = reduceOperationSlice(from, event, phase);
    const motion = reduceMotionSlice(from, event, phase);
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
