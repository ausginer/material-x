import {
  ControlledElement,
  define,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
import { useSelectable } from '@ydinjs/core/traits/selectable.js';
import type { EmptyObject } from 'type-fest';
import template from './list-button-item.tpl.html' with { type: 'html' };
import {
  type ListInteractiveItemCoreTraits,
  useInteractiveListItemCore,
  type ListInteractiveItemCoreCSSProperties,
  type ListInteractiveItemCoreProperties,
} from './ListInteractiveItemCore.ts';

export type ListButtonItemProperties = ListInteractiveItemCoreProperties;
export type ListButtonItemEvents = EmptyObject;
export type ListButtonItemCSSProperties = ListInteractiveItemCoreCSSProperties;

const ListButtonItemConstructor: Composed<
  ControlledElementConstructor,
  ListInteractiveItemCoreTraits
> = compose(ControlledElement);

/**
 * @tag mx-list-button-item
 *
 * @summary Interactive list items trigger actions with native button behavior.
 *
 * @attr {boolean} selected - Applies selected visual state.
 * @attr {boolean} disabled - Disables interaction.
 *
 * @slot - Primary label text.
 * @slot start - Leading icon, avatar, or image.
 * @slot end - Trailing icon or control.
 * @slot overline - Overline text.
 * @slot supporting-text - Supporting text below the label.
 * @slot trailing-supporting-text - Trailing supporting text.
 *
 * @csspart impl - Internal native button element.
 *
 * @event click - Fired when the item is activated.
 */
export default class ListButtonItem extends ListButtonItemConstructor {
  constructor() {
    super();
    const target = useInteractiveListItemCore(this, template);
    useSelectable(this, target);
  }
}

define('mx-list-button-item', ListButtonItem);

declare global {
  interface HTMLElementTagNameMap {
    'mx-list-button-item': ListButtonItem;
  }
}
