import type { EmptyObject } from 'type-fest';
import { Str } from '../core/elements/attribute.ts';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import iconButtonTemplate from './icon-button.tpl.html' with { type: 'html' };
import type {
  IconButtonColor,
  IconButtonProperties,
  IconButtonWidth,
} from './icon-button.ts';
import switchDefaultTokens from './styles/default/switch.tokens.css.ts' with { type: 'css' };
import mainElevatedStyles from './styles/elevated/main.ctr.css' with { type: 'css' };
import elevatedTokens from './styles/elevated/main.tokens.css.ts' with { type: 'css' };
import switchElevatedTokens from './styles/elevated/switch.tokens.css.ts' with { type: 'css' };
import iconTokens from './styles/icon/main.tokens.css.ts' with { type: 'css' };
import switchIconTokens from './styles/icon/switch.tokens.css.ts' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.ctr.css' with { type: 'css' };
import outlinedTokens from './styles/outlined/main.tokens.css.ts' with { type: 'css' };
import switchOutlinedTokens from './styles/outlined/switch.tokens.css.ts' with { type: 'css' };
import switchSizeTokens from './styles/size/switch.tokens.css.ts' with { type: 'css' };
import tonalTokens from './styles/tonal/main.tokens.css.ts' with { type: 'css' };
import switchTonalTokens from './styles/tonal/switch.tokens.css.ts' with { type: 'css' };
import {
  createButtonAccessors,
  useButtonCore,
  type ButtonShape,
  type ButtonSize,
} from './useButtonCore.ts';
import {
  useSwitch,
  useSwitchAccessors,
  type SwitchAttributes,
  type SwitchLike,
} from './useSwitch.ts';

export type SwitchIconButtonProperties = IconButtonProperties &
  SwitchAttributes;
export type SwitchIconButtonEvents = EmptyObject;
export type SwitchIconButtonCSSProperties = EmptyObject;

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

  static {
    createButtonAccessors(this, { width: Str });
    useSwitchAccessors(this);
  }

  declare color: IconButtonColor | null;
  declare size: ButtonSize | null;
  declare shape: ButtonShape | null;
  declare width: IconButtonWidth | null;
  declare disabled: boolean;
  declare checked: boolean;

  constructor() {
    super();
    useButtonCore(this, iconButtonTemplate, 'button', [
      mainElevatedStyles,
      mainOutlinedStyles,
      elevatedTokens,
      outlinedTokens,
      tonalTokens,
      iconTokens,
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
