/**
 * Owns one landing animation's mechanics. It receives the committed
 * {@link LandingCurrency}, creates the realm-local `Animation`, applies
 * reduced-motion timing, and dispatches currency-tagged finished/interrupted
 * events. The FSM — not the runner — owns whether landing is preparing, running,
 * completing, or whether settlement is accepted/rejected/canceled/failed. The
 * runner's private bits exist only for idempotency and browser callback races.
 */
import type { VisualLiftSession } from './presentation.ts';
import type { LandingPlan } from './protocol.ts';
import type { DOMRealm } from './realm.ts';
import type { AnimationTiming } from './types.ts';

export type LandingRunner = Readonly<{
  /** Idempotently commit the completed target; only from an accepted completing transition. */
  pin(): void;
  /** Silent terminal teardown: mark destroyed, cancel, never pin, dispatch nothing. */
  destroy(): void;
}>;

/** Whether the owning realm reports a reduced-motion preference. */
function prefersReducedMotion(realm: DOMRealm): boolean {
  return (
    realm.window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
    false
  );
}

export function createLandingRunner(
  lift: VisualLiftSession,
  plan: LandingPlan,
  timing: AnimationTiming,
  realm: DOMRealm,
  onFinished: () => void,
  onInterrupted: (error: unknown) => void,
): LandingRunner {
  const toTransform = lift.compose(plan.target);
  let terminal = false;

  const animation = lift.visual.animate(
    [{ transform: lift.compose(plan.from) }, { transform: toTransform }],
    prefersReducedMotion(realm) ? { ...timing, duration: 0 } : timing,
  );

  animation.finished.then(
    () => {
      if (!terminal) {
        onFinished();
      }
    },
    () => {
      // A cancel (destroy/interrupt) rejects `finished`; those paths set
      // `terminal` first, so an ordinary interruption is not double-reported.
      if (!terminal) {
        onInterrupted(new Error('drag: landing animation canceled'));
      }
    },
  );

  return {
    pin() {
      lift.visual.style.transform = toTransform;
    },

    destroy() {
      terminal = true;
      animation.cancel();
    },
  };
}
