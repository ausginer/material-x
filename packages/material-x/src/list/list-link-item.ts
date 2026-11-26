import {
  ControlledElement,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
import {
  type Linkable,
  useDisableableLinkable,
  useLinkable,
  type LinkableProps,
} from '@ydinjs/core/traits/linkable.js';
import type { EmptyObject, Simplify } from 'type-fest';
import template from './list-link-item.tpl.html' with { type: 'html' };
import {
  type ListInteractiveItemCoreTraits,
  useInteractiveListItemCore,
  type ListInteractiveItemCoreCSSProperties,
  type ListInteractiveItemCoreProperties,
} from './ListInteractiveItemCore.ts';

export type ListLinkItemProperties = Simplify<
  ListInteractiveItemCoreProperties & LinkableProps
>;
export type ListLinkItemEvents = EmptyObject;
export type ListLinkItemCSSProperties = ListInteractiveItemCoreCSSProperties;

const ListLinkItemConstructor: Composed<
  ControlledElementConstructor,
  [...ListInteractiveItemCoreTraits, typeof Linkable]
> = compose(ControlledElement);

/**
 * @tag mx-list-link-item
 *
 * @summary Interactive list items navigate with native anchor behavior.
 *
 * @attr {boolean} selected - Applies selected visual state, and sets the link's
 *   own `aria-current="page"`. An `aria-current` of the host comes first.
 * @attr {boolean} disabled - Disables navigation and focus. In
 *   `mx-sortable-list`, the user can't reorder the item. Controls in the item's
 *   slots aren't disabled.
 * @attr {string} href - Link destination URL.
 * @attr {string} target - Navigation target (for example `_blank`).
 *
 * @slot - Primary label text.
 * @slot lead - Leading icon, avatar, or image.
 * @slot overline - Overline text.
 * @slot support - Supporting text below the label.
 * @slot trail - Trailing icon, control, or text.
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
      'page',
    ) as HTMLAnchorElement;
    useLinkable(this, target);
    useDisableableLinkable(this, target);
  }
}

customElements.define('mx-list-link-item', ListLinkItem);

declare global {
  interface HTMLElementTagNameMap {
    'mx-list-link-item': ListLinkItem;
  }
}
