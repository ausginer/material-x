import {
  ControlledElement,
  define,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
import {
  type SwitchIconButtonCoreTraits,
  useIconButtonCore,
} from './IconButtonCore.ts';
import switchDefaultStyles from './styles/default/switch.css.ts' with { type: 'css' };
import mainElevatedStyles from './styles/elevated/main.css.ts' with { type: 'css' };
import switchElevatedStyles from './styles/elevated/switch.css.ts' with { type: 'css' };
import mainIconStyles from './styles/icon/main.css.ts' with { type: 'css' };
import switchIconStyles from './styles/icon/switch.css.ts' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.css.ts' with { type: 'css' };
import switchOutlinedStyles from './styles/outlined/switch.css.ts' with { type: 'css' };
import switchSizeStyles from './styles/size/switch.css.ts' with { type: 'css' };
import mainTonalStyles from './styles/tonal/main.css.ts' with { type: 'css' };
import switchTonalStyles from './styles/tonal/switch.css.ts' with { type: 'css' };
import switchIconButtonTemplate from './switch-icon-button.tpl.html' with { type: 'html' };
import { useSwitchCore } from './SwitchCore.ts';

const SwitchIconButtonConstructor: Composed<
  ControlledElementConstructor,
  SwitchIconButtonCoreTraits
> = compose(ControlledElement);

/**
 * @tag mx-switch-icon-button
 *
 * @summary Switch icon buttons expose icon-only button visuals with switch
 * semantics.
 *
 * @attr {"outlined"|"elevated"|"tonal"|"standard"} color - Visual style
 * variant. Omit to use the default filled style.
 * @attr {"xsmall"|"medium"|"large"|"xlarge"} size - Button size. Omit to use
 * the default (small) size.
 * @attr {"round"|"square"} shape - Button shape. Omit to use round corners.
 * @attr {"wide"|"narrow"} width - Container width style.
 * @attr {string} value - Submitted form value.
 * @attr {boolean} checked - Current switch checked state.
 * @attr {boolean} disabled - Disables interaction and form participation.
 *
 * @slot - Icon content.
 *
 * @csspart impl - Internal native button with the switch role: the visual
 * container and the focus target.
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
 * @event input - Fired after `click` when the switch is activated. The switch
 * is controlled: activation doesn't change `checked`.
 * @event change - Fired after `input` when the switch is activated.
 */
export default class SwitchIconButton extends SwitchIconButtonConstructor {
  static override formAssociated = true;

  constructor() {
    super();
    useSwitchCore(this, switchIconButtonTemplate, [
      mainElevatedStyles,
      mainOutlinedStyles,
      mainTonalStyles,
      mainIconStyles,
      switchDefaultStyles,
      switchElevatedStyles,
      switchOutlinedStyles,
      switchSizeStyles,
      switchTonalStyles,
      switchIconStyles,
    ]);

    useIconButtonCore(this);
  }
}

define('mx-switch-icon-button', SwitchIconButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-switch-icon-button': SwitchIconButton;
  }
}
