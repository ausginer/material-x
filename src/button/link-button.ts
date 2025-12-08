import type { EmptyObject } from 'type-fest';
import { useAttribute } from '../core/controllers/useAttribute.ts';
import { attr, Str } from '../core/elements/attribute.ts';
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
  useButtonAccessors,
  useButtonCore,
  type ButtonColor,
  type ButtonLike,
  type ButtonShape,
  type ButtonSize,
  type CoreButtonProperties,
} from './useButtonCore.ts';

export type LinkButtonProperties = Readonly<
  CoreButtonProperties & {
    href?: HTMLAnchorElement['href'];
    target?: HTMLAnchorElement['target'];
  }
>;

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
  static {
    useButtonAccessors(this, {
      href: Str,
      target: Str,
    });
  }

  declare href: string | null;
  declare target: string | null;
  declare color: ButtonColor | null;
  declare size: ButtonSize | null;
  declare shape: ButtonShape | null;
  declare disabled: boolean;

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

    const anchor = query(this, 'a')!;

    ['href', 'target'].map((attribute) => {
      useAttribute(this, attribute, (_, value) =>
        attr.setRaw(anchor, attribute, value),
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
