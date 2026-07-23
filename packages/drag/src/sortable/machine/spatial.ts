import {
  CANCEL_CONSUMER,
  FAILURE_REORDER_RESOLUTION,
  OUTCOME_NO_OP,
  RECOVERY_IMMEDIATE,
} from '../../kernel/protocol.ts';
import { buildReorderProposal } from '../request.ts';
import {
  OPEN_REORDER_RESOLUTION,
  PLACE_COMMITTED_INSERTION,
  type SortableDecision,
  type SortableMachineConfig,
} from './effect.ts';
import {
  OPERATION_CANCELED,
  PROPOSAL_INSERTION_FAILED,
  PROPOSAL_INSERTION_RESOLVED,
  type SortableEvent,
} from './event.ts';
import {
  cancelResult,
  createSettlement,
  ignoreSortable,
  reportFailure,
  settlementEffects,
} from './helpers.ts';
import { SORTABLE_RESOLVING, type SpatialSortableState } from './state.ts';

export function decideSpatial(
  state: SpatialSortableState,
  event: SortableEvent,
  config: SortableMachineConfig,
): SortableDecision {
  const { operation, currency } = state;

  if (event.type === OPERATION_CANCELED) {
    return settlementEffects(
      createSettlement(
        state.nextOperationId,
        operation,
        cancelResult(event.reason, null),
        54,
        { stage: 0 },
      ),
      config,
    );
  }

  const current =
    'spatialId' in event &&
    event.operationId === currency.operationId &&
    event.collectionVersion === currency.collectionVersion &&
    event.spatialId === currency.spatialId;

  if (event.type === PROPOSAL_INSERTION_FAILED && current) {
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
          at: 108,
          proposal: null,
        },
        54,
        { stage: 0 },
      ),
      config,
    );
  }

  if (event.type !== PROPOSAL_INSERTION_RESOLVED || !current) {
    return ignoreSortable(state);
  }

  const build = buildReorderProposal(
    operation.snapshot,
    operation.item,
    event.insertion,
  );
  if (!build) {
    return reportFailure(
      state,
      operation,
      { stage: FAILURE_REORDER_RESOLUTION },
      new Error('drag: could not build a reorder proposal'),
      null,
      createSettlement(
        state.nextOperationId,
        operation,
        {
          type: 51,
          reason: { type: CANCEL_CONSUMER },
          at: 108,
          proposal: null,
        },
        54,
        { stage: 0 },
      ),
      config,
    );
  }

  const nextOperation = { ...operation, insertion: event.insertion };
  if (build.noop) {
    return settlementEffects(
      createSettlement(
        state.nextOperationId,
        nextOperation,
        { type: OUTCOME_NO_OP, proposal: build.proposal },
        RECOVERY_IMMEDIATE,
        { stage: 0 },
      ),
      config,
    );
  }

  const resolutionId = operation.nextResolutionId;
  return {
    state: {
      phase: SORTABLE_RESOLVING,
      nextOperationId: state.nextOperationId,
      operation: {
        ...nextOperation,
        nextResolutionId: resolutionId + 1,
      },
      currency: { operationId: operation.operationId, resolutionId },
      proposal: build.proposal,
    },
    effects: [
      {
        type: PLACE_COMMITTED_INSERTION,
        operationId: operation.operationId,
        insertion: event.insertion,
      },
      {
        type: OPEN_REORDER_RESOLUTION,
        operationId: operation.operationId,
        resolutionId,
        proposal: build.proposal,
        callback: config.onReorder,
      },
    ],
  };
}
