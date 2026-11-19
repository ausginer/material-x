import {
  ControlledElement,
  define,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
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
  ListItemCoreTraits
> = compose(ControlledElement);

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
