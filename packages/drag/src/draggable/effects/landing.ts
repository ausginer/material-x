import {
  createLandingRunner,
  type LandingRunner,
} from '../../kernel/animation.ts';
import {
  CONTINUE_BATCH,
  STOP_BATCH,
  type EffectDisposition,
} from '../../kernel/session.ts';
import type { AnimationTiming } from '../../kernel/types.ts';
import { homeLandingPlan, isValidHomeTarget } from '../landing.ts';
import type {
  DraggableEffectDeps,
  PinLandingEffect,
  PrepareFreeLandingEffect,
  StartLandingEffect,
} from '../machine/effect.ts';
import {
  LANDING_ANIMATION_FAILED,
  LANDING_FAILED,
  LANDING_FINISHED,
  LANDING_PIN_FAILED,
  LANDING_PINNED,
  LANDING_PLAN_FAILED,
  LANDING_PLAN_RESOLVED,
  LANDING_STARTED,
  LANDING_TIMING_FAILED,
  type DraggableEvent,
} from '../machine/event.ts';
import type { OperationInputOwner } from './operation.ts';
import type { DraggablePresentationOwner } from './presentation.ts';

const DEFAULT_TIMING = { duration: 200, easing: 'ease' } as const;

export type FreeLandingOwner = Readonly<{
  prepare(effect: PrepareFreeLandingEffect): EffectDisposition;
  start(effect: StartLandingEffect): EffectDisposition;
  pin(effect: PinLandingEffect): EffectDisposition;
  stop(): void;
  destroy(): void;
}>;

export function createFreeLandingOwner(
  deps: Pick<DraggableEffectDeps, 'realm'>,
  operation: OperationInputOwner,
  presentation: DraggablePresentationOwner,
  dispatch: (event: DraggableEvent) => void,
): FreeLandingOwner {
  let runner: LandingRunner | null = null;

  const stop = (): void => {
    runner?.destroy();
    runner = null;
  };

  return {
    prepare(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }

      stop();

      try {
        const target = effect.resolve({
          item: effect.item,
          visual: effect.visual,
        });

        if (!operation.current(effect)) {
          return STOP_BATCH;
        }

        if (!isValidHomeTarget(target)) {
          throw new Error('drag: invalid home target');
        }

        dispatch({
          type: LANDING_PLAN_RESOLVED,
          operationId: effect.operationId,
          landingId: effect.landingId,
          plan: homeLandingPlan(
            target,
            effect.viewportDelta,
            effect.originRect,
          ),
        });
        return CONTINUE_BATCH;
      } catch (error) {
        if (operation.current(effect)) {
          dispatch({
            type: LANDING_PLAN_FAILED,
            operationId: effect.operationId,
            landingId: effect.landingId,
            error,
          });
        }
        return STOP_BATCH;
      }
    },

    start(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }

      stop();

      let timing: AnimationTiming;
      try {
        timing = effect.timing?.() ?? DEFAULT_TIMING;
      } catch (error) {
        if (operation.current(effect)) {
          dispatch({
            type: LANDING_TIMING_FAILED,
            operationId: effect.operationId,
            landingId: effect.landingId,
            error,
          });
        }
        return STOP_BATCH;
      }

      if (!operation.current(effect)) {
        return STOP_BATCH;
      }

      try {
        const lift = presentation.lift();

        if (!lift) {
          throw new Error('drag: landing lift unavailable');
        }

        runner = createLandingRunner(
          lift,
          effect.plan,
          effect,
          timing,
          deps.realm,
          (currency) => {
            if (operation.current(currency)) {
              dispatch({
                type: LANDING_FINISHED,
                operationId: currency.operationId,
                landingId: currency.landingId,
              });
            }
          },
          (currency, error) => {
            if (operation.current(currency)) {
              dispatch({
                type: LANDING_FAILED,
                operationId: currency.operationId,
                landingId: currency.landingId,
                error,
              });
            }
          },
        );
        dispatch({
          type: LANDING_STARTED,
          operationId: effect.operationId,
          landingId: effect.landingId,
        });
        return CONTINUE_BATCH;
      } catch (error) {
        if (operation.current(effect)) {
          dispatch({
            type: LANDING_ANIMATION_FAILED,
            operationId: effect.operationId,
            landingId: effect.landingId,
            error,
          });
        }
        return STOP_BATCH;
      }
    },

    pin(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }

      try {
        if (!runner) {
          throw new Error('drag: landing runner unavailable');
        }

        runner.pin();
        dispatch({
          type: LANDING_PINNED,
          operationId: effect.operationId,
          landingId: effect.landingId,
        });
        return CONTINUE_BATCH;
      } catch (error) {
        if (operation.current(effect)) {
          dispatch({
            type: LANDING_PIN_FAILED,
            operationId: effect.operationId,
            landingId: effect.landingId,
            error,
          });
        }
        return STOP_BATCH;
      }
    },

    stop,
    destroy: stop,
  };
}
