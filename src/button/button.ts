import { define, template } from '../utils.ts';
import CoreButton from './core-button.ts';
import mainElevatedStyles from './elevated/main.scss' with { type: 'css' };
import mainOutlinedStyles from './outlined/main.scss' with { type: 'css' };
import mainSizeStyles from './size/main.scss' with { type: 'css' };
import mainTextStyles from './text/main.scss' with { type: 'css' };
import tonalTextStyles from './tonal/main.scss' with { type: 'css' };

const TEMPLATE = template`<slot name="icon"></slot><slot></slot>`;

/**
 * @attr {string} flavor
 * @attr {string} size
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
  }
}

define('mx-button', Button);

declare global {
  interface HTMLElementTagNameMap {
    'mx-button': Button;
  }
}
