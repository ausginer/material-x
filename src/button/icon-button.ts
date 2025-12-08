import type { EmptyObject } from 'type-fest';
import { Str } from '../core/elements/attribute.ts';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import mainElevatedStyles from './styles/elevated/main.css.ts?type=css' with { type: 'css' };
import mainIconStyles from './styles/icon/main.css.ts?type=css' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.css.ts?type=css' with { type: 'css' };
import mainSizeStyles from './styles/size/main.css.ts?type=css' with { type: 'css' };
import mainTextStyles from './styles/text/main.css.ts?type=css' with { type: 'css' };
import mainTonalStyles from './styles/tonal/main.css.ts?type=css' with { type: 'css' };
import { ICON_TEMPLATE } from './template.ts';
import {
  useButtonAccessors,
  useButtonCore,
  type ButtonColor,
  type ButtonLike,
  type ButtonShape,
  type ButtonSize,
  type CoreButtonProperties,
} from './useButtonCore.ts';

export type IconButtonWidth = 'wide' | 'narrow';
export type IconButtonColor = Exclude<ButtonColor, 'text'> | 'standard';

export type IconButtonProperties = Readonly<
  Omit<CoreButtonProperties, 'color'> & {
    color?: IconButtonColor;
    width?: IconButtonWidth;
  }
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
 * @attr {string} color
 * @attr {string} size
 * @attr {string} shape
 * @attr {string} width
 * @attr {boolean|undefined} disabled
 */
export default class IconButton extends ReactiveElement implements ButtonLike {
  static readonly formAssociated = true;

  static {
    useButtonAccessors(this, { width: Str });
  }

  declare color: IconButtonColor | null;
  declare size: ButtonSize | null;
  declare shape: ButtonShape | null;
  declare width: IconButtonWidth | null;
  declare disabled: boolean;

  constructor() {
    super();
    useButtonCore(this, ICON_TEMPLATE, 'button', [
      mainElevatedStyles,
      mainOutlinedStyles,
      mainSizeStyles,
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
