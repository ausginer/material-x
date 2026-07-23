import { createMapper, IDENTITY_MAPPER } from '../../kernel/coordinate.ts';
import { acquirePointerCapture } from '../../kernel/pointer.ts';
import {
  acquireLift,
  createDragRenderer,
  LIFT_FAITHFUL,
  LIFT_FLAT,
  LIFT_IN_PLACE,
  type DragRenderer,
  type LiftMode as PresentationLiftMode,
  type VisualLiftSession,
} from '../../kernel/presentation.ts';
import {
  CONTINUE_BATCH,
  STOP_BATCH,
  type EffectDisposition,
} from '../../kernel/session.ts';
import type {
  AcquireFreeActivationEffect,
  DraggableEffectDeps,
  PresentMotionEffect,
} from '../machine/effect.ts';
import {
  ACTIVATION_FAILED,
  ACTIVATION_READY,
  INVALIDATED,
  MOTION_PRESENTATION_FAILED,
  type DraggableEvent,
} from '../machine/event.ts';
import {
  LIFT_FLATTEN,
  LIFT_NONE,
  LIFT_TOP_LAYER,
  type DraggableOptions,
} from '../options.ts';
import type { OperationInputOwner } from './operation.ts';

const LIFT_MODES: Readonly<
  Record<NonNullable<DraggableOptions['lift']>, PresentationLiftMode>
> = {
  [LIFT_TOP_LAYER]: LIFT_FAITHFUL,
  [LIFT_FLATTEN]: LIFT_FLAT,
  [LIFT_NONE]: LIFT_IN_PLACE,
};

export type DraggablePresentationOwner = Readonly<{
  acquire(effect: AcquireFreeActivationEffect): EffectDisposition;
  present(effect: PresentMotionEffect): EffectDisposition;
  lift(): VisualLiftSession | null;
  release(): void;
  destroy(): void;
}>;

export function createDraggablePresentationOwner(
  deps: DraggableEffectDeps,
  operation: OperationInputOwner,
  dispatch: (event: DraggableEvent) => void,
): DraggablePresentationOwner {
  let lift: VisualLiftSession | null = null;
  let renderer: DragRenderer | null = null;

  const release = (): void => {
    if (lift || renderer) {
      operation.releasePresentation();
    }
    lift = null;
    renderer = null;
  };

  return {
    acquire(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }

      try {
        const originRect = deps.visual.getBoundingClientRect();
        const context = deps.item.offsetParent;
        const coordinateSpace =
          effect.coordinateSpace ??
          createMapper(
            context instanceof deps.realm.window.HTMLElement
              ? context
              : deps.realm.document.documentElement,
            deps.realm,
          ) ??
          IDENTITY_MAPPER;
        const acquiredLift = acquireLift(
          deps.visual,
          LIFT_MODES[deps.lift ?? LIFT_TOP_LAYER],
          originRect,
          (delta) => coordinateSpace.deltaFromViewport(delta),
          deps.realm,
        );
        lift = acquiredLift;
        operation.usePresentation(() => {
          acquiredLift.dispose();
        });
        renderer = createDragRenderer(acquiredLift);
        operation.useInteraction(
          acquirePointerCapture(deps.item, effect.pointerId),
        );
        deps.invalidation.arm(operation.signal(), () => {
          if (operation.current(effect)) {
            dispatch({ type: INVALIDATED });
          }
        });
        dispatch({
          type: ACTIVATION_READY,
          operationId: effect.operationId,
          candidate: { originRect, coordinateSpace },
        });
        return CONTINUE_BATCH;
      } catch (error) {
        operation.failMechanical();
        lift = null;
        renderer = null;
        dispatch({
          type: ACTIVATION_FAILED,
          operationId: effect.operationId,
          error,
        });
        return STOP_BATCH;
      }
    },

    present(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }

      try {
        if (!renderer) {
          throw new Error('drag: renderer unavailable');
        }

        renderer.render(effect.viewportDelta);
        return CONTINUE_BATCH;
      } catch (error) {
        dispatch({
          type: MOTION_PRESENTATION_FAILED,
          operationId: effect.operationId,
          motionId: effect.motionId,
          error,
        });
        return STOP_BATCH;
      }
    },

    lift: () => lift,
    release,
    destroy: release,
  };
}
