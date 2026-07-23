import {
  CANCEL_CONSUMER,
  FAILURE_PLACEHOLDER_TARGET,
  FAILURE_REORDER_RESOLUTION,
  OUTCOME_ACCEPTED,
  OUTCOME_CANCELED,
  OUTCOME_REJECTED,
  RECOVERY_DESTINATION,
  RECOVERY_HOME,
} from '../../kernel/protocol.ts';
import { ignored } from '../../kernel/session.ts';
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
  PLACEHOLDER_WRITE_FAILED,
  REORDER_RESOLVED,
  REORDER_RESOLUTION_FAILED,
  type SortableEvent,
} from './event.ts';
import {
  createSettlement,
  reportFailure,
  settlementEffects,
} from './helpers.ts';
import {
  PRESENTATION_ABSENT,
  PRESENTATION_WATCHING,
  type PresentationGate,
  type ResolvingSortableState,
} from './state.ts';

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
          type: OUTCOME_CANCELED,
          reason: event.reason,
          at: REORDER_CANCELED_AT_CONSUMER,
          proposal,
        },
        RECOVERY_HOME,
        { stage: PRESENTATION_ABSENT },
      ),
    );
  }

  if (
    event.type === PLACEHOLDER_WRITE_FAILED &&
    event.operationId === operation.operationId
  ) {
    return reportFailure(
      state,
      operation,
      { stage: FAILURE_PLACEHOLDER_TARGET },
      event.error,
      null,
      createSettlement(
        state.nextOperationId,
        operation,
        {
          type: OUTCOME_CANCELED,
          reason: { type: CANCEL_CONSUMER },
          at: REORDER_CANCELED_AT_CONSUMER,
          proposal,
        },
        RECOVERY_HOME,
        { stage: PRESENTATION_ABSENT },
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
          type: OUTCOME_CANCELED,
          reason: { type: CANCEL_CONSUMER },
          at: REORDER_CANCELED_AT_CONSUMER,
          proposal,
        },
        RECOVERY_HOME,
        { stage: PRESENTATION_ABSENT },
      ),
      config,
    );
  }

  if (event.type !== REORDER_RESOLVED || !current) {
    return ignored(state);
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
  const presentation: PresentationGate = event.resolution.presentationReady
    ? { stage: PRESENTATION_WATCHING, currency }
    : { stage: PRESENTATION_ABSENT };
  const settling = createSettlement(
    state.nextOperationId,
    operation,
    domain,
    accepted ? RECOVERY_DESTINATION : RECOVERY_HOME,
    presentation,
  );
  const base = settlementEffects(settling);

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
