/**
 * Shared pointer wiring. Forwards browser input into a session's transition
 * mechanism without holding any state-specific drag logic.
 *
 * A press starts on the item/container (`attachStartListener`), but once a
 * session is armed the remaining events are tracked on the document
 * (`attachSessionListeners`): before pointer capture is acquired a mouse can
 * leave the element, so item-scoped move/up listeners would lose the gesture,
 * and Escape only reaches an unfocused drag through the document.
 */
import type { DragSessionEvent } from './fsm.ts';

// Pointer events
export const POINTER_DOWN = 'pointerdown';
export const POINTER_MOVE = 'pointermove';
export const POINTER_UP = 'pointerup';
export const POINTER_CANCEL = 'pointercancel';
export const LOST_POINTER_CAPTURE = 'lostpointercapture';

const TOUCH_ACTION = 'touch-action';

/** The pointer event types tracked for the duration of a session. */
const SESSION_POINTER_EVENTS = [
  POINTER_MOVE,
  POINTER_UP,
  POINTER_CANCEL,
  LOST_POINTER_CAPTURE,
] as const;

/** Attaches the `pointerdown` that arms a session. */
export function attachStartListener(
  target: HTMLElement,
  signal: AbortSignal,
  onDown: (event: PointerEvent) => void,
): void {
  target.addEventListener(POINTER_DOWN, onDown, { signal });
}

/**
 * Attaches the per-session listeners on `doc`: pointer tracking plus an Escape
 * handler. All are removed when `signal` aborts (i.e. when the session ends).
 */
export function attachSessionListeners(
  doc: Document,
  signal: AbortSignal,
  transit: (event: DragSessionEvent) => void,
): void {
  const onPointer = (event: PointerEvent): void => {
    transit(event);
  };

  for (const type of SESSION_POINTER_EVENTS) {
    doc.addEventListener(type, onPointer, { signal });
  }

  doc.addEventListener(
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
 * Applies a `touch-action` to an element and returns a restore function that
 * puts back the previous inline value.
 */
export function applyTouchAction(
  element: HTMLElement,
  value: string,
): () => void {
  const previous = element.style.getPropertyValue(TOUCH_ACTION);
  const priority = element.style.getPropertyPriority(TOUCH_ACTION);
  element.style.setProperty(TOUCH_ACTION, value);

  return () => {
    if (previous) {
      element.style.setProperty(TOUCH_ACTION, previous, priority);
    } else {
      element.style.removeProperty(TOUCH_ACTION);
    }
  };
}
