/**
 * Decides whether one press may arm free dragging. Pure: it attaches no
 * listeners and mutates no gesture state.
 */
import { isPrimaryPress } from '../kernel/pointer.ts';
import type { PointerSample } from '../kernel/protocol.ts';

export type DraggablePress = PointerSample &
  Readonly<{
    item: HTMLElement;
  }>;

/**
 * Resolves an admitted press, or `null` when the press is non-primary or misses
 * the required handle. `handle` is the already-resolved handle for this press.
 */
export function resolveDraggablePress(
  event: PointerEvent,
  item: HTMLElement,
  handle: HTMLElement | null,
): DraggablePress | null {
  if (!isPrimaryPress(event)) {
    return null;
  }

  if (handle && !event.composedPath().includes(handle)) {
    return null;
  }

  return {
    item,
    pointerId: event.pointerId,
    point: { x: event.clientX, y: event.clientY },
  };
}
