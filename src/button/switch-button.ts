import elevationCss from '../core/elevation/elevation.scss';
import { createTemplate, define } from '../utils.ts';
import buttonCss from './button.scss' with { type: 'css' };
import type { ButtonVariant } from './button.ts';
import CoreElement from './core.js';
import switchButtonCss from './switch-button.scss' with { type: 'css' };

const template = createTemplate(`<slot name="icon"></slot><slot></slot>`);

export type SwitchButtonVariant = Exclude<ButtonVariant, 'text'>;

/**
 * @attr {string} variant
 * @attr {boolean} disabled
 * @attr {boolean} checked
 */
export default class SwitchButton extends CoreElement {
  static readonly formAssociated = true;
  static readonly observedAttributes = ['checked', 'disabled'] as const;

  constructor() {
    super(template, { role: 'switch' }, [
      buttonCss,
      elevationCss,
      switchButtonCss,
    ]);
    this.tabIndex = 0;
  }
}

define('mx-switch-button', SwitchButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-switch-button': SwitchButton;
  }
}
