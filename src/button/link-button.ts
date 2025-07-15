import { createTemplate, define } from '../utils.ts';
import CoreButton from './core-button.js';
import linkButtonCss from './link-button.scss' with { type: 'css' };
import textButtonCss from './text-button.scss' with { type: 'css' };

const template = createTemplate(
  `<a tabindex="-1"><slot name="icon"></slot><slot></slot></a>`,
);

/**
 * @attr {string} flavor
 * @attr {string} size
 * @attr {boolean} disabled
 * @attr {string} href
 */
export default class LinkButton extends CoreButton {
  static readonly observedAttributes = ['disabled', 'href', 'target'] as const;

  constructor() {
    super(template, 'link', [textButtonCss, linkButtonCss]);
  }
}

define('mx-link-button', LinkButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-link-button': LinkButton;
  }
}
