import type { EmptyObject } from 'type-fest';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import switchDefaultStyles from './styles/default/switch.css.ts?type=css' with { type: 'css' };
import mainElevatedStyles from './styles/elevated/main.css.ts?type=css' with { type: 'css' };
import switchElevatedStyles from './styles/elevated/switch.css.ts?type=css' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.css.ts?type=css' with { type: 'css' };
import switchOutlinedStyles from './styles/outlined/switch.css.ts?type=css' with { type: 'css' };
import mainSizeStyles from './styles/size/main.css.ts?type=css' with { type: 'css' };
import switchSizeStyles from './styles/size/switch.css.ts?type=css' with { type: 'css' };
import mainTonalStyles from './styles/tonal/main.css.ts?type=css' with { type: 'css' };
import switchTonalStyles from './styles/tonal/switch.css.ts?type=css' with { type: 'css' };
import { REGULAR_TEMPLATE } from './template.ts';
import {
  useButtonAccessors,
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
    useButtonAccessors(this);
    useSwitchAccessors(this);
  }

  declare color: SwitchButtonColor | null;
  declare size: ButtonSize | null;
  declare shape: ButtonShape | null;
  declare disabled: boolean;
  declare checked: boolean;

  constructor() {
    super();
    useButtonCore(this, REGULAR_TEMPLATE, 'switch', [
      mainElevatedStyles,
      mainOutlinedStyles,
      mainSizeStyles,
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
