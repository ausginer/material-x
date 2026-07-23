import {
  CANCEL_POINTER,
  FAILURE_INVALIDATION,
  FAILURE_PLACEHOLDER_TARGET,
  FAILURE_RENDERER_WRITE,
  RECOVERY_HOME,
  RECOVERY_IMMEDIATE,
} from '../../kernel/protocol.ts';
import { ignored } from '../../kernel/session.ts';
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
  MOTION_PRESENTATION_FAILED,
  OPERATION_CANCELED,
  PLACEHOLDER_WRITE_FAILED,
  POINTER_MOVED,
  POINTER_RELEASED,
  type SortableEvent,
} from './event.ts';
import {
  cancelResult,
  createSettlement,
  reportFailure,
  sameOperation,
  settlementEffects,
} from './helpers.ts';
import {
  INPUT_KEYBOARD,
  PRESENTATION_ABSENT,
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

  if (
    event.type === MOTION_PRESENTATION_FAILED &&
    event.operationId === state.latestMotion.operationId &&
    event.motionId === state.latestMotion.motionId
  ) {
    return reportFailure(
      state,
      operation,
      { stage: FAILURE_RENDERER_WRITE },
      event.error,
      null,
      createSettlement(
        state.nextOperationId,
        operation,
        cancelResult({ type: CANCEL_POINTER }, null),
        RECOVERY_HOME,
        { stage: PRESENTATION_ABSENT },
      ),
      config,
    );
  }

  if (
    event.type === PLACEHOLDER_WRITE_FAILED &&
    sameOperation(operation, event)
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
        cancelResult({ type: CANCEL_POINTER }, null),
        RECOVERY_HOME,
        { stage: PRESENTATION_ABSENT },
      ),
      config,
    );
  }

  if (event.type === OPERATION_CANCELED) {
    return settlementEffects(
      createSettlement(
        state.nextOperationId,
        operation,
        cancelResult(event.reason, null),
        RECOVERY_HOME,
        { stage: PRESENTATION_ABSENT },
      ),
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
          { stage: PRESENTATION_ABSENT },
        ),
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
          { stage: PRESENTATION_ABSENT },
        ),
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
        cancelResult({ type: CANCEL_POINTER }, null),
        RECOVERY_HOME,
        { stage: PRESENTATION_ABSENT },
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
    const motion = {
      operationId: operation.operationId,
      motionId: operation.nextMotionId,
    };
    const nextOperation = {
      ...operation,
      latestPoint: event.point,
      nextSpatialId: operation.nextSpatialId + 1,
      nextMotionId: operation.nextMotionId + 1,
    };
    const request = spatialRequest(operation, event.point, false);
    return {
      state: {
        ...state,
        operation: nextOperation,
        pendingSpatial: request,
        latestMotion: motion,
      },
      effects: [
        {
          type: PRESENT_MOTION,
          ...motion,
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
      return ignored(state);
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

  return ignored(state);
}
