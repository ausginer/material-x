import {
  FAILURE_ACTIVATION,
  OUTCOME_CANCELED,
  RECOVERY_HOME,
  RECOVERY_IMMEDIATE,
} from '../../kernel/protocol.ts';
import { ignored } from '../../kernel/session.ts';
import { pointerDelta } from '../motion.ts';
import {
  DISARM_OPERATION,
  INVOKE_START,
  PRESENT_MOTION,
  type DraggableDecision,
  type DraggableMachineConfig,
} from './effect.ts';
import {
  ACTIVATION_FAILED,
  ACTIVATION_READY,
  OPERATION_CANCELED,
  START_FAILED,
  START_SUCCEEDED,
  type DraggableEvent,
} from './event.ts';
import {
  canceledResult,
  createSettlement,
  geometryRequest,
  initialSettlementEffects,
  replacePhase,
  reportFailure,
  sameOperation,
  terminalPresentation,
} from './helpers.ts';
import {
  DRAG_IDLE,
  DRAG_STARTING,
  DRAGGING,
  type AcquiringDraggableState,
  type ActiveOperation,
  type StartingDraggableState,
} from './state.ts';

export function decideAcquiring(
  state: AcquiringDraggableState,
  event: DraggableEvent,
  config: DraggableMachineConfig,
): DraggableDecision {
  const { operation } = state;

  if (event.type === ACTIVATION_READY && sameOperation(operation, event)) {
    const viewportDelta = {
      ...pointerDelta(
        operation.latestPointer,
        operation.originPointer,
        event.candidate.originRect,
        state.policy.axis,
        null,
      ),
    };
    const active: ActiveOperation = {
      ...operation,
      ...event.candidate,
      viewportDelta,
    };
    return {
      state: replacePhase(state, {
        phase: DRAG_STARTING,
        operation: active,
      }),
      effects: {
        type: INVOKE_START,
        operationId: operation.operationId,
        geometry: geometryRequest(active),
        callback: config.onStart,
      },
    };
  }

  if (event.type === ACTIVATION_FAILED && sameOperation(operation, event)) {
    return reportFailure(
      state,
      operation,
      { stage: FAILURE_ACTIVATION },
      event.error,
      null,
      { phase: DRAG_IDLE },
      config.onError,
    );
  }

  if (event.type === OPERATION_CANCELED) {
    return {
      state: replacePhase(state, { phase: DRAG_IDLE }),
      effects: {
        type: DISARM_OPERATION,
        operationId: operation.operationId,
      },
    };
  }

  return ignored(state);
}

export function decideStarting(
  state: StartingDraggableState,
  event: DraggableEvent,
  config: DraggableMachineConfig,
): DraggableDecision {
  const { operation } = state;

  if (event.type === START_SUCCEEDED && sameOperation(operation, event)) {
    return {
      state: replacePhase(state, {
        phase: DRAGGING,
        operation,
        pendingMotion: null,
      }),
      effects: {
        type: PRESENT_MOTION,
        operationId: operation.operationId,
        motionId: 0,
        viewportDelta: operation.viewportDelta,
      },
    };
  }

  if (event.type === START_FAILED && sameOperation(operation, event)) {
    return reportFailure(
      state,
      operation,
      { stage: FAILURE_ACTIVATION },
      event.error,
      null,
      { phase: DRAG_IDLE },
      config.onError,
    );
  }

  if (event.type === OPERATION_CANCELED) {
    const domain = canceledResult(event.reason);
    const settling = createSettlement(
      operation,
      { result: OUTCOME_CANCELED, domain },
      config.hasHomeTarget ? RECOVERY_HOME : RECOVERY_IMMEDIATE,
      terminalPresentation(),
    );
    return {
      state: replacePhase(state, settling),
      effects: initialSettlementEffects(
        settling,
        undefined,
        config.resolveHomeTarget,
      ),
    };
  }

  return ignored(state);
}
