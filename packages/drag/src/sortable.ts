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
import { ORIGIN, type Point, type ReorderRequest } from './kernel/types.ts';
import { createAnchor } from './sortable/anchor.ts';
import type {
  ReorderOutcome,
  SortableController,
  SortableOptions,
} from './sortable/options.ts';
import { resolveItem } from './sortable/resolve.ts';

export type {
  PlaceholderContext,
  ReorderOutcome,
  SortableController,
  SortableOptions,
} from './sortable/options.ts';

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
  let restoreTouch: (() => void) | null = null;
  let landing: LandingAnimation | null = null;

  // Assigned once the session exists so effects can drive it re-entrantly.
  let transit: (event: DragSessionEvent) => void;

  const currentPointer = (): Point => ({
    x: start.x + delta.x,
    y: start.y + delta.y,
  });

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
      reposition(pointer);
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
    fromIndex = items.indexOf(current);
    toIndex = fromIndex;

    anchor = createAnchor(options, current, visual, originRect);
    current.before(anchor);

    savedStyles = snapshotStyles(visual);
    enterTopLayer(visual, originRect);
    container.setPointerCapture(pointerId);

    if (options.touchAction) {
      restoreTouch = applyTouchAction(current, options.touchAction);
    }

    tracker = createCommitTracker(getItems, current);
    rects = measure(items, current, getVisual);
    options.onStart?.(current);

    addEventListener('scroll', invalidate, {
      capture: true,
      passive: true,
      signal: listeners.signal,
    });
    addEventListener('resize', invalidate, {
      passive: true,
      signal: listeners.signal,
    });
  };

  const applyTransform = (): void => {
    if (visual) {
      visual.style.transform = `translate(${delta.x}px, ${delta.y}px)`;
    }
  };

  const cleanup = (): void => {
    anchor?.remove();

    if (visual) {
      exitTopLayer(visual);
      restoreStyles(visual, savedStyles);
    }

    restoreTouch?.();
    restoreTouch = null;
    cancelAnimationFrame(frame);
    frame = -1;
    dragged = null;
    visual = null;
    anchor = null;
    tracker = null;
    landing = null;
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

    let outcome: ReorderOutcome;

    try {
      outcome = options.onReorder?.(request);
    } catch (error) {
      options.onError?.(error);
      transit({ type: 'drop-rejected' });
      return;
    }

    Promise.resolve(outcome ?? { accepted: true })
      .then((result) => {
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

  const beginSettling = (result: SettleResult): void => {
    if (!visual || !anchor) {
      transit({ type: 'animation-finished' });
      return;
    }

    const current = dragged;

    if (result === 'canceled') {
      options.onCancel?.(current!, 'canceled');
    }

    // Accepted: land on the anchor's slot. Otherwise return home.
    const target: Point =
      result === 'accepted'
        ? (() => {
            const rect = anchor.getBoundingClientRect();
            return {
              x: rect.left - originRect.left,
              y: rect.top - originRect.top,
            };
          })()
        : ORIGIN;

    landing = animateTranslate(visual, delta, target, landingTiming());
    landing.done
      .then(async () => {
        // Wait for the consumer's reorder to land the item at `to`, so teardown
        // never reveals it in the wrong slot for a frame.
        if (result === 'accepted') {
          await tracker?.wait();
        }
      })
      .then(
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
      proposeReorder();
      return;
    }

    if (next.type === SETTLING && previous.type !== SETTLING) {
      beginSettling(next.result);
      return;
    }

    if (previous.type === SETTLING && next.type === IDLE) {
      const accepted = previous.result === 'accepted';
      const finished = dragged;
      cleanup();

      if (finished) {
        options.onFinish?.(finished, accepted);
      }
    }
  };

  const session = createSession({ threshold }, applyEffects);
  ({ transit } = session);

  attachPointerListeners(container, listeners.signal, (event) => {
    if (
      event instanceof PointerEvent &&
      event.type === 'pointerdown' &&
      session.state().type === IDLE
    ) {
      if (!isPrimaryPress(event)) {
        return;
      }

      const resolved = resolveItem(event, items, options);

      if (!resolved) {
        return;
      }

      dragged = resolved;
      ({ pointerId } = event);
      start = { x: event.clientX, y: event.clientY };
    }

    session.transit(event);
  });

  return {
    updateItems(next) {
      items = next;
      // A landing waiting on the consumer's commit may settle on this change.
      tracker?.notify();
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

    async cancel() {
      if (session.state().type !== IDLE) {
        session.transit({ type: 'escape' });
        await landing?.done;
      }
    },

    destroy() {
      landing?.cancel();
      tracker?.release();
      session.transit({ type: 'destroy' });

      if (dragged) {
        cleanup();
      }

      listeners.abort();
    },
  };
}
