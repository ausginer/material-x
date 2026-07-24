/**
 * Pure free-motion calculation. Derives the canonical motion delta from a
 * committed frame, and the reported {@link DragGeometry} from committed state.
 * Reads no DOM, no callbacks, no mutable options.
 */
import type { DOMRealm } from '../kernel/realm.ts';
import {
  AXIS_X,
  AXIS_Y,
  type CoordinateMapper,
  type DragAxis,
  type DragGeometry,
  type Point,
} from '../kernel/types.ts';
import type { DragStateFrame } from './runtime/frames.ts';

/**
 * Writes the axis-constrained, bounds-clamped delta into the frame's scalars.
 *
 * This is the sole implementation of movement geometry. It works in loose
 * numbers and mutates the target frame in place, so the per-pointer-move hot
 * path allocates nothing — which is why it is not composed from smaller
 * point-returning helpers.
 *
 * `frame` must be a draft under preparation, never the committed frame.
 */
export function applyMotionDelta(
  frame: DragStateFrame,
  axis: DragAxis,
  bounds: DOMRectReadOnly | null,
): void {
  let dx = axis === AXIS_Y ? 0 : frame.pointerX - frame.originX;
  let dy = axis === AXIS_X ? 0 : frame.pointerY - frame.originY;
  const rect = frame.originRect;

  if (bounds && rect) {
    // The lower clamp is applied first, so a bounds box smaller than the item
    // pins deterministically to the far edge instead of producing NaN.
    dx = Math.min(
      Math.max(dx, bounds.left - rect.left),
      bounds.right - rect.right,
    );
    dy = Math.min(
      Math.max(dy, bounds.top - rect.top),
      bounds.bottom - rect.bottom,
    );
  }

  frame.deltaX = dx;
  frame.deltaY = dy;
}

/**
 * The visual's current rect, derived arithmetically (no layout read).
 *
 * The constructor comes from the owning {@link DOMRealm} rather than the ambient
 * global, so a controller created inside an iframe hands its consumer a rect
 * belonging to that document's realm.
 */
export function currentRect(
  originRect: DOMRectReadOnly,
  viewportDelta: Point,
  realm: DOMRealm,
): DOMRectReadOnly {
  return new realm.window.DOMRectReadOnly(
    originRect.x + viewportDelta.x,
    originRect.y + viewportDelta.y,
    originRect.width,
    originRect.height,
  );
}

/** The geometry reported to `onStart`/`onMove`, derived from committed state. */
export function geometryOf(
  pointer: Point,
  originPointer: Point,
  viewportDelta: Point,
  originRect: DOMRectReadOnly,
  mapper: CoordinateMapper,
  realm: DOMRealm,
): DragGeometry {
  return {
    pointer,
    originPointer,
    viewportDelta,
    localDelta: mapper.deltaFromViewport(viewportDelta),
    originRect,
    currentRect: currentRect(originRect, viewportDelta, realm),
  };
}
