/**
 * Selects the sortable visual's landing plan. Accepted transactions animate the
 * lifted visual to the proposed placeholder slot (destination recovery).
 * Rejected/canceled transactions animate it home — back to the grab origin —
 * after the placeholder has been returned to the home slot (home recovery).
 */
import type { LandingPlan } from '../kernel/protocol.ts';
import type { Point } from '../kernel/types.ts';

/**
 * The plan animating the visual from its current viewport delta to the
 * placeholder slot's border-box origin.
 */
export function destinationPlan(
  placeholderRect: DOMRectReadOnly,
  originRect: DOMRectReadOnly,
  currentDelta: Point,
): LandingPlan {
  return {
    from: currentDelta,
    target: {
      x: placeholderRect.left - originRect.left,
      y: placeholderRect.top - originRect.top,
    },
  };
}

/**
 * The plan animating the visual from its current viewport delta back to the grab
 * origin (zero delta). The origin is the visual's home once the placeholder has
 * been returned to the home slot.
 */
export function homePlan(currentDelta: Point): LandingPlan {
  return { from: currentDelta, target: { x: 0, y: 0 } };
}
