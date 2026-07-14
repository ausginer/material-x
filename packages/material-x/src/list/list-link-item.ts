import { Bool } from '@ydinjs/core/attribute.js';
import { useAttributes, via } from '@ydinjs/core/controllers/useAttributes.js';
import {
  ControlledElement,
  define,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import {
  Linkable,
  useDisableableLinkable,
  useLinkable,
  type LinkableProps,
} from '@ydinjs/core/traits/linkable.js';
import {
  impl,
  type TraitedConstructor,
} from '@ydinjs/core/traits/attributes.js';
import type { EmptyObject, Simplify } from 'type-fest';
import template from './list-link-item.tpl.html' with { type: 'html' };
import {
  LIST_INTERACTIVE_ITEM_CORE_TRAITS,
  useInteractiveListItemCore,
  type ListInteractiveItemCoreCSSProperties,
  type ListInteractiveItemCoreProperties,
} from './ListInteractiveItemCore.ts';

export type ListLinkItemProperties = Simplify<
  ListInteractiveItemCoreProperties & LinkableProps
>;
export type ListLinkItemEvents = EmptyObject;
export type ListLinkItemCSSProperties = ListInteractiveItemCoreCSSProperties;

const ListLinkItemConstructor: TraitedConstructor<
  ControlledElement,
  ControlledElementConstructor,
  [...typeof LIST_INTERACTIVE_ITEM_CORE_TRAITS, typeof Linkable]
> = impl(ControlledElement, [...LIST_INTERACTIVE_ITEM_CORE_TRAITS, Linkable]);

/**
 * @tag mx-list-link-item
 *
 * @summary Interactive list items navigate with native anchor behavior.
 *
 * @attr {boolean} selected - Applies selected visual state.
 * @attr {boolean} disabled - Disables navigation and focus.
 * @attr {string} href - Link destination URL.
 * @attr {string} target - Navigation target (for example `_blank`).
 *
 * @slot - Primary label text.
 * @slot start - Leading icon, avatar, or image.
 * @slot end - Trailing icon or control.
 * @slot overline - Overline text.
 * @slot supporting-text - Supporting text below the label.
 * @slot trailing-supporting-text - Trailing supporting text.
 *
 * @csspart impl - Internal native anchor element.
 *
 * @event click - Fired when the item is activated.
 */
export default class ListLinkItem extends ListLinkItemConstructor {
  constructor() {
    super();
    const target = useInteractiveListItemCore(
      this,
      template,
    ) as HTMLAnchorElement;
    useLinkable(this, target);
    useDisableableLinkable(this, target);

    useAttributes(this, {
      selected: via(Bool, (_, value) => {
        target.ariaCurrent = value ? 'page' : null;
      }),
    });
  }
}

define('mx-list-link-item', ListLinkItem);

declare global {
  interface HTMLElementTagNameMap {
    'mx-list-link-item': ListLinkItem;
  }
}
