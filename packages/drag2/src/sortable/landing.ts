/**
 * The landing gate: how the lifted visual travels to its final place after the
 * transaction is decided.
 *
 * Without this feature the behavior holds **no** landing gate and none of this
 * module is imported. Installing it holds the gate through a runner — even with
 * `duration: 0`, which is immediate but not the same code path.
 *
 * **A runner is never responsible for correctness.** The `target` it is handed
 * is provisional and may be superseded; the kernel measures again at the join
 * and performs the authoritative pin. A runner's only obligations are to call
 * `done()` or `fail()` exactly once, and to relinquish the visual's transform on
 * `destroy()` so that pin is not overridden.
 */
import type { LandingHandle, LandingStart } from '../kernel/spec.ts';
import type { Point } from '../kernel/types.ts';
import { brandFeature, type SortableFeature } from './feature.ts';

export type { LandingHandle, LandingStart } from '../kernel/spec.ts';
export type { LandingContext } from '../kernel/spec.ts';

export type LandingOptions = Readonly<{
  duration?: number;
  easing?: string;
  /**
   * Full replacement for the default Web Animations runner. A spring driving
   * `requestAnimationFrame` and calling `done()` when it settles is a
   * first-class citizen: nothing in the contract assumes a CSS timing function
   * or a finite known duration.
   */
  run?: LandingStart;
}>;

const DEFAULT_DURATION = 200;
const DEFAULT_EASING = 'ease-out';

export function landing(options: LandingOptions = {}): SortableFeature {
  const { run } = options;

  if (run !== undefined) {
    return brandFeature(() => ({ startLanding: run }));
  }

  const duration = options.duration ?? DEFAULT_DURATION;
  const easing = options.easing ?? DEFAULT_EASING;

  const start: LandingStart = (context, done, fail): LandingHandle => {
    const { visual, compose, realm } = context;
    // Collapsed to zero rather than skipped: the gate is still held and still
    // released through the runner, so the lifecycle is one path whatever the
    // user's motion preference is.
    const reduced =
      realm.window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
      false;
    const timing = {
      duration: reduced ? 0 : duration,
      easing,
      // The kernel destroys the runner *before* it pins, so a forwards fill is
      // released exactly when the authoritative write lands. Without it the
      // visual would fall back to its last drag transform for the microtask
      // between the animation finishing and `finished` resolving.
      fill: 'forwards',
    } as const satisfies KeyframeAnimationOptions;

    let animation: Animation;
    // Bumped by every retarget and by teardown, so a completion belonging to a
    // superseded animation is inert. WAAPI rejects `finished` on `cancel()`,
    // and a retarget cancels — which would otherwise be reported as a landing
    // failure for an operation that is landing perfectly well.
    let generation = 0;

    const play = (from: string, to: Point): void => {
      const mine = generation;

      animation = visual.animate(
        [{ transform: from }, { transform: compose(to.x, to.y) }],
        timing,
      );
      animation.finished.then(
        () => {
          if (mine === generation) {
            done();
          }
        },
        (error: unknown) => {
          if (mine === generation) {
            fail(error);
          }
        },
      );
    };

    play(compose(context.from.x, context.from.y), context.target);

    return {
      destroy(): void {
        generation += 1;
        // Relinquishes the transform: `cancel()` removes the animation's
        // effect, including the forwards fill, so the kernel's pin is the only
        // thing writing.
        animation.cancel();
      },

      /**
       * Trajectory quality only — a runner that omits it is fully correct. The
       * replay starts from the *computed* transform rather than the authored
       * origin, so a late correction is a smooth adjustment instead of a step.
       */
      retarget(target): void {
        const { transform } = realm.window.getComputedStyle(visual);

        generation += 1;
        animation.cancel();
        play(transform === 'none' ? '' : transform, target);
      },
    };
  };

  return brandFeature(() => ({ startLanding: start }));
}
