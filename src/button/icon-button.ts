import { define, template } from '../core/elements/core-element.ts';
import { usePressAnimation } from '../core/utils/button.ts';
import CoreButton, { type ButtonAttributes } from './core-button.ts';
import mainElevatedStyles from './elevated/main.css.ts?type=css' with { type: 'css' };
import mainIconStyles from './icon/main.css.ts?type=css' with { type: 'css' };
import mainOutlinedStyles from './outlined/main.css.ts?type=css' with { type: 'css' };
import mainSizeStyles from './size/main.css.ts?type=css' with { type: 'css' };
import mainTextStyles from './text/main.css.ts?type=css' with { type: 'css' };
import mainTonalStyles from './tonal/main.css.ts?type=css' with { type: 'css' };

export type IconButtonWidth = 'wide' | 'narrow';

export type IconButtonAttributes = Readonly<
  ButtonAttributes & {
    width: IconButtonWidth;
  }
>;

const TEMPLATE = template`<slot></slot>`;

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
export default class IconButton extends CoreButton {
  static readonly formAssociated = true;
  static readonly observedAttributes = ['disabled'] as const;

  constructor() {
    super(TEMPLATE, 'button', [
      mainElevatedStyles,
      mainOutlinedStyles,
      mainSizeStyles,
      mainTextStyles,
      mainTonalStyles,
      mainIconStyles,
    ]);
    usePressAnimation(this);
  }
}

define('mx-icon-button', IconButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-icon-button': IconButton;
  }
}
