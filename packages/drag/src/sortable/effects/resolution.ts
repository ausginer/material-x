import {
  OUTCOME_ACCEPTED,
  OUTCOME_REJECTED,
  type ResolutionContext,
} from '../../kernel/protocol.ts';
import type { ReorderRequest } from '../../kernel/types.ts';
import {
  REORDER_RESOLVED,
  REORDER_RESOLUTION_FAILED,
  type ResolutionCurrency,
  type SortableEvent,
} from '../machine.ts';
import type { ReorderResolution, SortableOptions } from '../options.ts';

export type ReorderResolutionOwner = Readonly<{
  abort(): void;
  completed(): boolean;
  invoke(request: ReorderRequest, callback: SortableOptions['onReorder']): void;
}>;

function isResolution(value: unknown): value is ReorderResolution {
  return (
    typeof value === 'object' &&
    value != null &&
    'type' in value &&
    (value.type === OUTCOME_ACCEPTED || value.type === OUTCOME_REJECTED)
  );
}

export function createReorderResolutionOwner(
  currency: ResolutionCurrency,
  dispatch: (event: SortableEvent) => void,
): ReorderResolutionOwner {
  const controller = new AbortController();
  let done = false;

  return {
    abort() {
      if (!done) {
        controller.abort();
      }
    },
    completed: () => done,
    invoke(request, callback) {
      const context: ResolutionContext = { signal: controller.signal };
      Promise.resolve()
        .then(() => callback(request, context))
        .then(
          (resolution) => {
            if (done || controller.signal.aborted) {
              return;
            }
            done = true;
            if (!isResolution(resolution)) {
              dispatch({
                type: REORDER_RESOLUTION_FAILED,
                ...currency,
                error: new TypeError('drag: invalid reorder resolution'),
              });
              return;
            }
            dispatch({ ...currency, type: REORDER_RESOLVED, resolution });
          },
          (error: unknown) => {
            if (!done && !controller.signal.aborted) {
              done = true;
              dispatch({
                type: REORDER_RESOLUTION_FAILED,
                ...currency,
                error,
              });
            }
          },
        );
    },
  };
}
