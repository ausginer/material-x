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
  attachPointerListeners,
  isPrimaryPress,
} from './kernel/pointer.ts';
import { createSession } from './kernel/session.ts';
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

  // Per-session mutable context, live between activation and cleanup.
  let originPointer: Point = ORIGIN;
  let originRect: DOMRectReadOnly = new DOMRectReadOnly();
  let delta: Point = ORIGIN;
  let latestPointer: Point = ORIGIN;
  let savedStyles: SavedStyles = new Map();
  let activated = false;
  let pointerId = -1;
  let restoreTouch: (() => void) | null = null;
  let landing: LandingAnimation | null = null;
  // Scroll/resize listeners, attached only while a drag is live.
  let dragScope: AbortController | null = null;

  const geometry = (): DragGeometry => ({
    pointer: latestPointer,
    originPointer,
    viewportDelta: delta,
    localDelta: mapper().deltaFromViewport(delta),
    originRect,
    currentRect: visual.getBoundingClientRect(),
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

  const activate = (pointer: Point): void => {
    activated = true;
    originRect = visual.getBoundingClientRect();

    if (opts.touchAction) {
      const handle =
        typeof opts.handle === 'function'
          ? opts.handle(item)
          : (opts.handle ?? item);
      restoreTouch = handle ? applyTouchAction(handle, opts.touchAction) : null;
    }

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
    exitTopLayer(visual);
    restoreStyles(visual, savedStyles);
    restoreTouch?.();
    restoreTouch = null;
    activated = false;
    landing = null;
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

  // Assigned once the session exists so effects can drive it re-entrantly.
  let transit: (event: DragSessionEvent) => void;

  const proposeDrop = (): void => {
    const request = dropRequest();
    let outcome: DropOutcome;

    try {
      outcome = opts.onDrop?.(request);
    } catch (error) {
      opts.onError?.(error);
      transit({ type: 'drop-rejected' });
      return;
    }

    Promise.resolve(outcome ?? { accepted: true })
      .then((result) => {
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
        opts.onError?.(error);
        transit({ type: 'drop-rejected' });
      });
  };

  const beginSettling = (result: SettleTarget): void => {
    const target = result === 'accepted' ? delta : ORIGIN;

    if (result === 'canceled') {
      opts.onCancel?.('canceled');
    }

    const timing = opts.landingTiming?.() ?? DEFAULT_TIMING;
    landing = animateTranslate(visual, delta, target, timing);
    landing.done.then(
      () => transit({ type: 'animation-finished' }),
      () => transit({ type: 'animation-finished' }),
    );
  };

  const applyEffects = (
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

  const session = createSession({ threshold }, applyEffects);
  ({ transit } = session);

  attachPointerListeners(item, listeners.signal, (event) => {
    if (
      event instanceof PointerEvent &&
      event.type === 'pointerdown' &&
      session.state().type === IDLE
    ) {
      if (!isPrimaryPress(event)) {
        return;
      }

      const handle =
        typeof opts.handle === 'function' ? opts.handle(item) : opts.handle;

      if (handle && !event.composedPath().includes(handle)) {
        return;
      }

      ({ pointerId } = event);
      originPointer = { x: event.clientX, y: event.clientY };
    }

    session.transit(event);
  });

  return {
    update(next) {
      const { position, ...rest } = next;
      Object.assign(opts, rest);

      // A controlled position retargets the live visual (or, adjusted during an
      // async drop, the landing) to a consumer coordinate; ignored while idle,
      // where the consumer owns the element's resting position directly.
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

    async cancel() {
      if (session.state().type !== IDLE) {
        session.transit({ type: 'escape' });
        await landing?.done;
      }
    },

    destroy() {
      landing?.cancel();
      session.transit({ type: 'destroy' });

      if (activated) {
        cleanup();
      }

      listeners.abort();
    },
  };
}
