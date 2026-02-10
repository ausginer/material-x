import type { EmptyObject } from 'type-fest';
import { define } from '../core/elements/reactive-element.ts';
import { impl, type ConstructorWithTraits } from '../core/elements/traits.ts';
import { useButtonCore } from './ButtonCore.ts';
import iconButtonTemplate from './icon-button.tpl.html' with { type: 'html' };
import { IconButtonLike, type IconButtonProperties } from './icon-button.ts';
import switchDefaultStyles from './styles/default/switch.css.ts' with { type: 'css' };
import mainElevatedStyles from './styles/elevated/main.css.ts' with { type: 'css' };
import switchElevatedStyles from './styles/elevated/switch.css.ts' with { type: 'css' };
import mainIconStyles from './styles/icon/main.css.ts' with { type: 'css' };
import switchIconStyles from './styles/icon/switch.css.ts' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.css.ts' with { type: 'css' };
import switchOutlinedStyles from './styles/outlined/switch.css.ts' with { type: 'css' };
import switchSizeStyles from './styles/size/switch.css.ts' with { type: 'css' };
import mainTonalStyles from './styles/tonal/main.css.ts' with { type: 'css' };
import switchTonalStyles from './styles/tonal/switch.css.ts' with { type: 'css' };
import { SwitchCore, useSwitch, type SwitchProps } from './SwitchCore.ts';

export type SwitchIconButtonProperties = IconButtonProperties & SwitchProps;
export type SwitchIconButtonEvents = EmptyObject;
export type SwitchIconButtonCSSProperties = EmptyObject;

const SwitchIconButtonCore: ConstructorWithTraits<
  InstanceType<typeof SwitchCore>,
  [typeof IconButtonLike]
> = impl(SwitchCore, [IconButtonLike]);

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
export default class SwitchIconButton extends SwitchIconButtonCore {
  static readonly formAssociated = true;

  constructor() {
    super();
    useButtonCore(this, iconButtonTemplate, [
      mainElevatedStyles,
      mainOutlinedStyles,
      mainTonalStyles,
      mainIconStyles,
      switchDefaultStyles,
      switchElevatedStyles,
      switchOutlinedStyles,
      switchSizeStyles,
      switchTonalStyles,
      switchIconStyles,
    ]);
    useSwitch(this);
  }
}

define('mx-switch-icon-button', SwitchIconButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-switch-icon-button': SwitchIconButton;
  }
}
