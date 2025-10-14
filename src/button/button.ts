import { define, template } from '../core/elements/core-element.ts';
import { usePressAnimation } from '../core/utils/button.ts';
import CoreButton from './core-button.ts';
import mainElevatedStyles from './elevated/main.styles.ts?type=css' with { type: 'css' };
import mainOutlinedStyles from './outlined/main.styles.ts?type=css' with { type: 'css' };
import mainSizeStyles from './size/main.styles.ts?type=css' with { type: 'css' };
import mainTextStyles from './text/main.styles.ts?type=css' with { type: 'css' };
import tonalTextStyles from './tonal/main.styles.ts?type=css' with { type: 'css' };

const TEMPLATE = template`<slot name="icon"></slot><slot></slot>`;

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
 * @attr {boolean|undefined} disabled
 */
export default class Button extends CoreButton {
  static readonly formAssociated = true;
  static readonly observedAttributes = ['disabled'] as const;

  constructor() {
    super(TEMPLATE, 'button', [
      mainElevatedStyles,
      mainOutlinedStyles,
      mainSizeStyles,
      mainTextStyles,
      tonalTextStyles,
    ]);
    usePressAnimation(this);
  }
}

define('mx-button', Button);

declare global {
  interface HTMLElementTagNameMap {
    'mx-button': Button;
  }
}
