import { useAttribute } from '../core/elements/useAttribute.ts';
import {
  define,
  html,
  ReactiveElement,
} from '../core/elements/reactive-element.ts';
import { useButtonCore, type CoreButtonAttributes } from './useButtonCore.ts';
import mainElevatedStyles from './elevated/main.css.ts?type=css' with { type: 'css' };
import linkButtonStyles from './link-button.css.ts?type=css' with { type: 'css' };
import mainOutlinedStyles from './outlined/main.css.ts?type=css' with { type: 'css' };
import mainSizeStyles from './size/main.css.ts?type=css' with { type: 'css' };
import mainTextStyles from './text/main.css.ts?type=css' with { type: 'css' };
import tonalStyles from './tonal/main.css.ts?type=css' with { type: 'css' };
import { useButtonPressAnimation } from './useButtonPressAnimation.ts';
import { AttributeManager } from '../core/elements/attribute-manager.ts';

export type LinkButtonAttributes = CoreButtonAttributes;

const TEMPLATE = html`<a><slot name="icon"></slot><slot></slot></a>`;

/**
 * @attr {string} color
 * @attr {string} size
 * @attr {string} shape
 * @attr {boolean} disabled
 * @attr {string} href
 * @attr {string} target
 */
export default class LinkButton extends ReactiveElement {
  static readonly observedAttributes = ['disabled', 'href', 'target'] as const;

  constructor() {
    super();
    useButtonCore(
      this,
      TEMPLATE,
      'link',
      [
        mainElevatedStyles,
        mainOutlinedStyles,
        mainSizeStyles,
        mainTextStyles,
        linkButtonStyles,
        tonalStyles,
      ],
      { delegatesFocus: true },
    );
    useButtonPressAnimation(this);
    this.#useAttributeObserver('href');
    this.#useAttributeObserver('target');
  }

  #useAttributeObserver(attribute: string) {
    const linkAttribute = new AttributeManager(
      this.shadowRoot!.querySelector('a')!,
      attribute,
      String,
    );
    useAttribute(this, attribute, String).on((_, value) =>
      linkAttribute.set(value),
    );
  }
}

define('mx-link-button', LinkButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-link-button': LinkButton;
  }
}
