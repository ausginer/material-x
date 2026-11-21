import { useProvider } from '@ydinjs/core/controllers/useContext.js';
import { useSlot } from '@ydinjs/core/controllers/useSlot.js';
import {
  ControlledElement,
  internals,
  use,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
import { DEFAULT_EVENT_INIT, toggleState } from '@ydinjs/core/utils/DOM.js';
import { landing } from '@ydinjs/drag/sortable/landing.js';
import { y } from '@ydinjs/drag/sortable/y.js';
import {
  ReorderResolution,
  sortable,
  type SortableConfig,
  type SortableController,
} from '@ydinjs/drag/sortable.js';
import type { EmptyObject } from 'type-fest';
import { parseMs } from '../core/utils/fns.ts';
import { type ListCoreCSSProperties, useListCore } from './ListCore.ts';
import { handleOf, sortItem } from './sortable-item.ts';
import { SORTABLE_LIST_CTX } from './sortable-list-context.ts';

/**
 * How long an accepted move waits for the list's slot to show it before the
 * item lands where the DOM has it.
 */
const COMMIT_TIMEOUT = 500;

const DRAG_STATE = 'drag';

export type ReorderEventInit = Readonly<{
  item: HTMLElement;
  from: number;
  to: number;
  /** The item before the new slot, or `null` at the start. */
  previous: HTMLElement | null;
  /** The item after the new slot, or `null` at the end. */
  next: HTMLElement | null;
}>;

/**
 * A proposed move of one item. `list.insertBefore(event.item, event.next)`
 * applies it, and `preventDefault()` rejects it.
 */
export class ReorderEvent extends Event {
  declare readonly item: HTMLElement;
  declare readonly from: number;
  declare readonly to: number;
  declare readonly previous: HTMLElement | null;
  declare readonly next: HTMLElement | null;

  constructor(init: ReorderEventInit) {
    super('reorder', DEFAULT_EVENT_INIT);
    Object.assign(this, init);
  }
}

export type SortableListProperties = EmptyObject;
export type SortableListEvents = Readonly<{ reorder: ReorderEvent }>;
export type SortableListCSSProperties = ListCoreCSSProperties;

const SortableListConstructor: Composed<
  ControlledElementConstructor,
  readonly []
> = compose(ControlledElement);

/**
 * @tag mx-sortable-list
 *
 * @summary A list whose items the user reorders by pointer or keyboard.
 *
 * It renders and styles like `mx-list`, and takes the same item elements. It
 * needs `@ydinjs/drag`, an optional peer dependency of this package, which the
 * consumer installs.
 *
 * - **Handles.** An item with a `[data-handle]` child in its `lead` or `trail`
 *   slot, such as an icon, drags only by its handle, by pointer and by
 *   keyboard. In this list the handle becomes a focusable _Reorder_ button
 *   with `touch-action: none`, keeping the values the consumer set. An item
 *   without a handle drags by its whole surface.
 * - **Static items.** An `mx-list-item` without a handle is a tab stop while it
 *   is in this list, and stops being one when it gets a handle or leaves the
 *   list. The other items keep their own button or link as their tab stop.
 * - **Keyboard.** An arrow key moves the focused item one slot and proposes the
 *   move. It works from a focused handle, or from any focused element inside an
 *   item without a handle, such as the button of an `mx-list-button-item`. At
 *   the start or end of the list the key keeps its native meaning. Focus stays
 *   where it was, so the next press moves the item again. A focused handle, or
 *   item without one, is described as _Use the arrow keys to move_.
 * - **Nested controls.** A control inside an item without a handle that uses
 *   the arrow keys itself, such as a text field or a slider, needs a
 *   `data-drag-ignore` attribute. Otherwise its arrow keys move the item.
 *
 * @slot - List item elements.
 *
 * @event reorder - A `ReorderEvent`, fired on the list for each move the user
 *   proposes. It carries `item`, `from`, `to`, `previous` and `next`, and
 *   `list.insertBefore(event.item, event.next)` applies it. The list never
 *   moves an item itself. The item stays lifted until the list's children
 *   show it at `to`, so the consumer may commit in the handler or later, as in
 *   a framework render. After 500 ms the item lands where the DOM has it.
 *   `preventDefault()` rejects the move, and the item lands home.
 *
 * @cssprop --md-list-container-color - Overrides the list container color.
 * @cssprop --md-list-container-shape - Overrides the list container shape.
 */
export default class SortableList extends SortableListConstructor {
  constructor() {
    super();
    useListCore(this);
    const live = document.createElement('div');
    live.setAttribute('aria-live', 'polite');
    // Visually hidden and exposed to assistive technology. No stylesheet of
    // the list's reaches it, so the styles are inline.
    live.style.cssText =
      'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap';
    this.shadowRoot!.append(live);

    const slot = this.shadowRoot!.querySelector<HTMLSlotElement>('slot')!;
    const read = (): readonly ControlledElement[] =>
      slot
        .assignedElements()
        .filter(
          (element): element is ControlledElement =>
            element instanceof ControlledElement,
        );

    let items: readonly ControlledElement[] = [];
    let dragged: ControlledElement | null = null;
    let commit: (() => void) | null = null;
    let controller: SortableController | null = null;

    const config: SortableConfig = {
      items: () => items,
      axis: y(),
      handle: (item) => handleOf(item) ?? item,
      visual: (item) => item.shadowRoot!.querySelector<HTMLElement>('.host')!,
      landing: {
        ...landing(),
        timing: () => {
          const styles = getComputedStyle(this);

          return {
            duration: parseMs(
              styles.getPropertyValue('--_drag-duration'),
              this,
              '--_drag-duration',
            ),
            easing: styles.getPropertyValue('--_drag-easing').trim(),
          };
        },
      },
      onStart: (item) => {
        dragged = item as ControlledElement;
        toggleState(internals(dragged), DRAG_STATE, true);
      },
      onEnd: (result) => {
        toggleState(internals(dragged!), DRAG_STATE, false);
        dragged = null;

        if (result.type === 'accepted') {
          live.textContent = `Item ${result.request.to + 1} of ${items.length}.`;
        }
      },
      onReorder: (request, { signal }) => {
        if (!this.dispatchEvent(new ReorderEvent(request))) {
          return ReorderResolution.reject();
        }

        return new Promise((resolve) => {
          const done = (): void => {
            clearTimeout(timer);
            commit = null;
            resolve(ReorderResolution.accept());
          };
          const timer = setTimeout(done, COMMIT_TIMEOUT);

          commit = () => {
            if (
              read().indexOf(request.item as ControlledElement) === request.to
            ) {
              done();
            }
          };
          signal.addEventListener('abort', done, { once: true });
          commit();
        });
      },
    };

    const refresh = (): void => {
      const current = read();

      if (
        current.length !== items.length ||
        current.some((item, index) => item !== items[index])
      ) {
        items = current;
        controller?.invalidate();
      }
    };

    // Each item that resolves this list as its parent applies its sortable
    // semantics to its own elements, with the writer the value carries. The
    // list keeps no registry and queries no item. An item that upgrades after
    // the list's last slot change isn't in the collection yet, because an
    // upgrade fires no `slotchange`, so its lookup reads the slot again.
    useProvider(this, SORTABLE_LIST_CTX, (host, control) => {
      if (!items.includes(host as ControlledElement)) {
        refresh();
      }

      return sortItem(this, host, control);
    });

    useSlot(this, slot, () => {
      refresh();
      commit?.();
    });

    // A controller per connection. Destroying it ends a drag without a
    // landing, which a cancel would attempt on a placeholder that left the
    // document with the list. Destruction calls no `onEnd`.
    use(this, {
      connected: () => {
        controller = sortable(this, config);
      },
      disconnected: () => {
        void controller!.requestDestroy();
        controller = null;

        if (dragged) {
          toggleState(internals(dragged), DRAG_STATE, false);
          dragged = null;
        }
      },
    });
  }
}

customElements.define('mx-sortable-list', SortableList);

declare global {
  interface HTMLElementTagNameMap {
    'mx-sortable-list': SortableList;
  }
}
