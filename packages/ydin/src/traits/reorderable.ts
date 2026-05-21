import { Bool } from '../attribute.ts';
import { useEvents } from '../controllers/useEvents.ts';
import { useSlot } from '../controllers/useSlot.ts';
import { ControlledElement, internals } from '../element.ts';
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

const DRAGGED_STATE = 'dragged';

/**
 * Maps each reorderable item to the inner visual element used as the drag
 * ghost. Set by {@link useReorderableItem}, read by {@link useReorderable}.
 */
const itemTargets = new WeakMap<ControlledElement, HTMLElement>();

function getItemTarget(item: ControlledElement): HTMLElement {
  return itemTargets.get(item) ?? item;
}

const DRAGGING_PROPS = [
  'position',
  'top',
  'left',
  'width',
  'z-index',
  'transform',
];

/**
 * Registers pointer-based drag-and-drop reorder coordination on a container
 * host.
 *
 * The host must implement {@link Reorderable}. Drag behaviour is gated by
 * `host.reorderable` — handlers are no-ops when false.
 *
 * The context is always published so child items can subscribe and react to
 * `reorderable` changes at any point in the lifecycle.
 *
 * On `pointerdown` over a tracked item the item's visual element lifts to a
 * fixed position following the pointer. A footprint placeholder — a `<div>`
 * with the class `footprintClass` and CSS custom properties
 * `--_drag-footprint-inline-size` / `--_drag-footprint-block-size` — is
 * inserted in the list to show the insertion point. The footprint moves among
 * siblings as the pointer crosses their midpoints.
 *
 * On `pointerup` the item animates back to the footprint position, lands
 * there, and a {@link ReorderEvent} is dispatched. The hook never mutates the
 * DOM order beyond the animation landing — the consumer handles final
 * reordering if needed.
 *
 * @param host - Container host implementing {@link Reorderable}.
 * @param ctx - Context channel shared with {@link useReorderableItem}.
 * @param footprintClass - CSS class applied to the footprint placeholder. The
 *   caller's shadow styles should target `::slotted(.footprintClass)` to
 *   provide dimensions and appearance via `--_drag-footprint-inline-size` and
 *   `--_drag-footprint-block-size`.
 * @param slotSelector - Selector for the slot that provides item children.
 */
export function useReorderable(
  host: ReorderableHost,
  slotSelector = 'slot',
): void {
  let items: readonly ControlledElement[] = [];
  let itemSet = new Set<ControlledElement>();
  let draggedItem: ControlledElement | null | undefined;
  let draggedVisual: HTMLElement | null | undefined;
  let footprint: HTMLElement | null | undefined;
  let startX = 0;
  let startY = 0;
  let startPointerX = 0;
  let startPointerY = 0;
  let currentDeltaX = 0;
  let currentDeltaY = 0;
  let originalIndex = -1;
  const rectCache = new WeakMap<HTMLElement, DOMRect>();

  useSlot<ControlledElement>(host, slotSelector, (_, nodes) => {
    items = nodes.filter(
      (n): n is ControlledElement => n instanceof ControlledElement,
    );
    itemSet = new Set(items);
  });

  const computeToIndex = () => {
    let index = 0;

    for (const child of host.children) {
      if (child === footprint) {
        return index;
      }

      if (
        child instanceof ControlledElement &&
        itemSet.has(child) &&
        child !== draggedItem
      ) {
        index += 1;
      }
    }

    return Math.max(0, items.length - 1);
  };

  const findInsertionPoint = (pointerY: number): ControlledElement | null => {
    for (const item of items) {
      if (item === draggedItem) {
        continue;
      }

      const rect = rectCache.get(getItemTarget(item))!;

      if (pointerY < rect.top + rect.height / 2) {
        return item;
      }
    }

    return null;
  };

  const invalidateRects = (
    a: ControlledElement | null,
    b: ControlledElement | null,
  ) => {
    for (const item of [a, b]) {
      if (item) {
        const visual = getItemTarget(item);
        rectCache.set(visual, visual.getBoundingClientRect());
      }
    }
  };

  const endDrag = async (fireEvent: boolean) => {
    if (!draggedItem || !draggedVisual || !footprint) {
      return;
    }

    const dragged = draggedItem;
    const visual = draggedVisual;
    const fp = footprint;
    const toIndex = computeToIndex();

    draggedItem = null;
    draggedVisual = null;
    footprint = null;

    const fpRect = fp.getBoundingClientRect();
    const toDeltaX = fpRect.left - startX;
    const toDeltaY = fpRect.top - startY;

    const animation = visual.animate(
      [
        { transform: `translate(${currentDeltaX}px, ${currentDeltaY}px)` },
        { transform: `translate(${toDeltaX}px, ${toDeltaY}px)` },
      ],
      { duration: 200, easing: 'ease-out' },
    );

    await animation.finished;

    fp.replaceWith(dragged);

    for (const prop of DRAGGING_PROPS) {
      visual.style.removeProperty(prop);
    }

    toggleState(internals(dragged), DRAGGED_STATE, false);

    if (fireEvent) {
      host.dispatchEvent(new ReorderEvent(dragged, originalIndex, toIndex));
    }
  };

  useEvents(host, {
    pointerdown(event: PointerEvent) {
      if (!host.reorderable || draggedItem) {
        return;
      }

      draggedItem = event
        .composedPath()
        .find(
          (n): n is ControlledElement =>
            n instanceof ControlledElement && itemSet.has(n),
        );

      if (!draggedItem) {
        return;
      }

      draggedVisual = getItemTarget(draggedItem);

      const { left, top, width, height } =
        draggedVisual.getBoundingClientRect();

      startX = left;
      startY = top;
      startPointerX = event.clientX;
      startPointerY = event.clientY;
      currentDeltaX = 0;
      currentDeltaY = 0;
      originalIndex = items.indexOf(draggedItem);

      footprint = document.createElement('div');
      footprint.classList.add('drag-footprint');
      footprint.style.inlineSize = `${width}px`;
      footprint.style.blockSize = `${height}px`;
      footprint.setAttribute('aria-hidden', 'true');
      draggedItem.before(footprint);

      draggedVisual.style.position = 'fixed';
      draggedVisual.style.top = `${top}px`;
      draggedVisual.style.left = `${left}px`;
      draggedVisual.style.width = `${width}px`;
      draggedVisual.style.zIndex = '9999';

      for (const item of items) {
        if (item !== draggedItem) {
          const visual = getItemTarget(item);
          rectCache.set(visual, visual.getBoundingClientRect());
        }
      }

      footprint.setPointerCapture(event.pointerId);
      toggleState(internals(draggedItem), DRAGGED_STATE, true);
      event.preventDefault();
    },

    pointermove(event: PointerEvent) {
      if (!draggedVisual || !footprint) {
        return;
      }

      currentDeltaX = event.clientX - startPointerX;
      currentDeltaY = event.clientY - startPointerY;

      draggedVisual.style.transform = `translate(${currentDeltaX}px, ${currentDeltaY}px)`;

      // Only reposition the footprint once the pointer has moved meaningfully.
      // pointermove can fire immediately after pointerdown with minimal delta,
      // which would jump the footprint away from its initial position.
      if (Math.abs(currentDeltaX) < 8 && Math.abs(currentDeltaY) < 8) {
        return;
      }

      const insertBefore = findInsertionPoint(event.clientY);
      const next = footprint.nextElementSibling;

      if (next !== insertBefore) {
        invalidateRects(
          next instanceof ControlledElement ? next : null,
          insertBefore,
        );

        if (insertBefore) {
          insertBefore.before(footprint);
        } else {
          host.append(footprint);
        }
      }
    },

    pointerup() {
      void endDrag(true);
    },

    pointercancel() {
      void endDrag(false);
    },
  });
}

/**
 * Registers the inner visual element of a reorderable item so that
 * {@link useReorderable} can lift it during a drag.
 *
 * The item subscribes to the provided context (published by
 * {@link useReorderable}) to track whether the parent container is currently
 * reorderable — reserved for future use by sub-hooks.
 *
 * @param host - The item host element.
 * @param ctx - Context channel shared with {@link useReorderable}.
 * @param target - Inner visual element used as the drag ghost. Defaults to
 *   `host`.
 */
export function useReorderableItem(
  host: ControlledElement,
  target: HTMLElement = host as HTMLElement,
): void {
  itemTargets.set(host, target);
}
