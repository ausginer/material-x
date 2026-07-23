import { acquirePointerCapture } from '../../kernel/pointer.ts';
import {
  CONTINUE_BATCH,
  STOP_BATCH,
  type EffectDisposition,
} from '../../kernel/session.ts';
import {
  ACTIVATION_FAILED,
  ACTIVATION_READY,
  INPUT_POINTER,
  type AcquireSortableActivationEffect,
  type SortableEffectDeps,
  type SortableEvent,
} from '../machine.ts';
import type { OperationInputOwner } from './operation.ts';
import type { SortablePlaceholderOwner } from './placeholder.ts';
import type { SpatialInsertionOwner } from './spatial.ts';
import type { SortableVisualOwner } from './visual.ts';

export type SortableActivationCoordinator = Readonly<{
  acquire(effect: AcquireSortableActivationEffect): EffectDisposition;
}>;

export function createSortableActivationCoordinator(
  deps: SortableEffectDeps,
  visual: SortableVisualOwner,
  placeholder: SortablePlaceholderOwner,
  spatial: SpatialInsertionOwner,
  operation: OperationInputOwner,
  dispatch: (event: SortableEvent) => void,
): SortableActivationCoordinator {
  return {
    acquire(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }
      const sortable = effect.operation;
      const resources = operation.resources();
      const rollback: Array<
        Readonly<{
          interaction: boolean;
          release(): void;
        }>
      > = [];
      const rollbackNow = (): void => {
        for (let i = rollback.length - 1; i >= 0; i -= 1) {
          try {
            rollback[i]!.release();
          } catch {
            // Preserve the acquisition failure.
          }
        }
      };
      const activation = new AbortController();
      try {
        visual.acquire(sortable);
        rollback.push({ release: visual.release, interaction: false });

        const result = placeholder.acquire(sortable, visual);
        rollback.push({ release: placeholder.release, interaction: false });

        if (sortable.input.type === INPUT_POINTER) {
          const releaseCapture = acquirePointerCapture(
            sortable.item,
            sortable.input.pointerId,
          );
          rollback.push({ release: releaseCapture, interaction: true });
        }

        deps.invalidation.arm(
          AbortSignal.any([resources.signal, activation.signal]),
          spatial.invalidate,
        );
        rollback.push({
          release: () => activation.abort(),
          interaction: true,
        });

        if (!operation.current(effect)) {
          rollbackNow();
          return STOP_BATCH;
        }
        for (const acquisition of rollback) {
          (acquisition.interaction
            ? resources.interaction
            : resources.presentation
          ).use(acquisition.release);
        }
        dispatch({
          type: ACTIVATION_READY,
          operationId: effect.operationId,
          ...result,
        });
        return CONTINUE_BATCH;
      } catch (error) {
        rollbackNow();
        if (operation.current(effect)) {
          dispatch({
            type: ACTIVATION_FAILED,
            operationId: effect.operationId,
            error,
          });
        }
        return STOP_BATCH;
      }
    },
  };
}
