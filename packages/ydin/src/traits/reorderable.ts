import { Bool } from '../attribute.ts';
import {
  useAttributes,
  type UpdateCallback,
} from '../controllers/useAttributes.ts';
import {
  useProvider,
  useContext,
  type Context,
} from '../controllers/useContext.ts';
import { useEvents } from '../controllers/useEvents.ts';
import { useSlot } from '../controllers/useSlot.ts';
import { ControlledElement, internals } from '../element.ts';
import { EventEmitter } from '../emitter.ts';
import { toggleState } from '../utils/DOM.ts';
import { ReorderEvent } from '../utils/events.ts';
import { trait, type Interface, type Props, type Trait } from './traits.ts';

const $reorderable: unique symbol = Symbol('Reorderable');

/**
 * Element trait that exposes a presence-based `reorderable` boolean field,
 * indicating that the element's children can be dragged to reorder.
 */
export const Reorderable: Trait<{ reorderable: boolean }, typeof $reorderable> =
  trait({ reorderable: Bool }, $reorderable);

/**
 * Branded instance interface derived from {@link Reorderable}.
 */
export type Reorderable = Interface<typeof Reorderable>;

/**
 * Framework-facing props derived from {@link Reorderable}.
 */
export type ReorderableProps = Props<typeof Reorderable>;

type ReorderableHost = ControlledElement & Reorderable;

/**
 * Stable context value shape shared between {@link useReorderable} and
 * {@link useReorderableItem}.
 */
export type ReorderableContextData = Readonly<{
  emitter: EventEmitter<
    readonly [oldValue: string | null, newValue: string | null]
  >;
  provider: ReorderableHost;
}>;

const DRAG_OVER_STATE = 'drag-over';
const DRAGGED_STATE = 'dragged';

function clearState(item: ControlledElement, state: string): void {
  toggleState(internals(item), state, false);
}

/**
 * Registers drag-and-drop reorder coordination on a container host.
 *
 * The host must implement {@link Reorderable}. Drag behaviour is gated by
 * `host.reorderable` — handlers are no-ops when false.
 *
 * The context is always published so child items can subscribe and react to
 * `reorderable` changes at any point in the lifecycle. On attribute change the
 * context emitter notifies subscribers.
 *
 * On drop a {@link ReorderEvent} is dispatched on the host. The hook never
 * mutates the DOM.
 *
 * @param host - Container host implementing {@link Reorderable}.
 * @param ctx - Context channel shared with {@link useReorderableItem}.
 * @param slotSelector - Selector for the slot that provides item children.
 */
export function useReorderable(
  host: ReorderableHost,
  ctx: Context<ReorderableContextData>,
  slotSelector = 'slot',
): void {
  const emitter = new EventEmitter<
    readonly [oldValue: string | null, newValue: string | null]
  >();

  useProvider(host, ctx, { emitter, provider: host });

  useAttributes(host, {
    reorderable: ((oldValue, newValue) =>
      emitter.emit(oldValue, newValue)) satisfies UpdateCallback,
  });

  let items: readonly ControlledElement[] = [];
  let draggedItem: ControlledElement | null = null;
  let dragOverItem: ControlledElement | null = null;

  useSlot<ControlledElement>(host, slotSelector, (_, nodes) => {
    items = nodes.filter(
      (n): n is ControlledElement => n instanceof ControlledElement,
    );
  });

  useEvents(host, {
    dragstart(event: DragEvent) {
      if (!host.reorderable) {
        return;
      }

      const target = event
        .composedPath()
        .find(
          (n): n is ControlledElement =>
            n instanceof ControlledElement && items.includes(n),
        );

      if (!target) {
        return;
      }

      draggedItem = target;
      toggleState(internals(target), DRAGGED_STATE, true);
    },

    dragover(event: DragEvent) {
      if (!host.reorderable || !draggedItem) {
        return;
      }

      event.preventDefault();

      const target = event
        .composedPath()
        .find(
          (n): n is ControlledElement =>
            n instanceof ControlledElement &&
            items.includes(n) &&
            n !== draggedItem,
        );

      if (target === dragOverItem) {
        return;
      }

      if (dragOverItem) {
        clearState(dragOverItem, DRAG_OVER_STATE);
      }

      dragOverItem = target ?? null;

      if (dragOverItem) {
        toggleState(internals(dragOverItem), DRAG_OVER_STATE, true);
      }
    },

    dragleave() {
      if (!dragOverItem) {
        return;
      }
      clearState(dragOverItem, DRAG_OVER_STATE);
      dragOverItem = null;
    },

    dragend() {
      if (draggedItem) {
        clearState(draggedItem, DRAGGED_STATE);
      }
      if (dragOverItem) {
        clearState(dragOverItem, DRAG_OVER_STATE);
      }
      draggedItem = null;
      dragOverItem = null;
    },

    drop(event: DragEvent) {
      event.preventDefault();

      const dragged = draggedItem;
      const target = dragOverItem;

      if (draggedItem) {
        clearState(draggedItem, DRAGGED_STATE);
      }
      if (dragOverItem) {
        clearState(dragOverItem, DRAG_OVER_STATE);
      }
      draggedItem = null;
      dragOverItem = null;

      if (!dragged || !target || dragged === target) {
        return;
      }

      const fromIndex = items.indexOf(dragged);
      const toIndex = items.indexOf(target);

      if (fromIndex === -1 || toIndex === -1) {
        return;
      }

      host.dispatchEvent(new ReorderEvent(dragged, fromIndex, toIndex));
    },
  });
}

/**
 * Registers drag-handle behaviour on a list item.
 *
 * The item subscribes to the provided context (published by
 * {@link useReorderable}) and keeps `host.draggable` in sync with the
 * provider's `reorderable` property. When the parent becomes reorderable, the
 * item becomes draggable; when it stops, draggability is removed.
 *
 * Drag is filtered to elements marked with `data-handle` in the composed path.
 * Any `dragstart` that does not originate from such an element is cancelled via
 * `preventDefault()`, so interactive content (buttons, links) inside the item
 * is not accidentally dragged.
 *
 * @param host - The item host element.
 * @param ctx - Context channel shared with {@link useReorderable}.
 */
export function useReorderableItem(
  host: ControlledElement,
  ctx: Context<ReorderableContextData>,
): void {
  useContext(host, ctx, (data) => {
    if (!data) {
      host.draggable = false;
      return undefined;
    }

    host.draggable = data.provider.reorderable;

    return data.emitter.on((_, newValue) => {
      host.draggable = newValue !== null;
    });
  });

  useEvents(host, {
    dragstart(event: DragEvent) {
      const hasHandle = event
        .composedPath()
        .some(
          (n): n is HTMLElement =>
            n instanceof HTMLElement && 'handle' in n.dataset,
        );

      if (!hasHandle) {
        event.preventDefault();
      }
    },
  });
}
