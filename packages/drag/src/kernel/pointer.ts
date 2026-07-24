/**
 * Pointer input plumbing. Forwards browser input for the appropriate lifetime
 * and holds no feature policy: primary-button, handle, and phase checks live in
 * feature admission.
 *
 * A press starts on the item/container; once a gesture is armed the remaining
 * events are tracked on the document, because before pointer capture is acquired
 * a pointer can leave the element, and Escape only reaches an unfocused drag
 * through the document.
 */
import {
  CANCEL_ESCAPE,
  KEY_DOWN,
  KEY_ESCAPE,
  LOST_POINTER_CAPTURE,
  POINTER_CANCEL,
  POINTER_DOWN,
  POINTER_MOVE,
  POINTER_UP,
} from './protocol.ts';
import type { DOMRealm } from './realm.ts';
import type { Disposer } from './resource-scope.ts';

const SESSION_POINTER_EVENTS = [
  POINTER_MOVE,
  POINTER_UP,
  POINTER_CANCEL,
  LOST_POINTER_CAPTURE,
] as const;

/** An internal Escape signal, emitted alongside raw pointer events. */
export type EscapeSignal = Readonly<{ type: typeof CANCEL_ESCAPE }>;

export type PointerSource = Readonly<{
  /** Arms document-level move/up/cancel/lostcapture and Escape for one gesture. */
  armSession(
    signal: AbortSignal,
    emit: (event: PointerEvent | EscapeSignal) => void,
  ): void;
}>;

/** Attaches the controller-lifetime `pointerdown` and returns the session arm. */
export function createPointerSource(
  target: HTMLElement,
  realm: DOMRealm,
  controllerSignal: AbortSignal,
  onDown: (event: PointerEvent) => void,
): PointerSource {
  target.addEventListener(POINTER_DOWN, onDown as EventListener, {
    signal: controllerSignal,
  });

  return {
    armSession(signal, emit) {
      const onPointer = (event: Event): void => {
        emit(event as PointerEvent);
      };

      for (const type of SESSION_POINTER_EVENTS) {
        realm.document.addEventListener(type, onPointer, { signal });
      }

      realm.document.addEventListener(
        KEY_DOWN,
        (event: Event) => {
          if ((event as KeyboardEvent).key === KEY_ESCAPE) {
            emit({ type: CANCEL_ESCAPE });
          }
        },
        { signal },
      );
    },
  };
}

/**
 * Arms one operation's document-level input across two independent lifetimes.
 *
 * Motion (move/up/cancel/lostpointercapture) rides `motionSignal` and is closed
 * at release. Escape rides `cancelSignal` and outlives it, so a consumer can
 * still abandon a gesture whose resolver has not settled. Sharing one signal
 * would make that impossible.
 */
export function armOperationInput(
  realm: DOMRealm,
  motionSignal: AbortSignal,
  cancelSignal: AbortSignal,
  onPointer: (event: PointerEvent) => void,
  onEscape: () => void,
): void {
  const forward = (event: Event): void => {
    onPointer(event as PointerEvent);
  };

  for (const type of SESSION_POINTER_EVENTS) {
    realm.document.addEventListener(type, forward, { signal: motionSignal });
  }

  realm.document.addEventListener(
    KEY_DOWN,
    (event: Event) => {
      if ((event as KeyboardEvent).key === KEY_ESCAPE) {
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
 * Pairs best-effort pointer capture with a safe release. Capture only keeps a
 * pointer that wanders off the bound element; the gesture is tracked on the
 * document regardless, so capture is never essential and its failure is benign.
 */
export function acquirePointerCapture(
  element: HTMLElement,
  pointerId: number,
): Disposer {
  let held = false;

  try {
    element.setPointerCapture(pointerId);
    held = true;
  } catch {
    // Non-fatal: fall back to the document-level session listeners.
  }

  return () => {
    if (held) {
      held = false;

      try {
        element.releasePointerCapture(pointerId);
      } catch {
        // Already released or pointer gone.
      }
    }
  };
}
