/**
 * Free drag's pure geometry, derived from numbers the operation already holds:
 * nothing here reads the DOM.
 */
import { delta, localDelta, type Space } from '@ydinjs/box-quad';
import type { LiftedDrag } from '../draggable.ts';
import type { DragGeometry, FreeDragRequest, Point } from './domain.ts';

/** From the owning window, so an iframe's consumer gets that document's rect. */
function currentRect(
  originRect: DOMRectReadOnly,
  dx: number,
  dy: number,
  window: Window & typeof globalThis,
): DOMRectReadOnly {
  return new window.DOMRectReadOnly(
    originRect.x + dx,
    originRect.y + dy,
    originRect.width,
    originRect.height,
  );
}

/** A singular ancestor renders nothing, so the viewport delta stands in for it. */
function toLocal(space: Space, dx: number, dy: number): Float64Array {
  const local = delta();

  if (!localDelta(space, dx, dy, local)) {
    local[0] = dx;
    local[1] = dy;
  }

  return local;
}

/** `motion` is the rendered delta, axis-projected and clamped. */
export function buildGeometry(
  drag: LiftedDrag<unknown>,
  motion: Point,
  window: Window & typeof globalThis,
): DragGeometry {
  const { x: dx, y: dy } = motion;
  const local = toLocal(drag.visualSpace, dx, dy);

  return {
    pointerX: drag.x,
    pointerY: drag.y,
    originPointerX: drag.originX,
    originPointerY: drag.originY,
    viewportDeltaX: dx,
    viewportDeltaY: dy,
    localDeltaX: local[0]!,
    localDeltaY: local[1]!,
    originRect: drag.rect,
    currentRect: currentRect(drag.rect, dx, dy, window),
  };
}

/**
 * The release snapshot `onDrop` is asked about. Its deltas are the offset from
 * `home`, the visual's top-left at home in the viewport, to its top-left at the
 * drop, so a scroll that moved the home during the drag is in them.
 */
export function buildRequest(
  item: HTMLElement,
  drag: LiftedDrag<unknown>,
  motion: Point,
  home: Point,
  window: Window & typeof globalThis,
): FreeDragRequest {
  const visualRect = currentRect(drag.rect, motion.x, motion.y, window);
  const dx = visualRect.left - home.x;
  const dy = visualRect.top - home.y;
  const local = toLocal(drag.visualSpace, dx, dy);

  return {
    item,
    visual: drag.visual,
    pointerX: drag.x,
    pointerY: drag.y,
    positionX: visualRect.left,
    positionY: visualRect.top,
    viewportDeltaX: dx,
    viewportDeltaY: dy,
    localDeltaX: local[0]!,
    localDeltaY: local[1]!,
    visualRect,
  };
}
