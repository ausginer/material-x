import elevationCss from '../core/elevation/elevation.scss';
import { attachShadow, createTemplate, define } from '../utils.js';
import buttonCss from './button.scss' with { type: 'css' };
import switchButtonCss from './switch-button.scss' with { type: 'css' };
import { AriaMapping } from './utils.js';

const template = createTemplate(`<slot name="icon"></slot><slot></slot>`);

/**
 * @attr {string} variant
 * @attr {boolean} disabled
 * @attr {boolean} checked
 */
export default class SwitchButton extends HTMLElement {
  static readonly observedAttributes: readonly string[] = [
    'checked',
    'disabled',
  ];

  readonly #internals: ElementInternals;

  constructor() {
    super();
    attachShadow(this, template, [buttonCss, elevationCss, switchButtonCss]);
    this.#internals = Object.assign(this.attachInternals(), { role: 'switch' });
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

define('mx-switch-button', SwitchButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-switch-button': SwitchButton;
  }
}
