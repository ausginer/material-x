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
  type SortableEffectDeps,
  type SortableEvent,
  type BeginKeyboardOperationEffect,
  type BeginPointerOperationEffect,
  type DisarmOperationEffect,
  type StopInteractionEffect,
} from '../machine.ts';

export type OperationInputOwner = Readonly<{
  begin(
    effect: BeginPointerOperationEffect | BeginKeyboardOperationEffect,
    resetOwners: () => void,
  ): EffectDisposition;
  disarm(
    effect: DisarmOperationEffect,
    resetOwners: () => void,
  ): EffectDisposition;
  current(currency: Readonly<{ operationId: number }>): boolean;
  resources(): OperationResources;
  useInteraction(dispose: () => void): void;
  stop(
    effect: StopInteractionEffect,
    stopOwners: () => void,
  ): EffectDisposition;
  stopInteraction(): void;
  releasePresentation(): void;
  retire(
    currency?: Readonly<{ operationId: number }>,
    resetOwners?: () => void,
  ): EffectDisposition;
  destroy(): void;
}>;

export function createOperationInputOwner(
  deps: SortableEffectDeps,
  dispatch: (event: SortableEvent) => void,
  active: () => boolean,
): OperationInputOwner {
  let operationId = 0;
  let pointerId = 0;
  let resources: OperationResources | null = null;

  const current = (currency: Readonly<{ operationId: number }>): boolean =>
    active() && operationId !== 0 && currency.operationId === operationId;

  const retire = (
    currency?: Readonly<{ operationId: number }>,
    resetOwners?: () => void,
  ): EffectDisposition => {
    if (currency && !current(currency)) {
      return STOP_BATCH;
    }
    resetOwners?.();
    resources?.destroy();
    resources = null;
    operationId = 0;
    pointerId = 0;
    return CONTINUE_BATCH;
  };

  return {
    begin(effect, resetOwners) {
      resetOwners();
      retire();
      ({ operationId } = effect);
      pointerId = 'pointerId' in effect ? effect.pointerId : 0;
      resources = createOperationResources((error) => {
        reportError_(error, undefined);
      });
      if ('pointerId' in effect) {
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
                operationId,
                pointerId: raw.pointerId,
                point,
              });
            } else if (raw.type === POINTER_UP) {
              dispatch({
                type: POINTER_RELEASED,
                operationId,
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
        } catch (error) {
          if (current(effect)) {
            dispatch({ type: OPERATION_ARM_FAILED, operationId, error });
          }
          return STOP_BATCH;
        }
      }
      if (!current(effect)) {
        return STOP_BATCH;
      }
      dispatch({ type: OPERATION_ARMED, operationId });
      return CONTINUE_BATCH;
    },
    disarm(effect, resetOwners) {
      if (current(effect)) {
        return retire(effect, resetOwners);
      }
      return STOP_BATCH;
    },
    current,
    resources() {
      if (!resources) {
        throw new Error('drag: operation resources unavailable');
      }
      return resources;
    },
    useInteraction(dispose) {
      if (!resources) {
        throw new Error('drag: operation resources unavailable');
      }
      resources.interaction.use(dispose);
    },
    stopInteraction() {
      if (!resources) {
        throw new Error('drag: operation resources unavailable');
      }
      resources.stopInteraction();
    },
    stop(effect, stopOwners) {
      if (!current(effect)) {
        return STOP_BATCH;
      }
      if (!resources) {
        throw new Error('drag: operation resources unavailable');
      }
      resources.stopInteraction();
      stopOwners();
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
    retire,
    // eslint-disable-next-line @typescript-eslint/strict-void-return
    destroy: retire,
  };
}
