import type { EmptyObject } from 'type-fest';
import { useAttribute } from '../core/controllers/useAttribute.ts';
import { Attribute } from '../core/elements/attribute.ts';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import { query } from '../core/utils/DOM.ts';
import mainElevatedStyles from './styles/elevated/main.css.ts?type=css' with { type: 'css' };
import linkButtonStyles from './styles/link-button.css.ts?type=css' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.css.ts?type=css' with { type: 'css' };
import mainSizeStyles from './styles/size/main.css.ts?type=css' with { type: 'css' };
import mainTextStyles from './styles/text/main.css.ts?type=css' with { type: 'css' };
import tonalStyles from './styles/tonal/main.css.ts?type=css' with { type: 'css' };
import { LINK_TEMPLATE } from './template.ts';
import {
  useButtonCore,
  type ButtonLike,
  type CoreButtonAttributes,
} from './useButtonCore.ts';

export type LinkButtonAttributes = Readonly<
  CoreButtonAttributes & {
    href?: HTMLAnchorElement['href'];
    target?: HTMLAnchorElement['target'];
  }
>;

export type LinkButtonProperties = EmptyObject;
export type LinkButtonEvents = EmptyObject;
export type LinkButtonCSSProperties = EmptyObject;

/**
 * @attr {string} color
 * @attr {string} size
 * @attr {string} shape
 * @attr {boolean} disabled
 * @attr {string} href
 * @attr {string} target
 */
export default class LinkButton extends ReactiveElement implements ButtonLike {
  static readonly observedAttributes = ['disabled', 'href', 'target'] as const;

  constructor() {
    super();
    useButtonCore(
      this,
      LINK_TEMPLATE,
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
    ['href', 'target'].map((attr) => {
      const inner = Attribute.string(query(this, 'a')!, attr);

      useAttribute(Attribute.string(this, attr), (_, value) =>
        inner.set(value),
      );
    });
  }
}

define('mx-link-button', LinkButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-link-button': LinkButton;
  }
}
