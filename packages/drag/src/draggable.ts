/**
 * Free dragging entry point. An element can be lifted, moved through
 * two-dimensional space, and dropped at an arbitrary position. No destination
 * element is required; the consumer owns the persisted position through the
 * required, explicit `onDrop` resolution.
 *
 * The public function owns only controller-lifetime composition: it creates the
 * config, session, pointer source, and identity source; resolves admitted
 * presses into one `FreeDragGesture`; connects protocol dispatch to that
 * gesture's effect router; and forwards `update`, `cancel`, and `destroy`.
 *
 * @example
 * ```ts
 * import { draggable } from '@ydinjs/drag/draggable';
 *
 * const drag = draggable(element, {
 *   axis: 'both',
 *   async onDrop(request, { signal }) {
 *     const position = snapToGrid(request.localPosition);
 *     await savePosition(position, { signal });
 *     return { type: 'accepted' };
 *   },
 * });
 * ```
 */
import { resolveDraggablePress } from './draggable/admission.ts';
import { resolveBounds } from './draggable/bounds.ts';
import { FreeDragGesture } from './draggable/gesture.ts';
import type {
  DragUpdate,
  DraggableOptions,
  FreeDragController,
} from './draggable/options.ts';
import {
  createDraggableReducer,
  INITIAL_DRAGGABLE_STATE,
  type DraggableEvent,
  type DraggableState,
} from './draggable/reducer.ts';
import { createInvalidationSource } from './kernel/invalidation.ts';
import { createIdentitySource } from './kernel/operation-id.ts';
import { createPointerSource, type EscapeSignal } from './kernel/pointer.ts';
import { createRealm } from './kernel/realm.ts';
import { createSession, type DragSession } from './kernel/session.ts';

export type {
  DragBounds,
  DraggableOptions,
  DragUpdate,
  FreeDragController,
  FreeDropProposal,
  FreeDropResolution,
  FreeDropResult,
  FreeDragFinishResult,
  FreeDragCancelResult,
  FreeHomeTarget,
  OnDrop,
  ResolveFreeHomeTarget,
} from './draggable/options.ts';
export type {
  AnimationTiming,
  CoordinateMapper,
  DragAxis,
  DragGeometry,
  FreeDropRequest,
  Point,
} from './kernel/types.ts';

const DEFAULT_THRESHOLD = 8;

export function draggable(
  item: HTMLElement,
  options: DraggableOptions,
): FreeDragController {
  if (typeof options?.onDrop !== 'function') {
    throw new TypeError('draggable: `onDrop` is required.');
  }

  // A mutable copy so `update()` may revise live options. Threshold and the
  // presence of a home target are captured once for the reducer config.
  const opts: { -readonly [K in keyof DraggableOptions]: DraggableOptions[K] } =
    {
      ...options,
    };
  const realm = createRealm(item);
  const visual = opts.getVisual?.(item) ?? item;
  const ids = createIdentitySource();
  const invalidation = createInvalidationSource(realm);
  const controllerAbort = new AbortController();

  const reduce = createDraggableReducer(
    {
      threshold: options.threshold ?? DEFAULT_THRESHOLD,
      hasHomeTarget: typeof options.resolveHomeTarget === 'function',
    },
    ids,
  );

  let gesture: FreeDragGesture | null = null;
  let terminal = false;
  let session: DragSession<DraggableState, DraggableEvent>;

  const currentBounds = (): DOMRectReadOnly | null =>
    resolveBounds(opts.bounds, realm);

  function emit(raw: PointerEvent | EscapeSignal): void {
    if ('type' in raw && raw.type === 'escape') {
      session.dispatch({ type: 'cancel', reason: { type: 'escape' } });
      return;
    }

    const event = raw as PointerEvent;
    const point = { x: event.clientX, y: event.clientY };

    switch (event.type) {
      case 'pointermove':
        session.dispatch({
          type: 'move',
          pointerId: event.pointerId,
          point,
          bounds: currentBounds(),
        });
        break;
      case 'pointerup':
        session.dispatch({
          type: 'release',
          pointerId: event.pointerId,
          point,
          bounds: currentBounds(),
        });
        break;
      case 'pointercancel':
        if (session.state().pointer?.id === event.pointerId) {
          session.dispatch({
            type: 'cancel',
            reason: { type: 'pointer-canceled' },
          });
        }
        break;
      // `lostpointercapture` is benign: the gesture is tracked on the document.
      default:
        break;
    }
  }

  const pointerSource = createPointerSource(
    item,
    realm,
    controllerAbort.signal,
    (event) => {
      if (terminal || session.state().phase !== 'idle') {
        return;
      }

      const handle =
        typeof opts.handle === 'function'
          ? opts.handle(item)
          : (opts.handle ?? null);
      const press = resolveDraggablePress(event, item, handle ?? null);

      if (!press) {
        return;
      }

      session.dispatch({
        type: 'admit',
        operationId: ids.next(),
        item,
        pointerId: press.pointerId,
        point: press.point,
      });
    },
  );

  session = createSession<DraggableState, DraggableEvent>(
    INITIAL_DRAGGABLE_STATE,
    reduce,
    (from, to, event) => {
      if (from.phase === 'idle' && to.phase === 'pending') {
        gesture = new FreeDragGesture({
          realm,
          ids,
          options: opts,
          item,
          visual,
          invalidation,
          dispatch: session.dispatch,
          currentBounds,
        });
        pointerSource.armSession(gesture.scope.signal, emit);
      }

      gesture?.handle(from, to, event);

      if (to.phase === 'idle' && from.phase !== 'idle') {
        gesture = null;
      }
    },
  );

  return {
    update(next: DragUpdate) {
      if (next.axis !== undefined || next.coordinateSpace !== undefined) {
        if (next.axis !== undefined) {
          opts.axis = next.axis;
        }
        if (next.coordinateSpace !== undefined) {
          opts.coordinateSpace = next.coordinateSpace;
        }
        session.dispatch({
          type: 'set-policy',
          axis: next.axis,
          coordinateOverride: next.coordinateSpace,
        });
      }

      if (next.bounds !== undefined) {
        opts.bounds = next.bounds;
      }
      if (next.landingTiming) {
        opts.landingTiming = next.landingTiming;
      }
      if (next.onMove) {
        opts.onMove = next.onMove;
      }

      if (next.position) {
        const state = session.state();
        const op = state.operation;

        if (op && op.type !== 'admitted') {
          const mapper = state.policy.coordinateOverride ?? op.coordinateSpace;
          const viewport = mapper.toViewport(next.position);
          session.dispatch({
            type: 'controlled',
            viewportDelta: {
              x: viewport.x - op.originRect.left,
              y: viewport.y - op.originRect.top,
            },
          });
        }
      }
    },

    cancel(reason?: unknown) {
      if (session.state().phase !== 'idle') {
        session.dispatch({
          type: 'cancel',
          reason: { type: 'consumer', detail: reason },
        });
      }
    },

    destroy() {
      if (terminal) {
        return;
      }

      terminal = true;
      session.close();
      gesture?.destroy();
      gesture = null;
      controllerAbort.abort();
    },
  };
}
