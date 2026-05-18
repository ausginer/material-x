import { Bool } from '../attribute.ts';
import { useAttributes } from '../controllers/useAttributes.ts';
import {
  useContext,
  useProvider,
  type Context,
} from '../controllers/useContext.ts';
import { useEvents } from '../controllers/useEvents.ts';
import { useSlot } from '../controllers/useSlot.ts';
import { ControlledElement, internals } from '../element.ts';
import { EventEmitter } from '../emitter.ts';
import { DEFAULT_EVENT_INIT, toggleState } from '../utils/DOM.ts';
import { trait, type Interface, type Props, type Trait } from './traits.ts';

/**
 * Fired by a reorderable container when the user drops a dragged item at a new
 * position. DOM reordering is left to the consumer.
 */
export class ReorderEvent extends Event {
  readonly item: HTMLElement;
  readonly from: number;
  readonly to: number;

  constructor(item: HTMLElement, from: number, to: number) {
    super('reorder', DEFAULT_EVENT_INIT);
    this.item = item;
    this.from = from;
    this.to = to;
  }
}

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
    reorderable: (oldValue, newValue) => emitter.emit(oldValue, newValue),
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
      toggleState(internals(host), DRAGGED_STATE, true);
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
        toggleState(internals(dragOverItem), DRAG_OVER_STATE, false);
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
      toggleState(internals(dragOverItem), DRAG_OVER_STATE, false);
      dragOverItem = null;
    },

    dragend() {
      if (draggedItem) {
        toggleState(internals(draggedItem), DRAGGED_STATE, false);
      }
      if (dragOverItem) {
        toggleState(internals(dragOverItem), DRAG_OVER_STATE, false);
      }
      draggedItem = null;
      dragOverItem = null;
    },

    drop(event: DragEvent) {
      event.preventDefault();

      const dragged = draggedItem;
      const target = dragOverItem;

      if (draggedItem) {
        toggleState(internals(draggedItem), DRAGGED_STATE, false);
      }
      if (dragOverItem) {
        toggleState(internals(dragOverItem), DRAG_OVER_STATE, false);
      }
      draggedItem = null;
      dragOverItem = null;

      if (!dragged || !target || dragged === target) {
        return;
      }

      const from = items.indexOf(dragged);
      const to = items.indexOf(target);

      if (from === -1 || to === -1) {
        return;
      }

      host.dispatchEvent(new ReorderEvent(dragged, from, to));
    },
  });
}

/**
 * Registers drag ghost behaviour on a reorderable item.
 *
 * The item subscribes to the provided context (published by
 * {@link useReorderable}) to track whether the parent container is currently
 * reorderable. The consumer is responsible for setting `draggable` on the
 * desired handle element — this hook does not manage `draggable` itself.
 *
 * When a `dragstart` fires on the host while the parent is reorderable, a
 * custom drag image is set using `target` (the visual inner element) so the
 * whole item appears as the drag ghost rather than just the handle. If the
 * parent is not reorderable, `dragstart` is cancelled so unrelated interactive
 * content is not accidentally dragged.
 *
 * @param host - The item host element. `dragstart` is listened here so light
 *   DOM handle drags are caught before they cross the shadow boundary.
 * @param ctx - Context channel shared with {@link useReorderable}.
 * @param target - Visual element used as the drag ghost. Defaults to `host`.
 */
export function useReorderableItem(
  host: ControlledElement,
  ctx: Context<ReorderableContextData>,
  target: HTMLElement = host,
): void {
  let reorderable = false;

  useContext(host, ctx, (data) => {
    if (!data) {
      reorderable = false;
      return undefined;
    }

    ({ reorderable } = data.provider);

    return data.emitter.on((_, newValue) => {
      reorderable = newValue !== null;
    });
  });

  useEvents(host, {
    dragstart(event: DragEvent) {
      if (!reorderable) {
        event.preventDefault();
        return;
      }

      const { left, top } = target.getBoundingClientRect();
      event.dataTransfer?.setDragImage(
        target,
        event.clientX - left,
        event.clientY - top,
      );
    },
  });
}
