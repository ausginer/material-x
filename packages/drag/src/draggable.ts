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
import {
  createMapper,
  IDENTITY_MAPPER,
  viewportMatrix,
} from './kernel/coordinate.ts';
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
  enterTopLayerFlat,
  enterTopLayerMatrix,
  exitTopLayer,
  restoreStyles,
  snapshotStyles,
  suppressTransitions,
  type SavedStyles,
} from './kernel/lift.ts';
import {
  applyTouchAction,
  attachSessionListeners,
  attachStartListener,
  capturePointer,
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

  // The coordinate mapper for the current session: a consumer-supplied mapper
  // wins; otherwise one is derived at grab time from the item's layout context
  // (below), falling back to identity before any drag.
  let sessionMapper: CoordinateMapper | null = null;

  const mapper = (): CoordinateMapper =>
    opts.coordinateSpace ?? sessionMapper ?? IDENTITY_MAPPER;

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
  // The transform the drag translation is composed with, captured at grab: for
  // the faithful lift the full local→viewport matrix (zoom included); for an
  // in-place drag the visual's own authored transform; empty for a flat lift.
  let liftBase = '';
  // Document scroll offset at grab, so a rollback can aim at the item's live
  // home slot rather than the stale grab-time viewport position.
  let grabScroll: Point = ORIGIN;
  let activated = false;
  let pointerId = -1;
  let landing: LandingAnimation | null = null;
  let cancelReason: unknown = 'canceled';
  // Bumped when a new gesture arms. An async drop decision captures the value at
  // dispatch and no-ops if it changed, so a stale `onDrop` from a cancelled
  // gesture can never settle a later one.
  let generation = 0;
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
  // Forward-declared so the scroll/resize guard (defined above the settling
  // machinery) can roll a failed session back.
  let failSession!: (error: unknown) => void;

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

  // Maps a viewport delta into the space the transform's translate acts in. In
  // the top layer that is viewport space; dragging in place, the translate acts
  // inside the (possibly transformed) container, so the viewport delta is mapped
  // to a local delta that renders as the same viewport movement — keeping the
  // pointer anchored under a scaled or rotated container.
  const toTranslate = (viewport: Point): Point => {
    if (opts.lift === 'none') {
      // In place: the translate acts in the container's transformed space.
      return mapper().deltaFromViewport(viewport);
    }

    // Top layer (faithful or flat): the lifted element has net zoom 1 and is
    // positioned in viewport space, so a viewport delta translates it directly.
    return viewport;
  };

  // The drag translation is prepended to the visual's authored transform so the
  // authored rotate/scale/skew still renders about the visual's own box.
  const composedTransform = (): string => {
    const move = toTranslate(delta);
    const translate = `translate(${move.x}px, ${move.y}px)`;
    return liftBase ? `${translate} ${liftBase}` : translate;
  };

  const applyTransform = (): void => {
    visual.style.transform = composedTransform();
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
    if (!activated) {
      return;
    }

    // Runs outside the transition boundary (scroll/resize), so it needs its own
    // exception guard: a throw from bounds resolution or `onMove` must roll the
    // session back, not strand a lifted, captured visual.
    try {
      updateDelta(latestPointer);
      applyTransform();
      opts.onMove?.(geometry());
    } catch (error) {
      failSession(error);
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
    grabScroll = { x: scrollX, y: scrollY };

    // Capture the transform context while the item is still in flow: the top
    // layer will make the visual `position: fixed`, which severs `offsetParent`.
    // A consumer-supplied `coordinateSpace` overrides this derived mapper.
    const context = item.offsetParent;
    sessionMapper = createMapper(
      context instanceof HTMLElement ? context : document.documentElement,
    );

    const lift = opts.lift ?? 'top-layer';

    if (lift === 'top-layer') {
      // Faithful lift: re-apply the element's full local→viewport matrix (zoom
      // included) in the top layer so its exact appearance — own and ancestor
      // `zoom`/`transform` — survives undistorted. The lift neutralizes the
      // element's net zoom to 1 so the matrix is the sole source of scale,
      // consistently across browsers (see `enterTopLayerMatrix`).
      liftBase = viewportMatrix(visual).toString();
      savedStyles = snapshotStyles(visual);
      enterTopLayerMatrix(visual);
    } else {
      // Flatten and in-place lifts ride only the visual's own transform (empty
      // for flatten, which renders axis-aligned).
      const own = getComputedStyle(visual).transform;
      liftBase = lift === 'flatten' || own === 'none' ? '' : own;
      savedStyles = snapshotStyles(visual);

      if (lift === 'flatten') {
        enterTopLayerFlat(visual, originRect);
      } else {
        // `lift === 'none'` stays in the container and only rides the transform;
        // still suppress transitions so engine transform writes apply instantly.
        suppressTransitions(visual);
      }
    }

    capturePointer(item, pointerId);
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
  failSession = (error: unknown): void => {
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
    // Snapshot the gesture identity: a decision that resolves after this gesture
    // was cancelled and another started must not settle the new one.
    const g = generation;
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
        if (destroyed || g !== generation) {
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
        if (destroyed || g !== generation) {
          return;
        }

        safeError(error);
        transit({ type: 'drop-rejected' });
      });
  };

  const beginSettling = (result: SettleTarget): void => {
    // A rollback aims at the item's live home slot. A lifted visual is pinned at
    // the grab-time viewport rect, so document scroll since grab shifts its home
    // by the negative scroll delta; an in-place visual rides the flow, so its
    // home is simply the origin. Accepted drops keep the pointer delta.
    const home: Point =
      opts.lift === 'none'
        ? ORIGIN
        : { x: grabScroll.x - scrollX, y: grabScroll.y - scrollY };
    const target = result === 'accepted' ? delta : home;

    if (result === 'canceled') {
      opts.onCancel?.(cancelReason);
    }

    const timing = opts.landingTiming?.() ?? DEFAULT_TIMING;

    // A consumer callback above (or the timing getter) may have destroyed the
    // controller; cleanup has then already run, so do not start a new animation.
    if (destroyed) {
      return;
    }

    // Animate in the transform's own space so an in-place landing tracks the
    // container just as live movement does.
    landing = animateTranslate(
      visual,
      toTranslate(delta),
      toTranslate(target),
      timing,
      liftBase,
    );
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
      // Flush the release position: the `pointerup` that ended the drag may sit
      // apart from the last `pointermove`, and the drop geometry must reflect it.
      if (event instanceof PointerEvent) {
        updateDelta({ x: event.clientX, y: event.clientY });
        applyTransform();
      }

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
    generation += 1;

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
