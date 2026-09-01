/**
 * The landing tail's timing policy — **behavior-neutral, declared once,
 * wrapped by two entries**.
 *
 * How the dropped visual travels to its final place has nothing to do with
 * collections or with free drags, and the kernel owns the interpolation
 * itself. What is left for a feature to own is the policy: how long, with what
 * easing, and whether the user asked for no motion at all. What the two entries
 * do **not** share is the installer type, because the contribution types differ
 * — so `sortable/landing.js` and `free-drag/landing.js` are each a thin factory
 * over this module.
 *
 * `LandingOptions` is declared here for the same reason: imported from either
 * landing entry it must be the **same declaration**, not two structurally equal
 * ones.
 *
 * Without a landing installed the visual is simply where the drop put it, and
 * none of this module is imported.
 */
import type { DOMRealm } from '../kernel/realm.ts';
import type { LandingTiming } from './composition.ts';

/**
 * What a contextual `duration` is handed.
 *
 * The four coordinates are the tail's endpoints — origin-relative viewport
 * deltas, where the visual was and where the drop decided it belongs — and
 * `distance` is the straight-line magnitude between them.
 *
 * They are **scalars rather than two points**: the kernel already holds them as
 * scalars, so nesting them here would allocate two objects for a function that
 * most often reads only `distance`.
 */
export type LandingTimingContext = Readonly<{
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  distance: number;
}>;

/**
 * **The contextual duration function.**
 */
export type LandingDuration = (context: LandingTimingContext) => number;

export type LandingOptions = Readonly<{
  /**
   * Fixed at construction, or **read at landing time** through a function. The
   * function is called once per landing, immediately before the interpolation
   * starts, and after the settlement step that decided where the visual went.
   *
   * A zero-parameter function such as `() => 200` is assignable and is called
   * the same way.
   *
   * What the function form costs is one call per landing, at landing time
   * rather than at construction — the value does not exist before then.
   *
   * **The domain is a finite number of milliseconds, and nothing here detects a
   * violation.** Either form — the fixed number or the value the function
   * returns — is handed to the platform's `animate()` as written, which refuses
   * `NaN`, a negative, `-Infinity`, a string and an object itself. The refusal
   * reaches the consumer as a warning and changes nothing about the drop, which
   * is already complete: the tail is an interpolation, not a gate.
   */
  duration?: number | LandingDuration;
  easing?: string;
}>;

const DEFAULT_DURATION = 200;
const DEFAULT_EASING = 'ease';

/**
 * Builds the timing both behaviors install. Pure: it allocates one closure and
 * reads no DOM, so an installer calling it stays externally inert.
 */
export function createLandingTiming(
  options: LandingOptions,
  realm: DOMRealm,
): LandingTiming {
  // **Both options are always read**, unconditionally.
  const declared = options.duration ?? DEFAULT_DURATION;
  const timing: LandingDuration | null =
    typeof declared === 'function' ? declared : null;
  const fixed = typeof declared === 'function' ? 0 : declared;
  // `easing` is not validated: it is a CSS easing function, the platform is the
  // only correct parser for one, and `animate()` reports a bad value itself.
  const easing = options.easing ?? DEFAULT_EASING;

  return (fromX, fromY, toX, toY) => {
    // Resolved **once per landing**, and **before the reduced-motion test,
    // never inside it**. The documented call timing — once per landing,
    // immediately before the interpolation starts — is not conditional on a
    // media query. Resolving inside the collapse would make a consumer's
    // settle-time side effect, and a thrown result, observable only for users
    // who have not asked for reduced motion.
    const resolved = timing
      ? timing({
          fromX,
          fromY,
          toX,
          toY,
          // The endpoints are the kernel's; the distance is the one arithmetic
          // this context adds.
          distance: Math.hypot(toX - fromX, toY - fromY),
        })
      : fixed;
    const reduced =
      realm.window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
      false;

    // **Collapsed to zero rather than declined**, so the element arrives on the
    // frame the drop lands and the two motion preferences differ in duration
    // alone. An unbounded duration therefore collapses and lands: that misuse
    // differs by OS setting, and nothing waits on either answer.
    return { duration: reduced ? 0 : resolved, easing };
  };
}
