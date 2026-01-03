import type { EmptyObject } from 'type-fest';
import { Str } from '../core/elements/attribute.ts';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import iconButtonTemplate from './icon-button.tpl.html' with { type: 'html' };
import mainElevatedStyles from './styles/elevated/main.ctr.css' with { type: 'css' };
import elevatedTokens from './styles/elevated/main.tokens.css.ts?type=css' with { type: 'css' };
import iconTokens from './styles/icon/main.tokens.css.ts?type=css' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.ctr.css' with { type: 'css' };
import outlinedTokens from './styles/outlined/main.tokens.css.ts?type=css' with { type: 'css' };
import textTokens from './styles/text/main.tokens.css.ts?type=css' with { type: 'css' };
import tonalTokens from './styles/tonal/main.tokens.css.ts?type=css' with { type: 'css' };
import {
  createButtonAccessors,
  useButtonCore,
  type ButtonColor,
  type ButtonLike,
  type ButtonShape,
  type ButtonSize,
  type ButtonCoreProperties,
} from './useButtonCore.ts';

export type IconButtonWidth = 'wide' | 'narrow';
export type IconButtonColor = Exclude<ButtonColor, 'text'> | 'standard';

export interface IconButtonLike extends ButtonLike {
  width: string | null;
}

export type IconButtonProperties = Readonly<
  Omit<ButtonCoreProperties, 'color'> & {
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
 * @attribute {string} color
 * @attribute {string} size
 * @attribute {string} shape
 * @attribute {string} width
 * @attribute {boolean|undefined} disabled
 */
export default class IconButton extends ReactiveElement implements ButtonLike {
  static readonly formAssociated = true;

  static {
    createButtonAccessors(this, { width: Str });
  }

  declare color: IconButtonColor | null;
  declare size: ButtonSize | null;
  declare shape: ButtonShape | null;
  declare width: IconButtonWidth | null;
  declare disabled: boolean;

  constructor() {
    super();
    useButtonCore(this, iconButtonTemplate, 'button', [
      mainElevatedStyles,
      mainOutlinedStyles,
      elevatedTokens,
      outlinedTokens,
      textTokens,
      tonalTokens,
      iconTokens,
    ]);
  }
}

define('mx-icon-button', IconButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-icon-button': IconButton;
  }
}
