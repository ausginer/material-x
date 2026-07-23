import {
  CANCEL_POINTER,
  FAILURE_INVALIDATION,
  RECOVERY_HOME,
  RECOVERY_IMMEDIATE,
} from '../../kernel/protocol.ts';
import { CHANGE_REBASE, reconcileCollection } from '../collection-policy.ts';
import {
  PLACE_COMMITTED_INSERTION,
  PRESENT_MOTION,
  RESOLVE_ACTIVE_INSERTION,
  RESOLVE_PROPOSAL_INSERTION,
  type SortableDecision,
  type SortableMachineConfig,
  type SpatialRequest,
} from './effect.ts';
import {
  ACTIVE_INSERTION_FAILED,
  ACTIVE_INSERTION_RESOLVED,
  COLLECTION_UPDATED,
  OPERATION_CANCELED,
  POINTER_MOVED,
  POINTER_RELEASED,
  type SortableEvent,
} from './event.ts';
import {
  cancelResult,
  createSettlement,
  ignoreSortable,
  reportFailure,
  sameOperation,
  settlementEffects,
} from './helpers.ts';
import {
  INPUT_KEYBOARD,
  SORTABLE_SPATIAL,
  type ActiveSortableState,
} from './state.ts';

function spatialRequest(
  operation: ActiveSortableState['operation'],
  point: ActiveSortableState['operation']['latestPoint'],
  keyboard: boolean,
): SpatialRequest {
  return {
    operationId: operation.operationId,
    collectionVersion: operation.snapshot.version,
    spatialId: operation.nextSpatialId,
    snapshot: operation.snapshot,
    item: operation.item,
    point,
    incumbent: operation.insertion,
    keyboard,
  };
}

export function decideActive(
  state: ActiveSortableState,
  event: SortableEvent,
  config: SortableMachineConfig,
): SortableDecision {
  const { operation } = state;

  if (event.type === OPERATION_CANCELED) {
    return settlementEffects(
      createSettlement(
        state.nextOperationId,
        operation,
        cancelResult(event.reason, null),
        RECOVERY_HOME,
        { stage: 0 },
      ),
      config,
    );
  }

  if (event.type === COLLECTION_UPDATED && sameOperation(operation, event)) {
    if (!event.snapshot.items.includes(operation.item)) {
      return settlementEffects(
        createSettlement(
          state.nextOperationId,
          operation,
          cancelResult({ type: CANCEL_POINTER }, null),
          RECOVERY_IMMEDIATE,
          { stage: 0 },
        ),
        config,
      );
    }
    const change = reconcileCollection(
      event.snapshot,
      operation.item,
      operation.insertion,
    );
    if (change.type !== CHANGE_REBASE) {
      return settlementEffects(
        createSettlement(
          state.nextOperationId,
          operation,
          cancelResult({ type: CANCEL_POINTER }, null),
          RECOVERY_IMMEDIATE,
          { stage: 0 },
        ),
        config,
      );
    }
    const nextOperation = {
      ...operation,
      snapshot: event.snapshot,
      insertion: change.insertion,
    };
    return {
      state: { ...state, operation: nextOperation },
      effects: {
        type: PLACE_COMMITTED_INSERTION,
        operationId: operation.operationId,
        insertion: change.insertion,
      },
    };
  }

  if (
    event.type === ACTIVE_INSERTION_RESOLVED &&
    state.pendingSpatial &&
    event.operationId === state.pendingSpatial.operationId &&
    event.collectionVersion === state.pendingSpatial.collectionVersion &&
    event.spatialId === state.pendingSpatial.spatialId
  ) {
    return {
      state: {
        ...state,
        operation: { ...operation, insertion: event.insertion },
        pendingSpatial: null,
      },
      effects: {
        type: PLACE_COMMITTED_INSERTION,
        operationId: operation.operationId,
        insertion: event.insertion,
      },
    };
  }

  if (
    event.type === ACTIVE_INSERTION_FAILED &&
    state.pendingSpatial &&
    event.operationId === state.pendingSpatial.operationId &&
    event.collectionVersion === state.pendingSpatial.collectionVersion &&
    event.spatialId === state.pendingSpatial.spatialId
  ) {
    return reportFailure(
      state,
      operation,
      { stage: FAILURE_INVALIDATION },
      event.error,
      null,
      createSettlement(
        state.nextOperationId,
        operation,
        {
          type: 51,
          reason: { type: CANCEL_POINTER },
          at: 108,
          proposal: null,
        },
        RECOVERY_HOME,
        { stage: 0 },
      ),
      config,
    );
  }

  if (
    event.type === POINTER_MOVED &&
    operation.input.type !== INPUT_KEYBOARD &&
    sameOperation(operation, event) &&
    event.pointerId === operation.input.pointerId
  ) {
    const nextOperation = {
      ...operation,
      latestPoint: event.point,
      nextSpatialId: operation.nextSpatialId + 1,
    };
    const request = spatialRequest(operation, event.point, false);
    return {
      state: { ...state, operation: nextOperation, pendingSpatial: request },
      effects: [
        {
          type: PRESENT_MOTION,
          operationId: operation.operationId,
          origin: operation.originPoint,
          point: event.point,
        },
        { type: RESOLVE_ACTIVE_INSERTION, request },
      ],
    };
  }

  const pointerRelease =
    event.type === POINTER_RELEASED &&
    operation.input.type !== INPUT_KEYBOARD &&
    sameOperation(operation, event) &&
    event.pointerId === operation.input.pointerId;

  if (pointerRelease || operation.input.type === INPUT_KEYBOARD) {
    if (!pointerRelease && event.type !== ACTIVE_INSERTION_RESOLVED) {
      return ignoreSortable(state);
    }
    const point = pointerRelease ? event.point : operation.latestPoint;
    const request = spatialRequest(
      operation,
      point,
      operation.input.type === INPUT_KEYBOARD,
    );
    return {
      state: {
        phase: SORTABLE_SPATIAL,
        nextOperationId: state.nextOperationId,
        operation: {
          ...operation,
          latestPoint: point,
          nextSpatialId: operation.nextSpatialId + 1,
        },
        currency: request,
        incumbent: operation.insertion,
      },
      effects: { type: RESOLVE_PROPOSAL_INSERTION, request },
    };
  }

  return ignoreSortable(state);
}
