import { FAILURE_ACTIVATION } from '../../kernel/protocol.ts';
import type { Point } from '../../kernel/types.ts';
import {
  ACQUIRE_FREE_ACTIVATION,
  DISARM_OPERATION,
  type DraggableDecision,
  type DraggableMachineConfig,
} from './effect.ts';
import {
  OPERATION_ARMED,
  OPERATION_ARM_FAILED,
  OPERATION_CANCELED,
  POINTER_MOVED,
  POINTER_RELEASED,
  type DraggableEvent,
} from './event.ts';
import {
  ignoreDraggable,
  replacePhase,
  reportFailure,
  sameOperation,
} from './helpers.ts';
import {
  DRAG_ACQUIRING,
  DRAG_IDLE,
  DRAG_PENDING,
  DRAG_PENDING_ARMING,
  type PendingDraggableState,
} from './state.ts';

function crossed(origin: Point, latest: Point, threshold: number): boolean {
  return (
    Math.abs(latest.x - origin.x) >= threshold ||
    Math.abs(latest.y - origin.y) >= threshold
  );
}

export function decidePending(
  state: PendingDraggableState,
  event: DraggableEvent,
  config: DraggableMachineConfig,
): DraggableDecision {
  const { operation } = state;

  if (
    event.type === OPERATION_ARMED &&
    state.phase === DRAG_PENDING_ARMING &&
    sameOperation(operation, event)
  ) {
    return {
      state: replacePhase(state, { phase: DRAG_PENDING, operation }),
      effects: null,
    };
  }

  if (event.type === OPERATION_ARM_FAILED && sameOperation(operation, event)) {
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

  if (
    event.type === POINTER_RELEASED &&
    event.pointerId === operation.pointerId
  ) {
    return {
      state: replacePhase(state, { phase: DRAG_IDLE }),
      effects: {
        type: DISARM_OPERATION,
        operationId: operation.operationId,
      },
    };
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

  if (event.type !== POINTER_MOVED || event.pointerId !== operation.pointerId) {
    return ignoreDraggable(state);
  }

  if (
    state.phase === DRAG_PENDING_ARMING ||
    !crossed(operation.originPointer, event.point, config.threshold)
  ) {
    return ignoreDraggable(state);
  }

  const nextOperation = {
    ...operation,
    latestPointer: event.point,
  };
  return {
    state: replacePhase(state, {
      phase: DRAG_ACQUIRING,
      operation: nextOperation,
    }),
    effects: {
      type: ACQUIRE_FREE_ACTIVATION,
      operationId: operation.operationId,
      pointerId: operation.pointerId,
      originPointer: operation.originPointer,
      latestPointer: event.point,
      coordinateSpace: state.policy.coordinateSpace,
    },
  };
}
