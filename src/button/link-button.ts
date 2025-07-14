import elevationCss from '../core/elevation/elevation.scss';
import { createTemplate, define } from '../utils.ts';
import css from './button.scss' with { type: 'css' };
import CoreElement from './core.js';
import linkButtonCss from './link-button.scss' with { type: 'css' };
import textButtonCss from './text-button.scss' with { type: 'css' };

const template = createTemplate(
  `<a tabindex="-1"><slot name="icon"></slot><slot></slot></a>`,
);

/**
 * @attr {string} variant
 * @attr {boolean} disabled
 * @attr {string} href
 */
export default class LinkButton extends CoreElement {
  static readonly observedAttributes = ['disabled', 'href', 'target'] as const;

  constructor() {
    super(template, { role: 'link' }, [
      css,
      elevationCss,
      textButtonCss,
      linkButtonCss,
    ]);
    this.tabIndex = 0;
  }
}

define('mx-link-button', LinkButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-link-button': LinkButton;
  }
}
