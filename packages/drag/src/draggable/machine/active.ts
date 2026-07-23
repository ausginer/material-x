import {
  FAILURE_MOVE,
  FAILURE_RENDERER_WRITE,
  OUTCOME_CANCELED,
  RECOVERY_HOME,
  RECOVERY_IMMEDIATE,
  type FailureCause,
} from '../../kernel/protocol.ts';
import { pointerDelta } from '../motion.ts';
import {
  INVOKE_MOVE,
  OBSERVE_CONTROLLED_POSITION,
  OBSERVE_FREE_MOTION,
  PRESENT_MOTION,
  RESOLVE_FREE_RELEASE,
  type DraggableDecision,
  type DraggableEffect,
  type DraggableMachineConfig,
  type PresentMotionEffect,
} from './effect.ts';
import {
  CONTROLLED_POSITION,
  CONTROLLED_POSITION_FAILED,
  CONTROLLED_POSITION_RESOLVED,
  INVALIDATED,
  MOTION_OBSERVATION_FAILED,
  MOTION_OBSERVED,
  MOTION_PRESENTATION_FAILED,
  MOVE_CALLBACK_FAILED,
  OPERATION_CANCELED,
  POINTER_MOVED,
  POINTER_RELEASED,
  type DraggableEvent,
} from './event.ts';
import {
  canceledResult,
  createSettlement,
  failedSettlement,
  geometryRequest,
  ignoreDraggable,
  initialSettlementEffects,
  replacePhase,
  reportFailure,
  sameOperation,
  terminalPresentation,
} from './helpers.ts';
import {
  DRAG_RESOLVING_RELEASE,
  DRAGGING,
  type ActiveDraggableState,
  type ActiveOperation,
  type DraggingLifecycle,
  type MotionCurrency,
} from './state.ts';

function motionEffects(
  lifecycle: DraggingLifecycle,
  currency: MotionCurrency,
  callback: ActiveDraggableState['policy']['onMove'],
): DraggableEffect | readonly DraggableEffect[] {
  const present: PresentMotionEffect = {
    ...currency,
    type: PRESENT_MOTION,
    viewportDelta: lifecycle.operation.viewportDelta,
  };

  if (!callback) {
    return present;
  }

  return [
    present,
    {
      ...currency,
      type: INVOKE_MOVE,
      callback,
      geometry: geometryRequest(lifecycle.operation),
    },
  ];
}

export function decideActive(
  state: ActiveDraggableState,
  event: DraggableEvent,
  config: DraggableMachineConfig,
): DraggableDecision {
  const lifecycle = state;
  const { operation } = state;

  if (event.type === POINTER_MOVED && event.pointerId === operation.pointerId) {
    const motionId = operation.nextMotionId;
    const currency = {
      operationId: operation.operationId,
      motionId,
    };
    return {
      state: {
        ...state,
        phase: DRAGGING,
        operation: {
          ...operation,
          nextMotionId: motionId + 1,
        },
        pendingMotion: {
          currency,
          point: event.point,
          refresh: false,
          axis: state.policy.axis,
          callback: state.policy.onMove,
        },
      },
      effects: {
        type: OBSERVE_FREE_MOTION,
        ...currency,
        bounds: state.policy.bounds,
        boundsVersion: state.policy.boundsVersion,
        refresh: false,
      },
    };
  }

  if (event.type === INVALIDATED) {
    const motionId = operation.nextMotionId;
    const currency = {
      operationId: operation.operationId,
      motionId,
    };
    return {
      state: {
        ...state,
        phase: DRAGGING,
        operation: {
          ...operation,
          nextMotionId: motionId + 1,
        },
        pendingMotion: {
          currency,
          point: operation.latestPointer,
          refresh: true,
          axis: state.policy.axis,
          callback: state.policy.onMove,
        },
      },
      effects: {
        type: OBSERVE_FREE_MOTION,
        ...currency,
        bounds: state.policy.bounds,
        boundsVersion: state.policy.boundsVersion,
        refresh: true,
      },
    };
  }

  if (event.type === CONTROLLED_POSITION) {
    const motionId = operation.nextMotionId;
    const currency = {
      operationId: operation.operationId,
      motionId,
    };
    return {
      state: {
        ...state,
        phase: DRAGGING,
        operation: {
          ...operation,
          nextMotionId: motionId + 1,
        },
        pendingMotion: {
          currency,
          point: operation.latestPointer,
          refresh: false,
          axis: state.policy.axis,
          callback: state.policy.onMove,
        },
      },
      effects: {
        type: OBSERVE_CONTROLLED_POSITION,
        ...currency,
        position: event.position,
        originRect: operation.originRect,
        coordinateSpace:
          state.policy.coordinateSpace ?? operation.coordinateSpace,
      },
    };
  }

  if (
    event.type === MOTION_OBSERVED &&
    lifecycle.pendingMotion &&
    lifecycle.pendingMotion.currency.motionId === event.motionId &&
    sameOperation(operation, event)
  ) {
    const { point } = lifecycle.pendingMotion;
    const delta = pointerDelta(
      point,
      operation.originPointer,
      operation.originRect,
      lifecycle.pendingMotion.axis,
      event.bounds,
    );
    const nextOperation: ActiveOperation = {
      ...operation,
      latestPointer: point,
      viewportDelta: delta,
    };
    const nextLifecycle: DraggingLifecycle = {
      phase: DRAGGING,
      operation: nextOperation,
      pendingMotion: null,
    };
    return {
      state: replacePhase(state, nextLifecycle),
      effects: motionEffects(
        nextLifecycle,
        event,
        lifecycle.pendingMotion.callback,
      ),
    };
  }

  if (
    event.type === CONTROLLED_POSITION_RESOLVED &&
    lifecycle.pendingMotion &&
    lifecycle.pendingMotion.currency.motionId === event.motionId &&
    sameOperation(operation, event)
  ) {
    const nextLifecycle: DraggingLifecycle = {
      phase: DRAGGING,
      operation: {
        ...operation,
        viewportDelta: event.viewportDelta,
      },
      pendingMotion: null,
    };
    return {
      state: replacePhase(state, nextLifecycle),
      effects: motionEffects(
        nextLifecycle,
        event,
        lifecycle.pendingMotion.callback,
      ),
    };
  }

  if (
    (event.type === MOTION_OBSERVATION_FAILED ||
      event.type === CONTROLLED_POSITION_FAILED ||
      event.type === MOTION_PRESENTATION_FAILED ||
      event.type === MOVE_CALLBACK_FAILED) &&
    sameOperation(operation, event)
  ) {
    const cause: FailureCause =
      event.type === MOTION_PRESENTATION_FAILED
        ? { stage: FAILURE_RENDERER_WRITE }
        : { stage: FAILURE_MOVE };
    return reportFailure(
      state,
      operation,
      cause,
      event.error,
      null,
      failedSettlement(operation, null, config.hasHomeTarget),
      config.onError,
    );
  }

  if (
    event.type === POINTER_RELEASED &&
    event.pointerId === operation.pointerId
  ) {
    const motionId = operation.nextMotionId;
    const currency = {
      operationId: operation.operationId,
      motionId,
    };
    return {
      state: replacePhase(state, {
        phase: DRAG_RESOLVING_RELEASE,
        operation: {
          ...operation,
          nextMotionId: motionId + 1,
        },
        currency,
        point: event.point,
      }),
      effects: {
        type: RESOLVE_FREE_RELEASE,
        ...currency,
        item: operation.item,
        visual: operation.visual,
        point: event.point,
        originPointer: operation.originPointer,
        originRect: operation.originRect,
        coordinateSpace:
          state.policy.coordinateSpace ?? operation.coordinateSpace,
        axis: state.policy.axis,
        bounds: state.policy.bounds,
        boundsVersion: state.policy.boundsVersion,
      },
    };
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

  return ignoreDraggable(state);
}
