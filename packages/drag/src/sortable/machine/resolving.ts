import {
  CANCEL_CONSUMER,
  FAILURE_REORDER_RESOLUTION,
  OUTCOME_ACCEPTED,
  OUTCOME_REJECTED,
  RECOVERY_DESTINATION,
  RECOVERY_HOME,
} from '../../kernel/protocol.ts';
import {
  REORDER_CANCELED_AT_CONSUMER,
  REORDER_REJECTION_CONSUMER,
  type ReorderTransactionResult,
} from '../options.ts';
import {
  WATCH_PRESENTATION,
  type SortableDecision,
  type SortableMachineConfig,
} from './effect.ts';
import {
  OPERATION_CANCELED,
  REORDER_RESOLVED,
  REORDER_RESOLUTION_FAILED,
  type SortableEvent,
} from './event.ts';
import {
  createSettlement,
  ignoreSortable,
  reportFailure,
  settlementEffects,
} from './helpers.ts';
import type { ResolvingSortableState } from './state.ts';

export function decideResolving(
  state: ResolvingSortableState,
  event: SortableEvent,
  config: SortableMachineConfig,
): SortableDecision {
  const { operation, currency, proposal } = state;

  if (event.type === OPERATION_CANCELED) {
    return settlementEffects(
      createSettlement(
        state.nextOperationId,
        operation,
        {
          type: 51,
          reason: event.reason,
          at: REORDER_CANCELED_AT_CONSUMER,
          proposal,
        },
        RECOVERY_HOME,
        { stage: 0 },
      ),
      config,
    );
  }

  const current =
    'resolutionId' in event &&
    event.operationId === currency.operationId &&
    event.resolutionId === currency.resolutionId;

  if (event.type === REORDER_RESOLUTION_FAILED && current) {
    return reportFailure(
      state,
      operation,
      { stage: FAILURE_REORDER_RESOLUTION },
      event.error,
      null,
      createSettlement(
        state.nextOperationId,
        operation,
        {
          type: 51,
          reason: { type: CANCEL_CONSUMER },
          at: REORDER_CANCELED_AT_CONSUMER,
          proposal,
        },
        RECOVERY_HOME,
        { stage: 0 },
      ),
      config,
    );
  }

  if (event.type !== REORDER_RESOLVED || !current) {
    return ignoreSortable(state);
  }

  const accepted = event.resolution.type === OUTCOME_ACCEPTED;
  const domain: ReorderTransactionResult = accepted
    ? { type: OUTCOME_ACCEPTED, proposal }
    : {
        type: OUTCOME_REJECTED,
        reason: REORDER_REJECTION_CONSUMER,
        detail: event.resolution.reason,
        proposal,
      };
  const presentation = event.resolution.presentationReady
    ? { stage: 1 as const, currency }
    : { stage: 0 as const };
  const settling = createSettlement(
    state.nextOperationId,
    operation,
    domain,
    accepted ? RECOVERY_DESTINATION : RECOVERY_HOME,
    presentation,
  );
  const base = settlementEffects(settling, config);

  if (!event.resolution.presentationReady) {
    return base;
  }
  const effects = Array.isArray(base.effects)
    ? [...base.effects]
    : base.effects
      ? [base.effects]
      : [];
  effects.push({
    type: WATCH_PRESENTATION,
    ...currency,
    ready: event.resolution.presentationReady,
  });
  return { state: settling, effects };
}
