/**
 * Constructs the public free-drop release snapshot. Pure: the visual's release
 * rect is derived arithmetically from the activation origin rect and committed
 * motion, so no layout read is needed and the request is reproducible.
 */
import type {
  CoordinateMapper,
  FreeDropRequest,
  Point,
} from '../kernel/types.ts';
import { currentRect } from './motion.ts';
import type { FreeDropProposal } from './options.ts';

export function buildFreeDropProposal(
  item: HTMLElement,
  visual: HTMLElement,
  pointer: Point,
  viewportDelta: Point,
  originRect: DOMRectReadOnly,
  coordinateSpace: CoordinateMapper,
): FreeDropProposal {
  const visualRect = currentRect(originRect, viewportDelta);
  const viewportPosition: Point = { x: visualRect.left, y: visualRect.top };

  const request: FreeDropRequest = {
    item,
    visual,
    pointer,
    viewportPosition,
    localPosition: coordinateSpace.fromViewport(viewportPosition),
    viewportDelta,
    localDelta: coordinateSpace.deltaFromViewport(viewportDelta),
    visualRect,
  };

  return { request, coordinateSpace };
}
