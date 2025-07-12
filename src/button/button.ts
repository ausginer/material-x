import elevationCss from '../core/elevation/elevation.scss' with { type: 'css' };
import {
  attachShadow,
  createTemplate,
  define,
  setDefaultAttributes,
} from '../utils.js';
import buttonCss from './button.scss' with { type: 'css' };
import { AriaMapping } from './utils.js';

const template = createTemplate('<slot name="icon"></slot><slot></slot>');

export type ButtonVariant = 'outlined' | 'filled-tonal' | 'elevated' | 'text';

/**
 * @attr {string} variant
 * @attr {boolean|undefined} disabled
 */
export default class Button extends HTMLElement {
  readonly #internals: ElementInternals;

  constructor() {
    super();
    attachShadow(this, template, [buttonCss, elevationCss]);
    setDefaultAttributes(this, { tabindex: '0' });
    this.#internals = Object.assign(this.attachInternals(), {
      role: 'button',
    });
  }

  attributeChangedCallback(
    name: string,
    _: string | null,
    newValue: string | null,
  ): void {
    if (name in AriaMapping) {
      this.#internals[
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        AriaMapping[name as keyof AriaMapping]
      ] = newValue;
    }
  }
}

define('mx-button', Button);

declare global {
  interface HTMLElementTagNameMap {
    'mx-button': Button;
  }
}
