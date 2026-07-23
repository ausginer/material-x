import {
  OUTCOME_ACCEPTED,
  OUTCOME_REJECTED,
  type ResolutionContext,
} from '../../kernel/protocol.ts';
import {
  CONTINUE_BATCH,
  STOP_BATCH,
  type EffectDisposition,
} from '../../kernel/session.ts';
import {
  REORDER_RESOLVED,
  REORDER_RESOLUTION_FAILED,
  type OpenReorderResolutionEffect,
  type SortableEvent,
} from '../machine.ts';
import type { ReorderResolution } from '../options.ts';
import type { OperationInputOwner } from './operation.ts';

function isResolution(value: unknown): value is ReorderResolution {
  return (
    typeof value === 'object' &&
    value != null &&
    'type' in value &&
    (value.type === OUTCOME_ACCEPTED || value.type === OUTCOME_REJECTED)
  );
}

export type ReorderResolutionOwner = Readonly<{
  open(effect: OpenReorderResolutionEffect): EffectDisposition;
  stop(): void;
  destroy(): void;
}>;

export function createReorderResolutionOwner(
  operation: OperationInputOwner,
  dispatch: (event: SortableEvent) => void,
): ReorderResolutionOwner {
  let controller: AbortController | null = null;
  let completed = false;

  const stop = (): void => {
    if (!completed) {
      controller?.abort();
    }
    controller = null;
    completed = false;
  };

  return {
    open(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }
      stop();
      const owned = new AbortController();
      controller = owned;
      try {
        operation.useInteraction(() => {
          if (!completed && controller === owned) {
            owned.abort();
          }
        });
      } catch (error) {
        stop();
        dispatch({
          type: REORDER_RESOLUTION_FAILED,
          operationId: effect.operationId,
          resolutionId: effect.resolutionId,
          error,
        });
        return STOP_BATCH;
      }

      const accept = (): boolean => {
        if (
          controller !== owned ||
          completed ||
          owned.signal.aborted ||
          !operation.current(effect)
        ) {
          return false;
        }
        completed = true;
        return true;
      };
      const context: ResolutionContext = { signal: owned.signal };
      let result: ReturnType<typeof effect.callback>;
      try {
        result = effect.callback(effect.proposal.request, context);
      } catch (error) {
        if (accept()) {
          dispatch({
            type: REORDER_RESOLUTION_FAILED,
            operationId: effect.operationId,
            resolutionId: effect.resolutionId,
            error,
          });
        }
        return STOP_BATCH;
      }
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }
      Promise.resolve(result).then(
        (resolution) => {
          if (!accept()) {
            return;
          }
          dispatch(
            isResolution(resolution)
              ? {
                  type: REORDER_RESOLVED,
                  operationId: effect.operationId,
                  resolutionId: effect.resolutionId,
                  resolution,
                }
              : {
                  type: REORDER_RESOLUTION_FAILED,
                  operationId: effect.operationId,
                  resolutionId: effect.resolutionId,
                  error: new TypeError('drag: invalid reorder resolution'),
                },
          );
        },
        (error: unknown) => {
          if (accept()) {
            dispatch({
              type: REORDER_RESOLUTION_FAILED,
              operationId: effect.operationId,
              resolutionId: effect.resolutionId,
              error,
            });
          }
        },
      );
      return CONTINUE_BATCH;
    },
    stop,
    destroy: stop,
  };
}
