import { define } from 'ydin/element.js';
import { useFormActivation } from '../core/utils/events.ts';
import { useButtonCore } from './ButtonCore.ts';
import iconButtonTemplate from './icon-button.tpl.html' with { type: 'html' };
import { IconButtonCore, useIconButtonCore } from './IconButtonCore.ts';
import mainElevatedStyles from './styles/elevated/main.css.ts' with { type: 'css' };
import mainIconStyles from './styles/icon/main.css.ts' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.css.ts' with { type: 'css' };
import mainTextStyles from './styles/text/main.css.ts' with { type: 'css' };
import mainTonalStyles from './styles/tonal/main.css.ts' with { type: 'css' };

/**
 * @tag mx-icon-button
 *
 * @summary Icon buttons communicate compact actions with icon-only content.
 *
 * @attr {"outlined"|"elevated"|"tonal"|"standard"} color - Visual style
 * variant. Omit to use the default filled style.
 * @attr {"xsmall"|"medium"|"large"|"xlarge"} size - Button size. Omit to use
 * the default (small) size.
 * @attr {"round"|"square"} shape - Button shape. Omit to use round corners.
 * @attr {"wide"|"narrow"} width - Container width style.
 * @attr {boolean} disabled - Disables interaction and form participation.
 *
 * @slot - Icon content.
 *
 * @csspart impl - Internal native button element.
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
 * @event click - Fired when the button is activated.
 */
export default class IconButton extends IconButtonCore {
  static override readonly formAssociated = true;

  constructor() {
    super();
    useButtonCore(this, iconButtonTemplate, [
      mainElevatedStyles,
      mainOutlinedStyles,
      mainTextStyles,
      mainTonalStyles,
      mainIconStyles,
    ]);

    useIconButtonCore(this);
    useFormActivation(this);
  }
}

define('mx-icon-button', IconButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-icon-button': IconButton;
  }
}
