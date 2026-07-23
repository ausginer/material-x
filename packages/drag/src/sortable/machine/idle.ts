import { ignored } from '../../kernel/session.ts';
import {
  BEGIN_KEYBOARD_OPERATION,
  BEGIN_POINTER_OPERATION,
  type SortableDecision,
} from './effect.ts';
import { ADMIT_KEYBOARD, ADMIT_POINTER, type SortableEvent } from './event.ts';
import {
  INPUT_KEYBOARD,
  INPUT_POINTER,
  SORTABLE_PENDING,
  type IdleSortableState,
  type SortableOperation,
} from './state.ts';

export function decideIdle(
  state: IdleSortableState,
  event: SortableEvent,
): SortableDecision {
  if (event.type !== ADMIT_POINTER && event.type !== ADMIT_KEYBOARD) {
    return ignored(state);
  }

  const operationId = state.nextOperationId;
  const operation: SortableOperation = {
    operationId,
    input:
      event.type === ADMIT_POINTER
        ? { type: INPUT_POINTER, pointerId: event.pointerId }
        : { type: INPUT_KEYBOARD },
    item: event.item,
    visual: event.visual,
    snapshot: event.snapshot,
    originPoint: event.point,
    latestPoint: event.point,
    insertion: event.type === ADMIT_KEYBOARD ? event.insertion : null,
    nextSpatialId: 1,
    nextMotionId: 1,
    nextResolutionId: 1,
    nextLandingId: 1,
  };

  return {
    state: {
      phase: SORTABLE_PENDING,
      nextOperationId: operationId + 1,
      operation,
    },
    effects:
      event.type === ADMIT_POINTER
        ? {
            type: BEGIN_POINTER_OPERATION,
            operationId,
            pointerId: event.pointerId,
          }
        : { type: BEGIN_KEYBOARD_OPERATION, operationId },
  };
}
