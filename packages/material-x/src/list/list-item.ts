import {
  ControlledElement,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
import focusStyles from '../core/styles/focus/focus.css.ts' with { type: 'css' };
import {
  type FocusForwarding,
  useFocusForwarding,
} from '../core/traits/focus-forwarding.ts';
import template from './list-item.tpl.html' with { type: 'html' };
import {
  type ListItemCoreTraits,
  useListItemCore,
  type ListItemCoreCSSProperties,
  type ListItemCoreEvents,
  type ListItemCoreProperties,
} from './ListItemCore.ts';

export type ListItemProperties = ListItemCoreProperties;
export type ListItemEvents = ListItemCoreEvents;
export type ListItemCSSProperties = ListItemCoreCSSProperties;

const ListItemConstructor: Composed<
  ControlledElementConstructor,
  [...ListItemCoreTraits, typeof FocusForwarding]
> = compose(ControlledElement);

/**
 * @tag mx-list-item
 *
 * @summary Static list items display content inside a list.
 *
 * A static item takes no focus. In `mx-sortable-list`, an item without a
 * handle is a tab stop, with the list item's focus indicator.
 *
 * @slot - Primary label text.
 * @slot start - Leading icon, avatar, or image.
 * @slot end - Trailing icon or control.
 * @slot overline - Overline text.
 * @slot supporting-text - Supporting text below the label.
 * @slot trailing-supporting-text - Trailing supporting text.
 *
 * @csspart impl - Internal list item container.
 */
export default class ListItem extends ListItemConstructor {
  constructor() {
    super();
    const target = useListItemCore(this, template, [focusStyles], {
      delegatesFocus: true,
    });
    // In `mx-sortable-list` the inner element is the item's tab stop, and
    // `focus()` reaches it in every engine through this registration.
    useFocusForwarding(this, target);
  }
}

customElements.define('mx-list-item', ListItem);

declare global {
  interface HTMLElementTagNameMap {
    'mx-list-item': ListItem;
  }
}
