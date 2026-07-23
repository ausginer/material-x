import {
  createLandingRunner,
  type LandingRunner,
} from '../../kernel/animation.ts';
import { RECOVERY_HOME, type LandingPlan } from '../../kernel/protocol.ts';
import type { DOMRealm } from '../../kernel/realm.ts';
import type { AnimationTiming } from '../../kernel/types.ts';
import { destinationPlan, homePlan } from '../landing.ts';
import {
  LANDING_FAILED,
  LANDING_FINISHED,
  LANDING_PIN_FAILED,
  LANDING_PINNED,
  LANDING_PLAN_FAILED,
  LANDING_PLAN_RESOLVED,
  LANDING_START_FAILED,
  LANDING_STARTED,
  type ActiveSortableOperation,
  type LandingCurrency,
  type SortableEvent,
} from '../machine.ts';
import type { SortablePresentationOwner } from './activation.ts';

const DEFAULT_TIMING = { duration: 200, easing: 'ease' } as const;

export type SortableLandingOwner = Readonly<{
  prepare(
    currency: LandingCurrency,
    operation: ActiveSortableOperation,
    recovery: number,
  ): void;
  start(
    currency: LandingCurrency,
    plan: LandingPlan,
    timing: (() => AnimationTiming) | undefined,
  ): void;
  pin(currency: LandingCurrency): void;
  destroy(): void;
}>;

export function createSortableLandingOwner(
  realm: DOMRealm,
  presentation: SortablePresentationOwner,
  dispatch: (event: SortableEvent) => void,
): SortableLandingOwner {
  let runner: LandingRunner | null = null;

  return {
    prepare(currency, operation, recovery) {
      runner?.destroy();
      runner = null;
      try {
        if (!presentation.visualConnected()) {
          throw new Error('drag: sortable visual is disconnected');
        }
        const delta = {
          x: operation.latestPoint.x - operation.originPoint.x,
          y: operation.latestPoint.y - operation.originPoint.y,
        };
        if (recovery === RECOVERY_HOME) {
          presentation.returnHome();
        }
        const plan =
          recovery === RECOVERY_HOME
            ? homePlan(delta)
            : destinationPlan(
                presentation.placeholderRect(),
                presentation.originRect(),
                delta,
              );
        dispatch({ ...currency, type: LANDING_PLAN_RESOLVED, plan });
      } catch (error) {
        dispatch({ ...currency, type: LANDING_PLAN_FAILED, error });
      }
    },
    start(currency, plan, timing) {
      try {
        const lift = presentation.lift();
        if (!lift) {
          throw new Error('drag: sortable lift is unavailable');
        }
        runner?.destroy();
        runner = createLandingRunner(
          lift,
          plan,
          currency,
          timing?.() ?? DEFAULT_TIMING,
          realm,
          (settled) => dispatch({ ...settled, type: LANDING_FINISHED }),
          (settled, error) =>
            dispatch({ ...settled, type: LANDING_FAILED, error }),
        );
        dispatch({ ...currency, type: LANDING_STARTED });
      } catch (error) {
        dispatch({ ...currency, type: LANDING_START_FAILED, error });
      }
    },
    pin(currency) {
      try {
        runner?.pin();
        dispatch({ ...currency, type: LANDING_PINNED });
      } catch (error) {
        dispatch({ ...currency, type: LANDING_PIN_FAILED, error });
      }
    },
    destroy() {
      runner?.destroy();
      runner = null;
    },
  };
}
