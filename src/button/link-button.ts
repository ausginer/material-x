import { define, template } from '../utils.ts';
import CoreButton from './core-button.ts';
import mainElevatedStyles from './elevated/main.scss' with { type: 'css' };
import linkButtonStyles from './link-button.scss' with { type: 'css' };
import mainOutlinedStyles from './outlined/main.scss' with { type: 'css' };
import mainSizeStyles from './size/main.scss' with { type: 'css' };
import mainTextStyles from './text/main.scss' with { type: 'css' };
import tonalTextStyles from './tonal/main.scss' with { type: 'css' };

const TEMPLATE = template`<a tabindex="-1"><slot name="icon"></slot><slot></slot></a>`;

/**
 * @attr {string} flavor
 * @attr {string} size
 * @attr {boolean} disabled
 * @attr {string} href
 */
export default class LinkButton extends CoreButton {
  static readonly observedAttributes = ['disabled', 'href', 'target'] as const;

  constructor() {
    super(TEMPLATE, 'link', [
      mainElevatedStyles,
      mainOutlinedStyles,
      mainSizeStyles,
      mainTextStyles,
      linkButtonStyles,
      tonalTextStyles,
    ]);
  }
}

define('mx-link-button', LinkButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-link-button': LinkButton;
  }
}
