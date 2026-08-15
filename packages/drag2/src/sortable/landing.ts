/**
 * The landing gate: how the lifted visual travels to its final place after the
 * transaction is decided.
 *
 * Without this feature the behavior holds **no** landing gate and none of this
 * module is imported. Installing it holds the gate through a runner — even with
 * `duration: 0`, which is immediate but not the same code path.
 *
 * **The library owns the animation at this tier** (D-63). ~~`landing({ run })`~~
 * replaced the runner entirely, and it is gone with the three seam types it
 * needed — `LandingStart`, `LandingHandle` and `LandingContext` are authoring
 * vocabulary now and live on `sortable/feature.js`. What survives is the clause
 * that made the slot look necessary and is true without it: **nothing in the
 * contract assumes a CSS timing function or a finite known duration**, which is
 * what keeps a kernel-tier spring authorable and what makes `duration: 0` safe.
 *
 * The runner the library installs is still never responsible for correctness:
 * the kernel performs the authoritative pin at the join, and the runner's only
 * obligations are to call `done()` or `fail()` exactly once and to relinquish
 * the transform on `destroy()`.
 */
import type { LandingHandle, LandingStart } from '../kernel/spec.ts';
import type { Point } from '../kernel/types.ts';
import type { SortableConfig } from './config.ts';

/**
 * What a contextual `duration` is handed (D-67).
 *
 * `from` and `to` are the landing's origin-relative deltas — the same two
 * points the runner animates between — and `distance` is the straight-line
 * magnitude between them, which is the quantity review 3 §10 said a zero-
 * argument thunk *"cannot even observe"*. All three are values the landing
 * already holds at that moment; the object is the only new allocation.
 */
export type LandingTimingContext = Readonly<{
  from: Point;
  to: Point;
  distance: number;
}>;

/**
 * **The contextual duration function** (D-67), as a named alias for the reason
 * every callback slot is one (F-51).
 */
export type LandingDuration = (context: LandingTimingContext) => number;

export type LandingOptions = Readonly<{
  /**
   * Fixed at construction, or **read at settle time** through a function
   * (13b B-2, D-67). The function is called once per landing, immediately
   * before the runner builds its animation — which is the moment the shipped
   * package's `landingTiming()` was read, and after the settlement step that
   * decides where the visual is going.
   *
   * **It takes a context now, and that is what kept the capability alive.**
   * Review 3 §10 rejected the zero-argument thunk on its own terms; D-63 then
   * removed `run`, which had been the other way to reach settle-time timing,
   * leaving the thunk as the sole carrier of parity L-6. The contextual form
   * discharges the objection instead of deleting the parity, and costs one
   * object and one `Math.hypot` more than the thunk did.
   *
   * **A shipped `() => 200` keeps working** and is not a compile error: a
   * zero-parameter function is assignable to any signature (F-52). The
   * migration is source-compatible, and the only way to *require* the context
   * would be a runtime arity check, which is not worth its cost for a form that
   * still behaves correctly.
   *
   * What it costs, either way, is one call per landing and a `TypeError` that
   * arrives at settle time rather than at construction — the value cannot be
   * range-checked before it exists.
   */
  duration?: number | LandingDuration;
  easing?: string;
}>;

const DEFAULT_DURATION = 200;
// **Parity, not taste** (D6, Checkpoint D). The shipped package's default
// landing timing is `{ duration: 200, easing: 'ease' }` and the parity ledger
// retains it, so a consumer that installs `landing()` with no easing gets the
// motion it already had. `'ease-out'` shipped here by accident and was
// observably different for every such consumer.
const DEFAULT_EASING = 'ease';

export function landing(
  options: LandingOptions = {},
): Pick<SortableConfig, 'landing'> {
  // **Both options are always read** (D-63). `run` used to short-circuit this
  // whole function, which meant the timing options were conditionally read;
  // removing it removes a conditional from the rule rather than adding one.
  const declared = options.duration ?? DEFAULT_DURATION;
  // **Narrowed to one comparison, and moved to the landing** (D-77). The check
  // used to be `requireFinite` at construction for the number form and per
  // landing for the thunk; both forms are now tested at the same instant and
  // against the same single value, because `animate()` is a better validator
  // than the library for every other case — **measured, and the artifact is
  // `.plan/measurements/animate-duration-domain.md`** (D-79): under Chrome 150
  // it rejects `NaN`, negatives, `-Infinity`, strings and objects itself, with
  // one message naming its own domain.
  //
  // ~~It also accepts `'auto'` and `undefined`, which a finiteness test would
  // have wrongly refused.~~ **Struck** (D-79): `undefined` never reaches
  // `animate()` — the line above coalesces it to the default — and `'auto'` is
  // reachable only from JavaScript, since `LandingDuration` returns `number`.
  // The deletion rests on the byte argument and on the `Infinity` invariant,
  // not on this.
  //
  // `Infinity` is the one value it accepts and never completes. That is the
  // only reason a check survives here at all: **the landing holds the
  // settlement gate**, so an animation that never finishes is an operation with
  // no terminal — the single failure this architecture cannot classify, because
  // classification needs something to happen. `layoutAnimation` takes the same
  // option, holds nothing, and therefore keeps no check.
  const timing: LandingDuration | null =
    typeof declared === 'function' ? declared : null;
  const fixed = typeof declared === 'function' ? 0 : declared;
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
    const { from, target } = context;
    const resolved =
      timing === null
        ? fixed
        : timing({
            from,
            to: target,
            // The one arithmetic D-67 adds. `from` and `to` were already
            // computed for `LandingContext`; this is what makes the distance
            // that motivated dynamic timing observable at all.
            distance: Math.hypot(target.x - from.x, target.y - from.y),
          });

    // **The one surviving domain test** (D-77), applied to both forms at the
    // same instant and **before** the reduced-motion collapse, which is where
    // Checkpoint D (D4) put it and where it stays: a consumer diagnosing a bug
    // must not get a different answer because of the reader's OS setting, even
    // though the collapse would have made this particular value harmless.
    if (resolved === Number.POSITIVE_INFINITY) {
      throw new TypeError(
        'sortable: landing({ duration }) must not be Infinity',
      );
    }
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

  return { landing: () => ({ startLanding: start }) };
}
