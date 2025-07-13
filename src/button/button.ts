import elevationCss from '../core/elevation/elevation.scss' with { type: 'css' };
import { attachShadow, createTemplate, define } from '../utils.js';
import buttonCss from './button.scss' with { type: 'css' };
import textButtonCss from './text-button.scss' with { type: 'css' };
import { AriaMapping } from './utils.js';

const template = createTemplate('<slot name="icon"></slot><slot></slot>');

export type ButtonVariant = 'outlined' | 'filled-tonal' | 'elevated' | 'text';

/**
 * @attr {string} variant
 * @attr {boolean|undefined} disabled
 */
export default class Button extends HTMLElement {
  static readonly observedAttributes = ['disabled'] as const;
  readonly #internals = this.attachInternals();

  constructor() {
    super();
    attachShadow(this, template, [buttonCss, elevationCss, textButtonCss]);
    this.tabIndex = 0;
    Object.assign(this.#internals, { role: 'button' });
  }

  attributeChangedCallback(
    name: (typeof Button.observedAttributes)[number],
    _: string | null,
    newValue: string | null,
  ): void {
    AriaMapping[name](this.#internals, newValue);
  }
}

define('mx-button', Button);

declare global {
  interface HTMLElementTagNameMap {
    'mx-button': Button;
  }
}
