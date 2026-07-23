import { reportError_ } from '../../kernel/errors.ts';
import {
  CONTINUE_BATCH,
  STOP_BATCH,
  type EffectDisposition,
} from '../../kernel/session.ts';
import {
  FAILURE_REPORTED,
  FINALIZATION_COMPLETED,
  FINALIZATION_FAILED,
  START_FAILED,
  START_SUCCEEDED,
  type FinalizeOperationEffect,
  type InvokeStartEffect,
  type ReportFailureEffect,
  type SortableEvent,
} from '../machine.ts';
import type { OperationInputOwner } from './operation.ts';
import type { SortablePlaceholderOwner } from './placeholder.ts';
import type { SortableVisualOwner } from './visual.ts';

export type SortableCallbackOwner = Readonly<{
  start(effect: InvokeStartEffect): EffectDisposition;
  report(effect: ReportFailureEffect): EffectDisposition;
  finalize(effect: FinalizeOperationEffect): EffectDisposition;
}>;

export function createSortableCallbackOwner(
  operation: OperationInputOwner,
  visual: SortableVisualOwner,
  placeholder: SortablePlaceholderOwner,
  stopSettlementOwners: () => void,
  dispatch: (event: SortableEvent) => void,
): SortableCallbackOwner {
  return {
    start(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }
      try {
        effect.callback?.(effect.item);
        if (!operation.current(effect)) {
          return STOP_BATCH;
        }
        dispatch({
          type: START_SUCCEEDED,
          operationId: effect.operationId,
        });
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
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }
      dispatch({
        type: FAILURE_REPORTED,
        operationId: effect.operationId,
      });
      return CONTINUE_BATCH;
    },
    finalize(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }
      stopSettlementOwners();
      operation.releasePresentation();
      placeholder.release();
      visual.release();
      try {
        effect.callback?.();
        if (!operation.current(effect)) {
          return STOP_BATCH;
        }
        dispatch({
          type: FINALIZATION_COMPLETED,
          operationId: effect.operationId,
        });
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
