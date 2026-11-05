/**
 * The landing animation's timing policy. It is behavior-neutral, declared once,
 * and wrapped by two entries.
 *
 * How the dropped visual travels to its final place has nothing to do with
 * collections or with free drags, and the kernel owns the interpolation itself.
 * What remains for a feature to own is the policy: how long, with what easing,
 * and whether the user asked for no motion at all. The two entries do not share
 * the installer type, because the contribution types differ. So
 * `sortable/landing.js` and `free-drag/landing.js` are each a thin factory over
 * this module.
 *
 * `LandingOptions` is declared here for the same reason: imported from either
 * landing entry, it must be the same declaration and not two structurally equal
 * ones.
 *
 * Without a landing installed, the visual is simply where the drop put it, and
 * none of this module is imported.
 */
import type { DOMRealm } from '../kernel/realm.ts';
import type { LandingTiming } from './composition.ts';

/**
 * What a contextual `duration` receives.
 *
 * The four coordinates are the landing animation's endpoints, as
 * origin-relative viewport deltas: where the visual was and where the drop
 * decided it belongs. `distance` is the straight-line magnitude between them.
 *
 * They are scalars and not two points: the kernel already holds them as
 * scalars, and nesting them here would allocate two objects for a function that
 * most often reads only `distance`.
 */
export type LandingTimingContext = Readonly<{
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  distance: number;
}>;

/** The contextual duration function. */
export type LandingDuration = (context: LandingTimingContext) => number;

export type LandingOptions = Readonly<{
  /**
   * Fixed at construction, or read at landing time through a function. The
   * function is called once per landing, immediately before the interpolation
   * starts, and after the settlement step that decided where the visual went.
   *
   * A zero-parameter function such as `() => 200` is assignable and is called
   * the same way.
   *
   * The function form costs one call per landing, at landing time and not at
   * construction. The value does not exist before then.
   *
   * The domain is a finite number of milliseconds, and nothing here detects a
   * violation. Either form, the fixed number or the value the function returns,
   * is passed to the platform's `animate()` as written. `animate()` refuses
   * `NaN`, a negative, `-Infinity`, a string and an object itself. The refusal
   * reaches the consumer as a warning and changes nothing about the drop, which
   * is already complete: the landing animation only interpolates, and nothing
   * waits on it.
   */
  duration?: number | LandingDuration;
  easing?: string;
}>;

const DEFAULT_DURATION = 200;
const DEFAULT_EASING = 'ease';

/**
 * Builds the timing both behaviors install. Pure: it allocates one closure and
 * reads no DOM, so an installer that calls it stays externally inert.
 */
export function createLandingTiming(
  options: LandingOptions,
  realm: DOMRealm,
): LandingTiming {
  // Both options are always read, unconditionally.
  const declared = options.duration ?? DEFAULT_DURATION;
  const timing: LandingDuration | null =
    typeof declared === 'function' ? declared : null;
  const fixed = typeof declared === 'function' ? 0 : declared;
  // `easing` is not validated: it is a CSS easing function, the platform is the
  // only correct parser for one, and `animate()` reports a bad value itself.
  const easing = options.easing ?? DEFAULT_EASING;

  return (fromX, fromY, toX, toY) => {
    // Resolved once per landing, before the reduced-motion test and never
    // inside it. The documented call timing, once per landing and immediately
    // before the interpolation starts, does not depend on a media query.
    // Resolving inside the collapse would make a consumer's settle-time side
    // effect, and a thrown result, observable only for users who have not asked
    // for reduced motion.
    const resolved = timing
      ? timing({
          fromX,
          fromY,
          toX,
          toY,
          // The endpoints are the kernel's. The distance is the one calculation
          // this context adds.
          distance: Math.hypot(toX - fromX, toY - fromY),
        })
      : fixed;
    const reduced =
      realm.window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
      false;

    // Reduced to zero and not declined, so the element arrives on the frame the
    // drop lands and the two motion preferences differ in duration alone. An
    // unbounded duration therefore collapses and lands: that misuse differs by
    // OS setting, and nothing waits on either answer.
    return { duration: reduced ? 0 : resolved, easing };
  };
}
