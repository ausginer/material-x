import type { EmptyObject, Simplify } from 'type-fest';
import { transfer, useAttributes } from '../core/controllers/useAttributes.ts';
import { useEvents } from '../core/controllers/useEvents.ts';
import { ATTRIBUTE, Str } from '../core/elements/attribute.ts';
import { define } from '../core/elements/reactive-element.ts';
import {
  impl,
  trait,
  type ConstructorWithTraits,
  type Interface,
  type Props,
  type Trait,
} from '../core/elements/traits.ts';
import { $ } from '../core/utils/DOM.ts';
import {
  ButtonCore,
  useButtonCore,
  type ButtonCoreProps,
  type ButtonSharedCSSProperties,
} from './ButtonCore.ts';
import linkButtonTemplate from './link-button.tpl.html' with { type: 'html' };
import mainElevatedStyles from './styles/elevated/main.css.ts' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.css.ts' with { type: 'css' };
import mainTextStyles from './styles/text/main.css.ts' with { type: 'css' };
import mainTonalStyles from './styles/tonal/main.css.ts' with { type: 'css' };

type LinkButtonLikeDescriptor = {
  href: HTMLAnchorElement['href'];
  target: HTMLAnchorElement['target'];
};

const $linkButtonLike: unique symbol = Symbol('LinkButtonLike');

export const LinkButtonLike: Trait<
  LinkButtonLikeDescriptor,
  typeof $linkButtonLike
> = trait<LinkButtonLikeDescriptor, typeof $linkButtonLike>(
  {
    href: Str,
    target: Str,
  },
  $linkButtonLike,
);

export type LinkButtonLike = Interface<typeof LinkButtonLike>;
export type LinkButtonLikeProps = Props<typeof LinkButtonLike>;

const LinkButtonCore: ConstructorWithTraits<
  InstanceType<typeof ButtonCore>,
  [typeof LinkButtonLike]
> = impl(ButtonCore, [LinkButtonLike]);

export type LinkButtonProps = Simplify<ButtonCoreProps & LinkButtonLikeProps>;
export type LinkButtonEvents = EmptyObject;
export type LinkButtonCSSProperties = ButtonSharedCSSProperties;

/**
 * @tag mx-link-button
 *
 * @summary Link buttons render as anchors for navigation actions with button
 * styling.
 *
 * @attr {"outlined"|"elevated"|"text"|"tonal"} color - Visual style variant.
 * Omit to use the default filled style.
 * @attr {"xsmall"|"medium"|"large"|"xlarge"} size - Button size. Omit to use
 * the default (small) size.
 * @attr {"round"|"square"} shape - Button shape. Omit to use round corners.
 * @attr {boolean} disabled - Disables interaction and removes navigation.
 * @attr {string} href - Link destination URL.
 * @attr {string} target - Navigation target (for example `_blank`).
 *
 * @slot - Button label/content.
 * @slot icon - Leading icon content.
 *
 * @csspart impl - Internal native anchor element.
 *
 * @cssprop --md-button-container-height - Overrides button height.
 * @cssprop --md-button-leading-space - Overrides start padding.
 * @cssprop --md-button-trailing-space - Overrides end padding.
 * @cssprop --md-button-icon-size - Overrides icon size.
 * @cssprop --md-button-icon-label-space - Overrides spacing between icon and
 * label.
 * @cssprop --md-button-label-text-line-height - Overrides label line height.
 * @cssprop --md-button-press-duration - Overrides press transition duration.
 * @cssprop --md-button-press-easing - Overrides press transition easing.
 *
 * @event click - Fired when the link button is activated.
 */
export default class LinkButton extends LinkButtonCore {
  constructor() {
    super();
    useButtonCore(
      this,
      linkButtonTemplate,
      [mainElevatedStyles, mainOutlinedStyles, mainTextStyles, mainTonalStyles],
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
