import {
  ControlledElement,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
import type { EmptyObject } from 'type-fest';
import { type ListCoreCSSProperties, useListCore } from './ListCore.ts';
import type { ReorderEvent } from './reorder-event.ts';
import sortableStyles from './styles/sortable/main.css.ts' with { type: 'css' };
import { useSortable } from './useSortable.ts';

export { ReorderEvent, type ReorderEventInit } from './reorder-event.ts';

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
 *   with `touch-action: none`, keeping the values the consumer set. Unless a
 *   page sets its `display`, a handle other than an `mx-icon` is an
 *   `inline-grid` box that centers its content, because `touch-action`
 *   doesn't apply to an inline or `display: contents` box. A mouse drags an
 *   item without a handle by its whole surface, as does a pen that the
 *   browser doesn't scroll with. A finger on it scrolls instead, so give the
 *   items of a list that is used by touch a handle. A focused handle shows
 *   Material's focus indicator. A page's own rule on it, such as
 *   `.grip:focus-visible`, replaces it. A handle that is a custom element with
 *   an indicator of its own needs such a rule, because the list's rule outranks
 *   the element's `:host` rule.
 * - **Disabled items.** The user can't reorder an item with `disabled`, by
 *   pointer or by keyboard, and other items move past it. Its handle isn't a tab
 *   stop and has `aria-disabled`. Disabling an item doesn't end a move that has
 *   begun. Other controls in the item stay enabled, dimmed with the item, and
 *   are the page's to disable.
 * - **Static items.** An `mx-list-item` without a handle is a tab stop while it
 *   is in this list, and stops being one when it gets a handle or leaves the
 *   list. A `tabindex` the consumer set on it stands. The other items keep
 *   their own button or link as their tab stop.
 * - **Keyboard.** An arrow key moves the focused item one slot and proposes the
 *   move. It works from a focused handle, or from any focused element inside an
 *   item without a handle, such as the button of an `mx-list-button-item`. At
 *   the start or end of the list the key keeps its native meaning. Focus stays
 *   where it was, so the next press moves the item again. A focused handle, or
 *   item without one, is described as _Use the arrow keys to move_.
 * - **Lift.** During a drag, the item element carries `popover="manual"` and
 *   matches `[popover]` and `:popover-open`. The lift keeps the item's size,
 *   position, padding, border, overflow, color and background color. In a
 *   pointer drag, an item that isn't disabled takes Material's reorder colors,
 *   and they replace a page's `color` and `background-color` on an
 *   `mx-list-item`. `--md-list-item-container-color` still overrides the
 *   container color. A page's popover rule that sets other properties, such as
 *   `box-shadow`, applies to the item while it is lifted.
 * - **Neighbors.** The items that a move pushes aside slide to their new
 *   places, in a pointer drag and a key move, and slide back when the move is
 *   cancelled, refused or never committed. The slide animates each item's
 *   `translate`, added to the item's own. With
 *   `prefers-reduced-motion: reduce`, they move at once.
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
 *   show the move, so the consumer may commit in the handler or later, as in
 *   a framework render. After 500 ms the item lands where the DOM has it.
 *   `preventDefault()` rejects the move, and the item lands home.
 *
 * @cssprop --md-list-container-color - Overrides the list container color.
 * @cssprop --md-list-container-shape - Overrides the list container shape.
 */
export default class SortableList extends SortableListConstructor {
  constructor() {
    super();
    useListCore(this, [sortableStyles]);
    useSortable(this);
  }
}

customElements.define('mx-sortable-list', SortableList);

declare global {
  interface HTMLElementTagNameMap {
    'mx-sortable-list': SortableList;
  }
}
