import { reportError_ } from '../../kernel/errors.ts';
import {
  createOperationResources,
  type OperationResources,
} from '../../kernel/operation-resources.ts';
import {
  CANCEL_ESCAPE,
  CANCEL_POINTER,
  POINTER_CANCEL,
  POINTER_MOVE,
  POINTER_UP,
} from '../../kernel/protocol.ts';
import {
  CONTINUE_BATCH,
  STOP_BATCH,
  type EffectDisposition,
} from '../../kernel/session.ts';
import {
  OPERATION_ARM_FAILED,
  OPERATION_ARMED,
  OPERATION_CANCELED,
  INTERACTION_STOPPED,
  POINTER_MOVED,
  POINTER_RELEASED,
  type DraggableEvent,
} from '../machine/event.ts';
import type {
  BeginPointerOperationEffect,
  DraggableEffectDeps,
  StopInteractionEffect,
} from '../machine/effect.ts';
import type { OperationCurrency } from '../machine/state.ts';

export type OperationInputOwner = Readonly<{
  begin(effect: BeginPointerOperationEffect): EffectDisposition;
  current(currency: OperationCurrency): boolean;
  signal(): AbortSignal;
  useInteraction(dispose: () => void): void;
  usePresentation(dispose: () => void): void;
  stop(effect: StopInteractionEffect): EffectDisposition;
  releasePresentation(): void;
  failMechanical(): void;
  retire(currency?: OperationCurrency): void;
  destroy(): void;
}>;

export function createOperationInputOwner(
  deps: Pick<DraggableEffectDeps, 'pointerSource'>,
  dispatch: (event: DraggableEvent) => void,
  active: () => boolean,
): OperationInputOwner {
  let operationId = 0;
  let pointerId = 0;
  let resources: OperationResources | null = null;

  const current = (currency: OperationCurrency): boolean =>
    active() && operationId !== 0 && operationId === currency.operationId;

  const failMechanical = (): void => {
    resources?.destroy();
    resources = null;
  };

  const retire = (currency?: OperationCurrency): void => {
    if (currency && !current(currency)) {
      return;
    }

    failMechanical();
    operationId = 0;
    pointerId = 0;
  };

  return {
    begin(effect) {
      retire();
      ({ operationId, pointerId } = effect);
      resources = createOperationResources((error) => {
        reportError_(error, undefined);
      });

      try {
        deps.pointerSource.armSession(resources.signal, (raw) => {
          if (!current(effect)) {
            return;
          }

          if (raw.type === CANCEL_ESCAPE) {
            dispatch({
              type: OPERATION_CANCELED,
              reason: { type: CANCEL_ESCAPE },
            });
            return;
          }

          const point = { x: raw.clientX, y: raw.clientY };

          if (raw.type === POINTER_MOVE) {
            dispatch({
              type: POINTER_MOVED,
              pointerId: raw.pointerId,
              point,
            });
          } else if (raw.type === POINTER_UP) {
            dispatch({
              type: POINTER_RELEASED,
              pointerId: raw.pointerId,
              point,
            });
          } else if (
            raw.type === POINTER_CANCEL &&
            raw.pointerId === pointerId
          ) {
            dispatch({
              type: OPERATION_CANCELED,
              reason: { type: CANCEL_POINTER },
            });
          }
        });
        dispatch({ type: OPERATION_ARMED, operationId: effect.operationId });
        return CONTINUE_BATCH;
      } catch (error) {
        failMechanical();
        dispatch({
          type: OPERATION_ARM_FAILED,
          operationId: effect.operationId,
          error,
        });
        return STOP_BATCH;
      }
    },

    current,

    signal() {
      if (!resources) {
        throw new Error('drag: operation resources unavailable');
      }

      return resources.signal;
    },

    useInteraction(dispose) {
      if (!resources) {
        throw new Error('drag: operation resources unavailable');
      }

      resources.interaction.use(dispose);
    },

    usePresentation(dispose) {
      if (!resources) {
        throw new Error('drag: operation resources unavailable');
      }

      resources.presentation.use(dispose);
    },

    stop(effect) {
      if (!current(effect)) {
        return STOP_BATCH;
      }

      if (!resources) {
        throw new Error('drag: operation resources unavailable');
      }

      resources.stopInteraction();
      dispatch({
        type: INTERACTION_STOPPED,
        operationId: effect.operationId,
      });
      return CONTINUE_BATCH;
    },

    releasePresentation() {
      if (!resources) {
        throw new Error('drag: operation resources unavailable');
      }

      resources.releasePresentation();
    },

    failMechanical,
    retire,
    destroy: retire,
  };
}
