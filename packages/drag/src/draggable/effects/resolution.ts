import { OUTCOME_ACCEPTED, OUTCOME_REJECTED } from '../../kernel/protocol.ts';
import {
  CONTINUE_BATCH,
  STOP_BATCH,
  type EffectDisposition,
} from '../../kernel/session.ts';
import type { OpenDropResolutionEffect } from '../machine/effect.ts';
import {
  DROP_RESOLUTION_FAILED,
  DROP_RESOLVED,
  type DraggableEvent,
} from '../machine/event.ts';
import type { ResolutionCurrency } from '../machine/state.ts';
import type { FreeDropResolution } from '../options.ts';
import type { OperationInputOwner } from './operation.ts';

type ResolutionAttempt = Readonly<{
  currency: ResolutionCurrency;
  controller: AbortController;
  completed(): boolean;
  complete(): void;
}>;

function isResolution(value: unknown): value is FreeDropResolution {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const { type } = value as { type?: unknown };
  return type === OUTCOME_ACCEPTED || type === OUTCOME_REJECTED;
}

export type DropResolutionOwner = Readonly<{
  open(effect: OpenDropResolutionEffect): EffectDisposition;
  stop(): void;
  destroy(): void;
}>;

export function createDropResolutionOwner(
  operation: OperationInputOwner,
  dispatch: (event: DraggableEvent) => void,
): DropResolutionOwner {
  let attempt: ResolutionAttempt | null = null;

  const stop = (): void => {
    if (attempt && !attempt.completed()) {
      attempt.controller.abort();
    }
    attempt = null;
  };

  return {
    open(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }

      stop();
      const controller = new AbortController();
      let completed = false;
      const currentAttempt: ResolutionAttempt = {
        currency: effect,
        controller,
        completed: () => completed,
        complete() {
          completed = true;
        },
      };
      attempt = currentAttempt;

      try {
        operation.useInteraction(() => {
          if (!currentAttempt.completed()) {
            controller.abort();
          }
        });
      } catch (error) {
        stop();
        dispatch({
          type: DROP_RESOLUTION_FAILED,
          operationId: effect.operationId,
          resolutionId: effect.resolutionId,
          error,
        });
        return STOP_BATCH;
      }

      const accept = (): boolean => {
        if (
          attempt !== currentAttempt ||
          completed ||
          controller.signal.aborted ||
          !operation.current(effect)
        ) {
          return false;
        }

        currentAttempt.complete();
        return true;
      };

      let value: ReturnType<typeof effect.callback>;

      try {
        value = effect.callback(effect.request, {
          signal: controller.signal,
        });
      } catch (error) {
        if (accept()) {
          dispatch({
            type: DROP_RESOLUTION_FAILED,
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

      Promise.resolve(value).then(
        (result) => {
          if (!accept()) {
            return;
          }

          dispatch(
            isResolution(result)
              ? {
                  type: DROP_RESOLVED,
                  operationId: effect.operationId,
                  resolutionId: effect.resolutionId,
                  resolution: result,
                }
              : {
                  type: DROP_RESOLUTION_FAILED,
                  operationId: effect.operationId,
                  resolutionId: effect.resolutionId,
                  error: new Error(
                    'drag: onDrop returned an invalid resolution',
                  ),
                },
          );
        },
        (error: unknown) => {
          if (accept()) {
            dispatch({
              type: DROP_RESOLUTION_FAILED,
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
