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
import {
  brandFeature,
  requireFinite,
  type SortableFeature,
} from './feature.ts';

export type { LandingHandle, LandingStart } from '../kernel/spec.ts';
export type { LandingContext } from '../kernel/spec.ts';

export type LandingOptions = Readonly<{
  /**
   * Fixed at construction, or **read at settle time** through a thunk (13b
   * B-2). The thunk is called once per landing, immediately before the runner
   * builds its animation — which is the moment the shipped package's
   * `landingTiming()` was read, and after the settlement step that decides
   * where the visual is going.
   *
   * A thunk keeps everything the default runner provides: the reduced-motion
   * collapse, the retarget replay and the generation guard. What it costs is
   * one call per landing and a `TypeError` that arrives at settle time rather
   * than at construction — the value cannot be range-checked before it exists.
   */
  duration?: number | (() => number);
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
// **Parity, not taste** (D6, Checkpoint D). The shipped package's default
// landing timing is `{ duration: 200, easing: 'ease' }` and the parity ledger
// retains it, so a consumer that installs `landing()` with no easing gets the
// motion it already had. `'ease-out'` shipped here by accident and was
// observably different for every such consumer.
const DEFAULT_EASING = 'ease';

export function landing(options: LandingOptions = {}): SortableFeature {
  const { run } = options;

  if (run !== undefined) {
    return brandFeature(() => ({ startLanding: run }));
  }

  const declared = options.duration ?? DEFAULT_DURATION;
  // Validated at construction when it is a number, and per landing when it is a
  // thunk — the earliest moment each form can be checked at all. A thunk that
  // returns a bad value throws from inside `start`, which the kernel already
  // classifies as `FAILURE_LANDING_CREATE`.
  let timing: (() => number) | null = null;
  let fixed = 0;

  if (typeof declared === 'function') {
    timing = declared;
  } else {
    fixed = requireFinite(declared, 'landing({ duration })', 0);
  }
  // `easing` is not validated: it is a CSS easing function, the platform is the
  // only correct parser for one, and `animate()` reports a bad value itself.
  const easing = options.easing ?? DEFAULT_EASING;

  const start: LandingStart = (context, done, fail): LandingHandle => {
    const { visual, compose, realm } = context;
    // Resolved and validated **once per landing**, not per `play`: a retarget
    // replays the same trajectory budget rather than re-reading a thunk that
    // may have moved on.
    //
    // **Before the reduced-motion test, never inside it** (D4, Checkpoint D).
    // The thunk's documented call timing is "once per landing, immediately
    // before the runner builds its animation" — it is not conditional on a
    // media query, and the shipped `landingTiming()` was likewise invoked and
    // its result adjusted afterwards. Resolving inside the collapse would make
    // a consumer's settle-time side effect, and a thrown or invalid result,
    // observable only for users who have not asked for reduced motion.
    const resolved =
      timing === null
        ? fixed
        : requireFinite(timing(), 'landing({ duration })', 0);
    // Collapsed to zero rather than skipped: the gate is still held and still
    // released through the runner, so the lifecycle is one path whatever the
    // user's motion preference is.
    const reduced =
      realm.window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
      false;
    const animationTiming = {
      duration: reduced ? 0 : resolved,
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
      // Local until it is fully subscribed. `animate()` succeeding is not the
      // same as *acquiring* a runner: `finished` is an accessor and `then` is a
      // call, and either can throw — a polyfill, a patched prototype, an engine
      // that refuses to construct the promise. An animation left playing at that
      // point would keep writing the transform with nothing able to stop it,
      // because the handle this function is building never reaches the kernel.
      // So acquisition is all-or-nothing: cancel what was started, then let the
      // throw travel, where `FAILURE_LANDING_CREATE` classifies it.
      const started = visual.animate(
        [{ transform: from }, { transform: compose(to.x, to.y) }],
        animationTiming,
      );

      try {
        started.finished.then(
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
      } catch (error) {
        // Bumped first: the cancel below rejects `finished` if a subscription
        // did land, and this play is already abandoned.
        generation += 1;
        started.cancel();
        throw error;
      }

      // Published last, so `destroy()` and `retarget()` never see a half-built
      // animation — a failed retarget leaves the previous, already-cancelled one
      // in the slot, which cancels idempotently.
      animation = started;
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
    };
  };

  return brandFeature(() => ({ startLanding: start }));
}
