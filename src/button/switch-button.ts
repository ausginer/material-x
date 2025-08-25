import { define, template } from '../utils.ts';
import CoreButton, { type ButtonColor } from './core-button.ts';
import switchDefaultStyles from './default/switch.scss' with { type: 'css' };
import mainElevatedStyles from './elevated/main.scss' with { type: 'css' };
import switchElevatedStyles from './elevated/switch.scss' with { type: 'css' };
import mainOutlinedStyles from './outlined/main.scss' with { type: 'css' };
import switchOutlinedStyles from './outlined/switch.scss' with { type: 'css' };
import mainSizeStyles from './size/main.scss' with { type: 'css' };
import switchSizeStyles from './size/switch.scss' with { type: 'css' };
import switchTonalStyles from './tonal/switch.scss' with { type: 'css' };

const TEMPLATE = template`<slot name="icon"></slot><slot></slot>`;

export type SwitchButtonColor = Exclude<ButtonColor, 'text'>;

/**
 * @attr {string} color
 * @attr {string} size
 * @attr {boolean} disabled
 * @attr {boolean} checked
 */
export default class SwitchButton extends CoreButton {
  static readonly formAssociated = true;
  static readonly observedAttributes = ['checked', 'disabled'] as const;

  constructor() {
    super(TEMPLATE, 'switch', [
      mainElevatedStyles,
      mainOutlinedStyles,
      mainSizeStyles,
      switchDefaultStyles,
      switchElevatedStyles,
      switchOutlinedStyles,
      switchSizeStyles,
      switchTonalStyles,
    ]);
  }
}

define('mx-switch-button', SwitchButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-switch-button': SwitchButton;
  }
}
