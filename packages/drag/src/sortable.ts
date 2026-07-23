/**
 * Sortable (reorder) entry point. Semantic decisions live in the sortable
 * machine; DOM work and resource ownership live in its effect runtime.
 */
import { reportError_ } from './kernel/errors.ts';
import { createInvalidationSource } from './kernel/invalidation.ts';
import { createPointerSource } from './kernel/pointer.ts';
import { CANCEL_CONSUMER } from './kernel/protocol.ts';
import { createRealm } from './kernel/realm.ts';
import {
  createControllerRuntime,
  type ControllerRuntime,
} from './kernel/runtime.ts';
import { resolveSortablePress } from './sortable/admission.ts';
import {
  createCollection,
  type SortableCollection,
} from './sortable/collection.ts';
import { createSortableEffects } from './sortable/effects.ts';
import {
  DIRECTION_DOWN,
  DIRECTION_UP,
  keyboardInsertion,
  type KeyboardDirection,
} from './sortable/keyboard.ts';
import {
  ADMIT_KEYBOARD,
  ADMIT_POINTER,
  COLLECTION_UPDATED,
  createInitialSortableState,
  createSortableMachine,
  OPERATION_CANCELED,
  SORTABLE_IDLE,
  type SortableEffect,
  type SortableEvent,
  type SortableState,
} from './sortable/machine.ts';
import type { SortableOptions } from './sortable/options.ts';

export {
  type PlaceholderContext,
  ReorderResolution,
  SortableResult,
  type SortableCancelResult,
  type SortableFinishResult,
  type SortableOptions,
} from './sortable/options.ts';
export type {
  AnimationTiming,
  DragSubject,
  ReorderRequest,
} from './kernel/types.ts';

export type SortableController = Readonly<{
  updateItems(items: readonly HTMLElement[]): void;
  cancel(reason?: unknown): void;
  destroy(): void;
}>;

export function sortable(
  container: HTMLElement,
  options: SortableOptions,
): SortableController {
  // oxlint-disable-next-line no-use-before-define
  return new SortableControllerImpl(container, options);
}

const ARROW_UP = 'ArrowUp';
const ARROW_LEFT = 'ArrowLeft';
const ARROW_DOWN = 'ArrowDown';
const ARROW_RIGHT = 'ArrowRight';
const DEFAULT_THRESHOLD = 8;

function commandOf(key: string): KeyboardDirection | null {
  if (key === ARROW_UP || key === ARROW_LEFT) {
    return DIRECTION_UP;
  }
  if (key === ARROW_DOWN || key === ARROW_RIGHT) {
    return DIRECTION_DOWN;
  }
  return null;
}

class SortableControllerImpl implements SortableController {
  readonly #options: SortableOptions;
  readonly #collection: SortableCollection;
  readonly #getVisual: (item: HTMLElement) => HTMLElement;
  readonly #controllerAbort = new AbortController();
  readonly #runtime: ControllerRuntime<SortableState, SortableEvent>;
  #terminal = false;

  constructor(container: HTMLElement, options: SortableOptions) {
    if (typeof options?.onReorder !== 'function') {
      throw new TypeError('sortable: `onReorder` is required.');
    }

    this.#options = options;
    this.#collection = createCollection(options.items());
    this.#getVisual = options.getVisual ?? ((item) => item);

    const realm = createRealm(container);
    const invalidation = createInvalidationSource(realm);
    const pointerSource = createPointerSource(
      container,
      realm,
      this.#controllerAbort.signal,
      (event) => {
        this.#admitPress(event);
      },
    );
    const decide = createSortableMachine({
      threshold: options.threshold ?? DEFAULT_THRESHOLD,
      onStart: options.onStart,
      onReorder: options.onReorder,
      onFinish: options.onFinish,
      onCancel: options.onCancel,
      onError: options.onError,
      landingTiming: options.landingTiming,
    });

    this.#runtime = createControllerRuntime<
      SortableState,
      SortableEvent,
      SortableEffect
    >(
      createInitialSortableState(),
      decide,
      (dispatch) =>
        createSortableEffects(
          {
            realm,
            pointerSource,
            invalidation,
            getVisual: this.#getVisual,
            createPlaceholder: options.createPlaceholder,
          },
          dispatch,
        ),
      (error) => {
        reportError_(error, undefined);
      },
    );

    container.addEventListener('keydown', this.#handleKeydown.bind(this), {
      signal: this.#controllerAbort.signal,
    });
    this.#collection.subscribe(this.#handleSnapshot.bind(this));
  }

  updateItems(items: readonly HTMLElement[]): void {
    if (!this.#terminal) {
      this.#collection.replace(items);
    }
  }

  cancel(reason?: unknown): void {
    const state = this.#runtime.state();
    if (state && state.phase !== SORTABLE_IDLE) {
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

  #admitPress(event: PointerEvent): void {
    const state = this.#runtime?.state();
    if (
      this.#terminal ||
      !state ||
      state.phase !== SORTABLE_IDLE ||
      event.button !== 0 ||
      !event.isPrimary
    ) {
      return;
    }
    const snapshot = this.#collection.snapshot();
    const item = resolveSortablePress(
      event,
      snapshot.items,
      this.#options.getHandle,
    );
    if (!item) {
      return;
    }
    this.#runtime.dispatch({
      type: ADMIT_POINTER,
      item,
      visual: this.#getVisual(item),
      pointerId: event.pointerId,
      point: { x: event.clientX, y: event.clientY },
      snapshot,
    });
  }

  #handleKeydown(event: KeyboardEvent): void {
    const direction = commandOf(event.key);
    const state = this.#runtime.state();
    if (
      this.#terminal ||
      direction === null ||
      !state ||
      state.phase !== SORTABLE_IDLE
    ) {
      return;
    }
    const snapshot = this.#collection.snapshot();
    const item = resolveSortablePress(
      event,
      snapshot.items,
      this.#options.getHandle,
    );
    const insertion = item && keyboardInsertion(snapshot, item, direction);
    if (!item || !insertion) {
      return;
    }
    event.preventDefault();
    const rect = item.getBoundingClientRect();
    this.#runtime.dispatch({
      type: ADMIT_KEYBOARD,
      item,
      visual: this.#getVisual(item),
      insertion,
      point: {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      },
      snapshot,
    });
  }

  #handleSnapshot(snapshot: ReturnType<SortableCollection['snapshot']>): void {
    const state = this.#runtime.state();
    if (state && 'operation' in state) {
      this.#runtime.dispatch({
        type: COLLECTION_UPDATED,
        operationId: state.operation.operationId,
        snapshot,
      });
    }
  }
}
