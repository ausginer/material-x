/**
 * Selects the sortable visual's landing plan. Accepted transactions animate the
 * lifted visual to the proposed placeholder slot (destination recovery).
 * Rejected/canceled transactions restore presentation immediately (v1), so no
 * plan is built for them.
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
