/**
 * Shared pointer wiring. Forwards browser input into a session's transition
 * mechanism without holding any state-specific drag logic.
 */
import type { DragSessionEvent } from './fsm.ts';

/** The pointer event types every session listens to. */
const POINTER_EVENTS = [
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
  'lostpointercapture',
] as const;

/**
 * Attaches the shared pointer listeners plus an Escape handler to `target`, each
 * forwarding into `transit`. All listeners are removed when `signal` aborts.
 */
export function attachPointerListeners(
  target: HTMLElement,
  signal: AbortSignal,
  transit: (event: DragSessionEvent) => void,
): void {
  const onPointer = (event: PointerEvent): void => {
    transit(event);
  };

  for (const type of POINTER_EVENTS) {
    target.addEventListener(type, onPointer, { signal });
  }

  target.addEventListener(
    'keydown',
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        transit({ type: 'escape' });
      }
    },
    { signal },
  );
}

/**
 * Whether `event` is a primary press eligible to start a drag: left button /
 * first touch only.
 */
export function isPrimaryPress(event: PointerEvent): boolean {
  return event.button === 0 && event.isPrimary;
}

/**
 * Resolves the tracked element and, if present, its handle from a pointer
 * event's composed path. Returns `null` when the press did not land on a tracked
 * item, or landed on an item that requires a handle but missed it.
 *
 * @param path - `event.composedPath()`.
 * @param isItem - Whether a node is one of the tracked draggable items.
 * @param requiresHandle - Whether the resolved item gates activation on a handle.
 * @param isHandle - Whether a node is an activation handle.
 */
export function resolveTarget(
  path: readonly EventTarget[],
  isItem: (node: EventTarget) => boolean,
  requiresHandle: (item: HTMLElement) => boolean,
  isHandle: (node: EventTarget) => boolean,
): HTMLElement | null {
  const itemIndex = path.findIndex(isItem);

  if (itemIndex === -1) {
    return null;
  }

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const item = path[itemIndex] as HTMLElement;

  if (requiresHandle(item)) {
    const onHandle = path.slice(0, itemIndex).some(isHandle);

    if (!onHandle) {
      return null;
    }
  }

  return item;
}

/**
 * Applies a `touch-action` to an element and returns a restore function that
 * puts back the previous inline value.
 */
export function applyTouchAction(
  element: HTMLElement,
  value: string,
): () => void {
  const previous = element.style.getPropertyValue('touch-action');
  const priority = element.style.getPropertyPriority('touch-action');
  element.style.setProperty('touch-action', value);

  return () => {
    if (previous) {
      element.style.setProperty('touch-action', previous, priority);
    } else {
      element.style.removeProperty('touch-action');
    }
  };
}
