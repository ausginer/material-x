import { createTemplate, define } from '../utils.ts';
import CoreButton from './core-button.js';
import type { ButtonFlavor } from './core-button.ts';
import switchButtonCss from './switch-button.scss' with { type: 'css' };

const template = createTemplate(`<slot name="icon"></slot><slot></slot>`);

export type SwitchButtonFlavor = Exclude<ButtonFlavor, 'text'>;

/**
 * @attr {string} flavor
 * @attr {string} size
 * @attr {boolean} disabled
 * @attr {boolean} checked
 */
export default class SwitchButton extends CoreButton {
  static readonly formAssociated = true;
  static readonly observedAttributes = ['checked', 'disabled'] as const;

  constructor() {
    super(template, 'switch', [switchButtonCss]);
  }
}

define('mx-switch-button', SwitchButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-switch-button': SwitchButton;
  }
}
