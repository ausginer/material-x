/**
 * Pure free-motion calculation. Derives the canonical `viewportDelta` from a
 * pointer position, and the reported {@link DragGeometry} from committed state.
 * Reads no DOM, no callbacks, no mutable options.
 */
import type {
  CoordinateMapper,
  DragAxis,
  DragGeometry,
  Point,
} from '../kernel/types.ts';
import { clampDelta, constrainAxis } from './bounds.ts';

/**
 * Pointer-derived motion: raw delta constrained to the configured axis and, when
 * present, clamped so the origin rect translated by it stays within `bounds`.
 */
export function pointerDelta(
  pointer: Point,
  originPointer: Point,
  originRect: DOMRectReadOnly,
  axis: DragAxis,
  bounds: DOMRectReadOnly | null,
): Point {
  const raw = constrainAxis(
    { x: pointer.x - originPointer.x, y: pointer.y - originPointer.y },
    axis,
  );

  return bounds ? clampDelta(raw, originRect, bounds) : raw;
}

/** The visual's current rect, derived arithmetically (no layout read). */
export function currentRect(
  originRect: DOMRectReadOnly,
  viewportDelta: Point,
): DOMRectReadOnly {
  return new DOMRectReadOnly(
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
): DragGeometry {
  return {
    pointer,
    originPointer,
    viewportDelta,
    localDelta: mapper.deltaFromViewport(viewportDelta),
    originRect,
    currentRect: currentRect(originRect, viewportDelta),
  };
}
