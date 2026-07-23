import {
  CONTINUE_BATCH,
  STOP_BATCH,
  type EffectDisposition,
} from '../../kernel/session.ts';
import { resolveBounds } from '../bounds.ts';
import type {
  DraggableEffectDeps,
  ObserveControlledPositionEffect,
  ObserveFreeMotionEffect,
  ResolveFreeReleaseEffect,
} from '../machine/effect.ts';
import {
  CONTROLLED_POSITION_FAILED,
  CONTROLLED_POSITION_RESOLVED,
  MOTION_OBSERVATION_FAILED,
  MOTION_OBSERVED,
  RELEASE_FAILED,
  RELEASE_RESOLVED,
  type DraggableEvent,
} from '../machine/event.ts';
import { pointerDelta } from '../motion.ts';
import type { DraggableOptions } from '../options.ts';
import { buildFreeDropProposal } from '../request.ts';
import type { OperationInputOwner } from './operation.ts';

export type FreeMotionObserver = Readonly<{
  observe(effect: ObserveFreeMotionEffect): EffectDisposition;
  controlled(effect: ObserveControlledPositionEffect): EffectDisposition;
  release(effect: ResolveFreeReleaseEffect): EffectDisposition;
  destroy(): void;
}>;

export function createFreeMotionObserver(
  deps: Pick<DraggableEffectDeps, 'realm'>,
  operation: OperationInputOwner,
  dispatch: (event: DraggableEvent) => void,
): FreeMotionObserver {
  let boundsVersion = -1;
  let boundsCached = false;
  let boundsCache: DOMRectReadOnly | null = null;

  const reset = (): void => {
    boundsVersion = -1;
    boundsCached = false;
    boundsCache = null;
  };

  const readBounds = (
    source: DraggableOptions['bounds'],
    version: number,
    refresh: boolean,
  ): DOMRectReadOnly | null => {
    if (typeof source === 'function') {
      return resolveBounds(source, deps.realm);
    }

    if (refresh || version !== boundsVersion) {
      boundsVersion = version;
      boundsCached = false;
    }

    if (!boundsCached) {
      boundsCache = resolveBounds(source, deps.realm);
      boundsCached = true;
    }

    return boundsCache;
  };

  return {
    observe(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }

      try {
        const bounds = readBounds(
          effect.bounds,
          effect.boundsVersion,
          effect.refresh,
        );

        if (!operation.current(effect)) {
          return STOP_BATCH;
        }

        dispatch({
          type: MOTION_OBSERVED,
          operationId: effect.operationId,
          motionId: effect.motionId,
          bounds,
        });
        return CONTINUE_BATCH;
      } catch (error) {
        if (operation.current(effect)) {
          dispatch({
            type: MOTION_OBSERVATION_FAILED,
            operationId: effect.operationId,
            motionId: effect.motionId,
            error,
          });
        }
        return STOP_BATCH;
      }
    },

    controlled(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }

      try {
        const viewport = effect.coordinateSpace.toViewport(effect.position);

        if (!operation.current(effect)) {
          return STOP_BATCH;
        }

        dispatch({
          type: CONTROLLED_POSITION_RESOLVED,
          operationId: effect.operationId,
          motionId: effect.motionId,
          viewportDelta: {
            x: viewport.x - effect.originRect.left,
            y: viewport.y - effect.originRect.top,
          },
        });
        return CONTINUE_BATCH;
      } catch (error) {
        if (operation.current(effect)) {
          dispatch({
            type: CONTROLLED_POSITION_FAILED,
            operationId: effect.operationId,
            motionId: effect.motionId,
            error,
          });
        }
        return STOP_BATCH;
      }
    },

    release(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }

      try {
        const bounds = readBounds(effect.bounds, effect.boundsVersion, false);
        const viewportDelta = pointerDelta(
          effect.point,
          effect.originPointer,
          effect.originRect,
          effect.axis,
          bounds,
        );
        const proposal = buildFreeDropProposal(
          effect.item,
          effect.visual,
          effect.point,
          viewportDelta,
          effect.originRect,
          effect.coordinateSpace,
          deps.realm,
        );

        if (!operation.current(effect)) {
          return STOP_BATCH;
        }

        dispatch({
          type: RELEASE_RESOLVED,
          operationId: effect.operationId,
          motionId: effect.motionId,
          viewportDelta,
          proposal,
        });
        return CONTINUE_BATCH;
      } catch (error) {
        if (operation.current(effect)) {
          dispatch({
            type: RELEASE_FAILED,
            operationId: effect.operationId,
            motionId: effect.motionId,
            error,
          });
        }
        return STOP_BATCH;
      }
    },

    destroy: reset,
  };
}
