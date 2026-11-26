import {
  ControlledElement,
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
 * @attr {boolean} disabled - Disables interaction. In `mx-sortable-list`,
 *   the user can't reorder the item. Controls in the item's slots aren't
 *   disabled.
 *
 * @slot - Primary label text.
 * @slot lead - Leading icon, avatar, or image.
 * @slot overline - Overline text.
 * @slot support - Supporting text below the label.
 * @slot trail - Trailing icon, control, or text.
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

customElements.define('mx-list-button-item', ListButtonItem);

declare global {
  interface HTMLElementTagNameMap {
    'mx-list-button-item': ListButtonItem;
  }
}
