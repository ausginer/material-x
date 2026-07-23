import type { EffectRuntime } from '../kernel/runtime.ts';
import {
  CONTINUE_BATCH,
  STOP_BATCH,
  type EffectDisposition,
} from '../kernel/session.ts';
import { createPresentationBarrierOwner } from './effects/barrier.ts';
import { createDraggableCallbackOwner } from './effects/callbacks.ts';
import { createFreeLandingOwner } from './effects/landing.ts';
import { createFreeMotionObserver } from './effects/motion.ts';
import { createOperationInputOwner } from './effects/operation.ts';
import { createDraggablePresentationOwner } from './effects/presentation.ts';
import { createDropResolutionOwner } from './effects/resolution.ts';
import {
  ACQUIRE_FREE_ACTIVATION,
  BEGIN_POINTER_OPERATION,
  DISARM_OPERATION,
  FINALIZE_OPERATION,
  INVOKE_MOVE,
  INVOKE_START,
  OBSERVE_CONTROLLED_POSITION,
  OBSERVE_FREE_MOTION,
  OPEN_DROP_RESOLUTION,
  PIN_LANDING,
  PREPARE_FREE_LANDING,
  PRESENT_MOTION,
  REPORT_FAILURE,
  RESOLVE_FREE_RELEASE,
  RETIRE_OPERATION,
  START_LANDING,
  STOP_INTERACTION,
  WATCH_PRESENTATION,
  type DraggableEffect,
  type DraggableEffectDeps,
  type DraggableEvent,
} from './machine.ts';

export function createDraggableEffects(
  deps: DraggableEffectDeps,
  dispatch: (event: DraggableEvent) => void,
): EffectRuntime<DraggableEffect> {
  let terminal = false;
  const operation = createOperationInputOwner(deps, dispatch, () => !terminal);
  const presentation = createDraggablePresentationOwner(
    deps,
    operation,
    dispatch,
  );
  const motion = createFreeMotionObserver(deps, operation, dispatch);
  const resolution = createDropResolutionOwner(operation, dispatch);
  const barrier = createPresentationBarrierOwner(deps, operation, dispatch);
  const landing = createFreeLandingOwner(
    deps,
    operation,
    presentation,
    dispatch,
  );

  const stopSettlementOwners = (): void => {
    resolution.stop();
    barrier.stop();
    landing.stop();
  };

  const callbacks = createDraggableCallbackOwner(
    deps,
    operation,
    presentation,
    stopSettlementOwners,
    dispatch,
  );

  const resetOwners = (): void => {
    stopSettlementOwners();
    motion.destroy();
    presentation.destroy();
  };

  const execute = (effect: DraggableEffect): EffectDisposition => {
    if (terminal) {
      return STOP_BATCH;
    }

    switch (effect.type) {
      case BEGIN_POINTER_OPERATION:
        resetOwners();
        return operation.begin(effect);

      case DISARM_OPERATION:
      case RETIRE_OPERATION:
        if (!operation.current(effect)) {
          return STOP_BATCH;
        }

        resetOwners();
        operation.retire(effect);
        return CONTINUE_BATCH;

      case ACQUIRE_FREE_ACTIVATION:
        return presentation.acquire(effect);

      case INVOKE_START:
        return callbacks.start(effect);

      case OBSERVE_FREE_MOTION:
        return motion.observe(effect);

      case OBSERVE_CONTROLLED_POSITION:
        return motion.controlled(effect);

      case RESOLVE_FREE_RELEASE:
        return motion.release(effect);

      case PRESENT_MOTION:
        return presentation.present(effect);

      case INVOKE_MOVE:
        return callbacks.move(effect);

      case OPEN_DROP_RESOLUTION:
        return resolution.open(effect);

      case STOP_INTERACTION:
        if (!operation.current(effect)) {
          return STOP_BATCH;
        }

        resolution.stop();
        return operation.stop(effect);

      case WATCH_PRESENTATION:
        return barrier.watch(effect);

      case PREPARE_FREE_LANDING:
        return landing.prepare(effect);

      case START_LANDING:
        return landing.start(effect);

      case PIN_LANDING:
        return landing.pin(effect);

      case REPORT_FAILURE:
        return callbacks.report(effect);

      case FINALIZE_OPERATION:
        return callbacks.finalize(effect);

      default: {
        const unexpected: never = effect;
        throw new Error(
          `drag: unknown effect ${
            (unexpected as { type?: unknown }).type as string
          }`,
        );
      }
    }
  };

  return {
    execute,
    destroy() {
      if (terminal) {
        return;
      }

      terminal = true;
      resetOwners();
      operation.destroy();
    },
  };
}
