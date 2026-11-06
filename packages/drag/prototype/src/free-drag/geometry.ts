/**
 * Free drag's pure geometry, derived from numbers the operation already holds:
 * nothing here reads the DOM.
 */
import type { InheritedSpace } from '../draggable.ts';
import type {
  DragGeometry,
  FreeDragRequest,
  FreeDragSubject,
} from './domain.ts';

/** From the owning realm, so an iframe's consumer gets that document's rect. */
export function currentRect(
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

/** `dx`/`dy` are the rendered delta, axis-projected and clamped. */
export function buildGeometry(
  pointerX: number,
  pointerY: number,
  originX: number,
  originY: number,
  dx: number,
  dy: number,
  originRect: DOMRectReadOnly,
  space: InheritedSpace,
  view: Window & typeof globalThis,
): DragGeometry {
  let localDeltaX = dx;
  let localDeltaY = dy;

  if (space) {
    localDeltaX = space.a * dx + space.c * dy;
    localDeltaY = space.b * dx + space.d * dy;
  }

  return {
    pointerX,
    pointerY,
    originPointerX: originX,
    originPointerY: originY,
    viewportDeltaX: dx,
    viewportDeltaY: dy,
    localDeltaX,
    localDeltaY,
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
  space: InheritedSpace,
  view: Window & typeof globalThis,
): FreeDragRequest {
  const visualRect = currentRect(originRect, dx, dy, view);

  let localDeltaX = dx;
  let localDeltaY = dy;

  if (space) {
    localDeltaX = space.a * dx + space.c * dy;
    localDeltaY = space.b * dx + space.d * dy;
  }

  return {
    item: subject.item,
    visual: subject.visual,
    pointerX,
    pointerY,
    positionX: visualRect.left,
    positionY: visualRect.top,
    viewportDeltaX: dx,
    viewportDeltaY: dy,
    localDeltaX,
    localDeltaY,
    visualRect,
  };
}
