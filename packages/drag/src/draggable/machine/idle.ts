import { BEGIN_POINTER_OPERATION, type DraggableDecision } from './effect.ts';
import { ADMIT_POINTER, type DraggableEvent } from './event.ts';
import { ignoreDraggable, replacePhase } from './helpers.ts';
import {
  DRAG_PENDING_ARMING,
  type IdleDraggableState,
  type PendingOperation,
} from './state.ts';

export function decideIdle(
  state: IdleDraggableState,
  event: DraggableEvent,
): DraggableDecision {
  if (event.type !== ADMIT_POINTER) {
    return ignoreDraggable(state);
  }

  const operationId = state.nextOperationId;
  const operation: PendingOperation = {
    operationId,
    item: event.item,
    visual: event.visual,
    pointerId: event.pointerId,
    originPointer: event.point,
    latestPointer: event.point,
    nextMotionId: 1,
    nextResolutionId: 1,
    nextLandingId: 1,
  };
  return {
    state: replacePhase(
      { ...state, nextOperationId: operationId + 1 },
      { phase: DRAG_PENDING_ARMING, operation },
    ),
    effects: {
      type: BEGIN_POINTER_OPERATION,
      operationId,
      pointerId: event.pointerId,
    },
  };
}
