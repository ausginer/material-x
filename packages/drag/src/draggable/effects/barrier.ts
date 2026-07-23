import { watchPresentationReady } from '../../kernel/presentation-ready.ts';
import {
  CONTINUE_BATCH,
  STOP_BATCH,
  type EffectDisposition,
} from '../../kernel/session.ts';
import type {
  DraggableEffectDeps,
  WatchPresentationEffect,
} from '../machine/effect.ts';
import { PRESENTATION_SETTLED, type DraggableEvent } from '../machine/event.ts';
import type { OperationInputOwner } from './operation.ts';

export type PresentationBarrierOwner = Readonly<{
  watch(effect: WatchPresentationEffect): EffectDisposition;
  stop(): void;
  destroy(): void;
}>;

export function createPresentationBarrierOwner(
  deps: Pick<DraggableEffectDeps, 'realm'>,
  operation: OperationInputOwner,
  dispatch: (event: DraggableEvent) => void,
): PresentationBarrierOwner {
  let dispose: (() => void) | null = null;

  const stop = (): void => {
    dispose?.();
    dispose = null;
  };

  return {
    watch(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }

      stop();
      dispose = watchPresentationReady(
        effect.ready,
        effect,
        deps.realm,
        (currency, error) => {
          if (operation.current(currency)) {
            dispose = null;
            dispatch({
              type: PRESENTATION_SETTLED,
              operationId: currency.operationId,
              resolutionId: currency.resolutionId,
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
