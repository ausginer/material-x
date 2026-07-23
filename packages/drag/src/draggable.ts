/**
 * Free dragging entry point. Semantic decisions live in the draggable machine;
 * browser work and resource ownership live in its effect runtime.
 */
import { resolveDraggablePress } from './draggable/admission.ts';
import { createDraggableEffects } from './draggable/effects.ts';
import {
  ADMIT_POINTER,
  CONTROLLED_POSITION,
  createDraggableMachine,
  createInitialDraggableState,
  DRAG_IDLE,
  OPERATION_CANCELED,
  POLICY_UPDATED,
  type DraggableEffect,
  type DraggableEvent,
  type DraggablePolicy,
  type DraggableState,
} from './draggable/machine.ts';
import type { DraggableOptions, DragUpdate } from './draggable/options.ts';
import { reportError_ } from './kernel/errors.ts';
import { createInvalidationSource } from './kernel/invalidation.ts';
import { createPointerSource } from './kernel/pointer.ts';
import { CANCEL_CONSUMER } from './kernel/protocol.ts';
import { createRealm } from './kernel/realm.ts';
import {
  createControllerRuntime,
  type ControllerRuntime,
} from './kernel/runtime.ts';

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

export type FreeDragController = Readonly<{
  update(options: DragUpdate): void;
  cancel(reason?: unknown): void;
  destroy(): void;
}>;

export function draggable(
  item: HTMLElement,
  options: DraggableOptions,
): FreeDragController {
  // oxlint-disable-next-line no-use-before-define
  return new FreeDragControllerImpl(item, options);
}

/* PRIVATE */

const DEFAULT_THRESHOLD = 8;

class FreeDragControllerImpl implements FreeDragController {
  readonly #item: HTMLElement;
  readonly #visual: HTMLElement;
  readonly #controllerAbort = new AbortController();
  readonly #runtime: ControllerRuntime<DraggableState, DraggableEvent>;
  #requestedPolicy: DraggablePolicy;
  #terminal = false;

  constructor(item: HTMLElement, options: DraggableOptions) {
    if (typeof options?.onDrop !== 'function') {
      throw new TypeError('draggable: `onDrop` is required.');
    }

    const initial = { ...options };
    this.#item = item;
    this.#visual = initial.getVisual?.(item) ?? item;

    const realm = createRealm(item);
    const invalidation = createInvalidationSource(realm);
    this.#requestedPolicy = {
      axis: initial.axis ?? 'both',
      bounds: initial.bounds,
      boundsVersion: 0,
      coordinateSpace: initial.coordinateSpace ?? null,
      landingTiming: initial.landingTiming,
      onMove: initial.onMove,
    };

    const pointerSource = createPointerSource(
      item,
      realm,
      this.#controllerAbort.signal,
      (event) => {
        this.#admitPress(event, initial);
      },
    );
    const decide = createDraggableMachine({
      threshold: initial.threshold ?? DEFAULT_THRESHOLD,
      hasHomeTarget: typeof initial.resolveHomeTarget === 'function',
      resolveHomeTarget: initial.resolveHomeTarget,
      onStart: initial.onStart,
      onDrop: initial.onDrop,
      onFinish: initial.onFinish,
      onCancel: initial.onCancel,
      onError: initial.onError,
    });

    this.#runtime = createControllerRuntime<
      DraggableState,
      DraggableEvent,
      DraggableEffect
    >(
      createInitialDraggableState(this.#requestedPolicy),
      decide,
      (dispatch) =>
        createDraggableEffects(
          {
            item,
            visual: this.#visual,
            realm,
            pointerSource,
            invalidation,
            lift: initial.lift,
          },
          dispatch,
        ),
      (error) => {
        reportError_(error, undefined);
      },
    );
  }

  update(next: DragUpdate): void {
    if (this.#terminal) {
      return;
    }

    const boundsChanged = next.bounds !== undefined;
    this.#requestedPolicy = {
      axis: next.axis ?? this.#requestedPolicy.axis,
      bounds: boundsChanged ? next.bounds : this.#requestedPolicy.bounds,
      boundsVersion: boundsChanged
        ? this.#requestedPolicy.boundsVersion + 1
        : this.#requestedPolicy.boundsVersion,
      coordinateSpace:
        next.coordinateSpace ?? this.#requestedPolicy.coordinateSpace,
      landingTiming: next.landingTiming ?? this.#requestedPolicy.landingTiming,
      onMove: next.onMove ?? this.#requestedPolicy.onMove,
    };
    this.#runtime.dispatch({
      type: POLICY_UPDATED,
      policy: this.#requestedPolicy,
    });

    if (next.position) {
      this.#runtime.dispatch({
        type: CONTROLLED_POSITION,
        position: next.position,
      });
    }
  }

  cancel(reason?: unknown): void {
    const state = this.#runtime.state();

    if (state && state.phase !== DRAG_IDLE) {
      this.#runtime.dispatch({
        type: OPERATION_CANCELED,
        reason: { type: CANCEL_CONSUMER, detail: reason },
      });
    }
  }

  destroy(): void {
    if (this.#terminal) {
      return;
    }

    this.#terminal = true;
    this.#runtime.destroy();
    this.#controllerAbort.abort();
  }

  #admitPress(event: PointerEvent, options: DraggableOptions): void {
    const state = this.#runtime?.state();

    if (this.#terminal || !state || state.phase !== DRAG_IDLE) {
      return;
    }

    const handle =
      typeof options.handle === 'function'
        ? options.handle(this.#item)
        : (options.handle ?? null);
    const press = resolveDraggablePress(event, this.#item, handle);

    if (!press) {
      return;
    }

    this.#runtime.dispatch({
      type: ADMIT_POINTER,
      item: this.#item,
      visual: this.#visual,
      pointerId: press.pointerId,
      point: press.point,
    });
  }
}
