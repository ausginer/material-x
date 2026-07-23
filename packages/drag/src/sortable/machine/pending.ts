import { FAILURE_PRESENTATION_LEASE } from '../../kernel/protocol.ts';
import {
  ACQUIRE_SORTABLE_ACTIVATION,
  DISARM_OPERATION,
  type SortableDecision,
  type SortableMachineConfig,
} from './effect.ts';
import {
  COLLECTION_UPDATED,
  OPERATION_ARMED,
  OPERATION_ARM_FAILED,
  OPERATION_CANCELED,
  POINTER_MOVED,
  POINTER_RELEASED,
  type SortableEvent,
} from './event.ts';
import {
  createIdle,
  ignoreSortable,
  reportFailure,
  sameOperation,
} from './helpers.ts';
import {
  INPUT_KEYBOARD,
  SORTABLE_ACTIVATING,
  type PendingSortableState,
} from './state.ts';

function crossed(
  origin: Readonly<{ x: number; y: number }>,
  point: Readonly<{ x: number; y: number }>,
  threshold: number,
): boolean {
  return (
    Math.abs(point.x - origin.x) >= threshold ||
    Math.abs(point.y - origin.y) >= threshold
  );
}

export function decidePending(
  state: PendingSortableState,
  event: SortableEvent,
  config: SortableMachineConfig,
): SortableDecision {
  const { operation } = state;

  if (event.type === OPERATION_ARM_FAILED && sameOperation(operation, event)) {
    return reportFailure(
      state,
      operation,
      { stage: FAILURE_PRESENTATION_LEASE },
      event.error,
      null,
      createIdle(state.nextOperationId),
      config,
    );
  }

  if (event.type === OPERATION_CANCELED) {
    return {
      state: createIdle(state.nextOperationId),
      effects: { type: DISARM_OPERATION, operationId: operation.operationId },
    };
  }

  if (
    event.type === POINTER_RELEASED &&
    operation.input.type !== INPUT_KEYBOARD &&
    event.pointerId === operation.input.pointerId
  ) {
    return {
      state: createIdle(state.nextOperationId),
      effects: { type: DISARM_OPERATION, operationId: operation.operationId },
    };
  }

  if (
    event.type === COLLECTION_UPDATED &&
    sameOperation(operation, event) &&
    !event.snapshot.items.includes(operation.item)
  ) {
    return {
      state: createIdle(state.nextOperationId),
      effects: { type: DISARM_OPERATION, operationId: operation.operationId },
    };
  }

  const armed =
    event.type === OPERATION_ARMED && sameOperation(operation, event);
  const moved =
    event.type === POINTER_MOVED &&
    sameOperation(operation, event) &&
    operation.input.type !== INPUT_KEYBOARD &&
    event.pointerId === operation.input.pointerId &&
    crossed(operation.originPoint, event.point, config.threshold);

  if (armed && operation.input.type === INPUT_KEYBOARD) {
    return {
      state: {
        phase: SORTABLE_ACTIVATING,
        nextOperationId: state.nextOperationId,
        operation,
        stage: 'acquiring',
      },
      effects: {
        type: ACQUIRE_SORTABLE_ACTIVATION,
        operationId: operation.operationId,
        operation,
      },
    };
  }

  if (moved) {
    const next = { ...operation, latestPoint: event.point };
    return {
      state: {
        phase: SORTABLE_ACTIVATING,
        nextOperationId: state.nextOperationId,
        operation: next,
        stage: 'acquiring',
      },
      effects: {
        type: ACQUIRE_SORTABLE_ACTIVATION,
        operationId: operation.operationId,
        operation: next,
      },
    };
  }

  if (
    event.type === POINTER_MOVED &&
    sameOperation(operation, event) &&
    operation.input.type !== INPUT_KEYBOARD &&
    event.pointerId === operation.input.pointerId
  ) {
    return {
      state: {
        ...state,
        operation: { ...operation, latestPoint: event.point },
      },
      effects: null,
    };
  }

  if (event.type === OPERATION_ARMED) {
    return ignoreSortable(state);
  }
  if (event.type === OPERATION_ARM_FAILED) {
    return ignoreSortable(state);
  }
  return ignoreSortable(state);
}
