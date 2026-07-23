import { createFrameTask, type FrameTask } from '../../kernel/invalidation.ts';
import {
  CONTINUE_BATCH,
  STOP_BATCH,
  type EffectDisposition,
} from '../../kernel/session.ts';
import { currentInsertion, resolveSpatialInsertion } from '../insertion.ts';
import {
  ACTIVE_INSERTION_FAILED,
  ACTIVE_INSERTION_RESOLVED,
  PROPOSAL_INSERTION_FAILED,
  PROPOSAL_INSERTION_RESOLVED,
  type SortableEffectDeps,
  type SortableEvent,
  type SpatialRequest,
  type ResolveActiveInsertionEffect,
  type ResolveProposalInsertionEffect,
} from '../machine.ts';
import {
  createRectIndex,
  markRectIndexDirty,
  type RectIndex,
} from '../rect-index.ts';
import type { SortablePlaceholderOwner } from './placeholder.ts';

export type SpatialInsertionOwner = Readonly<{
  schedule(effect: ResolveActiveInsertionEffect): EffectDisposition;
  resolveProposal(effect: ResolveProposalInsertionEffect): EffectDisposition;
  invalidate(): void;
  cancel(): void;
  destroy(): void;
}>;

export function createSpatialInsertionOwner(
  deps: SortableEffectDeps,
  placeholder: SortablePlaceholderOwner,
  current: (currency: Readonly<{ operationId: number }>) => boolean,
  dispatch: (event: SortableEvent) => void,
): SpatialInsertionOwner {
  const index: RectIndex = createRectIndex();
  const geometry = {
    get element(): HTMLElement {
      return placeholder.element();
    },
    rect: placeholder.rect,
  };
  let latest: SpatialRequest | null = null;

  const sameRequest = (request: SpatialRequest): boolean =>
    latest !== null &&
    request.operationId === latest.operationId &&
    request.collectionVersion === latest.collectionVersion &&
    request.spatialId === latest.spatialId;

  const resolve = (request: SpatialRequest) => {
    if (request.keyboard && request.incumbent) {
      return request.incumbent;
    }
    return (
      resolveSpatialInsertion(
        index,
        geometry,
        request.snapshot.items,
        request.item,
        deps.getVisual,
        request.point,
        request.snapshot.version,
      ) ??
      request.incumbent ??
      currentInsertion(
        geometry,
        request.snapshot.items,
        request.item,
        request.snapshot.version,
      )
    );
  };

  const run = (request: SpatialRequest, proposal: boolean): void => {
    if (!current(request) || !sameRequest(request)) {
      return;
    }
    try {
      const insertion = resolve(request);
      if (!current(request) || !sameRequest(request)) {
        return;
      }
      dispatch({
        type: proposal
          ? PROPOSAL_INSERTION_RESOLVED
          : ACTIVE_INSERTION_RESOLVED,
        operationId: request.operationId,
        collectionVersion: request.collectionVersion,
        spatialId: request.spatialId,
        insertion,
      });
    } catch (error) {
      if (!current(request) || !sameRequest(request)) {
        return;
      }
      dispatch({
        type: proposal ? PROPOSAL_INSERTION_FAILED : ACTIVE_INSERTION_FAILED,
        operationId: request.operationId,
        collectionVersion: request.collectionVersion,
        spatialId: request.spatialId,
        error,
      });
    }
  };
  const frame: FrameTask<SpatialRequest> = createFrameTask(
    deps.realm,
    (request) => run(request, false),
  );

  return {
    schedule(effect) {
      const { request } = effect;
      if (!current(request)) {
        return STOP_BATCH;
      }
      latest = request;
      try {
        frame.schedule(request);
        return CONTINUE_BATCH;
      } catch (error) {
        dispatch({
          type: ACTIVE_INSERTION_FAILED,
          operationId: request.operationId,
          collectionVersion: request.collectionVersion,
          spatialId: request.spatialId,
          error,
        });
        return STOP_BATCH;
      }
    },
    resolveProposal(effect) {
      const { request } = effect;
      if (!current(request)) {
        return STOP_BATCH;
      }
      frame.cancel();
      latest = request;
      markRectIndexDirty(index);
      run(request, true);
      return CONTINUE_BATCH;
    },
    invalidate: () => markRectIndexDirty(index),
    cancel() {
      latest = null;
      frame.cancel();
    },
    destroy() {
      latest = null;
      frame.cancel();
    },
  };
}
