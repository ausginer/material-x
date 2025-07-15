import { createTemplate, define } from '../utils.ts';
import CoreButton from './core-button.ts';
import textButtonCss from './text-button.scss' with { type: 'css' };

const template = createTemplate('<slot name="icon"></slot><slot></slot>');

/**
 * @attr {string} flavor
 * @attr {string} size
 * @attr {boolean|undefined} disabled
 */
export default class Button extends CoreButton {
  static readonly formAssociated = true;
  static readonly observedAttributes = ['disabled'] as const;

  constructor() {
    super(template, 'button', [textButtonCss]);
  }
}

define('mx-button', Button);

declare global {
  interface HTMLElementTagNameMap {
    'mx-button': Button;
  }
}
