import {
  createLandingRunner,
  type LandingRunner,
} from '../../kernel/animation.ts';
import { RECOVERY_HOME } from '../../kernel/protocol.ts';
import type { DOMRealm } from '../../kernel/realm.ts';
import {
  CONTINUE_BATCH,
  STOP_BATCH,
  type EffectDisposition,
} from '../../kernel/session.ts';
import type { AnimationTiming } from '../../kernel/types.ts';
import { destinationPlan, homePlan } from '../landing.ts';
import {
  LANDING_ANIMATION_CREATE_FAILED,
  LANDING_FAILED,
  LANDING_FINISHED,
  LANDING_PIN_FAILED,
  LANDING_PINNED,
  LANDING_PLAN_FAILED,
  LANDING_PLAN_RESOLVED,
  LANDING_STARTED,
  LANDING_TIMING_FAILED,
  type PinLandingEffect,
  type PrepareSortableLandingEffect,
  type SortableEvent,
  type StartLandingEffect,
} from '../machine.ts';
import type { OperationInputOwner } from './operation.ts';
import type { SortablePlaceholderOwner } from './placeholder.ts';
import type { SortableVisualOwner } from './visual.ts';

const DEFAULT_TIMING = { duration: 200, easing: 'ease' } as const;

export type SortableLandingOwner = Readonly<{
  prepare(effect: PrepareSortableLandingEffect): EffectDisposition;
  start(effect: StartLandingEffect): EffectDisposition;
  pin(effect: PinLandingEffect): EffectDisposition;
  destroy(): void;
}>;

export function createSortableLandingOwner(
  realm: DOMRealm,
  visual: SortableVisualOwner,
  placeholder: SortablePlaceholderOwner,
  operation: OperationInputOwner,
  dispatch: (event: SortableEvent) => void,
): SortableLandingOwner {
  let runner: LandingRunner | null = null;

  return {
    prepare(effect) {
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }
      runner?.destroy();
      runner = null;
      try {
        if (!visual.connected()) {
          throw new Error('drag: sortable visual is disconnected');
        }
        const delta = {
          x: effect.operation.latestPoint.x - effect.operation.originPoint.x,
          y: effect.operation.latestPoint.y - effect.operation.originPoint.y,
        };
        if (effect.recovery === RECOVERY_HOME) {
          placeholder.returnHome();
        }
        const plan =
          effect.recovery === RECOVERY_HOME
            ? homePlan(delta)
            : destinationPlan(placeholder.rect(), visual.originRect(), delta);
        if (!operation.current(effect)) {
          return STOP_BATCH;
        }
        dispatch({
          operationId: effect.operationId,
          landingId: effect.landingId,
          type: LANDING_PLAN_RESOLVED,
          plan,
        });
        return CONTINUE_BATCH;
      } catch (error) {
        if (operation.current(effect)) {
          dispatch({
            operationId: effect.operationId,
            landingId: effect.landingId,
            type: LANDING_PLAN_FAILED,
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
      let timing: AnimationTiming;
      try {
        timing = effect.timing?.() ?? DEFAULT_TIMING;
      } catch (error) {
        if (operation.current(effect)) {
          dispatch({
            operationId: effect.operationId,
            landingId: effect.landingId,
            type: LANDING_TIMING_FAILED,
            error,
          });
        }
        return STOP_BATCH;
      }
      if (!operation.current(effect)) {
        return STOP_BATCH;
      }
      try {
        const lift = visual.lift();
        runner?.destroy();
        runner = createLandingRunner(
          lift,
          effect.plan,
          effect,
          timing,
          realm,
          (settled) => {
            if (operation.current(settled)) {
              dispatch({ ...settled, type: LANDING_FINISHED });
            }
          },
          (settled, error) => {
            if (operation.current(settled)) {
              dispatch({ ...settled, type: LANDING_FAILED, error });
            }
          },
        );
        if (!operation.current(effect)) {
          runner.destroy();
          runner = null;
          return STOP_BATCH;
        }
        dispatch({
          operationId: effect.operationId,
          landingId: effect.landingId,
          type: LANDING_STARTED,
        });
        return CONTINUE_BATCH;
      } catch (error) {
        if (operation.current(effect)) {
          dispatch({
            operationId: effect.operationId,
            landingId: effect.landingId,
            type: LANDING_ANIMATION_CREATE_FAILED,
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
        if (!operation.current(effect)) {
          return STOP_BATCH;
        }
        dispatch({
          operationId: effect.operationId,
          landingId: effect.landingId,
          type: LANDING_PINNED,
        });
        return CONTINUE_BATCH;
      } catch (error) {
        if (operation.current(effect)) {
          dispatch({
            operationId: effect.operationId,
            landingId: effect.landingId,
            type: LANDING_PIN_FAILED,
            error,
          });
        }
        return STOP_BATCH;
      }
    },
    destroy() {
      runner?.destroy();
      runner = null;
    },
  };
}
