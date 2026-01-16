import type { EmptyObject } from 'type-fest';
import { transfer, useAttributes } from '../core/controllers/useAttributes.ts';
import { useEvents } from '../core/controllers/useEvents.ts';
import { ATTRIBUTE, Str } from '../core/elements/attribute.ts';
import {
  impl,
  trait,
  type Accessors,
  type ConstructorWithTraits,
  type Trait,
  type TraitProps,
} from '../core/elements/impl.ts';
import {
  define,
  type ReactiveElement,
} from '../core/elements/reactive-element.ts';
import type { Disableable } from '../core/traits/disabled.ts';
import { $ } from '../core/utils/DOM.ts';
import linkButtonTemplate from './link-button.tpl.html' with { type: 'html' };
import mainElevatedStyles from './styles/elevated/main.ctr.css' with { type: 'css' };
import mainElevatedTokens from './styles/elevated/main.tokens.css.ts' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.ctr.css' with { type: 'css' };
import mainOutlinedTokens from './styles/outlined/main.tokens.css.ts' with { type: 'css' };
import mainTextTokens from './styles/text/main.tokens.css.ts' with { type: 'css' };
import mainTonalTokens from './styles/tonal/main.tokens.css.ts' with { type: 'css' };
import {
  ButtonCore,
  useButtonCore,
  type ButtonCoreProperties,
  type ButtonLike,
} from './useButtonCore.ts';

export type LinkButtonProperties = Readonly<
  ButtonCoreProperties & {
    href?: HTMLAnchorElement['href'];
    target?: HTMLAnchorElement['target'];
  }
>;

export type LinkButtonEvents = EmptyObject;
export type LinkButtonCSSProperties = EmptyObject;

export const LinkButtonLike: Trait<
  HTMLElement,
  Accessors<{ href: Str; target: Str }>
> = trait({ href: Str, target: Str });

export type LinkButtonLike = ButtonLike & TraitProps<typeof LinkButtonLike>;

const LinkButtonCore: ConstructorWithTraits<
  ReactiveElement,
  [typeof ButtonLike, typeof Disableable, typeof LinkButtonLike]
> = impl(ButtonCore, LinkButtonLike);

/**
 * @attr {string} color
 * @attr {string} size
 * @attr {string} shape
 * @attr {boolean} disabled
 * @attr {string} href
 * @attr {string} target
 */
export default class LinkButton extends LinkButtonCore {
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

    const target = $<HTMLAnchorElement>(this, '.host')!;

    useAttributes(this, {
      target: transfer(target, 'target'),
      href: (_, value) => {
        if (!this.disabled) {
          ATTRIBUTE.setRaw(target, 'href', value);
        }
      },
      disabled: (_, value) => {
        if (value != null) {
          // Disabling anchor element manually since it doesn't accept
          // standard `disabled` attribute.
          ATTRIBUTE.setRaw(target, 'aria-disabled', 'true');
          ATTRIBUTE.setRaw(target, 'tabindex', '-1');
          ATTRIBUTE.setRaw(target, 'href', null);
        } else {
          // restoring attributes from the host.
          for (const attr of ['aria-disabled', 'tabindex', 'href']) {
            ATTRIBUTE.setRaw(target, attr, ATTRIBUTE.getRaw(this, attr));
          }
        }
      },
    });

    useEvents(
      this,
      {
        click: (event) => {
          if (this.disabled) {
            event.preventDefault();
            event.stopPropagation();
          }
        },
      },
      target,
    );
  }
}

define('mx-link-button', LinkButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-link-button': LinkButton;
  }
}
