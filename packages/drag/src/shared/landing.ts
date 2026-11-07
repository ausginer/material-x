import { DEFAULT_LANDING_DURATION, DEFAULT_LANDING_EASING } from './timing.ts';

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

/**
 * Composes a landing. Without it, a behavior measures no landing target. With
 * `prefers-reduced-motion: reduce`, every landing has zero duration, and the
 * `duration` function is still called.
 */
export function landing(options: LandingOptions = {}): LandingTiming {
  const {
    duration = DEFAULT_LANDING_DURATION,
    easing = DEFAULT_LANDING_EASING,
  } = options;

  return (fromX, fromY, toX, toY) => ({
    duration:
      typeof duration === 'function'
        ? duration({
            fromX,
            fromY,
            toX,
            toY,
            distance: Math.hypot(toX - fromX, toY - fromY),
          })
        : duration,
    easing,
  });
}
