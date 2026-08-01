/**
 * Pointer input plumbing. Forwards browser input for the appropriate lifetime
 * and holds no behavior policy: primary-button, handle and phase checks live in
 * the behavior's `admit`.
 *
 * A press starts on `root`; once an operation is admitted the remaining events
 * are tracked on the document, because before pointer capture is acquired a
 * pointer can leave the element, and Escape only reaches an unfocused drag
 * through the document.
 */
import type { Disposer } from './lifetimes.ts';
import {
  KEY_DOWN,
  KEY_ESCAPE,
  LOST_POINTER_CAPTURE,
  POINTER_CANCEL,
  POINTER_MOVE,
  POINTER_UP,
} from './protocol.ts';
import type { DOMRealm } from './realm.ts';

const SESSION_POINTER_EVENTS = [
  POINTER_MOVE,
  POINTER_UP,
  POINTER_CANCEL,
  LOST_POINTER_CAPTURE,
] as const;

/**
 * Arms one operation's document-level input across two independent lifetimes.
 *
 * Motion rides `motionSignal` and is closed at release. Escape rides
 * `cancelSignal` and outlives it, so a consumer can still abandon a gesture
 * whose resolver has not settled. Sharing one signal would make that
 * impossible.
 */
export function armOperationInput(
  realm: DOMRealm,
  motionSignal: AbortSignal,
  cancelSignal: AbortSignal,
  onPointer: (event: PointerEvent) => void,
  onEscape: () => void,
): void {
  for (const type of SESSION_POINTER_EVENTS) {
    realm.document.addEventListener(type, onPointer, { signal: motionSignal });
  }

  realm.document.addEventListener(
    KEY_DOWN,
    (event: KeyboardEvent) => {
      if (event.key === KEY_ESCAPE) {
        onEscape();
      }
    },
    { signal: cancelSignal },
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
 * Acquires pointer capture and returns its guarded release.
 *
 * **A capture failure is an activation failure**, not a silently degraded drag
 * (contract D-17), so `setPointerCapture` is allowed to throw here and the
 * caller classifies it. That is the one behavioural difference from the shipped
 * package, which swallowed the throw and fell back to document listeners.
 *
 * The release is guarded because releasing capture for a pointer that no longer
 * exists throws `NotFoundError`, and by then the operation is already over.
 */
export function acquirePointerCapture(
  element: HTMLElement,
  pointerId: number,
): Disposer {
  element.setPointerCapture(pointerId);

  let held = true;

  return () => {
    if (!held) {
      return;
    }

    held = false;

    try {
      element.releasePointerCapture(pointerId);
    } catch {
      // Already released, or the pointer is gone.
    }
  };
}
