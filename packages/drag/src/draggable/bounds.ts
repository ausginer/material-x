/** Stateless movement geometry: axis constraint and bounds clamping. */
import type { DOMRealm } from '../kernel/realm.ts';
import { AXIS_X, AXIS_Y, type DragAxis, type Point } from '../kernel/types.ts';
import type { DragBounds } from './options.ts';

export const BOUNDS_VIEWPORT = 'viewport';

/** Resolves a bounds source to a viewport rect, or `null` for unbounded. */
export function resolveBounds(
  bounds: DragBounds | undefined,
  realm: DOMRealm,
): DOMRectReadOnly | null {
  if (!bounds) {
    return null;
  }

  if (bounds === BOUNDS_VIEWPORT) {
    return new realm.window.DOMRectReadOnly(
      0,
      0,
      realm.window.innerWidth,
      realm.window.innerHeight,
    );
  }

  if (typeof bounds === 'function') {
    return bounds();
  }

  return bounds.getBoundingClientRect();
}

/** Clamps a delta so `rect` translated by it stays within `bounds`. */
export function clampDelta(
  delta: Point,
  rect: DOMRectReadOnly,
  bounds: DOMRectReadOnly,
): Point {
  const minX = bounds.left - rect.left;
  const maxX = bounds.right - rect.right;
  const minY = bounds.top - rect.top;
  const maxY = bounds.bottom - rect.bottom;

  return {
    x: Math.min(Math.max(delta.x, minX), maxX),
    y: Math.min(Math.max(delta.y, minY), maxY),
  };
}

/** Constrains a delta to the permitted axis. */
export function constrainAxis(delta: Point, axis: DragAxis): Point {
  if (axis === AXIS_X) {
    return { x: delta.x, y: 0 };
  }

  if (axis === AXIS_Y) {
    return { x: 0, y: delta.y };
  }

  return delta;
}
