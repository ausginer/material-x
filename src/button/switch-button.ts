import type { EmptyObject } from 'type-fest';
import { define } from '../core/elements/reactive-element.ts';
import buttonTemplate from './button.tpl.html' with { type: 'html' };
import switchDefaultTokens from './styles/default/switch.tokens.css.ts' with { type: 'css' };
import mainElevatedStyles from './styles/elevated/main.ctr.css' with { type: 'css' };
import mainElevatedTokens from './styles/elevated/main.tokens.css.ts' with { type: 'css' };
import switchElevatedTokens from './styles/elevated/switch.tokens.css.ts' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.ctr.css' with { type: 'css' };
import mainOutlinedTokens from './styles/outlined/main.tokens.css.ts' with { type: 'css' };
import switchOutlinedTokens from './styles/outlined/switch.tokens.css.ts' with { type: 'css' };
import switchSizeTokens from './styles/size/switch.tokens.css.ts' with { type: 'css' };
import mainTonalTokens from './styles/tonal/main.tokens.css.ts' with { type: 'css' };
import switchTonalTokens from './styles/tonal/switch.tokens.css.ts' with { type: 'css' };
import {
  useButtonCore,
  type ButtonColor,
  type ButtonCoreProperties,
} from './useButtonCore.ts';
import { SwitchCore, useSwitch, type SwitchAttributes } from './useSwitch.ts';

export type SwitchButtonColor = Exclude<ButtonColor, 'text'>;

export type SwitchButtonProperties = ButtonCoreProperties &
  SwitchAttributes &
  Readonly<{
    color?: SwitchButtonColor;
  }>;
export type SwitchButtonEvents = EmptyObject;
export type SwitchButtonCSSProperties = EmptyObject;

/**
 * @attr {string} color
 * @attr {string} size
 * @attr {string} shape
 * @attr {boolean} disabled
 * @attr {boolean} checked
 * @attr {string} value
 */
export default class SwitchButton extends SwitchCore {
  static readonly formAssociated = true;

  constructor() {
    super();
    useButtonCore(this, buttonTemplate, [
      mainElevatedStyles,
      mainOutlinedStyles,
      mainElevatedTokens,
      mainOutlinedTokens,
      mainTonalTokens,
      switchDefaultTokens,
      switchElevatedTokens,
      switchOutlinedTokens,
      switchSizeTokens,
      switchTonalTokens,
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
