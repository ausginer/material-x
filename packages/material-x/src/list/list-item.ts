import {
  ControlledElement,
  define,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import {
  impl,
  type TraitedConstructor,
} from '@ydinjs/core/traits/attributes.js';
import template from './list-item.tpl.html' with { type: 'html' };
import {
  LIST_ITEM_CORE_TRAITS,
  useListItemCore,
  type ListItemCoreCSSProperties,
  type ListItemCoreEvents,
  type ListItemCoreProperties,
} from './ListItemCore.ts';

export type ListItemProperties = ListItemCoreProperties;
export type ListItemEvents = ListItemCoreEvents;
export type ListItemCSSProperties = ListItemCoreCSSProperties;

const ListItemConstructor: TraitedConstructor<
  ControlledElement,
  ControlledElementConstructor,
  typeof LIST_ITEM_CORE_TRAITS
> = impl(ControlledElement, LIST_ITEM_CORE_TRAITS);

/**
 * @tag mx-list-item
 *
 * @summary Static list items display content inside a list.
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
    useListItemCore(this, template);
  }
}

define('mx-list-item', ListItem);

declare global {
  interface HTMLElementTagNameMap {
    'mx-list-item': ListItem;
  }
}
