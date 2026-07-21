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
import type { DraggableOptions, DragUpdate } from './draggable/options.ts';
import {
  CONTROLLED,
  createDraggableReducer,
  INITIAL_DRAGGABLE_STATE,
  SET_POLICY,
  type DraggableEvent,
  type DraggableState,
} from './draggable/reducer.ts';
import { createInvalidationSource } from './kernel/invalidation.ts';
import { createIdentitySource } from './kernel/operation-id.ts';
import { createPointerSource, type EscapeSignal } from './kernel/pointer.ts';
import {
  CANCEL_CONSUMER,
  CANCEL_ESCAPE,
  CANCEL_POINTER,
  LIFECYCLE_ADMIT,
  LIFECYCLE_CANCEL,
  LIFECYCLE_MOVE,
  LIFECYCLE_RELEASE,
  OPERATION_ADMITTED,
  PHASE_IDLE,
  PHASE_PENDING,
  POINTER_CANCEL,
  POINTER_MOVE,
  POINTER_UP,
} from './kernel/protocol.ts';
import { createRealm } from './kernel/realm.ts';
import { createSession, type DragSession } from './kernel/session.ts';

/* PUBLIC */

export {
  FreeDropResolution,
  FreeDropResult,
  type DragBounds,
  type DraggableOptions,
  type DragUpdate,
  type FreeDropCancelResult as FreeDragCancelResult,
  type FreeDropFinishResult as FreeDragFinishResult,
  type FreeHomeRequest,
  type FreeHomeTarget,
  type LiftMode,
} from './draggable/options.ts';
export type {
  AnimationTiming,
  CoordinateMapper,
  DragAxis,
  DragGeometry,
  DragSubject,
  FreeDropRequest,
  Point,
} from './kernel/types.ts';

export interface FreeDragController {
  update(options: DragUpdate): void;
  cancel(reason?: unknown): void;
  destroy(): void;
}

export function draggable(
  item: HTMLElement,
  options: DraggableOptions,
): FreeDragController {
  // oxlint-disable-next-line no-use-before-define
  return new FreeDragControllerImpl(item, options);
}

/* PRIVATE */

const DEFAULT_THRESHOLD = 8;

type MutableDraggableOptions = {
  -readonly [K in keyof DraggableOptions]: DraggableOptions[K];
};

class FreeDragControllerImpl implements FreeDragController {
  readonly #item: HTMLElement;
  readonly #opts: MutableDraggableOptions;
  readonly #realm: ReturnType<typeof createRealm>;
  readonly #visual: HTMLElement;
  readonly #ids = createIdentitySource();
  readonly #invalidation: ReturnType<typeof createInvalidationSource>;
  readonly #controllerAbort = new AbortController();
  readonly #session: DragSession<DraggableState, DraggableEvent>;
  readonly #pointerSource: ReturnType<typeof createPointerSource>;
  #gesture: FreeDragGesture | null = null;
  #terminal = false;

  constructor(item: HTMLElement, options: DraggableOptions) {
    if (typeof options?.onDrop !== 'function') {
      throw new TypeError('draggable: `onDrop` is required.');
    }

    this.#item = item;
    this.#opts = { ...options };
    this.#realm = createRealm(item);
    this.#visual = this.#opts.getVisual?.(item) ?? item;
    this.#invalidation = createInvalidationSource(this.#realm);

    const reduce = createDraggableReducer(
      {
        threshold: options.threshold ?? DEFAULT_THRESHOLD,
        hasHomeTarget: typeof options.resolveHomeTarget === 'function',
        realm: this.#realm,
      },
      this.#ids,
    );

    this.#pointerSource = createPointerSource(
      item,
      this.#realm,
      this.#controllerAbort.signal,
      (event) => {
        this.#admitPress(event);
      },
    );

    this.#session = createSession<DraggableState, DraggableEvent>(
      INITIAL_DRAGGABLE_STATE,
      reduce,
      (from, to, event) => {
        this.#transition(from, to, event);
      },
    );
  }

  /** Revises runtime options and/or retargets a controlled position. */
  update(next: DragUpdate): void {
    if (next.axis || next.coordinateSpace) {
      if (next.axis) {
        this.#opts.axis = next.axis;
      }

      if (next.coordinateSpace) {
        this.#opts.coordinateSpace = next.coordinateSpace;
      }

      this.#session.dispatch({
        type: SET_POLICY,
        axis: next.axis,
        coordinateOverride: next.coordinateSpace,
      });
    }

    if (next.bounds !== undefined) {
      this.#opts.bounds = next.bounds;
    }
    if (next.landingTiming) {
      this.#opts.landingTiming = next.landingTiming;
    }
    if (next.onMove) {
      this.#opts.onMove = next.onMove;
    }

    if (next.position) {
      const state = this.#session.state();
      const op = state.operation;

      if (op && op.type !== OPERATION_ADMITTED) {
        const mapper = state.policy.coordinateOverride ?? op.coordinateSpace;
        const viewport = mapper.toViewport(next.position);
        this.#session.dispatch({
          type: CONTROLLED,
          viewportDelta: {
            x: viewport.x - op.originRect.left,
            y: viewport.y - op.originRect.top,
          },
        });
      }
    }
  }

  /** Cancels any live gesture. */
  cancel(reason?: unknown): void {
    if (this.#session.state().phase !== PHASE_IDLE) {
      this.#session.dispatch({
        type: LIFECYCLE_CANCEL,
        reason: { type: CANCEL_CONSUMER, detail: reason },
      });
    }
  }

  /** Terminal, idempotent teardown. */
  destroy(): void {
    if (this.#terminal) {
      return;
    }

    this.#terminal = true;
    this.#session.close();
    this.#gesture?.destroy();
    this.#gesture = null;
    this.#controllerAbort.abort();
  }

  #currentBounds(): DOMRectReadOnly | null {
    return resolveBounds(this.#opts.bounds, this.#realm);
  }

  #emit(raw: PointerEvent | EscapeSignal): void {
    if (raw.type === CANCEL_ESCAPE) {
      this.#session.dispatch({
        type: LIFECYCLE_CANCEL,
        reason: { type: CANCEL_ESCAPE },
      });
      return;
    }

    const event = raw;
    const point = { x: event.clientX, y: event.clientY };

    switch (event.type) {
      case POINTER_MOVE:
        this.#session.dispatch({
          type: LIFECYCLE_MOVE,
          pointerId: event.pointerId,
          point,
          bounds: this.#currentBounds(),
        });
        break;
      case POINTER_UP:
        this.#session.dispatch({
          type: LIFECYCLE_RELEASE,
          pointerId: event.pointerId,
          point,
          bounds: this.#currentBounds(),
        });
        break;
      case POINTER_CANCEL:
        if (this.#session.state().pointer?.id === event.pointerId) {
          this.#session.dispatch({
            type: LIFECYCLE_CANCEL,
            reason: { type: CANCEL_POINTER },
          });
        }
        break;
      // `lostpointercapture` is benign: the gesture is tracked on the document.
      default:
        break;
    }
  }

  #admitPress(event: PointerEvent): void {
    if (this.#terminal || this.#session.state().phase !== PHASE_IDLE) {
      return;
    }

    const handle =
      typeof this.#opts.handle === 'function'
        ? this.#opts.handle(this.#item)
        : (this.#opts.handle ?? null);
    const press = resolveDraggablePress(event, this.#item, handle ?? null);

    if (!press) {
      return;
    }

    this.#session.dispatch({
      type: LIFECYCLE_ADMIT,
      operationId: this.#ids.next(),
      item: this.#item,
      pointerId: press.pointerId,
      point: press.point,
    });
  }

  #transition(
    from: DraggableState,
    to: DraggableState,
    event: DraggableEvent,
  ): void {
    if (from.phase === PHASE_IDLE && to.phase === PHASE_PENDING) {
      this.#gesture = new FreeDragGesture({
        realm: this.#realm,
        ids: this.#ids,
        options: this.#opts,
        item: this.#item,
        visual: this.#visual,
        invalidation: this.#invalidation,
        dispatch: this.#session.dispatch,
        currentBounds: this.#currentBounds.bind(this),
      });
      this.#pointerSource.armSession(
        this.#gesture.scope.signal,
        this.#emit.bind(this),
      );
    }

    this.#gesture?.handle(from, to, event);

    if (to.phase === PHASE_IDLE && from.phase !== PHASE_IDLE) {
      this.#gesture = null;
    }
  }
}
