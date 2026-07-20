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
import { createInvalidationSource } from './kernel/invalidation.ts';
import { createIdentitySource } from './kernel/operation-id.ts';
import { createPointerSource, type EscapeSignal } from './kernel/pointer.ts';
import { createRealm } from './kernel/realm.ts';
import { createSession, type DragSession } from './kernel/session.ts';
import { resolveSortablePress } from './sortable/admission.ts';
import { createCollection } from './sortable/collection.ts';
import { SortableGesture } from './sortable/gesture.ts';
import type {
  SortableController,
  SortableOptions,
} from './sortable/options.ts';
import {
  createSortableReducer,
  INITIAL_SORTABLE_STATE,
  type SortableEvent,
  type SortableState,
} from './sortable/reducer.ts';

export type {
  CollectionSnapshot,
  Insertion,
  OnReorder,
  PlaceholderContext,
  ReorderProposal,
  ReorderResolution,
  ReorderTransactionResult,
  SortableCancelResult,
  SortableController,
  SortableFinishResult,
  SortableOptions,
} from './sortable/options.ts';
export type { AnimationTiming, ReorderRequest } from './kernel/types.ts';

const DEFAULT_THRESHOLD = 8;

export function sortable(
  container: HTMLElement,
  options: SortableOptions,
): SortableController {
  if (typeof options?.onReorder !== 'function') {
    throw new TypeError('sortable: `onReorder` is required.');
  }

  const realm = createRealm(container);
  const ids = createIdentitySource();
  const invalidation = createInvalidationSource(realm);
  const collection = createCollection(options.items());
  const getVisual = options.getVisual ?? ((item: HTMLElement) => item);
  const controllerAbort = new AbortController();

  const reduce = createSortableReducer(
    { threshold: options.threshold ?? DEFAULT_THRESHOLD },
    ids,
  );

  let gesture: SortableGesture | null = null;
  let terminal = false;
  let session: DragSession<SortableState, SortableEvent>;

  function emit(raw: PointerEvent | EscapeSignal): void {
    if ('type' in raw && raw.type === 'escape') {
      session.dispatch({ type: 'cancel', reason: { type: 'escape' } });
      return;
    }
    const event = raw as PointerEvent;
    const point = { x: event.clientX, y: event.clientY };
    switch (event.type) {
      case 'pointermove':
        session.dispatch({ type: 'move', pointerId: event.pointerId, point });
        break;
      case 'pointerup':
        session.dispatch({
          type: 'release',
          pointerId: event.pointerId,
          point,
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
      default:
        break;
    }
  }

  const pointerSource = createPointerSource(
    container,
    realm,
    controllerAbort.signal,
    (event) => {
      if (
        terminal ||
        session.state().phase !== 'idle' ||
        event.button !== 0 ||
        !event.isPrimary
      ) {
        return;
      }
      const snapshot = collection.snapshot();
      const item = resolveSortablePress(
        event,
        snapshot.items,
        options.getHandle,
      );
      if (!item) {
        return;
      }
      session.dispatch({
        type: 'admit',
        operationId: ids.next(),
        input: 'pointer',
        item,
        pointerId: event.pointerId,
        point: { x: event.clientX, y: event.clientY },
        collection: snapshot,
      });
    },
  );

  collection.subscribe((snapshot) => {
    const op = session.state().operation;
    if (op) {
      session.dispatch({
        type: 'snapshot',
        operationId: op.operationId,
        snapshot,
      });
    }
  });

  session = createSession<SortableState, SortableEvent>(
    INITIAL_SORTABLE_STATE,
    reduce,
    (from, to, event) => {
      if (from.phase === 'idle' && to.phase === 'pending') {
        gesture = new SortableGesture({
          realm,
          ids,
          options,
          visual: getVisual(to.operation!.item),
          getVisual,
          invalidation,
          dispatch: session.dispatch,
        });
        pointerSource.armSession(gesture.scope.signal, emit);
      }

      gesture?.observe(to);
      gesture?.handle(from, to, event);

      if (to.phase === 'idle' && from.phase !== 'idle') {
        gesture = null;
      }
    },
  );

  return {
    updateItems(items) {
      collection.replace(items);
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
