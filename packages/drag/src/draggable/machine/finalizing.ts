import {
  FAILURE_CANCEL_CALLBACK,
  FAILURE_FINISH_CALLBACK,
  OUTCOME_ACCEPTED,
} from '../../kernel/protocol.ts';
import { ignored } from '../../kernel/session.ts';
import {
  RETIRE_OPERATION,
  type DraggableDecision,
  type DraggableMachineConfig,
} from './effect.ts';
import {
  FINALIZATION_COMPLETED,
  FINALIZATION_FAILED,
  type DraggableEvent,
} from './event.ts';
import { replacePhase, reportFailure, sameOperation } from './helpers.ts';
import { DRAG_IDLE, type FinalizingDraggableState } from './state.ts';

export function decideFinalizing(
  state: FinalizingDraggableState,
  event: DraggableEvent,
  config: DraggableMachineConfig,
): DraggableDecision {
  const lifecycle = state;

  if (
    event.type === FINALIZATION_COMPLETED &&
    sameOperation(lifecycle.operation, event)
  ) {
    return {
      state: replacePhase(state, { phase: DRAG_IDLE }),
      effects: {
        type: RETIRE_OPERATION,
        operationId: lifecycle.operation.operationId,
      },
    };
  }

  if (
    event.type === FINALIZATION_FAILED &&
    sameOperation(lifecycle.operation, event)
  ) {
    const stage =
      lifecycle.terminal.result === OUTCOME_ACCEPTED
        ? FAILURE_FINISH_CALLBACK
        : FAILURE_CANCEL_CALLBACK;
    return reportFailure(
      state,
      lifecycle.operation,
      { stage },
      event.error,
      lifecycle.terminal.domain,
      { phase: DRAG_IDLE },
      config.onError,
    );
  }

  return ignored(state);
}
