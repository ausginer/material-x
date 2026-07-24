import { describe, expect, it } from 'vitest';
import { applyMotionDelta } from '../../src/draggable/motion.ts';
import {
  createStateFrame,
  type DragStateFrame,
} from '../../src/draggable/runtime/frames.ts';
import { AXIS_BOTH, AXIS_X, AXIS_Y } from '../../src/kernel/types.ts';

/**
 * A rect literal. `applyMotionDelta` only reads edge properties, so a plain
 * object is a faithful stand-in and keeps the cases readable.
 */
const rect = (
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRectReadOnly =>
  // oxlint-disable-next-line typescript/consistent-type-assertions
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
  }) as DOMRectReadOnly;

/** A frame whose pointer has travelled `dx`/`dy` from a rect at (100, 100). */
function frameMovedBy(
  dx: number,
  dy: number,
  originRect: DOMRectReadOnly = rect(100, 100, 50, 50),
): DragStateFrame {
  const frame = createStateFrame();
  frame.originRect = originRect;
  frame.originX = 0;
  frame.originY = 0;
  frame.pointerX = dx;
  frame.pointerY = dy;
  return frame;
}

/** The committed delta after applying motion. */
function deltaOf(frame: DragStateFrame): Readonly<{ x: number; y: number }> {
  return { x: frame.deltaX, y: frame.deltaY };
}

describe('applyMotionDelta', () => {
  const bounds = rect(0, 0, 500, 400);

  describe('axis constraint', () => {
    it('should zero the vertical component on the x axis', () => {
      const frame = frameMovedBy(10, 20);

      applyMotionDelta(frame, AXIS_X, null);

      expect(deltaOf(frame)).toEqual({ x: 10, y: 0 });
    });

    it('should zero the horizontal component on the y axis', () => {
      const frame = frameMovedBy(10, 20);

      applyMotionDelta(frame, AXIS_Y, null);

      expect(deltaOf(frame)).toEqual({ x: 0, y: 20 });
    });

    it('should pass both components through on the default axis', () => {
      const frame = frameMovedBy(10, 20);

      applyMotionDelta(frame, AXIS_BOTH, null);

      expect(deltaOf(frame)).toEqual({ x: 10, y: 20 });
    });
  });

  describe('bounds clamping', () => {
    it('should leave a delta that stays inside the bounds untouched', () => {
      const frame = frameMovedBy(20, 30);

      applyMotionDelta(frame, AXIS_BOTH, bounds);

      expect(deltaOf(frame)).toEqual({ x: 20, y: 30 });
    });

    it('should clamp movement past the left edge', () => {
      const frame = frameMovedBy(-400, 0);

      applyMotionDelta(frame, AXIS_BOTH, bounds);

      expect(deltaOf(frame)).toEqual({ x: -100, y: 0 });
    });

    it('should clamp movement past the right edge', () => {
      // The item's right edge is 150; it may travel 350 before hitting 500.
      const frame = frameMovedBy(900, 0);

      applyMotionDelta(frame, AXIS_BOTH, bounds);

      expect(deltaOf(frame)).toEqual({ x: 350, y: 0 });
    });

    it('should clamp movement past the top edge', () => {
      const frame = frameMovedBy(0, -400);

      applyMotionDelta(frame, AXIS_BOTH, bounds);

      expect(deltaOf(frame)).toEqual({ x: 0, y: -100 });
    });

    it('should clamp movement past the bottom edge', () => {
      const frame = frameMovedBy(0, 900);

      applyMotionDelta(frame, AXIS_BOTH, bounds);

      expect(deltaOf(frame)).toEqual({ x: 0, y: 250 });
    });

    it('should clamp both axes independently in one call', () => {
      const frame = frameMovedBy(-400, 900);

      applyMotionDelta(frame, AXIS_BOTH, bounds);

      expect(deltaOf(frame)).toEqual({ x: -100, y: 250 });
    });

    it('should allow a delta that lands exactly on the boundary', () => {
      const frame = frameMovedBy(350, 250);

      applyMotionDelta(frame, AXIS_BOTH, bounds);

      expect(deltaOf(frame)).toEqual({ x: 350, y: 250 });
    });

    it('should pin the item to the far edge when the bounds are smaller than it', () => {
      // Degenerate but reachable (a shrunken container): the minimum exceeds
      // the maximum, and the upper clamp wins, so the result stays
      // deterministic rather than NaN.
      const frame = frameMovedBy(50, 50, rect(0, 0, 100, 100));

      applyMotionDelta(frame, AXIS_BOTH, rect(0, 0, 10, 10));

      expect(deltaOf(frame)).toEqual({ x: -90, y: -90 });
    });

    it('should ignore bounds when the frame has no origin rect', () => {
      const frame = frameMovedBy(900, 900);
      frame.originRect = null;

      applyMotionDelta(frame, AXIS_BOTH, bounds);

      expect(deltaOf(frame)).toEqual({ x: 900, y: 900 });
    });
  });

  it('should constrain the axis before clamping', () => {
    // The vertical component is zeroed first, so the bottom edge never applies.
    const frame = frameMovedBy(20, 900);

    applyMotionDelta(frame, AXIS_X, bounds);

    expect(deltaOf(frame)).toEqual({ x: 20, y: 0 });
  });
});
