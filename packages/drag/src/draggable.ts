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
import { animateTranslate, type LandingAnimation } from './kernel/animation.ts';
import { IDENTITY_MAPPER } from './kernel/coordinate.ts';
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
  type AnimationTiming,
  type CoordinateMapper,
  type DragAxis,
  type DragController,
  type DragGeometry,
  type FreeDropRequest,
  type FreeDropResult,
  type Point,
} from './kernel/types.ts';

/** A source of drag bounds, expressed in viewport space. */
export type DragBounds =
  | 'viewport'
  | HTMLElement
  | (() => DOMRectReadOnly | null);

/** The result an `onDrop` callback may produce (or nothing, meaning accept). */
export type DropOutcome = FreeDropResult | Promise<FreeDropResult> | undefined;

export type DraggableOptions = Readonly<{
  /** Element (or resolver) that must be pressed to start the drag. */
  handle?: HTMLElement | ((item: HTMLElement) => HTMLElement | null);
  /** The element actually lifted; defaults to the item itself. */
  getVisual?(item: HTMLElement): HTMLElement;
  /** Which axes movement is allowed on. Defaults to `'both'`. */
  axis?: DragAxis;
  /** Optional movement bounds, in viewport space. */
  bounds?: DragBounds;
  /** Maps viewport space to the consumer's coordinate space. */
  coordinateSpace?: CoordinateMapper;
  /** `touch-action` applied to the handle/item for the gesture. */
  touchAction?: string;
  /** Activation travel, in viewport pixels. Defaults to 8. */
  threshold?: number;
  /** Landing animation timing, read at drop time. */
  landingTiming?(): AnimationTiming;
  onStart?(geometry: DragGeometry): void;
  onMove?(geometry: DragGeometry): void;
  onDrop?(request: FreeDropRequest): DropOutcome;
  onCancel?(reason: unknown): void;
  onFinish?(accepted: boolean): void;
  onError?(error: unknown): void;
}>;

const DEFAULT_THRESHOLD = 8;
const DEFAULT_TIMING: AnimationTiming = { duration: 200, easing: 'ease' };

/** Resolves a bounds source to a viewport rect, or `null` for unbounded. */
function resolveBounds(bounds: DragBounds | undefined): DOMRectReadOnly | null {
  if (!bounds) {
    return null;
  }

  if (bounds === 'viewport') {
    return new DOMRectReadOnly(0, 0, innerWidth, innerHeight);
  }

  if (typeof bounds === 'function') {
    return bounds();
  }

  return bounds.getBoundingClientRect();
}

/** Clamps a delta so `rect` translated by it stays within `bounds`. */
function clampDelta(
  delta: Point,
  rect: DOMRectReadOnly,
  bounds: DOMRectReadOnly,
): Point {
  const minX = bounds.left - rect.left;
  const maxX = bounds.right - rect.right;
  const minY = bounds.top - rect.top;
  const maxY = bounds.bottom - rect.bottom;

  return {
    x: Math.min(Math.max(delta.x, minX), maxX),
    y: Math.min(Math.max(delta.y, minY), maxY),
  };
}

/** Constrains a delta to the permitted axis. */
function constrainAxis(delta: Point, axis: DragAxis): Point {
  if (axis === 'x') {
    return { x: delta.x, y: 0 };
  }

  if (axis === 'y') {
    return { x: 0, y: delta.y };
  }

  return delta;
}

export function draggable(
  item: HTMLElement,
  options: DraggableOptions = {},
): DragController {
  const {
    getVisual = (element) => element,
    axis = 'both',
    coordinateSpace = IDENTITY_MAPPER,
    threshold = DEFAULT_THRESHOLD,
    landingTiming = () => DEFAULT_TIMING,
  } = options;

  const visual = getVisual(item);
  const listeners = new AbortController();

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

  const geometry = (): DragGeometry => ({
    pointer: latestPointer,
    originPointer,
    viewportDelta: delta,
    localDelta: coordinateSpace.deltaFromViewport(delta),
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
      axis,
    );

    const bounds = resolveBounds(options.bounds);

    if (bounds) {
      next = clampDelta(next, originRect, bounds);
    }

    delta = next;
  };

  const activate = (pointer: Point): void => {
    activated = true;
    originRect = visual.getBoundingClientRect();

    if (options.touchAction) {
      const handle =
        typeof options.handle === 'function'
          ? options.handle(item)
          : (options.handle ?? item);
      restoreTouch = handle
        ? applyTouchAction(handle, options.touchAction)
        : null;
    }

    savedStyles = snapshotStyles(visual);
    enterTopLayer(visual, originRect);
    item.setPointerCapture(pointerId);
    updateDelta(pointer);
    applyTransform();
    options.onStart?.(geometry());
  };

  const cleanup = (): void => {
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
      localPosition: coordinateSpace.fromViewport(viewportPosition),
      viewportDelta: delta,
      localDelta: coordinateSpace.deltaFromViewport(delta),
      visualRect,
    };
  };

  // Assigned once the session exists so effects can drive it re-entrantly.
  let transit: (event: DragSessionEvent) => void;

  const proposeDrop = (): void => {
    const request = dropRequest();
    let outcome: DropOutcome;

    try {
      outcome = options.onDrop?.(request);
    } catch (error) {
      options.onError?.(error);
      transit({ type: 'drop-rejected' });
      return;
    }

    Promise.resolve(outcome ?? { accepted: true })
      .then((result) => {
        if (result.accepted && result.position) {
          // Adjusted landing target: map the consumer position back to a
          // viewport delta relative to the origin rect.
          const viewport = coordinateSpace.toViewport(result.position);
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
        options.onError?.(error);
        transit({ type: 'drop-rejected' });
      });
  };

  const beginSettling = (result: SettleTarget): void => {
    const target = result === 'accepted' ? delta : ORIGIN;

    if (result === 'canceled') {
      options.onCancel?.('canceled');
    }

    landing = animateTranslate(visual, delta, target, landingTiming());
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
      options.onMove?.(geometry());
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
      options.onFinish?.(accepted);
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
        typeof options.handle === 'function'
          ? options.handle(item)
          : options.handle;

      if (handle && !event.composedPath().includes(handle)) {
        return;
      }

      ({ pointerId } = event);
      originPointer = { x: event.clientX, y: event.clientY };
    }

    session.transit(event);
  });

  return {
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

/** The subset of settle results the free-drag entry animates towards. */
type SettleTarget = 'accepted' | 'rejected' | 'canceled';
