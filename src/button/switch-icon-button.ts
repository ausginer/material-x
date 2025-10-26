import { define, template } from '../core/elements/core-element.ts';
import { usePressAnimation } from '../core/utils/button.ts';
import CoreButton from './core-button.ts';
import switchDefaultStyles from './default/switch.css.ts?type=css' with { type: 'css' };
import mainElevatedStyles from './elevated/main.css.ts?type=css' with { type: 'css' };
import switchElevatedStyles from './elevated/switch.css.ts?type=css' with { type: 'css' };
import mainIconStyles from './icon/main.css.ts?type=css' with { type: 'css' };
import switchIconStyles from './icon/switch.css.ts?type=css' with { type: 'css' };
import type { IconButtonAttributes } from './icon-button.ts';
import mainOutlinedStyles from './outlined/main.css.ts?type=css' with { type: 'css' };
import switchOutlinedStyles from './outlined/switch.css.ts?type=css' with { type: 'css' };
import mainSizeStyles from './size/main.css.ts?type=css' with { type: 'css' };
import switchSizeStyles from './size/switch.css.ts?type=css' with { type: 'css' };
import type { SwitchButtonColor } from './switch-button.ts';
import mainTonalStyles from './tonal/main.css.ts?type=css' with { type: 'css' };
import switchTonalStyles from './tonal/switch.css.ts?type=css' with { type: 'css' };

const TEMPLATE = template`<slot name="icon"></slot>`;

export type SwitchIconButtonAttributes = Readonly<
  IconButtonAttributes & {
    color?: SwitchButtonColor;
    checked?: boolean;
  }
>;

/**
 * @summary Buttons communicate actions that people can take. They are typically
 * placed throughout the UI, in places like:
 *
 * - Dialogs
 * - Modal windows
 * - Forms
 * - Cards
 * - Toolbars
 *
 * They can also be placed within standard button groups.
 *
 * @attr {string} color
 * @attr {string} size
 * @attr {string} shape
 * @attr {string} width
 * @attr {boolean|undefined} checked
 * @attr {boolean|undefined} disabled
 */
export default class SwitchIconButton extends CoreButton {
  static readonly formAssociated = true;
  static readonly observedAttributes = ['disabled'] as const;

  constructor() {
    super(TEMPLATE, 'button', [
      mainElevatedStyles,
      mainOutlinedStyles,
      mainSizeStyles,
      mainTonalStyles,
      mainIconStyles,
      switchDefaultStyles,
      switchElevatedStyles,
      switchOutlinedStyles,
      switchSizeStyles,
      switchTonalStyles,
      switchIconStyles,
    ]);
    usePressAnimation(this);
  }
}

define('mx-switch-icon-button', SwitchIconButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-switch-icon-button': SwitchIconButton;
  }
}
