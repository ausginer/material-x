import { watchPresentationReady } from '../../kernel/presentation-ready.ts';
import type { DOMRealm } from '../../kernel/realm.ts';
import {
  CONTINUE_BATCH,
  STOP_BATCH,
  type EffectDisposition,
} from '../../kernel/session.ts';
import {
  PRESENTATION_SETTLED,
  type SortableEvent,
  type WatchPresentationEffect,
} from '../machine.ts';
import type { OperationInputOwner } from './operation.ts';

export type PresentationBarrierOwner = Readonly<{
  watch(effect: WatchPresentationEffect): EffectDisposition;
  stop(): void;
  destroy(): void;
}>;

export function createPresentationBarrierOwner(
  realm: DOMRealm,
  operation: OperationInputOwner,
  dispatch: (event: SortableEvent) => void,
): PresentationBarrierOwner {
  let stopWatch: (() => void) | null = null;
  const stop = (): void => {
    stopWatch?.();
    stopWatch = null;
  };

  return {
    watch(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }
      stop();
      stopWatch = watchPresentationReady(
        effect.ready,
        {
          operationId: effect.operationId,
          resolutionId: effect.resolutionId,
        },
        realm,
        (settled, error) => {
          dispatch({
            ...settled,
            type: PRESENTATION_SETTLED,
            ...(error === null ? {} : { error }),
          });
        },
      );
      return CONTINUE_BATCH;
    },
    stop,
    destroy: stop,
  };
}
