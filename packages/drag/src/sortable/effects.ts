import type { EffectRuntime } from '../kernel/runtime.ts';
import { STOP_BATCH, type EffectDisposition } from '../kernel/session.ts';
import {
  createSortableActivationCoordinator,
  type SortableActivationCoordinator,
} from './effects/activation.ts';
import {
  createPresentationBarrierOwner,
  type PresentationBarrierOwner,
} from './effects/barrier.ts';
import {
  createSortableCallbackOwner,
  type SortableCallbackOwner,
} from './effects/callbacks.ts';
import {
  createSortableLandingOwner,
  type SortableLandingOwner,
} from './effects/landing.ts';
import {
  createOperationInputOwner,
  type OperationInputOwner,
} from './effects/operation.ts';
import {
  createSortablePlaceholderOwner,
  type SortablePlaceholderOwner,
} from './effects/placeholder.ts';
import {
  createReorderResolutionOwner,
  type ReorderResolutionOwner,
} from './effects/resolution.ts';
import {
  createSpatialInsertionOwner,
  type SpatialInsertionOwner,
} from './effects/spatial.ts';
import {
  createSortableVisualOwner,
  type SortableVisualOwner,
} from './effects/visual.ts';
import {
  ACQUIRE_SORTABLE_ACTIVATION,
  BEGIN_KEYBOARD_OPERATION,
  BEGIN_POINTER_OPERATION,
  DISARM_OPERATION,
  FINALIZE_OPERATION,
  INVOKE_START,
  OPEN_REORDER_RESOLUTION,
  PIN_LANDING,
  PLACE_COMMITTED_INSERTION,
  PREPARE_SORTABLE_LANDING,
  PRESENT_MOTION,
  REPORT_FAILURE,
  RESOLVE_ACTIVE_INSERTION,
  RESOLVE_PROPOSAL_INSERTION,
  RETIRE_OPERATION,
  START_LANDING,
  STOP_INTERACTION,
  WATCH_PRESENTATION,
  type SortableEffect,
  type SortableEffectDeps,
  type SortableEvent,
} from './machine.ts';

function assertNever(value: never): never {
  throw new Error(
    `drag: unknown sortable effect ${(value as { type?: unknown }).type as string}`,
  );
}

export function createSortableEffects(
  deps: SortableEffectDeps,
  dispatch: (event: SortableEvent) => void,
): EffectRuntime<SortableEffect> {
  let terminal = false;
  const operation: OperationInputOwner = createOperationInputOwner(
    deps,
    dispatch,
    () => !terminal,
  );
  const visual: SortableVisualOwner = createSortableVisualOwner(
    deps.realm,
    operation,
    dispatch,
  );
  let spatial!: SpatialInsertionOwner;
  const placeholder: SortablePlaceholderOwner = createSortablePlaceholderOwner(
    deps,
    () => spatial.invalidate(),
    operation,
    dispatch,
  );
  spatial = createSpatialInsertionOwner(
    deps,
    placeholder,
    operation.current,
    dispatch,
  );
  const activation: SortableActivationCoordinator =
    createSortableActivationCoordinator(
      deps,
      visual,
      placeholder,
      spatial,
      operation,
      dispatch,
    );
  const barrier: PresentationBarrierOwner = createPresentationBarrierOwner(
    deps.realm,
    operation,
    dispatch,
  );
  const resolution: ReorderResolutionOwner = createReorderResolutionOwner(
    operation,
    dispatch,
  );
  const landing: SortableLandingOwner = createSortableLandingOwner(
    deps.realm,
    visual,
    placeholder,
    operation,
    dispatch,
  );

  const stopSettlementOwners = (): void => {
    resolution.stop();
    spatial.cancel();
    barrier.stop();
    landing.destroy();
  };
  const stopMechanical = (): void => {
    operation.stopInteraction();
    stopSettlementOwners();
  };
  const resetOwners = (): void => {
    stopSettlementOwners();
    placeholder.release();
    visual.release();
  };
  const callbacks: SortableCallbackOwner = createSortableCallbackOwner(
    operation,
    visual,
    placeholder,
    stopMechanical,
    dispatch,
  );

  const execute = (effect: SortableEffect): EffectDisposition => {
    if (terminal) {
      return STOP_BATCH;
    }

    switch (effect.type) {
      case BEGIN_POINTER_OPERATION:
      case BEGIN_KEYBOARD_OPERATION:
        return operation.begin(effect, resetOwners);
      case DISARM_OPERATION:
        return operation.disarm(effect, resetOwners);
      case ACQUIRE_SORTABLE_ACTIVATION:
        return activation.acquire(effect);
      case INVOKE_START:
        return callbacks.start(effect);
      case PRESENT_MOTION:
        return visual.present(effect);
      case RESOLVE_ACTIVE_INSERTION:
        return spatial.schedule(effect);
      case PLACE_COMMITTED_INSERTION:
        return placeholder.place(effect);
      case RESOLVE_PROPOSAL_INSERTION:
        return spatial.resolveProposal(effect);
      case OPEN_REORDER_RESOLUTION:
        return resolution.open(effect);
      case STOP_INTERACTION:
        return operation.stop(effect, stopSettlementOwners);
      case WATCH_PRESENTATION:
        return barrier.watch(effect);
      case PREPARE_SORTABLE_LANDING:
        return landing.prepare(effect);
      case START_LANDING:
        return landing.start(effect);
      case PIN_LANDING:
        return landing.pin(effect);
      case REPORT_FAILURE:
        return callbacks.report(effect);
      case FINALIZE_OPERATION:
        return callbacks.finalize(effect);
      case RETIRE_OPERATION:
        return operation.retire(effect, resetOwners);
      default:
        return assertNever(effect);
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
