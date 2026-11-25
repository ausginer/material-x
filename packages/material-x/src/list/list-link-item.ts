import { Bool } from '@ydinjs/core/attribute.js';
import { setOwnARIA } from '@ydinjs/core/controllers/useARIA.js';
import { useAttributes, via } from '@ydinjs/core/controllers/useAttributes.js';
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
 * @attr {boolean} selected - Applies selected visual state.
 * @attr {boolean} disabled - Disables navigation and focus.
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
    ) as HTMLAnchorElement;
    useLinkable(this, target);
    useDisableableLinkable(this, target);

    useAttributes(this, {
      selected: via(Bool, (_, value) => {
        setOwnARIA(target, 'aria-current', value ? 'page' : null);
      }),
    });
  }
}

customElements.define('mx-list-link-item', ListLinkItem);

declare global {
  interface HTMLElementTagNameMap {
    'mx-list-link-item': ListLinkItem;
  }
}
