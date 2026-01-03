import type { EmptyObject } from 'type-fest';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import buttonTemplate from './button.tpl.html' with { type: 'html' };
import switchDefaultTokens from './styles/default/switch.tokens.css.ts?type=css' with { type: 'css' };
import mainElevatedStyles from './styles/elevated/main.ctr.css' with { type: 'css' };
import elevatedTokens from './styles/elevated/main.tokens.css.ts?type=css' with { type: 'css' };
import switchElevatedTokens from './styles/elevated/switch.tokens.css.ts?type=css' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.ctr.css' with { type: 'css' };
import outlinedTokens from './styles/outlined/main.tokens.css.ts?type=css' with { type: 'css' };
import switchOutlinedTokens from './styles/outlined/switch.tokens.css.ts?type=css' with { type: 'css' };
import switchSizeTokens from './styles/size/switch.tokens.css.ts?type=css' with { type: 'css' };
import tonalTokens from './styles/tonal/main.tokens.css.ts?type=css' with { type: 'css' };
import switchTonalTokens from './styles/tonal/switch.tokens.css.ts?type=css' with { type: 'css' };
import {
  createButtonAccessors,
  useButtonCore,
  type ButtonColor,
  type ButtonShape,
  type ButtonSize,
  type ButtonCoreProperties,
} from './useButtonCore.ts';
import {
  useSwitch,
  useSwitchAccessors,
  type SwitchAttributes,
  type SwitchLike,
} from './useSwitch.ts';

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
export default class SwitchButton
  extends ReactiveElement
  implements SwitchLike
{
  static readonly formAssociated = true;

  static {
    createButtonAccessors(this);
    useSwitchAccessors(this);
  }

  declare color: SwitchButtonColor | null;
  declare size: ButtonSize | null;
  declare shape: ButtonShape | null;
  declare disabled: boolean;
  declare checked: boolean;

  constructor() {
    super();
    useButtonCore(this, buttonTemplate, 'switch', [
      mainElevatedStyles,
      mainOutlinedStyles,
      elevatedTokens,
      outlinedTokens,
      tonalTokens,
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
