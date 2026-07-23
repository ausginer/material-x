import {
  FAILURE_ACTIVATION,
  FAILURE_CANCEL_CALLBACK,
  FAILURE_FINISH_CALLBACK,
  OUTCOME_ACCEPTED,
  OUTCOME_CANCELED,
  OUTCOME_FAILED,
  OUTCOME_NO_OP,
  OUTCOME_REJECTED,
  RECOVERY_IMMEDIATE,
  type CancellationReason,
  type FailureCause,
} from '../../kernel/protocol.ts';
import {
  REORDER_CANCELED_AT_PROPOSAL,
  type ReorderProposal,
  type ReorderTransactionResult,
} from '../options.ts';
import {
  PREPARE_SORTABLE_LANDING,
  FINALIZE_OPERATION,
  REPORT_FAILURE,
  STOP_INTERACTION,
  type SortableDecision,
  type SortableEffect,
  type SortableMachineConfig,
} from './effect.ts';
import type { SortableEvent } from './event.ts';
import {
  LANDING_PREPARING,
  LANDING_TERMINAL,
  PRESENTATION_ABSENT,
  PRESENTATION_TERMINAL,
  SORTABLE_IDLE,
  SORTABLE_FINALIZING,
  SORTABLE_REPORTING,
  SORTABLE_SETTLING,
  type ActiveSortableOperation,
  type IdleSortableState,
  type SettlingSortableState,
  type SortableOperation,
  type SortableState,
} from './state.ts';

export function sameOperation(
  operation: SortableOperation,
  event: SortableEvent,
): boolean {
  return 'operationId' in event && event.operationId === operation.operationId;
}

export function createIdle(nextOperationId: number): IdleSortableState {
  return { phase: SORTABLE_IDLE, nextOperationId };
}

export function cancelResult(
  reason: CancellationReason,
  proposal: ReorderProposal | null,
): ReorderTransactionResult {
  return {
    type: OUTCOME_CANCELED,
    reason,
    at: REORDER_CANCELED_AT_PROPOSAL,
    proposal,
  };
}

export function createSettlement(
  nextOperationId: number,
  operation: ActiveSortableOperation,
  domain: ReorderTransactionResult,
  recovery: SettlingSortableState['recovery'],
  watch: SettlingSortableState['presentation'],
): SettlingSortableState {
  const landingId = operation.nextLandingId;
  return {
    phase: SORTABLE_SETTLING,
    nextOperationId,
    operation: { ...operation, nextLandingId: landingId + 1 },
    outcome: { result: domain.type, domain },
    recovery,
    interactionStopped: false,
    landing:
      recovery === RECOVERY_IMMEDIATE
        ? { stage: LANDING_TERMINAL }
        : {
            stage: LANDING_PREPARING,
            currency: { operationId: operation.operationId, landingId },
          },
    presentation: watch,
  };
}

export function failedSettlement(
  nextOperationId: number,
  operation: ActiveSortableOperation,
  domain: ReorderTransactionResult | null,
): SettlingSortableState {
  return {
    phase: SORTABLE_SETTLING,
    nextOperationId,
    operation,
    outcome: { result: OUTCOME_FAILED, domain },
    recovery: RECOVERY_IMMEDIATE,
    interactionStopped: false,
    landing: { stage: LANDING_TERMINAL },
    presentation: { stage: PRESENTATION_TERMINAL },
  };
}

export function reportFailure(
  state: SortableState,
  operation: SortableOperation,
  cause: FailureCause,
  error: unknown,
  domain: ReorderTransactionResult | null,
  continuation: IdleSortableState | SettlingSortableState,
  config: SortableMachineConfig,
): SortableDecision {
  return {
    state: {
      phase: SORTABLE_REPORTING,
      nextOperationId: state.nextOperationId,
      operation,
      cause,
      error,
      domain,
      continuation,
    },
    effects: {
      type: REPORT_FAILURE,
      operationId: operation.operationId,
      cause,
      error,
      domain,
      callback: config.onError,
    },
  };
}

export function activationFailure(
  state: SortableState,
  operation: SortableOperation,
  error: unknown,
  config: SortableMachineConfig,
): SortableDecision {
  return reportFailure(
    state,
    operation,
    { stage: FAILURE_ACTIVATION },
    error,
    null,
    createIdle(state.nextOperationId),
    config,
  );
}

export function settlementEffects(
  state: SettlingSortableState,
): SortableDecision {
  const effects: SortableEffect[] = [];
  effects.push({
    type: STOP_INTERACTION,
    operationId: state.operation.operationId,
  });
  if (state.landing.stage === LANDING_PREPARING) {
    effects.push({
      type: PREPARE_SORTABLE_LANDING,
      ...state.landing.currency,
      operation: state.operation,
      recovery: state.recovery,
    });
  }
  if (state.presentation.stage !== PRESENTATION_ABSENT) {
    // The watch effect is emitted by the resolution branch because it owns the promise.
  }
  return { state, effects };
}

export function finalizeSettlement(
  state: SettlingSortableState,
  config: SortableMachineConfig,
): SortableDecision {
  const { domain } = state.outcome;
  const finishes =
    domain?.type === OUTCOME_ACCEPTED || domain?.type === OUTCOME_NO_OP;
  const failureCause = {
    stage: finishes ? FAILURE_FINISH_CALLBACK : FAILURE_CANCEL_CALLBACK,
  } as const;
  const callback =
    domain?.type === OUTCOME_ACCEPTED || domain?.type === OUTCOME_NO_OP
      ? () => config.onFinish?.(domain)
      : domain?.type === OUTCOME_REJECTED || domain?.type === OUTCOME_CANCELED
        ? () => config.onCancel?.(domain)
        : undefined;

  return {
    state: {
      phase: SORTABLE_FINALIZING,
      nextOperationId: state.nextOperationId,
      operation: state.operation,
      terminal: state.outcome,
      failureCause,
    },
    effects: {
      type: FINALIZE_OPERATION,
      operationId: state.operation.operationId,
      callback,
      failureCause,
    },
  };
}
