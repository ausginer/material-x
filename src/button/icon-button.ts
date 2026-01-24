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
  type Traits,
} from '../core/elements/traits.ts';
import {
  ButtonCore,
  useButtonCore,
  type ButtonColor,
  type ButtonCoreProps,
  type ButtonLike,
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
  [...Traits<typeof ButtonCore>, typeof IconButtonLike]
> = impl(ButtonCore, [IconButtonLike]);

export type IconButtonProperties = Simplify<
  Omit<ButtonCoreProps, 'color'> &
    IconButtonLikeProps &
    Readonly<{
      color?: IconButtonColor;
    }>
>;
export type IconButtonEvents = EmptyObject;
export type IconButtonCSSProperties = EmptyObject;

/**
 * @summary Buttons communicate actions that people can take. They are typically
 * placed throughout the UI, in places like:
 *
 * - Dialogs
 * - Modal windows
 * - Forms
 * - Cards
 * - Toolbars
 *
 * They can also be placed within standard button groups.
 *
 * @attribute {string} color
 * @attribute {string} size
 * @attribute {string} shape
 * @attribute {string} width
 * @attribute {boolean|undefined} disabled
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
