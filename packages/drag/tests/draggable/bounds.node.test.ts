import { describe, expect, it, vi } from 'vitest';
import { BOUNDS_VIEWPORT, resolveBounds } from '../../src/draggable/bounds.ts';
import type { DOMRealm } from '../../src/kernel/realm.ts';

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
