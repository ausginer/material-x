/**
 * Requests one explicit consumer reorder resolution and emits its normalized
 * event. Owns a dedicated `AbortController`, a completed bit, one promise
 * continuation, and the captured immutable proposal currency; semantic state
 * lives only in `SortableState`.
 */
import type { ResolutionCurrency } from '../kernel/protocol.ts';
import type { ReorderRequest } from '../kernel/types.ts';
import type { OnReorder, ReorderResolution } from './options.ts';
import type { SortableEvent } from './reducer.ts';

function isResolution(value: unknown): value is ReorderResolution {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { type } = value as { type?: unknown };
  return type === 'accepted' || type === 'rejected';
}

export type ReorderResolutionEffect = Readonly<{
  signal: AbortSignal;
  completed(): boolean;
  abort(): void;
  invoke(request: ReorderRequest, onReorder: OnReorder): void;
}>;

export function createReorderResolution(
  currency: ResolutionCurrency,
  dispatch: (event: SortableEvent) => void,
): ReorderResolutionEffect {
  const controller = new AbortController();
  let done = false;

  const finish = (event: SortableEvent): void => {
    if (done || controller.signal.aborted) {
      return;
    }
    done = true;
    dispatch(event);
  };

  const failed = (error: unknown): SortableEvent => ({
    type: 'reorder-resolution-failed',
    operationId: currency.operationId,
    resolutionId: currency.resolutionId,
    error,
  });

  return {
    signal: controller.signal,
    completed() {
      return done;
    },
    abort() {
      if (!done && !controller.signal.aborted) {
        controller.abort();
      }
    },
    invoke(request, onReorder) {
      let value: ReturnType<OnReorder>;
      try {
        value = onReorder(request, { signal: controller.signal });
      } catch (error) {
        finish(failed(error));
        return;
      }
      Promise.resolve(value).then(
        (result) => {
          finish(
            isResolution(result)
              ? {
                  type: 'reorder-resolved',
                  operationId: currency.operationId,
                  resolutionId: currency.resolutionId,
                  resolution: result,
                }
              : failed(
                  new Error('drag: onReorder returned an invalid resolution'),
                ),
          );
        },
        (error: unknown) => {
          finish(failed(error));
        },
      );
    },
  };
}
