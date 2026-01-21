import type { EmptyObject } from 'type-fest';
import { Str } from '../core/elements/attribute.ts';
import {
  impl,
  trait,
  type Accessors,
  type AppliedTraits,
  type ConstructorWithTraits,
  type Trait,
  type TraitProps,
} from '../core/elements/impl.ts';
import {
  define,
  type ReactiveElement,
} from '../core/elements/reactive-element.ts';
import {
  ButtonCore,
  useButtonCore,
  type ButtonColor,
  type ButtonCoreProperties,
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

export type IconButtonProperties = Readonly<
  Omit<ButtonCoreProperties, 'color'> & {
    color?: IconButtonColor;
    width?: IconButtonWidth;
  }
>;
export type IconButtonEvents = EmptyObject;
export type IconButtonCSSProperties = EmptyObject;

export const IconButtonLike: Trait<
  HTMLElement,
  Accessors<{ width: Str }>
> = trait({ width: Str });

export type IconButtonLike = ButtonLike & TraitProps<typeof IconButtonLike>;

const IconButtonCore: ConstructorWithTraits<
  ReactiveElement,
  [...AppliedTraits<typeof ButtonCore>, typeof IconButtonLike]
> = impl(ButtonCore, [IconButtonLike]);

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
