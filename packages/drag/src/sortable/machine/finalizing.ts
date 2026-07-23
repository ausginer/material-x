import {
  FAILURE_CANCEL_CALLBACK,
  FAILURE_FINISH_CALLBACK,
} from '../../kernel/protocol.ts';
import {
  REPORT_FAILURE,
  RETIRE_OPERATION,
  type SortableDecision,
  type SortableMachineConfig,
} from './effect.ts';
import {
  FINALIZATION_COMPLETED,
  FINALIZATION_FAILED,
  type SortableEvent,
} from './event.ts';
import { createIdle, ignoreSortable } from './helpers.ts';
import { SORTABLE_REPORTING, type FinalizingSortableState } from './state.ts';

export function decideFinalizing(
  state: FinalizingSortableState,
  event: SortableEvent,
  config: SortableMachineConfig,
): SortableDecision {
  if (
    event.type === FINALIZATION_COMPLETED &&
    event.operationId === state.operation.operationId
  ) {
    return {
      state: createIdle(state.nextOperationId),
      effects: { type: RETIRE_OPERATION, operationId: event.operationId },
    };
  }

  if (
    event.type === FINALIZATION_FAILED &&
    event.operationId === state.operation.operationId
  ) {
    return {
      state: {
        phase: SORTABLE_REPORTING,
        nextOperationId: state.nextOperationId,
        operation: state.operation,
        cause: event.cause,
        error: event.error,
        domain: state.terminal.domain,
        continuation: createIdle(state.nextOperationId),
      },
      effects: [
        {
          type: REPORT_FAILURE,
          operationId: state.operation.operationId,
          cause: event.cause,
          error: event.error,
          domain: state.terminal.domain,
          callback: config.onError,
        },
        { type: RETIRE_OPERATION, operationId: state.operation.operationId },
      ],
    };
  }

  void FAILURE_CANCEL_CALLBACK;
  void FAILURE_FINISH_CALLBACK;
  return ignoreSortable(state);
}
