import type { EmptyObject, Simplify } from 'type-fest';
import { Str } from '../core/elements/attribute.ts';
import { define } from '../core/elements/reactive-element.ts';
import {
  impl,
  trait,
  type ConstructorWithTraits,
  type Interface,
  type Props,
  type Trait,
} from '../core/elements/traits.ts';
import {
  ButtonCore,
  useButtonCore,
  type ButtonColor,
  type ButtonCoreProps,
  type ButtonLike,
  type ButtonSharedCSSProperties,
} from './ButtonCore.ts';
import iconButtonTemplate from './icon-button.tpl.html' with { type: 'html' };
import mainElevatedStyles from './styles/elevated/main.css.ts' with { type: 'css' };
import mainIconStyles from './styles/icon/main.css.ts' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.css.ts' with { type: 'css' };
import mainTextStyles from './styles/text/main.css.ts' with { type: 'css' };
import mainTonalStyles from './styles/tonal/main.css.ts' with { type: 'css' };

export type IconButtonWidth = 'wide' | 'narrow';
export type IconButtonColor = Exclude<ButtonColor, 'text'> | 'standard';

type IconButtonLikeDescriptor = {
  width: IconButtonWidth;
};

const $iconButtonLike: unique symbol = Symbol('IconButtonLike');

export const IconButtonLike: Trait<
  IconButtonLikeDescriptor,
  typeof $iconButtonLike
> = trait<IconButtonLikeDescriptor, typeof $iconButtonLike>(
  { width: Str },
  $iconButtonLike,
);

export type IconButtonLike = Omit<ButtonLike, 'color'> & {
  color: IconButtonColor | null;
} & Interface<typeof IconButtonLike>;

export type IconButtonLikeProps = Props<typeof IconButtonLike>;

const IconButtonCore: ConstructorWithTraits<
  InstanceType<typeof ButtonCore>,
  [typeof IconButtonLike]
> = impl(ButtonCore, [IconButtonLike]);

export type IconButtonProperties = Simplify<
  Omit<ButtonCoreProps, 'color'> &
    IconButtonLikeProps &
    Readonly<{
      color?: IconButtonColor;
    }>
>;
export type IconButtonEvents = EmptyObject;
export type IconButtonCSSProperties = ButtonSharedCSSProperties;

/**
 * @tag mx-icon-button
 *
 * @summary Icon buttons communicate compact actions with icon-only content.
 *
 * @attr {"outlined"|"elevated"|"tonal"|"standard"} color - Visual style
 * variant. Omit to use the default filled style.
 * @attr {"xsmall"|"medium"|"large"|"xlarge"} size - Button size. Omit to use
 * the default (small) size.
 * @attr {"round"|"square"} shape - Button shape. Omit to use round corners.
 * @attr {"wide"|"narrow"} width - Container width style.
 * @attr {boolean} disabled - Disables interaction and form participation.
 *
 * @slot - Icon content.
 *
 * @csspart impl - Internal native button element.
 *
 * @cssprop --md-button-container-height - Overrides button height.
 * @cssprop --md-button-leading-space - Overrides start padding.
 * @cssprop --md-button-trailing-space - Overrides end padding.
 * @cssprop --md-button-icon-size - Overrides icon size.
 * @cssprop --md-button-icon-label-space - Overrides spacing between icon and
 * label.
 * @cssprop --md-button-label-text-line-height - Overrides label line height.
 * @cssprop --md-button-press-duration - Overrides press transition duration.
 * @cssprop --md-button-press-easing - Overrides press transition easing.
 *
 * @event click - Fired when the button is activated.
 */
export default class IconButton extends IconButtonCore {
  static readonly formAssociated = true;

  constructor() {
    super();
    useButtonCore(this, iconButtonTemplate, [
      mainElevatedStyles,
      mainOutlinedStyles,
      mainTextStyles,
      mainTonalStyles,
      mainIconStyles,
    ]);
  }
}

define('mx-icon-button', IconButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-icon-button': IconButton;
  }
}
