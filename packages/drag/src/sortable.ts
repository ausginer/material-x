/**
 * Sortable (reorder) entry point. Items in a collection can be lifted and
 * reordered; the consumer owns the persisted order through the required, explicit
 * `onReorder` resolution. There is no public programmatic `move()` in v1.
 *
 * The public function owns only controller-lifetime composition: it creates the
 * collection, session, pointer source, and identity source; arbitrates admission
 * into one `SortableGesture`; connects protocol dispatch to that gesture; and
 * forwards `updateItems`, `cancel`, and `destroy`.
 *
 * @example
 * ```ts
 * import { sortable } from '@ydinjs/drag/sortable';
 *
 * const sorter = sortable(container, {
 *   items: () => [...container.children] as HTMLElement[],
 *   async onReorder(request, { signal }) {
 *     await persistOrder(request, { signal });
 *     return { type: 'accepted' };
 *   },
 * });
 * ```
 */
import {
  createInvalidationSource,
  type InvalidationSource,
} from './kernel/invalidation.ts';
import { createIdentitySource } from './kernel/operation-id.ts';
import {
  createPointerSource,
  type EscapeSignal,
  type PointerSource,
} from './kernel/pointer.ts';
import {
  LIFECYCLE_ADMIT,
  LIFECYCLE_CANCEL,
  CANCEL_CONSUMER,
  CANCEL_ESCAPE,
  CANCEL_POINTER,
  LIFECYCLE_MOVE,
  PHASE_DRAGGING,
  PHASE_IDLE,
  PHASE_PENDING,
  POINTER_CANCEL,
  POINTER_MOVE,
  POINTER_UP,
  LIFECYCLE_RELEASE,
} from './kernel/protocol.ts';
import { createRealm, type DOMRealm } from './kernel/realm.ts';
import { createSession, type DragSession } from './kernel/session.ts';
import { resolveSortablePress } from './sortable/admission.ts';
import {
  createCollection,
  type SortableCollection,
} from './sortable/collection.ts';
import { SortableGesture } from './sortable/gesture.ts';
import {
  DIRECTION_DOWN,
  DIRECTION_UP,
  keyboardInsertion,
  type KeyboardDirection,
} from './sortable/keyboard.ts';
import type {
  CollectionSnapshot,
  SortableOptions,
} from './sortable/options.ts';
import {
  createSortableReducer,
  INITIAL_SORTABLE_STATE,
  INPUT_KEYBOARD,
  INPUT_POINTER,
  KEYBOARD_ACTIVATE,
  KEYBOARD_PROPOSE,
  SNAPSHOT,
  type SortableEvent,
  type SortableState,
} from './sortable/reducer.ts';

/* PUBLIC */

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

type SortableController = Readonly<{
  updateItems(items: readonly HTMLElement[]): void;
  cancel(reason?: unknown): void;
  destroy(): void;
}>;

export type { SortableController };

export function sortable(
  container: HTMLElement,
  options: SortableOptions,
): SortableController {
  // oxlint-disable-next-line no-use-before-define
  return new SortableControllerImpl(container, options);
}

/* PRIVATE */

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
  readonly #realm: DOMRealm;
  readonly #ids = createIdentitySource();
  readonly #invalidation: InvalidationSource;
  readonly #collection: SortableCollection;
  readonly #getVisual: (item: HTMLElement) => HTMLElement;
  readonly #controllerAbort = new AbortController();
  readonly #session: DragSession<SortableState, SortableEvent>;
  readonly #pointerSource: PointerSource;
  #gesture: SortableGesture | null = null;
  #terminal = false;

  constructor(container: HTMLElement, options: SortableOptions) {
    if (typeof options?.onReorder !== 'function') {
      throw new TypeError('sortable: `onReorder` is required.');
    }

    this.#options = options;
    this.#realm = createRealm(container);
    this.#invalidation = createInvalidationSource(this.#realm);
    this.#collection = createCollection(options.items());
    this.#getVisual = options.getVisual ?? ((item) => item);

    const reduce = createSortableReducer(
      { threshold: options.threshold ?? DEFAULT_THRESHOLD },
      this.#ids,
    );

    this.#pointerSource = createPointerSource(
      container,
      this.#realm,
      this.#controllerAbort.signal,
      this.#admitPress.bind(this),
    );

    this.#session = createSession<SortableState, SortableEvent>(
      INITIAL_SORTABLE_STATE,
      reduce,
      this.#transition.bind(this),
    );

    container.addEventListener('keydown', this.#handleKeydown.bind(this), {
      signal: this.#controllerAbort.signal,
    });
    this.#collection.subscribe(this.#handleSnapshot.bind(this));
  }

  updateItems(items: readonly HTMLElement[]): void {
    this.#collection.replace(items);
  }

  cancel(reason?: unknown): void {
    if (this.#session.state().phase !== PHASE_IDLE) {
      this.#session.dispatch({
        type: LIFECYCLE_CANCEL,
        reason: { type: CANCEL_CONSUMER, detail: reason },
      });
    }
  }

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
        });
        break;
      case POINTER_UP:
        this.#session.dispatch({
          type: LIFECYCLE_RELEASE,
          pointerId: event.pointerId,
          point,
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
      default:
        break;
    }
  }

  #admitPress(event: PointerEvent): void {
    if (
      this.#terminal ||
      this.#session.state().phase !== PHASE_IDLE ||
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
    this.#session.dispatch({
      type: LIFECYCLE_ADMIT,
      operationId: this.#ids.next(),
      input: INPUT_POINTER,
      item,
      pointerId: event.pointerId,
      point: { x: event.clientX, y: event.clientY },
      collection: snapshot,
    });
  }

  #commandKeyboard(
    item: HTMLElement,
    insertion: ReturnType<typeof keyboardInsertion>,
    snapshot: CollectionSnapshot,
    point: { x: number; y: number },
  ): void {
    if (!insertion) {
      return;
    }
    const operationId = this.#ids.next();
    this.#session.dispatch({
      type: LIFECYCLE_ADMIT,
      operationId,
      input: INPUT_KEYBOARD,
      item,
      pointerId: -1,
      point,
      collection: snapshot,
    });
    this.#session.dispatch({ type: KEYBOARD_ACTIVATE, operationId });
    const active = this.#session.state().operation;
    if (
      this.#session.state().phase === PHASE_DRAGGING &&
      active?.operationId === operationId
    ) {
      this.#session.dispatch({
        type: KEYBOARD_PROPOSE,
        operationId,
        insertion,
      });
    }
  }

  #handleKeydown(event: KeyboardEvent): void {
    const direction = commandOf(event.key);
    if (
      this.#terminal ||
      direction === null ||
      this.#session.state().phase !== PHASE_IDLE
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
    this.#commandKeyboard(item, insertion, snapshot, {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }

  #handleSnapshot(snapshot: CollectionSnapshot): void {
    const op = this.#session.state().operation;
    if (op) {
      this.#session.dispatch({
        type: SNAPSHOT,
        operationId: op.operationId,
        snapshot,
      });
    }
  }

  #transition(
    from: SortableState,
    to: SortableState,
    event: SortableEvent,
  ): void {
    if (from.phase === PHASE_IDLE && to.phase === PHASE_PENDING) {
      this.#gesture = new SortableGesture({
        realm: this.#realm,
        ids: this.#ids,
        options: this.#options,
        visual: this.#getVisual(to.operation!.item),
        getVisual: this.#getVisual,
        invalidation: this.#invalidation,
        dispatch: this.#session.dispatch,
      });
      this.#pointerSource.armSession(
        this.#gesture.scope.signal,
        this.#emit.bind(this),
      );
    }

    this.#gesture?.observe(to);
    this.#gesture?.handle(from, to, event);

    if (to.phase === PHASE_IDLE && from.phase !== PHASE_IDLE) {
      this.#gesture = null;
    }
  }
}
