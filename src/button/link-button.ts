import elevationCss from '../core/elevation/elevation.scss';
import {
  ariaAttributes,
  attachShadow,
  createTemplate,
  define,
} from '../utils.js';
import css from './button.scss' with { type: 'css' };
import linkButtonCss from './link-button.scss' with { type: 'css' };

const template = createTemplate(
  `<a><slot name="icon"></slot><slot></slot></a>`,
);

/**
 * @attr {string} variant
 * @attr {boolean} disabled
 * @attr {string} href
 */
export default class LinkButton extends HTMLElement {
  static readonly observedAttributes: readonly string[] = [
    ...ariaAttributes,
    'href',
    'target',
  ];

  readonly #anchor: HTMLAnchorElement;

  constructor() {
    super();
    const root = attachShadow(this, template, [
      css,
      elevationCss,
      linkButtonCss,
    ]);
    this.#anchor = root.querySelector('a')!;
  }

  attributeChangedCallback(
    name: string,
    _: string | null,
    newValue: string | null,
  ): void {
    if (newValue != null) {
      this.#anchor.setAttribute(name, newValue);
    } else {
      this.#anchor.removeAttribute(name);
    }
  }
}

define('mx-link-button', LinkButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-link-button': LinkButton;
  }
}
