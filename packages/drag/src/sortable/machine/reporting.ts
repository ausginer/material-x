import {
  FINALIZE_OPERATION,
  RETIRE_OPERATION,
  type SortableDecision,
  type SortableMachineConfig,
} from './effect.ts';
import { FAILURE_REPORTED, type SortableEvent } from './event.ts';
import { ignoreSortable, settlementEffects } from './helpers.ts';
import {
  LANDING_TERMINAL,
  PRESENTATION_WATCHING,
  SORTABLE_FINALIZING,
  SORTABLE_SETTLING,
  type ReportingSortableState,
} from './state.ts';

export function decideReporting(
  state: ReportingSortableState,
  event: SortableEvent,
  config: SortableMachineConfig,
): SortableDecision {
  if (
    event.type === FAILURE_REPORTED &&
    event.operationId === state.operation.operationId
  ) {
    const { continuation } = state;
    if (
      continuation.phase === SORTABLE_SETTLING &&
      continuation.interactionStopped &&
      continuation.landing.stage === LANDING_TERMINAL &&
      continuation.presentation.stage !== PRESENTATION_WATCHING
    ) {
      return {
        state: {
          phase: SORTABLE_FINALIZING,
          nextOperationId: state.nextOperationId,
          operation: continuation.operation,
          terminal: continuation.outcome,
        },
        effects: {
          type: FINALIZE_OPERATION,
          operationId: continuation.operation.operationId,
          terminal: continuation.outcome,
          onFinish: config.onFinish,
          onCancel: config.onCancel,
        },
      };
    }
    if (continuation.phase === SORTABLE_SETTLING) {
      return settlementEffects(continuation, config);
    }
    return {
      state: continuation,
      effects: {
        type: RETIRE_OPERATION,
        operationId: state.operation.operationId,
      },
    };
  }
  return ignoreSortable(state);
}
