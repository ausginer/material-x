// oxlint-disable no-use-before-define -- declarations hoist; grouped by lifecycle stage.
/**
 * Controller wiring for the action-driven draggable runtime.
 *
 * This is the only place that touches native events. Admission preflight runs
 * synchronously inside the listener, because `composedPath()` and the handle
 * resolver are valid only during native dispatch; everything it decides is
 * handed to the queue as a small owned value.
 *
 * Phase 2: reachable through a test-only factory. The public `draggable()`
 * entry still runs the previous implementation until the Phase 3 cutover.
 */
import { createInvalidationSource } from '../../kernel/invalidation.ts';
import { isPrimaryPress } from '../../kernel/pointer.ts';
import {
  LIFT_FAITHFUL,
  LIFT_FLAT,
  LIFT_IN_PLACE,
  type LiftMode as PresentationLiftMode,
} from '../../kernel/presentation.ts';
import { CANCEL_CONSUMER, POINTER_DOWN } from '../../kernel/protocol.ts';
import { createRealm } from '../../kernel/realm.ts';
import {
  LIFT_FLATTEN,
  LIFT_NONE,
  LIFT_TOP_LAYER,
  type DraggableOptions,
  type DragUpdate,
} from '../options.ts';
import {
  ADMIT,
  CONTROLLED,
  dispatch,
  POLICY,
  requestCancel,
  type AdmittedPress,
} from './actions.ts';
import {
  createDraggableRuntime,
  destroyRuntime,
  type DraggableConfig,
  type DraggablePolicy,
  type DraggableRuntime,
} from './runtime.ts';

const DEFAULT_THRESHOLD = 8;

const LIFT_MODES: Readonly<
  Record<NonNullable<DraggableOptions['lift']>, PresentationLiftMode>
> = {
  [LIFT_TOP_LAYER]: LIFT_FAITHFUL,
  [LIFT_FLATTEN]: LIFT_FLAT,
  [LIFT_NONE]: LIFT_IN_PLACE,
};

export type FreeDragController = Readonly<{
  update(options: DragUpdate): void;
  cancel(reason?: unknown): void;
  destroy(): void;
}>;

/**
 * Builds a draggable controller on the action-driven runtime.
 *
 * Not exported from the package entry point during Phase 2 — it exists so the
 * behavioural contract can be exercised before the atomic cutover.
 */
export function createDraggableController(
  item: HTMLElement,
  options: DraggableOptions,
): FreeDragController {
  return createDraggableControllerInternal(item, options).controller;
}

/**
 * As {@link createDraggableController}, but also hands back the runtime
 * container so retention and teardown can be asserted directly. Not part of any
 * public entry point.
 */
export function createDraggableControllerInternal(
  item: HTMLElement,
  options: DraggableOptions,
): Readonly<{ controller: FreeDragController; runtime: DraggableRuntime }> {
  if (typeof options?.onDrop !== 'function') {
    throw new TypeError('draggable: `onDrop` is required.');
  }

  const initial = { ...options };
  const visual = initial.getVisual?.(item) ?? item;
  const realm = createRealm(item);

  const config: DraggableConfig = {
    threshold: initial.threshold ?? DEFAULT_THRESHOLD,
    lift: LIFT_MODES[initial.lift ?? LIFT_TOP_LAYER],
    resolveHomeTarget: initial.resolveHomeTarget,
    hasHomeTarget: typeof initial.resolveHomeTarget === 'function',
    onStart: initial.onStart,
    onDrop: initial.onDrop,
    onFinish: initial.onFinish,
    onCancel: initial.onCancel,
    onError: initial.onError,
  };

  let policy: DraggablePolicy = {
    axis: initial.axis ?? 'both',
    bounds: initial.bounds,
    boundsVersion: 0,
    coordinateSpace: initial.coordinateSpace ?? null,
    landingTiming: initial.landingTiming,
    onMove: initial.onMove,
  };

  const runtime: DraggableRuntime = createDraggableRuntime({
    realm,
    item,
    visual,
    invalidation: createInvalidationSource(realm),
    config,
    policy,
  });

  item.addEventListener(
    POINTER_DOWN,
    ((event: PointerEvent) => {
      admit(runtime, event, item, initial);
    }) as EventListener,
    { signal: runtime.ingress.signal },
  );

  const controller: FreeDragController = {
    update(next) {
      if (runtime.closed) {
        return;
      }

      const boundsChanged = next.bounds !== undefined;
      policy = {
        axis: next.axis ?? policy.axis,
        bounds: boundsChanged ? next.bounds : policy.bounds,
        boundsVersion: boundsChanged
          ? policy.boundsVersion + 1
          : policy.boundsVersion,
        coordinateSpace: next.coordinateSpace ?? policy.coordinateSpace,
        landingTiming: next.landingTiming ?? policy.landingTiming,
        onMove: next.onMove ?? policy.onMove,
      };
      dispatch(runtime, POLICY, policy);

      if (next.position) {
        // Copy the caller's coordinates: the queued action must not observe a
        // later mutation of the object they handed us.
        dispatch(runtime, CONTROLLED, {
          x: next.position.x,
          y: next.position.y,
        });
      }
    },

    cancel(reason) {
      requestCancel(runtime, { type: CANCEL_CONSUMER, detail: reason });
    },

    destroy() {
      destroyRuntime(runtime);
    },
  };

  return { controller, runtime };
}

/**
 * Dispatch-scoped admission. `composedPath()` and the consumer's handle
 * resolver are only meaningful while the native listener is on the stack, so
 * both run here and only the resulting scalars are queued.
 *
 * A throwing handle resolver escapes to the browser, leaving the controller
 * idle and usable — preserved behaviour, see the compatibility ledger.
 */
function admit(
  runtime: DraggableRuntime,
  event: PointerEvent,
  item: HTMLElement,
  options: DraggableOptions,
): void {
  if (runtime.closed || runtime.current.operation !== null) {
    return;
  }

  if (!isPrimaryPress(event)) {
    return;
  }

  const handle =
    typeof options.handle === 'function'
      ? options.handle(item)
      : (options.handle ?? null);

  if (handle && !event.composedPath().includes(handle)) {
    return;
  }

  const press: AdmittedPress = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
  };
  dispatch(runtime, ADMIT, press);
}
