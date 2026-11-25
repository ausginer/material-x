import { Str, type ConverterOf } from '@ydinjs/core/attribute.js';
import { useAttributes } from '@ydinjs/core/controllers/useAttributes.js';
import {
  ControlledElement,
  internals,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import {
  AnyElement,
  attributes,
  type Props,
} from '@ydinjs/core/traits/attribute-traits.js';
import {
  compose,
  trait,
  type Composed,
} from '@ydinjs/core/traits/composition.js';
import { switchState } from '@ydinjs/core/utils/DOM.js';
import type { EmptyObject } from 'type-fest';
import elevationStyles from '../core/styles/elevation/elevation.css.ts' with { type: 'css' };
import '../core/styles/elevation/elevation.runtime.ts';
import hostBoxStyles from '../core/styles/elevation/host-box.css.ts' with { type: 'css' };
import { useCore } from '../core/utils/useCore.ts';
import template from './card.tpl.html' with { type: 'html' };
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };
import elevatedStyles from './styles/elevated/main.css.ts' with { type: 'css' };
import outlinedStyles from './styles/outlined/main.css.ts' with { type: 'css' };

export type CardVariant = 'elevated' | 'outlined';

@trait
@attributes({
  variant: Str as ConverterOf<CardVariant>,
})
export class CardLike extends AnyElement {
  accessor variant!: CardVariant | null;
}

export type CardLikeProps = Props<typeof CardLike>;

export type CardProperties = Readonly<CardLikeProps>;
export type CardEvents = EmptyObject;
export type CardCSSProperties = Readonly<{
  '--md-card-container-color'?: string;
  '--md-card-container-shape'?: string;
  '--md-card-outline-color'?: string;
  '--md-card-padding'?: string;
}>;

const CardConstructor: Composed<
  ControlledElementConstructor,
  [typeof CardLike]
> = compose(ControlledElement);

/**
 * @tag mx-card
 *
 * @summary Cards display content and actions about a single subject.
 *
 * The card is a static container. It has no role, adds no tab stop of its own,
 * and handles no activation. A `role`, an `aria-*` attribute or a `tabindex`
 * set on it stands. It doesn't clip its content, and the content inherits the
 * page's text color and font.
 *
 * Full-bleed content rounds its own corners: a direct child of the card takes
 * the card's corner with `border-radius: inherit`, or with one corner's
 * property, such as `border-start-start-radius: inherit`.
 *
 * The card may be smaller than its content, or scroll it: the container, the
 * outline and the shadow stay on its own box. A browser may make a scrolling
 * card a tab stop, as it does a `div`: Firefox does, Chromium does when Tab
 * reaches nothing inside it, and WebKit doesn't. Content at the card's edge that
 * is positioned, or has an `opacity` or a `transform`, paints over the outline.
 *
 * `--md-card-padding` sets the padding. A `padding` that the page sets on the
 * card doesn't apply.
 *
 * On an outlined card, an `outline` that the page sets applies only while the
 * card matches `:focus-visible`.
 *
 * @attr {"elevated"|"outlined"} variant - Card variant. Omit to use the filled
 * default.
 *
 * @slot - Card content.
 *
 * @cssprop --md-card-container-color - Overrides the container color.
 * @cssprop --md-card-container-shape - Overrides the container corner radius.
 * @cssprop --md-card-outline-color - Overrides the outline color of the
 * outlined variant.
 * @cssprop --md-card-padding - Overrides the space between the container's edge
 * and the content. Set to `0` for full-bleed content.
 */
export default class Card extends CardConstructor {
  constructor() {
    super();
    useCore(this, [template], {}, [
      elevationStyles,
      hostBoxStyles,
      defaultStyles,
      elevatedStyles,
      outlinedStyles,
    ]);

    const innards = internals(this);

    useAttributes(this, {
      variant: (oldValue, newValue) => switchState(innards, oldValue, newValue),
    });
  }
}

customElements.define('mx-card', Card);

declare global {
  interface HTMLElementTagNameMap {
    'mx-card': Card;
  }
}
