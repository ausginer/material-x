import { Attribute } from '../core/elements/attribute.ts';
import {
  define,
  html,
  ReactiveElement,
} from '../core/elements/reactive-element.ts';
import switchDefaultStyles from './styles/default/switch.css.ts?type=css' with { type: 'css' };
import mainElevatedStyles from './styles/elevated/main.css.ts?type=css' with { type: 'css' };
import switchElevatedStyles from './styles/elevated/switch.css.ts?type=css' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.css.ts?type=css' with { type: 'css' };
import switchOutlinedStyles from './styles/outlined/switch.css.ts?type=css' with { type: 'css' };
import mainSizeStyles from './styles/size/main.css.ts?type=css' with { type: 'css' };
import switchSizeStyles from './styles/size/switch.css.ts?type=css' with { type: 'css' };
import mainTonalStyles from './styles/tonal/main.css.ts?type=css' with { type: 'css' };
import switchTonalStyles from './styles/tonal/switch.css.ts?type=css' with { type: 'css' };
import {
  useButtonCore,
  type CoreButtonAttributes,
  type ButtonColor,
} from './useButtonCore.ts';
import {
  useSwitchButtonPressAnimation,
  type SwitchElement,
} from './useSwitchButtonPressAnimation.ts';

const TEMPLATE = html`<slot name="icon"></slot><slot></slot>`;

export type SwitchButtonColor = Exclude<ButtonColor, 'text'>;

export type SwitchButtonAttributes = Readonly<
  CoreButtonAttributes & {
    color?: SwitchButtonColor;
    checked?: boolean;
  }
>;

/**
 * @attr {string} color
 * @attr {string} size
 * @attr {string} shape
 * @attr {boolean} disabled
 * @attr {boolean} checked
 */
export default class SwitchButton
  extends ReactiveElement
  implements SwitchElement
{
  static readonly formAssociated = true;
  static readonly observedAttributes = ['checked', 'disabled'] as const;

  readonly #checked = Attribute.bool(this, 'checked');

  constructor() {
    super();
    useButtonCore(this, TEMPLATE, 'switch', [
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
    useSwitchButtonPressAnimation(this);
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
