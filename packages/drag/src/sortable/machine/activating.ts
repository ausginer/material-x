import {
  ACQUIRE_SORTABLE_ACTIVATION,
  INVOKE_START,
  RESOLVE_PROPOSAL_INSERTION,
  type SortableDecision,
  type SortableMachineConfig,
} from './effect.ts';
import {
  ACTIVATION_FAILED,
  ACTIVATION_READY,
  COLLECTION_UPDATED,
  OPERATION_CANCELED,
  START_FAILED,
  START_SUCCEEDED,
  type SortableEvent,
} from './event.ts';
import { activationFailure, ignoreSortable, sameOperation } from './helpers.ts';
import {
  SORTABLE_ACTIVE,
  SORTABLE_SPATIAL,
  INPUT_KEYBOARD,
  type ActivatingSortableState,
  type ActiveSortableOperation,
} from './state.ts';

export function decideActivating(
  state: ActivatingSortableState,
  event: SortableEvent,
  config: SortableMachineConfig,
): SortableDecision {
  const { operation } = state;

  if (
    event.type === COLLECTION_UPDATED &&
    sameOperation(operation, event) &&
    !event.snapshot.items.includes(operation.item)
  ) {
    return activationFailure(
      state,
      operation,
      new Error('drag: sortable item was removed during activation'),
      config,
    );
  }

  if (event.type === OPERATION_CANCELED) {
    return activationFailure(state, operation, event.reason, config);
  }

  if (
    event.type === ACTIVATION_READY &&
    state.stage === 'acquiring' &&
    sameOperation(operation, event)
  ) {
    const active: ActiveSortableOperation = {
      ...operation,
      activationVersion: event.activationVersion,
      activationIndex: event.activationIndex,
      insertion:
        operation.input.type === INPUT_KEYBOARD
          ? operation.insertion
          : event.insertion,
    };
    return {
      state: { ...state, operation: active, stage: 'starting' },
      effects: {
        type: INVOKE_START,
        operationId: active.operationId,
        item: active.item,
        callback: config.onStart,
      },
    };
  }

  if (
    (event.type === ACTIVATION_FAILED || event.type === START_FAILED) &&
    sameOperation(operation, event)
  ) {
    return activationFailure(state, operation, event.error, config);
  }

  if (
    event.type === START_SUCCEEDED &&
    state.stage === 'starting' &&
    sameOperation(operation, event) &&
    'activationVersion' in operation
  ) {
    if (operation.input.type === INPUT_KEYBOARD) {
      const currency = {
        operationId: operation.operationId,
        collectionVersion: operation.snapshot.version,
        spatialId: operation.nextSpatialId,
      };
      return {
        state: {
          phase: SORTABLE_SPATIAL,
          nextOperationId: state.nextOperationId,
          operation: {
            ...operation,
            nextSpatialId: operation.nextSpatialId + 1,
          },
          currency,
          incumbent: operation.insertion,
        },
        effects: {
          type: RESOLVE_PROPOSAL_INSERTION,
          request: {
            ...currency,
            snapshot: operation.snapshot,
            item: operation.item,
            point: operation.latestPoint,
            incumbent: operation.insertion,
            keyboard: true,
          },
        },
      };
    }
    return {
      state: {
        phase: SORTABLE_ACTIVE,
        nextOperationId: state.nextOperationId,
        operation,
        pendingSpatial: null,
      },
      effects: {
        type: 365,
        operationId: operation.operationId,
        origin: operation.originPoint,
        point: operation.latestPoint,
      },
    };
  }

  if (event.type === ACTIVATION_READY && state.stage !== 'acquiring') {
    return ignoreSortable(state);
  }
  void ACQUIRE_SORTABLE_ACTIVATION;
  return ignoreSortable(state);
}
