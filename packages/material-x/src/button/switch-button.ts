import {
  ControlledElement,
  define,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import {
  impl,
  type TraitedConstructor,
} from '@ydinjs/core/traits/attributes.js';
import { focusControl } from '../core/utils/useCore.ts';
import type {
  ButtonColor,
  ButtonCoreProps,
  ButtonSharedCSSProperties,
} from './ButtonCore.ts';
import switchDefaultStyles from './styles/default/switch.css.ts' with { type: 'css' };
import mainElevatedStyles from './styles/elevated/main.css.ts' with { type: 'css' };
import switchElevatedStyles from './styles/elevated/switch.css.ts' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.css.ts' with { type: 'css' };
import switchOutlinedStyles from './styles/outlined/switch.css.ts' with { type: 'css' };
import switchSizeStyles from './styles/size/switch.css.ts' with { type: 'css' };
import mainTonalStyles from './styles/tonal/main.css.ts' with { type: 'css' };
import switchTonalStyles from './styles/tonal/switch.css.ts' with { type: 'css' };
import switchButtonTemplate from './switch-button.tpl.html' with { type: 'html' };
import {
  SWITCH_CORE_TRAITS,
  useSwitchCore,
  type SwitchEvents,
  type SwitchProps,
} from './SwitchCore.ts';

export type SwitchButtonColor = Exclude<ButtonColor, 'text'>;

export type SwitchButtonProperties = ButtonCoreProps &
  SwitchProps &
  Readonly<{
    color?: SwitchButtonColor;
  }>;
export type SwitchButtonEvents = SwitchEvents;
export type SwitchButtonCSSProperties = ButtonSharedCSSProperties;

const SwitchButtonConstructor: TraitedConstructor<
  ControlledElement,
  ControlledElementConstructor,
  typeof SWITCH_CORE_TRAITS
> = impl(ControlledElement, SWITCH_CORE_TRAITS);

/**
 * @tag mx-switch-button
 *
 * @summary Switch buttons expose button visuals with switch semantics.
 *
 * @attr {"outlined"|"elevated"|"tonal"} color - Visual style variant. Omit to
 * use the default filled style.
 * @attr {"xsmall"|"medium"|"large"|"xlarge"} size - Button size. Omit to use
 * the default (small) size.
 * @attr {"round"|"square"} shape - Button shape. Omit to use round corners.
 * @attr {boolean} disabled - Disables interaction and form participation.
 * @attr {boolean} checked - Current switch checked state.
 * @attr {string} value - Submitted form value.
 *
 * @slot - Button label/content.
 * @slot icon - Leading icon content.
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
export default class SwitchButton extends SwitchButtonConstructor {
  static override formAssociated = true;

  constructor() {
    super();
    useSwitchCore(this, switchButtonTemplate, [
      mainElevatedStyles,
      mainOutlinedStyles,
      mainTonalStyles,
      switchDefaultStyles,
      switchElevatedStyles,
      switchOutlinedStyles,
      switchSizeStyles,
      switchTonalStyles,
    ]);
  }

  override focus(options?: FocusOptions): void {
    focusControl(this, options);
  }
}

define('mx-switch-button', SwitchButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-switch-button': SwitchButton;
  }
}
