/**
 * Free dragging entry point. An element can be lifted, moved through
 * two-dimensional space, and dropped at an arbitrary position. No destination
 * element is required; the consumer owns the persisted position.
 *
 * @example
 * ```ts
 * import { draggable } from '@ydinjs/drag/draggable';
 *
 * const drag = draggable(element, {
 *   axis: 'both',
 *   async onDrop(request) {
 *     const position = snapToGrid(request.localPosition);
 *     await savePosition(position);
 *     return { accepted: true, position };
 *   },
 * });
 * ```
 */
import {
  clampDelta,
  constrainAxis,
  resolveBounds,
} from './draggable/bounds.ts';
import type {
  DraggableOptions,
  DropOutcome,
  FreeDragController,
} from './draggable/options.ts';
import { animateTranslate, type LandingAnimation } from './kernel/animation.ts';
import { IDENTITY_MAPPER } from './kernel/coordinate.ts';
import { DEFAULT_THRESHOLD, DEFAULT_TIMING } from './kernel/defaults.ts';
import {
  AWAITING_COMMIT,
  DRAGGING,
  IDLE,
  PENDING,
  SETTLING,
  type DragSessionEvent,
  type DragSessionState,
} from './kernel/fsm.ts';
import {
  enterTopLayer,
  exitTopLayer,
  restoreStyles,
  snapshotStyles,
  type SavedStyles,
} from './kernel/lift.ts';
import {
  applyTouchAction,
  attachSessionListeners,
  attachStartListener,
  isPrimaryPress,
} from './kernel/pointer.ts';
import { createSession, type Session } from './kernel/session.ts';
import {
  ORIGIN,
  type CoordinateMapper,
  type DragGeometry,
  type FreeDropRequest,
  type Point,
} from './kernel/types.ts';

export type {
  DragBounds,
  DraggableOptions,
  DragUpdate,
  DropOutcome,
  FreeDragController,
} from './draggable/options.ts';
export type {
  AnimationTiming,
  CoordinateMapper,
  DragAxis,
  DragController,
  DragGeometry,
  FreeDropRequest,
  FreeDropResult,
  Point,
} from './kernel/types.ts';

/** The subset of settle results the free-drag entry animates towards. */
type SettleTarget = 'accepted' | 'rejected' | 'canceled';

export function draggable(
  item: HTMLElement,
  options: DraggableOptions = {},
): FreeDragController {
  // A mutable copy so `update()` can revise runtime-read options live. The
  // activation threshold is captured once by the session config below, so
  // changing it after construction has no effect.
  const opts: DraggableOptions = { ...options };
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;

  const visual = opts.getVisual?.(item) ?? item;
  const listeners = new AbortController();

  const mapper = (): CoordinateMapper =>
    opts.coordinateSpace ?? IDENTITY_MAPPER;

  // The touch-action policy is installed for the controller's lifetime: the
  // browser decides gesture behaviour when the press begins, so it must be in
  // place before `pointerdown`, not after activation.
  let restoreTouch: (() => void) | null = null;

  if (opts.touchAction) {
    const target =
      typeof opts.handle === 'function' ? opts.handle(item) : opts.handle;
    restoreTouch = applyTouchAction(target ?? item, opts.touchAction);
  }

  // Per-session mutable context, live between activation and cleanup.
  let originPointer: Point = ORIGIN;
  let originRect: DOMRectReadOnly = new DOMRectReadOnly();
  let delta: Point = ORIGIN;
  let latestPointer: Point = ORIGIN;
  let savedStyles: SavedStyles = new Map();
  let activated = false;
  let pointerId = -1;
  let landing: LandingAnimation | null = null;
  let cancelReason: unknown = 'canceled';
  // Once destroyed, no effect or async continuation may touch the DOM again.
  let destroyed = false;
  // Scroll/resize listeners, attached only while a drag is live.
  let dragScope: AbortController | null = null;
  // Document-level pointer/Escape listeners, live only while a session is armed.
  let sessionScope: AbortController | null = null;
  // The state machine and its re-entrant transit wrapper, created synchronously
  // below (definite-assignment) before any effect can run.
  let session!: Session;
  let transit: (event: DragSessionEvent) => void;

  // The visual is a fixed-size box translated by `delta` from its origin rect,
  // so its current rect is derived arithmetically — reading it back would force
  // a layout on every pointer move.
  const currentRect = (): DOMRectReadOnly =>
    new DOMRectReadOnly(
      originRect.x + delta.x,
      originRect.y + delta.y,
      originRect.width,
      originRect.height,
    );

  const geometry = (): DragGeometry => ({
    pointer: latestPointer,
    originPointer,
    viewportDelta: delta,
    localDelta: mapper().deltaFromViewport(delta),
    originRect,
    currentRect: currentRect(),
  });

  const applyTransform = (): void => {
    visual.style.transform = `translate(${delta.x}px, ${delta.y}px)`;
  };

  const updateDelta = (pointer: Point): void => {
    latestPointer = pointer;
    let next = constrainAxis(
      { x: pointer.x - originPointer.x, y: pointer.y - originPointer.y },
      opts.axis ?? 'both',
    );

    const bounds = resolveBounds(opts.bounds);

    if (bounds) {
      next = clampDelta(next, originRect, bounds);
    }

    delta = next;
  };

  // Scroll or resize moves the bounds and the item's flow position in viewport
  // space without a pointermove; re-clamp against the latest pointer so a bounded
  // drag stays correct and the reported geometry keeps up.
  const invalidate = (): void => {
    if (activated) {
      updateDelta(latestPointer);
      applyTransform();
      opts.onMove?.(geometry());
    }
  };

  /** Aborts the document-level session listeners, if any are attached. */
  const endSession = (): void => {
    sessionScope?.abort();
    sessionScope = null;
  };

  const activate = (pointer: Point): void => {
    activated = true;
    originRect = visual.getBoundingClientRect();

    savedStyles = snapshotStyles(visual);
    enterTopLayer(visual, originRect);
    item.setPointerCapture(pointerId);
    updateDelta(pointer);
    applyTransform();

    // `capture` catches scrolls from descendant scrollers (scroll does not
    // bubble); both are torn down when the drag settles.
    dragScope = new AbortController();
    addEventListener('scroll', invalidate, {
      capture: true,
      passive: true,
      signal: dragScope.signal,
    });
    addEventListener('resize', invalidate, {
      passive: true,
      signal: dragScope.signal,
    });

    opts.onStart?.(geometry());
  };

  const cleanup = (): void => {
    dragScope?.abort();
    dragScope = null;

    if (pointerId !== -1 && item.hasPointerCapture(pointerId)) {
      item.releasePointerCapture(pointerId);
    }

    exitTopLayer(visual);
    restoreStyles(visual, savedStyles);
    activated = false;
    landing = null;
  };

  /** Reports a recoverable error without letting a bad handler mask cleanup. */
  const safeError = (error: unknown): void => {
    try {
      opts.onError?.(error);
    } catch (handlerError) {
      reportError(handlerError);
    }
  };

  /** Rolls a failed session back to a safe idle so a later drag can start. */
  const failSession = (error: unknown): void => {
    safeError(error);

    if (activated) {
      cleanup();
    }

    session.reset();
    endSession();
  };

  const dropRequest = (): FreeDropRequest => {
    const visualRect = visual.getBoundingClientRect();
    const viewportPosition: Point = { x: visualRect.left, y: visualRect.top };

    return {
      item,
      visual,
      pointer: latestPointer,
      viewportPosition,
      localPosition: mapper().fromViewport(viewportPosition),
      viewportDelta: delta,
      localDelta: mapper().deltaFromViewport(delta),
      visualRect,
    };
  };

  const proposeDrop = (): void => {
    const request = dropRequest();
    let outcome: DropOutcome;

    try {
      outcome = opts.onDrop?.(request);
    } catch (error) {
      safeError(error);
      transit({ type: 'drop-rejected' });
      return;
    }

    Promise.resolve(outcome ?? { accepted: true })
      .then((result) => {
        if (destroyed) {
          return;
        }

        if (result.accepted && result.position) {
          // Adjusted landing target: map the consumer position back to a
          // viewport delta relative to the origin rect.
          const viewport = mapper().toViewport(result.position);
          delta = {
            x: viewport.x - originRect.left,
            y: viewport.y - originRect.top,
          };
        }

        transit(
          result.accepted
            ? { type: 'drop-accepted' }
            : { type: 'drop-rejected' },
        );
      })
      .catch((error: unknown) => {
        safeError(error);
        transit({ type: 'drop-rejected' });
      });
  };

  const beginSettling = (result: SettleTarget): void => {
    const target = result === 'accepted' ? delta : ORIGIN;

    if (result === 'canceled') {
      opts.onCancel?.(cancelReason);
    }

    const timing = opts.landingTiming?.() ?? DEFAULT_TIMING;
    landing = animateTranslate(visual, delta, target, timing);
    landing.done.then(
      () => transit({ type: 'animation-finished' }),
      () => transit({ type: 'animation-finished' }),
    );
  };

  const runEffects = (
    previous: DragSessionState,
    next: DragSessionState,
    event: DragSessionEvent,
  ): void => {
    if (previous.type === PENDING && next.type === DRAGGING) {
      activate(next.latest);
      return;
    }

    if (
      previous.type === DRAGGING &&
      next.type === DRAGGING &&
      event instanceof PointerEvent &&
      event.type === 'pointermove'
    ) {
      updateDelta(next.latest);
      applyTransform();
      opts.onMove?.(geometry());
      return;
    }

    if (previous.type === DRAGGING && next.type === AWAITING_COMMIT) {
      proposeDrop();
      return;
    }

    if (next.type === SETTLING && previous.type !== SETTLING) {
      beginSettling(next.result);
      return;
    }

    if (previous.type === SETTLING && next.type === IDLE) {
      const accepted = previous.result === 'accepted';
      cleanup();
      opts.onFinish?.(accepted);
    }
  };

  // Effects run behind a destroyed guard and an exception boundary: a throw
  // (from a lift, an animation, or a consumer callback) rolls the session back
  // rather than stranding an open popover, capture, or temporary styles.
  const applyEffects = (
    previous: DragSessionState,
    next: DragSessionState,
    event: DragSessionEvent,
  ): void => {
    if (destroyed) {
      return;
    }

    try {
      runEffects(previous, next, event);
    } catch (error) {
      failSession(error);
    }
  };

  session = createSession({ threshold }, applyEffects);

  // Every transit goes through here so the document-level listeners are torn
  // down the moment the machine settles back to idle.
  transit = (event: DragSessionEvent): void => {
    session.transit(event);

    if (session.state().type === IDLE) {
      endSession();
    }
  };

  attachStartListener(item, listeners.signal, (event) => {
    if (session.state().type !== IDLE || !isPrimaryPress(event)) {
      return;
    }

    const handle =
      typeof opts.handle === 'function' ? opts.handle(item) : opts.handle;

    if (handle && !event.composedPath().includes(handle)) {
      return;
    }

    ({ pointerId } = event);
    originPointer = { x: event.clientX, y: event.clientY };
    cancelReason = 'canceled';

    // Track the rest of the gesture on the document so a mouse leaving the item
    // before capture is acquired cannot lose it, and Escape reaches an unfocused
    // drag. Torn down by `transit` once the machine returns to idle.
    sessionScope = new AbortController();
    attachSessionListeners(item.ownerDocument, sessionScope.signal, transit);

    transit(event);
  });

  return {
    update(next) {
      const { position, ...rest } = next;
      Object.assign(opts, rest);

      // A controlled position retargets the live visual to a consumer
      // coordinate; ignored while idle, where the consumer owns the element's
      // resting position directly. It does not retarget an in-flight landing.
      if (position && activated) {
        const viewport = mapper().toViewport(position);
        delta = {
          x: viewport.x - originRect.left,
          y: viewport.y - originRect.top,
        };
        applyTransform();
        opts.onMove?.(geometry());
      }
    },

    async cancel(reason) {
      if (session.state().type !== IDLE) {
        cancelReason = reason ?? 'canceled';
        transit({ type: 'escape' });
        await landing?.done;
      }
    },

    destroy() {
      if (destroyed) {
        return;
      }

      destroyed = true;
      landing?.cancel();
      // Advances the machine; effects are inert now that `destroyed` is set.
      session.transit({ type: 'destroy' });

      if (activated) {
        cleanup();
      }

      restoreTouch?.();
      endSession();
      listeners.abort();
    },
  };
}
