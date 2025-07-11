import {
  attachInternals,
  attachShadow,
  createTemplate,
  define,
  setDefaultAttributes,
} from '../utils.js';
import css from './button.scss' with { type: 'css' };

const template = createTemplate('<slot name="icon"></slot><slot></slot>');

export type ButtonVariant = 'outlined' | 'filled-tonal' | 'elevated' | 'text';

/**
 * @attr {ButtonVariant} variant
 * @attr {boolean|undefined} disabled
 */
export default class Button extends HTMLElement {
  static formAssociated = true;

  constructor() {
    super();
    attachShadow(this, template, [css]);
    attachInternals(this, { role: 'button' });
    setDefaultAttributes(this, { tabindex: '0' });
  }
}

define('mx-button', Button);

declare global {
  interface HTMLElementTagNameMap {
    'mx-button': Button;
  }
}
