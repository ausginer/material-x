import { describe, expect, it, vi } from 'vitest';
import {
  BOUNDS_VIEWPORT,
  clampDelta,
  constrainAxis,
  resolveBounds,
} from '../../src/draggable/bounds.ts';
import type { DOMRealm } from '../../src/kernel/realm.ts';
import { AXIS_BOTH, AXIS_X, AXIS_Y } from '../../src/kernel/types.ts';

/**
 * A rect literal. These functions only read the edge properties, so a plain
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

/** A realm exposing only what `resolveBounds` reads from its window. */
function realmOf(innerWidth: number, innerHeight: number): DOMRealm {
  class FakeRect {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
    readonly right: number;
    readonly bottom: number;

    constructor(x: number, y: number, width: number, height: number) {
      this.left = x;
      this.top = y;
      this.width = width;
      this.height = height;
      this.right = x + width;
      this.bottom = y + height;
    }
  }

  return {
    window: { innerWidth, innerHeight, DOMRectReadOnly: FakeRect },
  } as unknown as DOMRealm;
}

describe('resolveBounds', () => {
  it('should treat an absent source as unbounded', () => {
    expect(resolveBounds(undefined, realmOf(800, 600))).toBeNull();
  });

  it('should resolve the viewport keyword to the realm viewport rect', () => {
    const resolved = resolveBounds(BOUNDS_VIEWPORT, realmOf(800, 600));

    expect(resolved).toMatchObject({
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
    });
  });

  it('should read the viewport size from the owning realm, not ambient globals', () => {
    // The iframe case: a controller created in another realm must measure that
    // realm's viewport.
    const resolved = resolveBounds(BOUNDS_VIEWPORT, realmOf(320, 240));

    expect(resolved).toMatchObject({ right: 320, bottom: 240 });
  });

  it('should call a function source and return its rect', () => {
    const bounds = rect(10, 20, 100, 50);
    const source = vi.fn(() => bounds);

    expect(resolveBounds(source, realmOf(800, 600))).toBe(bounds);
    expect(source).toHaveBeenCalledOnce();
  });

  it('should pass through a null returned by a function source as unbounded', () => {
    expect(resolveBounds(() => null, realmOf(800, 600))).toBeNull();
  });

  it('should measure an element source at call time', () => {
    const bounds = rect(0, 0, 200, 200);
    const getBoundingClientRect = vi.fn(() => bounds);
    const element = { getBoundingClientRect } as unknown as HTMLElement;

    expect(resolveBounds(element, realmOf(800, 600))).toBe(bounds);
    expect(getBoundingClientRect).toHaveBeenCalledOnce();
  });
});

describe('clampDelta', () => {
  const item = rect(100, 100, 50, 50);
  const bounds = rect(0, 0, 500, 400);

  it('should leave a delta that stays inside the bounds untouched', () => {
    expect(clampDelta({ x: 20, y: 30 }, item, bounds)).toEqual({
      x: 20,
      y: 30,
    });
  });

  it('should clamp movement past the left edge', () => {
    expect(clampDelta({ x: -400, y: 0 }, item, bounds)).toEqual({
      x: -100,
      y: 0,
    });
  });

  it('should clamp movement past the right edge', () => {
    // right edge of the item is 150; it may travel 350 before hitting 500.
    expect(clampDelta({ x: 900, y: 0 }, item, bounds)).toEqual({
      x: 350,
      y: 0,
    });
  });

  it('should clamp movement past the top edge', () => {
    expect(clampDelta({ x: 0, y: -400 }, item, bounds)).toEqual({
      x: 0,
      y: -100,
    });
  });

  it('should clamp movement past the bottom edge', () => {
    expect(clampDelta({ x: 0, y: 900 }, item, bounds)).toEqual({
      x: 0,
      y: 250,
    });
  });

  it('should clamp both axes independently in one call', () => {
    expect(clampDelta({ x: -400, y: 900 }, item, bounds)).toEqual({
      x: -100,
      y: 250,
    });
  });

  it('should allow a delta that lands exactly on the boundary', () => {
    expect(clampDelta({ x: 350, y: 250 }, item, bounds)).toEqual({
      x: 350,
      y: 250,
    });
  });

  it('should pin the item to the far edge when the bounds are smaller than it', () => {
    // Degenerate but reachable (a shrunken container): min exceeds max, and the
    // upper clamp wins, so the result stays deterministic rather than NaN.
    const large = rect(0, 0, 100, 100);
    const tiny = rect(0, 0, 10, 10);

    expect(clampDelta({ x: 50, y: 50 }, large, tiny)).toEqual({
      x: -90,
      y: -90,
    });
  });
});

describe('constrainAxis', () => {
  it('should zero the vertical component on the x axis', () => {
    expect(constrainAxis({ x: 10, y: 20 }, AXIS_X)).toEqual({ x: 10, y: 0 });
  });

  it('should zero the horizontal component on the y axis', () => {
    expect(constrainAxis({ x: 10, y: 20 }, AXIS_Y)).toEqual({ x: 0, y: 20 });
  });

  it('should pass both components through on the default axis', () => {
    expect(constrainAxis({ x: 10, y: 20 }, AXIS_BOTH)).toEqual({
      x: 10,
      y: 20,
    });
  });

  it('should return the same reference when nothing is constrained', () => {
    // Movement runs per pointer event, so the unconstrained path must not
    // allocate a fresh point.
    const delta = { x: 10, y: 20 };

    expect(constrainAxis(delta, AXIS_BOTH)).toBe(delta);
  });
});
