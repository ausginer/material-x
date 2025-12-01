import { Attribute } from '../core/elements/attribute.ts';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import type { IconButtonAttributes } from './icon-button.ts';
import switchDefaultStyles from './styles/default/switch.css.ts?type=css' with { type: 'css' };
import mainElevatedStyles from './styles/elevated/main.css.ts?type=css' with { type: 'css' };
import switchElevatedStyles from './styles/elevated/switch.css.ts?type=css' with { type: 'css' };
import mainIconStyles from './styles/icon/main.css.ts?type=css' with { type: 'css' };
import switchIconStyles from './styles/icon/switch.css.ts?type=css' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.css.ts?type=css' with { type: 'css' };
import switchOutlinedStyles from './styles/outlined/switch.css.ts?type=css' with { type: 'css' };
import mainSizeStyles from './styles/size/main.css.ts?type=css' with { type: 'css' };
import switchSizeStyles from './styles/size/switch.css.ts?type=css' with { type: 'css' };
import mainTonalStyles from './styles/tonal/main.css.ts?type=css' with { type: 'css' };
import switchTonalStyles from './styles/tonal/switch.css.ts?type=css' with { type: 'css' };
import { ICON_TEMPLATE } from './template.ts';
import { useButtonCore } from './useButtonCore.ts';
import {
  useSwitch,
  type SwitchAttributes,
  type SwitchLike,
} from './useSwitch.ts';

export type SwitchIconButtonAttributes = IconButtonAttributes &
  SwitchAttributes;

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
 * @attr {string} value
 * @attr {boolean|undefined} checked
 * @attr {boolean|undefined} disabled
 */
export default class SwitchIconButton
  extends ReactiveElement
  implements SwitchLike
{
  static readonly formAssociated = true;
  static readonly observedAttributes = ['checked', 'disabled'] as const;

  readonly #checked = Attribute.bool(this, 'checked');

  constructor() {
    super();
    const self = this;
    useButtonCore(self, ICON_TEMPLATE, 'button', [
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
    useSwitch(self, self.#checked);
  }

  get checked(): boolean {
    return this.#checked.get();
  }

  set checked(value: boolean) {
    this.#checked.set(value);
  }
}

define('mx-switch-icon-button', SwitchIconButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-switch-icon-button': SwitchIconButton;
  }
}
