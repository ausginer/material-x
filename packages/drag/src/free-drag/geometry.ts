/**
 * Free drag's pure geometry, derived from numbers the operation already holds:
 * nothing here reads the DOM.
 */
import { delta, localDelta, type Space } from '@ydinjs/box-quad';
import type {
  DragGeometry,
  FreeDragRequest,
  FreeDragSubject,
} from './domain.ts';

/** From the owning realm, so an iframe's consumer gets that document's rect. */
function currentRect(
  originRect: DOMRectReadOnly,
  dx: number,
  dy: number,
  view: Window & typeof globalThis,
): DOMRectReadOnly {
  return new view.DOMRectReadOnly(
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

/** `dx`/`dy` are the rendered delta, axis-projected and clamped. */
export function buildGeometry(
  pointerX: number,
  pointerY: number,
  originX: number,
  originY: number,
  dx: number,
  dy: number,
  originRect: DOMRectReadOnly,
  space: Space,
  view: Window & typeof globalThis,
): DragGeometry {
  const local = toLocal(space, dx, dy);

  return {
    pointerX,
    pointerY,
    originPointerX: originX,
    originPointerY: originY,
    viewportDeltaX: dx,
    viewportDeltaY: dy,
    localDeltaX: local[0]!,
    localDeltaY: local[1]!,
    originRect,
    currentRect: currentRect(originRect, dx, dy, view),
  };
}

/** The release snapshot `onDrop` is asked about. */
export function buildRequest(
  subject: FreeDragSubject,
  pointerX: number,
  pointerY: number,
  dx: number,
  dy: number,
  originRect: DOMRectReadOnly,
  space: Space,
  view: Window & typeof globalThis,
): FreeDragRequest {
  const visualRect = currentRect(originRect, dx, dy, view);
  const local = toLocal(space, dx, dy);

  return {
    item: subject.item,
    visual: subject.visual,
    pointerX,
    pointerY,
    positionX: visualRect.left,
    positionY: visualRect.top,
    viewportDeltaX: dx,
    viewportDeltaY: dy,
    localDeltaX: local[0]!,
    localDeltaY: local[1]!,
    visualRect,
  };
}
