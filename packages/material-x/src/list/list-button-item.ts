import type { EmptyObject } from 'type-fest';
import {
  ControlledElement,
  define,
  type ControlledElementConstructor,
} from 'ydin/element.js';
import { useSelectable } from 'ydin/traits/selectable.js';
import { impl, type TraitedConstructor } from 'ydin/traits/traits.js';
import template from './list-button-item.tpl.html' with { type: 'html' };
import {
  LIST_INTERACTIVE_ITEM_CORE_TRAITS,
  useInteractiveListItemCore,
  type ListInteractiveItemCoreCSSProperties,
  type ListInteractiveItemCoreProperties,
} from './ListInteractiveItemCore.ts';

export type ListButtonItemProperties = ListInteractiveItemCoreProperties;
export type ListButtonItemEvents = EmptyObject;
export type ListButtonItemCSSProperties = ListInteractiveItemCoreCSSProperties;

export type ListButtonItemConstructor = TraitedConstructor<
  ControlledElement,
  ControlledElementConstructor,
  typeof LIST_INTERACTIVE_ITEM_CORE_TRAITS
>;

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
const ListButtonItem: ListButtonItemConstructor = impl(
  ControlledElement,
  LIST_INTERACTIVE_ITEM_CORE_TRAITS,
)(
  (Base) =>
    class extends Base {
      constructor() {
        super();
        const target = useInteractiveListItemCore(this, template);
        useSelectable(this, target);
      }
    },
);
type ListButtonItem = InstanceType<typeof ListButtonItem>;

export default ListButtonItem;

define('mx-list-button-item', ListButtonItem);

declare global {
  interface HTMLElementTagNameMap {
    'mx-list-button-item': ListButtonItem;
  }
}
