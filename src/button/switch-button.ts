import { Attribute } from '../core/elements/attribute.ts';
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
  useButtonCore,
  type ButtonColor,
  type ButtonLike,
  type CoreButtonAttributes,
} from './useButtonCore.ts';
import { useSwitch, type SwitchAttributes } from './useSwitch.ts';

export type SwitchButtonColor = Exclude<ButtonColor, 'text'>;

export type SwitchButtonAttributes = CoreButtonAttributes &
  SwitchAttributes &
  Readonly<{
    color?: SwitchButtonColor;
  }>;

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
  implements ButtonLike
{
  static readonly formAssociated = true;
  static readonly observedAttributes = ['checked', 'disabled'] as const;

  readonly #checked = Attribute.bool(this, 'checked');

  constructor() {
    super();
    const self = this;
    useButtonCore(self, REGULAR_TEMPLATE, 'switch', [
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
    useSwitch(self, self.#checked);
  }

  get checked(): boolean {
    return this.#checked.get();
  }

  set checked(value: boolean) {
    this.#checked.set(value);
  }
}

define('mx-switch-button', SwitchButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-switch-button': SwitchButton;
  }
}
