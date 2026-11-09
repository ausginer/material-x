import { delta, localDelta, type Space } from '@ydinjs/box-quad';
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

/**
 * The landing capability: what animates a released visual to where it lands.
 * Pass it as a built-in's `landing`, or to `Lift.land`. A lift that is given
 * none starts no animation and carries no animation code. It holds no controller
 * or operation state, so one value serves every controller.
 */
export interface Landing {
  /**
   * Called once, at `land`, with the delta last translated to and the delta to
   * the landing. The lift copies the values it returns and keeps no reference to
   * the object.
   */
  timing(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ): Readonly<{ duration: number; easing: string }>;
  /**
   * Called right after the lift's release. `dx` and `dy` are the viewport offset
   * of the visual from where it lands, and `duration` and `easing` are the values
   * `timing` returned. Returns the cancel, or `null` when nothing animates. The
   * lifter calls the cancel at its next `acquire` and at `cancelLanding`.
   */
  start(
    visual: HTMLElement,
    visualSpace: Space,
    dx: number,
    dy: number,
    duration: number,
    easing: string,
    window: Window,
  ): (() => void) | null;
}

const TOP_Z_INDEX = 2_147_483_647;

/**
 * The flight is additive, so it composes with whatever else animates the visual.
 * Elevation is a separate replacing animation: added to an item's own `z-index`,
 * the sum wraps in WebKit and the item goes under its siblings.
 */
function startLandingAnimation(
  visual: HTMLElement,
  visualSpace: Space,
  dx: number,
  dy: number,
  duration: number,
  easing: string,
  window: Window,
): (() => void) | null {
  const local = delta();

  if (
    !localDelta(visualSpace, dx, dy, local) ||
    (local[0] === 0 && local[1] === 0)
  ) {
    return null;
  }

  const effectiveDuration = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches
    ? 0
    : duration;
  const flight = visual.animate(
    [{ translate: `${local[0]!}px ${local[1]!}px` }, { translate: '0 0' }],
    { duration: effectiveDuration, easing, composite: 'add' },
  );

  if (effectiveDuration === 0) {
    return () => {
      flight.cancel();
    };
  }

  const keyframe =
    window.getComputedStyle(visual).position === 'static'
      ? { zIndex: TOP_Z_INDEX, position: 'relative' }
      : { zIndex: TOP_Z_INDEX };
  const elevation = visual.animate([keyframe, keyframe], {
    duration: effectiveDuration,
  });

  return () => {
    flight.cancel();
    elevation.cancel();
  };
}

/**
 * Composes a landing: an additive flight from where the visual was released,
 * with the visual above its siblings for the flight. Without it, a behavior
 * measures no landing target and the lift starts no animation. With
 * `prefers-reduced-motion: reduce`, every landing it starts has zero duration,
 * and the `duration` function is still called. It returns a new value per call
 * and holds no state.
 */
export function landing(options: LandingOptions = {}): Landing {
  const {
    duration = DEFAULT_LANDING_DURATION,
    easing = DEFAULT_LANDING_EASING,
  } = options;

  return {
    timing: (fromX, fromY, toX, toY) => ({
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
    }),
    start: startLandingAnimation,
  };
}
