// oxlint-disable no-use-before-define -- declarations hoist; grouped by role.

/**
 * Controller wiring for the action-driven sortable runtime.
 *
 * The only place that touches native events. Both admission paths run their
 * preflight synchronously inside the listener, because `composedPath()`, the
 * handle resolver and `preventDefault()` are valid only during native dispatch;
 * everything they decide is handed to the queue as a small owned value.
 */
import { createInvalidationSource } from '../../kernel/invalidation.ts';
import { isPrimaryPress } from '../../kernel/pointer.ts';
import {
  CANCEL_CONSUMER,
  KEY_DOWN,
  POINTER_DOWN,
} from '../../kernel/protocol.ts';
import { createRealm } from '../../kernel/realm.ts';
import { resolveSortablePress } from '../admission.ts';
import {
  DIRECTION_DOWN,
  DIRECTION_UP,
  keyboardInsertion,
  type KeyboardDirection,
} from '../keyboard.ts';
import type { CollectionSnapshot, SortableOptions } from '../options.ts';
import {
  ADMIT_KEYBOARD,
  ADMIT_POINTER,
  COLLECTION,
  dispatch,
  requestCancel,
} from './actions.ts';
import {
  createSortableRuntime,
  destroyRuntime,
  type SortableConfig,
  type SortableRuntime,
} from './runtime.ts';

const ARROW_UP = 'ArrowUp';
const ARROW_LEFT = 'ArrowLeft';
const ARROW_DOWN = 'ArrowDown';
const ARROW_RIGHT = 'ArrowRight';
const DEFAULT_THRESHOLD = 8;

export type SortableController = Readonly<{
  updateItems(items: readonly HTMLElement[]): void;
  cancel(reason?: unknown): void;
  destroy(): void;
}>;

function commandOf(key: string): KeyboardDirection | null {
  if (key === ARROW_UP || key === ARROW_LEFT) {
    return DIRECTION_UP;
  }

  if (key === ARROW_DOWN || key === ARROW_RIGHT) {
    return DIRECTION_DOWN;
  }

  return null;
}

export function createSortableController(
  container: HTMLElement,
  options: SortableOptions,
): SortableController {
  return createSortableControllerInternal(container, options).controller;
}

/**
 * As {@link createSortableController}, but also hands back the runtime container
 * so retention and teardown can be asserted directly. Not part of any public
 * entry point.
 */
export function createSortableControllerInternal(
  container: HTMLElement,
  options: SortableOptions,
): Readonly<{ controller: SortableController; runtime: SortableRuntime }> {
  if (typeof options?.onReorder !== 'function') {
    throw new TypeError('sortable: `onReorder` is required.');
  }

  const realm = createRealm(container);
  const config: SortableConfig = {
    threshold: options.threshold ?? DEFAULT_THRESHOLD,
    getVisual: options.getVisual ?? ((item) => item),
    getHandle: options.getHandle,
    createPlaceholder: options.createPlaceholder,
    landingTiming: options.landingTiming,
    onStart: options.onStart,
    onReorder: options.onReorder,
    onFinish: options.onFinish,
    onCancel: options.onCancel,
    onError: options.onError,
  };

  const runtime = createSortableRuntime({
    realm,
    container,
    invalidation: createInvalidationSource(realm),
    config,
  });

  // The published ordered snapshot. `replace` shallow-copies, so an already
  // queued snapshot can never be changed by a later caller mutation.
  let snapshot: CollectionSnapshot = {
    items: [...options.items()],
    version: 0,
  };

  container.addEventListener(
    POINTER_DOWN,
    ((event: PointerEvent) => {
      admitPress(runtime, event, snapshot, config);
    }) as EventListener,
    { signal: runtime.ingress.signal },
  );

  container.addEventListener(
    KEY_DOWN,
    ((event: KeyboardEvent) => {
      admitCommand(runtime, event, snapshot, config);
    }) as EventListener,
    { signal: runtime.ingress.signal },
  );

  const controller: SortableController = {
    updateItems(items) {
      if (runtime.closed) {
        return;
      }

      snapshot = { items: [...items], version: snapshot.version + 1 };
      dispatch(runtime, COLLECTION, snapshot);
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
 * Dispatch-scoped pointer admission. A throwing `getHandle` or `getVisual`
 * escapes to the browser, leaving the controller idle and usable — preserved
 * behaviour, see the compatibility ledger.
 */
function admitPress(
  runtime: SortableRuntime,
  event: PointerEvent,
  snapshot: CollectionSnapshot,
  config: SortableConfig,
): void {
  if (
    runtime.closed ||
    runtime.current.operation !== null ||
    !isPrimaryPress(event)
  ) {
    return;
  }

  const item = resolveSortablePress(event, snapshot.items, config.getHandle);

  if (!item) {
    return;
  }

  dispatch(runtime, ADMIT_POINTER, {
    item,
    visual: config.getVisual(item),
    snapshot,
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
  });
}

/**
 * Dispatch-scoped keyboard admission. `preventDefault()` must happen before the
 * listener returns, so the whole decision — including whether the command is
 * even possible at this edge of the collection — is made here rather than
 * queued and decided later.
 */
function admitCommand(
  runtime: SortableRuntime,
  event: KeyboardEvent,
  snapshot: CollectionSnapshot,
  config: SortableConfig,
): void {
  const direction = commandOf(event.key);

  if (
    runtime.closed ||
    direction === null ||
    runtime.current.operation !== null
  ) {
    return;
  }

  const item = resolveSortablePress(event, snapshot.items, config.getHandle);
  const insertion = item && keyboardInsertion(snapshot, item, direction);

  if (!item || !insertion) {
    return;
  }

  event.preventDefault();
  const rect = item.getBoundingClientRect();
  dispatch(runtime, ADMIT_KEYBOARD, {
    item,
    visual: config.getVisual(item),
    snapshot,
    insertion,
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  });
}
