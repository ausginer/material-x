/**
 * Selects the free-drag landing plan.
 *
 * For v1, accepted free drops dispose the temporary presentation immediately and
 * reveal the consumer-authored accepted position; they do not animate. Only a
 * rejected/canceled drop with an explicit valid home target animates. This module
 * converts that home target, the current visual delta, and the activation origin
 * rect into explicit `from`/`target` viewport-space deltas.
 */
import type { LandingPlan } from '../kernel/protocol.ts';
import { isFinitePoint, type Point } from '../kernel/types.ts';
import type { FreeHomeTarget } from './options.ts';

/** Whether a resolver output is a valid finite viewport-space home target. */
export function isValidHomeTarget(value: unknown): value is FreeHomeTarget {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as FreeHomeTarget).space === 'viewport' &&
    isFinitePoint((value as FreeHomeTarget).position)
  );
}

/**
 * The landing plan animating the visual from its current delta to the home
 * target's border-box origin.
 */
export function homeLandingPlan(
  target: FreeHomeTarget,
  currentDelta: Point,
  originRect: DOMRectReadOnly,
): LandingPlan {
  return {
    from: currentDelta,
    target: {
      x: target.position.x - originRect.left,
      y: target.position.y - originRect.top,
    },
  };
}
