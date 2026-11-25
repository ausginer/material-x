import {
  ControlledElement,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
import hostBoxStyles from '../core/styles/elevation/host-box.css.ts' with { type: 'css' };
import {
  type ListItemCoreTraits,
  useListItemCore,
  type ListItemCoreCSSProperties,
  type ListItemCoreEvents,
  type ListItemCoreProperties,
} from './ListItemCore.ts';
import staticBoxStyles from './styles/item/static-box.css.ts' with { type: 'css' };

export type ListItemProperties = ListItemCoreProperties;
export type ListItemEvents = ListItemCoreEvents;
export type ListItemCSSProperties = ListItemCoreCSSProperties;

const ListItemConstructor: Composed<
  ControlledElementConstructor,
  ListItemCoreTraits
> = compose(ControlledElement);

/**
 * @tag mx-list-item
 *
 * @summary Static list items display content inside a list.
 *
 * The item element is the list item's box. A static item takes no focus of
 * its own, and a `tabindex` set on it stands, in either list. In
 * `mx-sortable-list`, an item without a handle is a tab stop, with the list
 * item's focus indicator.
 *
 * @slot - Primary label text.
 * @slot lead - Leading icon, avatar, or image.
 * @slot overline - Overline text.
 * @slot support - Supporting text below the label.
 * @slot trail - Trailing icon, control, or text.
 */
export default class ListItem extends ListItemConstructor {
  constructor() {
    super();
    useListItemCore(this, [hostBoxStyles, staticBoxStyles]);
  }
}

customElements.define('mx-list-item', ListItem);

declare global {
  interface HTMLElementTagNameMap {
    'mx-list-item': ListItem;
  }
}
