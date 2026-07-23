import { reportError_ } from '../../kernel/errors.ts';
import {
  CONTINUE_BATCH,
  STOP_BATCH,
  type EffectDisposition,
} from '../../kernel/session.ts';
import type {
  DraggableEffectDeps,
  FinalizeOperationEffect,
  GeometryRequest,
  InvokeMoveEffect,
  InvokeStartEffect,
  ReportFailureEffect,
} from '../machine/effect.ts';
import {
  FAILURE_REPORTED,
  FINALIZATION_COMPLETED,
  FINALIZATION_FAILED,
  MOVE_CALLBACK_FAILED,
  START_FAILED,
  START_SUCCEEDED,
  type DraggableEvent,
} from '../machine/event.ts';
import { geometryOf } from '../motion.ts';
import type { OperationInputOwner } from './operation.ts';
import type { DraggablePresentationOwner } from './presentation.ts';

export type DraggableCallbackOwner = Readonly<{
  start(effect: InvokeStartEffect): EffectDisposition;
  move(effect: InvokeMoveEffect): EffectDisposition;
  report(effect: ReportFailureEffect): EffectDisposition;
  finalize(effect: FinalizeOperationEffect): EffectDisposition;
}>;

export function createDraggableCallbackOwner(
  deps: Pick<DraggableEffectDeps, 'realm'>,
  operation: OperationInputOwner,
  presentation: DraggablePresentationOwner,
  stopSettlementOwners: () => void,
  dispatch: (event: DraggableEvent) => void,
): DraggableCallbackOwner {
  const geometry = (request: GeometryRequest) =>
    geometryOf(
      request.pointer,
      request.originPointer,
      request.viewportDelta,
      request.originRect,
      request.coordinateSpace,
      deps.realm,
    );

  return {
    start(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }

      try {
        effect.callback?.(geometry(effect.geometry));

        if (operation.current(effect)) {
          dispatch({
            type: START_SUCCEEDED,
            operationId: effect.operationId,
          });
        }
        return CONTINUE_BATCH;
      } catch (error) {
        if (operation.current(effect)) {
          dispatch({
            type: START_FAILED,
            operationId: effect.operationId,
            error,
          });
        }
        return STOP_BATCH;
      }
    },

    move(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }

      try {
        effect.callback(geometry(effect.geometry));
        return operation.current(effect) ? CONTINUE_BATCH : STOP_BATCH;
      } catch (error) {
        if (operation.current(effect)) {
          dispatch({
            type: MOVE_CALLBACK_FAILED,
            operationId: effect.operationId,
            motionId: effect.motionId,
            error,
          });
        }
        return STOP_BATCH;
      }
    },

    report(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }

      reportError_(
        effect.error,
        effect.callback
          ? (error) =>
              effect.callback?.(error, {
                cause: effect.cause,
                domain: effect.domain,
              })
          : undefined,
      );

      if (operation.current(effect)) {
        dispatch({
          type: FAILURE_REPORTED,
          operationId: effect.operationId,
        });
      }
      return CONTINUE_BATCH;
    },

    finalize(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }

      presentation.release();
      stopSettlementOwners();

      try {
        effect.callback?.();

        if (operation.current(effect)) {
          dispatch({
            type: FINALIZATION_COMPLETED,
            operationId: effect.operationId,
          });
        }
        return CONTINUE_BATCH;
      } catch (error) {
        if (operation.current(effect)) {
          dispatch({
            type: FINALIZATION_FAILED,
            operationId: effect.operationId,
            error,
          });
        }
        return STOP_BATCH;
      }
    },
  };
}
