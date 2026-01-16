import type { EmptyObject } from 'type-fest';
import { impl, type ConstructorWithTraits } from '../core/elements/impl.ts';
import {
  define,
  type ReactiveElement,
} from '../core/elements/reactive-element.ts';
import type { Disableable } from '../core/traits/disableable.ts';
import iconButtonTemplate from './icon-button.tpl.html' with { type: 'html' };
import { IconButtonLike, type IconButtonProperties } from './icon-button.ts';
import switchDefaultTokens from './styles/default/switch.tokens.css.ts' with { type: 'css' };
import mainElevatedStyles from './styles/elevated/main.ctr.css' with { type: 'css' };
import mainElevatedTokens from './styles/elevated/main.tokens.css.ts' with { type: 'css' };
import switchElevatedTokens from './styles/elevated/switch.tokens.css.ts' with { type: 'css' };
import mainIconTokens from './styles/icon/main.tokens.css.ts' with { type: 'css' };
import switchIconTokens from './styles/icon/switch.tokens.css.ts' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.ctr.css' with { type: 'css' };
import mainOutlinedTokens from './styles/outlined/main.tokens.css.ts' with { type: 'css' };
import switchOutlinedTokens from './styles/outlined/switch.tokens.css.ts' with { type: 'css' };
import switchSizeTokens from './styles/size/switch.tokens.css.ts' with { type: 'css' };
import mainTonalTokens from './styles/tonal/main.tokens.css.ts' with { type: 'css' };
import switchTonalTokens from './styles/tonal/switch.tokens.css.ts' with { type: 'css' };
import { useButtonCore, type ButtonLike } from './useButtonCore.ts';
import {
  SwitchCore,
  useSwitch,
  type SwitchAttributes,
  type SwitchLike,
} from './useSwitch.ts';

export type SwitchIconButtonProperties = IconButtonProperties &
  SwitchAttributes;
export type SwitchIconButtonEvents = EmptyObject;
export type SwitchIconButtonCSSProperties = EmptyObject;

const SwitchIconButtonCore: ConstructorWithTraits<
  ReactiveElement,
  [
    typeof ButtonLike,
    typeof Disableable,
    typeof SwitchLike,
    typeof IconButtonLike,
  ]
> = impl(SwitchCore, IconButtonLike);

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
      mainElevatedTokens,
      mainOutlinedTokens,
      mainTonalTokens,
      mainIconTokens,
      switchDefaultTokens,
      switchElevatedTokens,
      switchOutlinedTokens,
      switchSizeTokens,
      switchTonalTokens,
      switchIconTokens,
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
