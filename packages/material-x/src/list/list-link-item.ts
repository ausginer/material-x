import type { EmptyObject, Simplify } from 'type-fest';
import { Bool } from 'ydin/attribute.js';
import { useAttributes, via } from 'ydin/controllers/useAttributes.js';
import { define } from 'ydin/element.js';
import {
  Linkable,
  useDisableableLinkable,
  useLinkable,
  type LinkableProps,
} from 'ydin/traits/linkable.js';
import { impl, type TraitedConstructor } from 'ydin/traits/traits.js';
import template from './list-link-item.tpl.html' with { type: 'html' };
import {
  ListInteractiveItemCore,
  useInteractiveListItemCore,
  type ListInteractiveItemCoreCSSProperties,
  type ListInteractiveItemCoreProperties,
} from './ListInteractiveItemCore.ts';

const LinkListItemCore: TraitedConstructor<
  ListInteractiveItemCore,
  typeof ListInteractiveItemCore,
  [typeof Linkable]
> = impl(ListInteractiveItemCore, [Linkable]);

export type ListLinkItemProperties = Simplify<
  ListInteractiveItemCoreProperties & LinkableProps
>;
export type ListLinkItemEvents = EmptyObject;
export type ListLinkItemCSSProperties = ListInteractiveItemCoreCSSProperties;

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
export default class ListLinkItem extends LinkListItemCore {
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
