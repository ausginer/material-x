import type { EmptyObject } from 'type-fest';
import { define } from '../core/elements/reactive-element.ts';
import buttonTemplate from './button.tpl.html' with { type: 'html' };
import {
  useButtonCore,
  type ButtonColor,
  type ButtonCoreProps,
  type ButtonSharedCSSProperties,
} from './ButtonCore.ts';
import switchDefaultStyles from './styles/default/switch.css.ts' with { type: 'css' };
import mainElevatedStyles from './styles/elevated/main.css.ts' with { type: 'css' };
import switchElevatedStyles from './styles/elevated/switch.css.ts' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.css.ts' with { type: 'css' };
import switchOutlinedStyles from './styles/outlined/switch.css.ts' with { type: 'css' };
import switchSizeStyles from './styles/size/switch.css.ts' with { type: 'css' };
import mainTonalStyles from './styles/tonal/main.css.ts' with { type: 'css' };
import switchTonalStyles from './styles/tonal/switch.css.ts' with { type: 'css' };
import { SwitchCore, useSwitch, type SwitchProps } from './SwitchCore.ts';

export type SwitchButtonColor = Exclude<ButtonColor, 'text'>;

export type SwitchButtonProperties = ButtonCoreProps &
  SwitchProps &
  Readonly<{
    color?: SwitchButtonColor;
  }>;
export type SwitchButtonEvents = EmptyObject;
export type SwitchButtonCSSProperties = ButtonSharedCSSProperties;

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
 * @event input - Fired when switch interaction occurs.
 * @event change - Fired when switch interaction occurs.
 */
export default class SwitchButton extends SwitchCore {
  static readonly formAssociated = true;

  constructor() {
    super();
    useButtonCore(this, buttonTemplate, [
      mainElevatedStyles,
      mainOutlinedStyles,
      mainTonalStyles,
      switchDefaultStyles,
      switchElevatedStyles,
      switchOutlinedStyles,
      switchSizeStyles,
      switchTonalStyles,
    ]);
    useSwitch(this);
  }
}

define('mx-switch-button', SwitchButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-switch-button': SwitchButton;
  }
}
