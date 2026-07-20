/**
 * Requests one explicit consumer drop resolution and emits its normalized event.
 *
 * It owns a dedicated `AbortController` (never the general gesture signal), a
 * completed bit, one promise continuation, and the captured immutable proposal
 * currency. Semantic resolution state lives only in `DraggableState`; this effect
 * only gates currency/abort so a stale or post-completion continuation is inert.
 */
import type { ResolutionCurrency } from '../kernel/protocol.ts';
import type { FreeDropRequest } from '../kernel/types.ts';
import type { FreeDropResolution, OnDrop } from './options.ts';
import type { DraggableEvent } from './reducer.ts';

/** Whether `value` is a well-formed consumer resolution. */
function isResolution(value: unknown): value is FreeDropResolution {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const { type } = value as { type?: unknown };
  return type === 'accepted' || type === 'rejected';
}

export type DropResolutionEffect = Readonly<{
  /** The dedicated signal handed to the resolver. Aborts unresolved work once. */
  signal: AbortSignal;
  /** Whether the resolution has already terminalized (accepted/rejected/failed). */
  completed(): boolean;
  /** Aborts unresolved work exactly once (interaction disposal / invalidation). */
  abort(): void;
  /** Invokes `onDrop` and dispatches the normalized, currency-tagged result. */
  invoke(request: FreeDropRequest, onDrop: OnDrop): void;
}>;

export function createDropResolution(
  currency: ResolutionCurrency,
  dispatch: (event: DraggableEvent) => void,
): DropResolutionEffect {
  const controller = new AbortController();
  let done = false;

  const finish = (event: DraggableEvent): void => {
    if (done || controller.signal.aborted) {
      return;
    }

    done = true;
    dispatch(event);
  };

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
    invoke(request, onDrop) {
      let value: ReturnType<OnDrop>;

      const failed = (error: unknown): DraggableEvent => ({
        type: 'drop-resolution-failed',
        operationId: currency.operationId,
        resolutionId: currency.resolutionId,
        error,
      });

      try {
        value = onDrop(request, { signal: controller.signal });
      } catch (error) {
        finish(failed(error));
        return;
      }

      Promise.resolve(value).then(
        (result) => {
          finish(
            isResolution(result)
              ? {
                  type: 'drop-resolved',
                  operationId: currency.operationId,
                  resolutionId: currency.resolutionId,
                  resolution: result,
                }
              : failed(
                  new Error('drag: onDrop returned an invalid resolution'),
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
