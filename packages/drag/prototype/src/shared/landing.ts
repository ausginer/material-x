/**
 * The landing's timing policy, shared by `sortable/landing.js` and
 * `free-drag/landing.js`. Without a landing composed none of this is imported,
 * and a behavior measures no target.
 */

export type LandingTimingContext = Readonly<{
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  distance: number;
}>;

export type LandingOptions = Readonly<{
  /** Milliseconds, or a function called once per landing. */
  duration?: number | ((context: LandingTimingContext) => number);
  easing?: string;
}>;

export type LandingTiming = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) => Readonly<{ duration: number; easing: string }>;

const DEFAULT_DURATION = 200;
const DEFAULT_EASING = 'ease';

/** The value a `landing` config key takes. */
export type LandingInstaller = (view: Window) => LandingTiming;

export function landing(options: LandingOptions = {}): LandingInstaller {
  const { duration = DEFAULT_DURATION, easing = DEFAULT_EASING } = options;

  return (view) => (fromX, fromY, toX, toY) => {
    // Resolved before the reduced-motion test, so a function's call timing does
    // not depend on a media query.
    const resolved =
      typeof duration === 'function'
        ? duration({
            fromX,
            fromY,
            toX,
            toY,
            distance: Math.hypot(toX - fromX, toY - fromY),
          })
        : duration;
    const reduced = view.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return { duration: reduced ? 0 : resolved, easing };
  };
}
