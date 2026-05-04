import type { EmptyObject, Simplify } from 'type-fest';
import { define } from 'ydin/element.js';
import {
  Linkable,
  type LinkableProps,
  useLinkable,
  useDisableableLinkable,
} from 'ydin/traits/linkable.js';
import { impl, type TraitedConstructor } from 'ydin/traits/traits.js';
import { $ } from 'ydin/utils/DOM.js';
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

const LinkButtonCore: TraitedConstructor<
  ButtonCore,
  typeof ButtonCore,
  [typeof Linkable]
> = impl(ButtonCore, [Linkable]);

export type LinkButtonProps = Simplify<ButtonCoreProps & LinkableProps>;
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

    const anchor = $<HTMLAnchorElement>(this, '.host')!;
    useLinkable(this, anchor);
    useDisableableLinkable(this, anchor);
  }
}

define('mx-link-button', LinkButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-link-button': LinkButton;
  }
}
