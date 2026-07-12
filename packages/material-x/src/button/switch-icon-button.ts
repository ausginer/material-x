import {
  ControlledElement,
  define,
  type ControlledElementConstructor,
} from 'ydin/element.js';
import { impl, type TraitedConstructor } from 'ydin/traits/traits.js';
import {
  SWITCH_ICON_BUTTON_CORE_TRAITS,
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

export type SwitchIconButtonConstructor = TraitedConstructor<
  ControlledElement,
  ControlledElementConstructor,
  typeof SWITCH_ICON_BUTTON_CORE_TRAITS
>;

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
 * @csspart impl - Visual button container.
 * @csspart control - Internal native checkbox control.
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
 * @event input - Fired when switch interaction occurs.
 * @event change - Fired when switch interaction occurs.
 */
const SwitchIconButton: SwitchIconButtonConstructor = impl(
  ControlledElement,
  SWITCH_ICON_BUTTON_CORE_TRAITS,
)(
  (Base) =>
    class extends Base {
      static readonly formAssociated = true;

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
    },
);
type SwitchIconButton = InstanceType<typeof SwitchIconButton>;

export default SwitchIconButton;

define('mx-switch-icon-button', SwitchIconButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-switch-icon-button': SwitchIconButton;
  }
}
