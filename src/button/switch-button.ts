import {
  define,
  html,
  ReactiveElement,
} from '../core/elements/reactive-element.ts';
import {
  useButtonCore,
  type CoreButtonAttributes,
  type ButtonColor,
} from './useButtonCore.ts';
import switchDefaultStyles from './default/switch.css.ts?type=css' with { type: 'css' };
import mainElevatedStyles from './elevated/main.css.ts?type=css' with { type: 'css' };
import switchElevatedStyles from './elevated/switch.css.ts?type=css' with { type: 'css' };
import mainOutlinedStyles from './outlined/main.css.ts?type=css' with { type: 'css' };
import switchOutlinedStyles from './outlined/switch.css.ts?type=css' with { type: 'css' };
import mainSizeStyles from './size/main.css.ts?type=css' with { type: 'css' };
import switchSizeStyles from './size/switch.css.ts?type=css' with { type: 'css' };
import mainTonalStyles from './tonal/main.css.ts?type=css' with { type: 'css' };
import switchTonalStyles from './tonal/switch.css.ts?type=css' with { type: 'css' };
import { useSwitchButtonPressAnimation } from './useSwitchButtonPressAnimation.ts';
import {
  AttributeObserver,
  useAttribute,
} from '../core/elements/useAttribute.ts';

const TEMPLATE = html`<slot name="icon"></slot><slot></slot>`;

export type SwitchButtonColor = Exclude<ButtonColor, 'text'>;

export type SwitchButtonAttributes = Readonly<
  CoreButtonAttributes & {
    color?: SwitchButtonColor;
    checked?: boolean;
  }
>;

const EVENTS = ['input', 'change'] as const;

/**
 * @attr {string} color
 * @attr {string} size
 * @attr {string} shape
 * @attr {boolean} disabled
 * @attr {boolean} checked
 */
export default class SwitchButton extends ReactiveElement {
  static readonly formAssociated = true;
  static readonly observedAttributes = ['checked', 'disabled'] as const;

  readonly #checked: AttributeObserver<BooleanConstructor>;

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
    this.#checked = useAttribute(this, 'checked', Boolean);
    EVENTS.forEach((name) =>
      this.#checked.on(() => this.dispatchEvent(new Event(name))),
    );
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
