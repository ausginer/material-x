import type { EmptyObject } from 'type-fest';
import { useAttribute } from '../core/controllers/useAttribute.ts';
import { ATTRIBUTE, Str } from '../core/elements/attribute.ts';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import { $ } from '../core/utils/DOM.ts';
import linkButtonTemplate from './link-button.tpl.html' with { type: 'html' };
import mainElevatedStyles from './styles/elevated/main.ctr.css' with { type: 'css' };
import elevatedTokens from './styles/elevated/main.tokens.css.ts?type=css' with { type: 'css' };
import linkButtonStyles from './styles/link-button.ctr.css' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.ctr.css' with { type: 'css' };
import outlinedTokens from './styles/outlined/main.tokens.css.ts?type=css' with { type: 'css' };
import textTokens from './styles/text/main.tokens.css.ts?type=css' with { type: 'css' };
import tonalTokens from './styles/tonal/main.tokens.css.ts?type=css' with { type: 'css' };
import {
  createButtonAccessors,
  useButtonCore,
  type ButtonColor,
  type ButtonLike,
  type ButtonShape,
  type ButtonSize,
  type ButtonCoreProperties,
} from './useButtonCore.ts';

export type LinkButtonProperties = Readonly<
  ButtonCoreProperties & {
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
    createButtonAccessors(this, {
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
      linkButtonTemplate,
      'link',
      [
        mainElevatedStyles,
        mainOutlinedStyles,
        elevatedTokens,
        outlinedTokens,
        textTokens,
        linkButtonStyles,
        tonalTokens,
      ],
      { delegatesFocus: true },
    );

    const anchor = $(this, 'a')!;

    ['href', 'target'].map((attribute) => {
      useAttribute(this, attribute, (_, value) =>
        ATTRIBUTE.setRaw(anchor, attribute, value),
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
