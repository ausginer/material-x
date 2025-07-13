import elevationCss from '../core/elevation/elevation.scss';
import { attachShadow, createTemplate, define } from '../utils.js';
import css from './button.scss' with { type: 'css' };
import linkButtonCss from './link-button.scss' with { type: 'css' };
import textButtonCss from './text-button.scss' with { type: 'css' };
import { AriaMapping } from './utils.js';

const template = createTemplate(
  `<a tabindex="-1"><slot name="icon"></slot><slot></slot></a>`,
);

/**
 * @attr {string} variant
 * @attr {boolean} disabled
 * @attr {string} href
 */
export default class LinkButton extends HTMLElement {
  static readonly observedAttributes = ['disabled', 'href', 'target'] as const;

  readonly #internals = this.attachInternals();
  readonly #anchor: HTMLAnchorElement;

  constructor() {
    super();
    const root = attachShadow(this, template, [
      css,
      elevationCss,
      textButtonCss,
      linkButtonCss,
    ]);
    this.tabIndex = 0;
    Object.assign(this.#internals, { role: 'link' });
    this.#anchor = root.querySelector('a')!;
  }

  attributeChangedCallback(
    name: (typeof LinkButton.observedAttributes)[number],
    _: string | null,
    newValue: string | null,
  ): void {
    if (name === 'disabled') {
      AriaMapping[name](this.#internals, newValue);
    } else {
      if (newValue != null) {
        this.#anchor.setAttribute(name, newValue);
      } else {
        this.#anchor.removeAttribute(name);
      }
    }
  }
}

define('mx-link-button', LinkButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-link-button': LinkButton;
  }
}
