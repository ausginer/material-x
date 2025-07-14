import elevationCss from '../core/elevation/elevation.scss' with { type: 'css' };
import { createTemplate, define } from '../utils.ts';
import buttonCss from './button.scss' with { type: 'css' };
import CoreElement from './core.js';
import textButtonCss from './text-button.scss' with { type: 'css' };

const template = createTemplate('<slot name="icon"></slot><slot></slot>');

export type ButtonVariant = 'outlined' | 'filled-tonal' | 'elevated' | 'text';

/**
 * @attr {string} variant
 * @attr {boolean|undefined} disabled
 */
export default class Button extends CoreElement {
  static readonly formAssociated = true;
  static readonly observedAttributes = ['disabled'] as const;

  constructor() {
    super(template, { role: 'button' }, [
      buttonCss,
      elevationCss,
      textButtonCss,
    ]);
    this.tabIndex = 0;
  }
}

define('mx-button', Button);

declare global {
  interface HTMLElementTagNameMap {
    'mx-button': Button;
  }
}
