/**
 * The landing runner, its timing domain and its reduced-motion collapse —
 * **behavior-neutral, declared once, wrapped by two entries**.
 *
 * `LandingStart`, `LandingContext` and `LandingHandle` are kernel SPI, so
 * nothing about how a lifted visual travels to its final place is specific to a
 * collection or to a free drag. What the two entries do **not** share is the
 * installer type, because the contribution types differ (F-64) — so
 * `sortable/landing.js` and `free-drag/landing.js` are each a thin factory over
 * this module.
 *
 * `LandingOptions` is declared here for B-7's reason: imported from either
 * landing entry it must be the **same declaration**, not two structurally equal
 * ones.
 *
 * Without a landing installed the behavior holds **no** landing gate and none of
 * this module is imported. Installing it holds the gate through a runner — even
 * with `duration: 0`, which is immediate but not the same code path.
 *
 * **The library owns the animation at the ordinary tier** (D-63), and **nothing
 * in the contract assumes a CSS timing function or a finite known duration**,
 * which is what keeps a kernel-tier spring authorable and what makes
 * `duration: 0` safe.
 *
 * The runner is never responsible for correctness: the kernel performs the
 * authoritative pin at the join, and the runner's only obligations are to call
 * `done()` or `fail()` exactly once and to relinquish the transform on
 * `destroy()`.
 */
import type { LandingHandle, LandingStart } from '../kernel/spec.ts';
import type { Point } from '../kernel/types.ts';

/**
 * What a contextual `duration` is handed.
 *
 * `from` and `to` are the landing's origin-relative deltas — the same two
 * points the runner animates between — and `distance` is the straight-line
 * magnitude between them.
 */
export type LandingTimingContext = Readonly<{
  from: Point;
  to: Point;
  distance: number;
}>;

/**
 * **The contextual duration function.**
 */
export type LandingDuration = (context: LandingTimingContext) => number;

export type LandingOptions = Readonly<{
  /**
   * Fixed at construction, or **read at settle time** through a function. The
   * function is called once per landing, immediately before the runner builds
   * its animation, and after the settlement step that decides where the visual
   * is going.
   *
   * A zero-parameter function such as `() => 200` is assignable and is called
   * the same way.
   *
   * What the function form costs is one call per landing, at settle time rather
   * than at construction — the value does not exist before then.
   *
   * **The domain is a finite number of milliseconds, and nothing here detects
   * a violation.** Either form — the fixed number or the value the function
   * returns — is handed to the platform's `animate()` as written. `animate()`
   * refuses `NaN`, a negative, `-Infinity`, a string and an object itself, at
   * that moment, and the failure is classified as an ordinary landing-creation
   * failure. **`Infinity` is the one value it accepts and never completes**:
   * the landing holds the settlement gate, so an unbounded duration leaves the
   * operation with no terminal at all. That is a documented boundary rather
   * than a guarded one.
   */
  duration?: number | LandingDuration;
  easing?: string;
}>;

const DEFAULT_DURATION = 200;
// **Parity, not taste** (D6). The shipped package's default landing timing is
// `{ duration: 200, easing: 'ease' }` and the parity ledger retains it, so a
// consumer that installs `landing()` with no easing gets the motion it already
// had.
const DEFAULT_EASING = 'ease';

/**
 * Builds the `LandingStart` both behaviors install. Pure: it allocates two
 * closures and reads no DOM, so an installer calling it stays externally inert.
 */
export function createLandingStart(options: LandingOptions): LandingStart {
  // **Both options are always read**, unconditionally (D-63).
  const declared = options.duration ?? DEFAULT_DURATION;
  // **No domain test survives here**: the whole duration domain is
  // `animate()`'s, which rejects `NaN`, negatives, `-Infinity`, strings and
  // objects itself, with one message naming its own domain (D-79).
  //
  // `Infinity` is the one value `animate()` accepts and never completes, and
  // **nothing detects a violation** — an unbounded duration holds the
  // settlement gate open with no terminal, which is what that misuse buys
  // (D-124).
  const timing: LandingDuration | null =
    typeof declared === 'function' ? declared : null;
  const fixed = typeof declared === 'function' ? 0 : declared;
  // `easing` is not validated: it is a CSS easing function, the platform is the
  // only correct parser for one, and `animate()` reports a bad value itself.
  const easing = options.easing ?? DEFAULT_EASING;

  return (context, done, fail): LandingHandle => {
    const { visual, compose, realm } = context;
    // Resolved **once per landing**, not per `play`: a retarget replays the
    // same trajectory budget rather than re-reading a thunk that may have moved
    // on.
    //
    // **Before the reduced-motion test, never inside it** (D4). The documented
    // call timing — once per landing, immediately before the runner builds its
    // animation — is not conditional on a media query. Resolving inside the
    // collapse would make a consumer's settle-time side effect, and a thrown
    // result, observable only for users who have not asked for reduced motion.
    const { from, target } = context;
    const resolved =
      timing === null
        ? fixed
        : timing({
            from,
            to: target,
            // `from` and `to` were already computed for `LandingContext`; the
            // distance is the one arithmetic this context adds (D-67).
            distance: Math.hypot(target.x - from.x, target.y - from.y),
          });

    // The reduced-motion collapse is the first thing the resolved value meets,
    // so under `reduce` an unbounded duration collapses to zero and lands:
    // that misuse differs by OS setting (D-124).
    //
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

    const play = (start: string, to: Point): void => {
      const mine = generation;
      // Local until it is fully subscribed. `animate()` succeeding is not the
      // same as *acquiring* a runner: `finished` is an accessor and `then` is a
      // call, and either can throw — a polyfill, a patched prototype, an engine
      // that refuses to construct the promise. An animation left playing at
      // that point would keep writing the transform with nothing able to stop
      // it, because the handle this function is building never reaches the
      // kernel. So acquisition is all-or-nothing: cancel what was started, then
      // let the throw travel, where `FAILURE_LANDING_CREATE` classifies it.
      const started = visual.animate(
        [{ transform: start }, { transform: compose(to.x, to.y) }],
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

      // Published last, so `destroy()` never sees a half-built animation.
      animation = started;
    };

    play(compose(from.x, from.y), target);

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
}
