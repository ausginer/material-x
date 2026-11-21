import {
  ControlledElement,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
import {
  type Linkable,
  useDisableableLinkable,
  useLinkable,
  type LinkableProps,
} from '@ydinjs/core/traits/linkable.js';
import type { EmptyObject, Simplify } from 'type-fest';
import type { FocusForwarding } from '../core/traits/focus-forwarding.ts';
import {
  type ButtonCoreTraits,
  useButtonCore,
  type ButtonCoreProps,
  type ButtonSharedCSSProperties,
} from './ButtonCore.ts';
import linkButtonTemplate from './link-button.tpl.html' with { type: 'html' };
import mainElevatedStyles from './styles/elevated/main.css.ts' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.css.ts' with { type: 'css' };
import mainTextStyles from './styles/text/main.css.ts' with { type: 'css' };
import mainTonalStyles from './styles/tonal/main.css.ts' with { type: 'css' };

export type LinkButtonProps = Simplify<ButtonCoreProps & LinkableProps>;
export type LinkButtonEvents = EmptyObject;
export type LinkButtonCSSProperties = ButtonSharedCSSProperties;

const LinkButtonConstructor: Composed<
  ControlledElementConstructor,
  [...ButtonCoreTraits, typeof Linkable, typeof FocusForwarding]
> = compose(ControlledElement);

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
export default class LinkButton extends LinkButtonConstructor {
  constructor() {
    super();
    useButtonCore(
      this,
      linkButtonTemplate,
      [mainElevatedStyles, mainOutlinedStyles, mainTextStyles, mainTonalStyles],
      { delegatesFocus: true },
    );

    const anchor = this.shadowRoot!.querySelector<HTMLAnchorElement>('.host')!;
    useLinkable(this, anchor);
    useDisableableLinkable(this, anchor);
  }
}

customElements.define('mx-link-button', LinkButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-link-button': LinkButton;
  }
}
