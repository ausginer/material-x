/**
 * Spatial collection reordering entry point. Items in a container are treated as
 * a field of rectangles, so vertical lists, horizontal rows, wrapping layouts,
 * and grids are all handled through one geometry model. The engine proposes a
 * reorder and observes the consumer's commit; it never mutates the collection
 * itself.
 *
 * @example
 * ```ts
 * import { sortable } from '@ydinjs/drag/sortable';
 *
 * const grid = sortable(container, {
 *   items: () => currentItems,
 *   onReorder(request) {
 *     updateApplicationOrder(request);
 *   },
 * });
 * ```
 */
import { animateTranslate, type LandingAnimation } from './kernel/animation.ts';
import { createCommitTracker } from './kernel/commit.ts';
import { viewportMatrix } from './kernel/coordinate.ts';
import { DEFAULT_THRESHOLD, DEFAULT_TIMING } from './kernel/defaults.ts';
import {
  AWAITING_COMMIT,
  DRAGGING,
  IDLE,
  PENDING,
  SETTLING,
  type DragSessionEvent,
  type DragSessionState,
  type SettleResult,
} from './kernel/fsm.ts';
import {
  anchorIndex,
  center,
  follows,
  measure,
  neighbor,
  nearestItem,
} from './kernel/geometry.ts';
import {
  enterTopLayerMatrix,
  exitTopLayer,
  restoreStyles,
  snapshotStyles,
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
import { ORIGIN, type Point, type ReorderRequest } from './kernel/types.ts';
import { createAnchor } from './sortable/anchor.ts';
import type {
  ReorderFinish,
  ReorderOutcome,
  SortableController,
  SortableOptions,
} from './sortable/options.ts';
import { resolveItem } from './sortable/resolve.ts';

export type {
  PlaceholderContext,
  ReorderFinish,
  ReorderOutcome,
  SortableController,
  SortableOptions,
} from './sortable/options.ts';
export type {
  AnimationTiming,
  CoordinateMapper,
  DragController,
  Insertion,
  MoveResult,
  Point,
  ReorderRequest,
  ReorderResult,
} from './kernel/types.ts';

export function sortable(
  container: HTMLElement,
  options: SortableOptions,
): SortableController {
  const {
    getVisual = (element) => element,
    threshold = DEFAULT_THRESHOLD,
    landingTiming = () => DEFAULT_TIMING,
  } = options;

  const listeners = new AbortController();
  let items: readonly HTMLElement[] = options.items();

  const getItems = (): readonly HTMLElement[] => items;

  // The touch-action policy is installed on the container for the controller's
  // lifetime: it must be in place before `pointerdown` for the browser to
  // suppress native panning when a drag starts on any child.
  const restoreTouch: (() => void) | null = options.touchAction
    ? applyTouchAction(container, options.touchAction)
    : null;

  // Per-session mutable context, live between activation and cleanup.
  let dragged: HTMLElement | null = null;
  let visual: HTMLElement | null = null;
  let anchor: HTMLElement | null = null;
  let tracker: ReturnType<typeof createCommitTracker> | null = null;
  let start: Point = ORIGIN;
  let originRect: DOMRectReadOnly = new DOMRectReadOnly();
  let delta: Point = ORIGIN;
  let fromIndex = -1;
  let toIndex = -1;
  let pointerId = -1;
  let frame = -1;
  let rects: ReadonlyMap<HTMLElement, DOMRect> = new Map();
  let rectsDirty = false;
  let savedStyles: SavedStyles = new Map();
  // The dragged visual's captured full local→viewport matrix (zoom included),
  // re-applied in the top layer so the faithful lift reproduces its exact
  // appearance; the drag translation is composed with it.
  let liftBase = '';
  let landing: LandingAnimation | null = null;
  let cancelReason: unknown = 'canceled';
  // Whether the consumer's DOM commit was observed for the current accepted
  // drop, as opposed to the commit wait timing out. Distinguishes the `onFinish`
  // outcome; reset when a session arms.
  let commitObserved = false;
  // Bumped when a new gesture arms. An async reorder decision (and its commit
  // watch) captures the value at dispatch and no-ops if it changed, so a stale
  // `onReorder` from a cancelled gesture can never settle a later one.
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
  // Forward-declared so the rAF reposition guard can roll a failed session back.
  let failSession!: (error: unknown) => void;

  const currentPointer = (): Point => ({
    x: start.x + delta.x,
    y: start.y + delta.y,
  });

  /** Aborts the document-level session listeners, if any are attached. */
  const endSession = (): void => {
    sessionScope?.abort();
    sessionScope = null;
  };

  /** Moves the anchor to the item slot nearest the pointer. */
  const reposition = (pointer: Point): void => {
    frame = -1;

    if (!dragged || !anchor) {
      return;
    }

    if (rectsDirty) {
      rects = measure(items, dragged, getVisual);
      rectsDirty = false;
    }

    const anchorCentre = center(anchor.getBoundingClientRect());
    const nearest = nearestItem(items, dragged, rects, anchorCentre, pointer);

    if (!nearest) {
      return;
    }

    if (follows(anchor, nearest)) {
      nearest.after(anchor);
    } else {
      nearest.before(anchor);
    }

    toIndex = anchorIndex(items, dragged, anchor);
    rects = measure(items, dragged, getVisual);
  };

  const scheduleReposition = (pointer: Point): void => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      // The rAF reposition runs outside the transition boundary, so a throw from
      // measurement, `getVisual`, or a DOM move needs its own guard to roll the
      // session back rather than strand a lifted, captured item.
      try {
        reposition(pointer);
      } catch (error) {
        failSession(error);
      }
    });
  };

  const flush = (): void => {
    if (frame !== -1) {
      cancelAnimationFrame(frame);
      reposition(currentPointer());
    }
  };

  const invalidate = (): void => {
    if (dragged) {
      rectsDirty = true;
      scheduleReposition(currentPointer());
    }
  };

  const activate = (): void => {
    const current = dragged;

    if (!current) {
      return;
    }

    visual = getVisual(current);
    originRect = visual.getBoundingClientRect();
    // Capture the full faithful lift matrix (zoom included) while the visual is
    // still in flow.
    liftBase = viewportMatrix(visual).toString();

    fromIndex = items.indexOf(current);
    toIndex = fromIndex;

    // Snapshot before building the placeholder: a throwing `createPlaceholder`
    // must roll back from a real snapshot, not an empty one that would strip the
    // visual's authored inline styles.
    savedStyles = snapshotStyles(visual);

    anchor = createAnchor(options, current, visual, originRect);
    current.before(anchor);

    enterTopLayerMatrix(visual);
    capturePointer(container, pointerId);

    tracker = createCommitTracker(getItems, current);
    rects = measure(items, current, getVisual);
    options.onStart?.(current);

    // `capture` catches scrolls from descendant scrollers (scroll does not
    // bubble); per-drag so they never accumulate across gestures.
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
  };

  // The lifted tile has net zoom 1 and is positioned in viewport space, so a
  // viewport delta translates it directly.
  const toTranslate = (viewport: Point): Point => viewport;

  const applyTransform = (): void => {
    if (visual) {
      // Prepend the drag translation to the faithful lift matrix so the tile
      // keeps its exact appearance and tracks the pointer.
      const move = toTranslate(delta);
      const translate = `translate(${move.x}px, ${move.y}px)`;
      visual.style.transform = liftBase
        ? `${translate} ${liftBase}`
        : translate;
    }
  };

  const cleanup = (): void => {
    // Abandon any commit wait still pending (e.g. a cancelled gesture) so its
    // timeout can't fire into a torn-down session.
    tracker?.release();

    dragScope?.abort();
    dragScope = null;

    if (pointerId !== -1 && container.hasPointerCapture(pointerId)) {
      container.releasePointerCapture(pointerId);
    }

    anchor?.remove();

    if (visual) {
      exitTopLayer(visual);
      restoreStyles(visual, savedStyles);
    }

    cancelAnimationFrame(frame);
    frame = -1;
    dragged = null;
    visual = null;
    anchor = null;
    tracker = null;
    landing = null;
  };

  /** Reports a recoverable error without letting a bad handler mask cleanup. */
  const safeError = (error: unknown): void => {
    try {
      options.onError?.(error);
    } catch (handlerError) {
      reportError(handlerError);
    }
  };

  /** Rolls a failed session back to a safe idle so a later drag can start. */
  failSession = (error: unknown): void => {
    safeError(error);

    if (dragged) {
      cleanup();
    }

    session.reset();
    endSession();
  };

  const reorderRequest = (): ReorderRequest | null => {
    if (!dragged || !anchor) {
      return null;
    }

    const after = neighbor(items, dragged, anchor, true);
    const before = neighbor(items, dragged, anchor, false);

    return { item: dragged, from: fromIndex, to: toIndex, before, after };
  };

  const proposeReorder = (): void => {
    flush();
    tracker?.capture(anchor!);

    // A no-op drop proposes nothing; only a real move is announced.
    if (toIndex === fromIndex) {
      transit({ type: 'drop-rejected' });
      return;
    }

    const request = reorderRequest();

    if (!request) {
      transit({ type: 'drop-rejected' });
      return;
    }

    // Snapshot the gesture identity: a decision that resolves after this gesture
    // was cancelled and another started must not settle the new one.
    const g = generation;
    let outcome: ReorderOutcome;

    try {
      outcome = options.onReorder?.(request);
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

        if (!result.accepted) {
          transit({ type: 'drop-rejected' });
          return;
        }

        // Accepted: hold the visual until the consumer's DOM commit is observed
        // (or the wait times out), so teardown never reveals a half-committed
        // collection. The tracker feeds that observation back through the FSM as
        // a `commit-observed` transition — the same path a committed and a
        // timed-out reorder both settle through.
        if (!tracker) {
          transit({ type: 'commit-observed' });
          return;
        }

        tracker.watch((observed) => {
          if (destroyed || g !== generation) {
            return;
          }

          commitObserved = observed;
          transit({ type: 'commit-observed' });
        });
      })
      .catch((error: unknown) => {
        if (destroyed || g !== generation) {
          return;
        }

        safeError(error);
        transit({ type: 'drop-rejected' });
      });
  };

  /** Maps a settle result to the outcome reported to `onFinish`. */
  const finishOutcome = (result: SettleResult): ReorderFinish => {
    if (result === 'accepted') {
      return commitObserved ? 'committed' : 'accepted';
    }

    return result === 'rejected' ? 'rejected' : 'canceled';
  };

  const beginSettling = (result: SettleResult): void => {
    if (!visual || !anchor) {
      transit({ type: 'animation-finished' });
      return;
    }

    const current = dragged;

    if (result === 'canceled') {
      options.onCancel?.(current!, cancelReason);

      // `onCancel` may have destroyed the controller; cleanup has then run, so
      // do not start a new landing animation on the torn-down visual.
      if (destroyed) {
        return;
      }
    }

    // A rollback returns the anchor to the dragged item's original DOM slot
    // (the item never moved in the DOM, only lifted), so the landing aims at the
    // live home position wherever scrolling or sibling shifts left it — not the
    // stale grab-time origin. An accepted drop keeps the anchor at its landing
    // slot, whose commit was already observed before this state.
    if (result !== 'accepted' && current) {
      current.before(anchor);
    }

    const rect = anchor.getBoundingClientRect();
    const target: Point = {
      x: rect.left - originRect.left,
      y: rect.top - originRect.top,
    };

    // Animate in the lift's own (zoom-divided) translate space so the landing
    // tracks the pointer just as live movement does.
    landing = animateTranslate(
      visual,
      toTranslate(delta),
      toTranslate(target),
      landingTiming(),
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
      activate();
      delta = {
        x: next.latest.x - start.x,
        y: next.latest.y - start.y,
      };
      applyTransform();
      scheduleReposition(currentPointer());
      return;
    }

    if (
      previous.type === DRAGGING &&
      next.type === DRAGGING &&
      event instanceof PointerEvent &&
      event.type === 'pointermove'
    ) {
      delta = { x: next.latest.x - start.x, y: next.latest.y - start.y };
      applyTransform();
      scheduleReposition(currentPointer());
      return;
    }

    if (previous.type === DRAGGING && next.type === AWAITING_COMMIT) {
      // Flush the release position: the `pointerup` that ended the drag may sit
      // apart from the last `pointermove`, and the insertion (which `flush()`
      // inside `proposeReorder` computes from the current pointer) must use it.
      if (event instanceof PointerEvent) {
        delta = { x: event.clientX - start.x, y: event.clientY - start.y };
        applyTransform();
      }

      proposeReorder();
      return;
    }

    if (next.type === SETTLING && previous.type !== SETTLING) {
      beginSettling(next.result);
      return;
    }

    if (previous.type === SETTLING && next.type === IDLE) {
      const outcome = finishOutcome(previous.result);
      const finished = dragged;
      cleanup();

      if (finished) {
        options.onFinish?.(finished, outcome);
      }
    }
  };

  // Effects run behind a destroyed guard and an exception boundary: a throw
  // (from a lift, an animation, or a consumer callback) rolls the session back
  // rather than stranding an open popover, capture, anchor, or temporary styles.
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

  attachStartListener(container, listeners.signal, (event) => {
    if (session.state().type !== IDLE || !isPrimaryPress(event)) {
      return;
    }

    const resolved = resolveItem(event, items, options);

    if (!resolved) {
      return;
    }

    dragged = resolved;
    ({ pointerId } = event);
    start = { x: event.clientX, y: event.clientY };
    cancelReason = 'canceled';
    commitObserved = false;
    generation += 1;

    // Track the rest of the gesture on the document so a mouse leaving the item
    // before capture is acquired cannot lose it, and Escape reaches an unfocused
    // drag. Torn down by `transit` once the machine returns to idle.
    sessionScope = new AbortController();
    attachSessionListeners(
      container.ownerDocument,
      sessionScope.signal,
      transit,
    );

    transit(event);
  });

  return {
    updateItems(next) {
      items = next;
      // A landing waiting on the consumer's commit may settle on this change.
      tracker?.notify();

      // New or relaid-out items invalidate cached geometry; remeasure on the
      // next frame so hit testing sees them.
      if (dragged) {
        rectsDirty = true;
        scheduleReposition(currentPointer());
      }
    },

    async move(item, destination) {
      const list = items;
      const from = list.indexOf(item);

      if (from === -1) {
        return { accepted: false };
      }

      const to = destination.after
        ? list.indexOf(destination.after)
        : list.length;
      const request: ReorderRequest = {
        item,
        from,
        to,
        before: destination.before,
        after: destination.after,
      };

      const outcome = options.onReorder?.(request);
      const result = await Promise.resolve(outcome ?? { accepted: true });
      return { accepted: result.accepted };
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
      tracker?.release();
      // Advances the machine; effects are inert now that `destroyed` is set.
      session.transit({ type: 'destroy' });

      if (dragged) {
        cleanup();
      }

      restoreTouch?.();
      endSession();
      listeners.abort();
    },
  };
}
