import type { EmptyObject } from 'type-fest';
import { useAttributeTransfer } from '../core/controllers/useAttribute.ts';
import { Str } from '../core/elements/attribute.ts';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import { $ } from '../core/utils/DOM.ts';
import linkButtonTemplate from './link-button.tpl.html' with { type: 'html' };
import mainElevatedStyles from './styles/elevated/main.ctr.css' with { type: 'css' };
import mainElevatedTokens from './styles/elevated/main.tokens.css.ts' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.ctr.css' with { type: 'css' };
import mainOutlinedTokens from './styles/outlined/main.tokens.css.ts' with { type: 'css' };
import mainTextTokens from './styles/text/main.tokens.css.ts' with { type: 'css' };
import mainTonalTokens from './styles/tonal/main.tokens.css.ts' with { type: 'css' };
import {
  createButtonAccessors,
  useButtonCore,
  type ButtonColor,
  type ButtonCoreProperties,
  type ButtonLike,
  type ButtonShape,
  type ButtonSize,
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
      [
        mainElevatedStyles,
        mainOutlinedStyles,
        mainElevatedTokens,
        mainOutlinedTokens,
        mainTextTokens,
        mainTonalTokens,
      ],
      { delegatesFocus: true },
    );

    useAttributeTransfer(this, $(this, '.host')!, {
      href: 'href',
      target: 'target',
      disabled: 'disabled',
    });
  }
}

define('mx-link-button', LinkButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-link-button': LinkButton;
  }
}
