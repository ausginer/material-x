import type { EmptyObject } from 'type-fest';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import buttonTemplate from './button.tpl.html' with { type: 'html' };
import mainElevatedStyles from './styles/elevated/main.ctr.css' with { type: 'css' };
import elevatedTokens from './styles/elevated/main.tokens.css.ts' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.ctr.css' with { type: 'css' };
import outlinedTokens from './styles/outlined/main.tokens.css.ts' with { type: 'css' };
import textTokens from './styles/text/main.tokens.css.ts' with { type: 'css' };
import tonalTokens from './styles/tonal/main.tokens.css.ts' with { type: 'css' };
import {
  createButtonAccessors,
  useButtonCore,
  type ButtonColor,
  type ButtonCoreProperties,
  type ButtonLike,
  type ButtonShape,
  type ButtonSize,
} from './useButtonCore.ts';

export type ButtonProperties = ButtonCoreProperties;
export type ButtonEvents = EmptyObject;
export type ButtonCSSProperties = EmptyObject;

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
 * @tag mx-button
 */
export default class Button extends ReactiveElement implements ButtonLike {
  static readonly formAssociated = true;
  static {
    createButtonAccessors(this);
  }

  declare color: ButtonColor | null;
  declare size: ButtonSize | null;
  declare shape: ButtonShape | null;
  declare disabled: boolean;

  constructor() {
    super();
    useButtonCore(
      this,
      buttonTemplate,
      [
        mainElevatedStyles,
        mainOutlinedStyles,
        elevatedTokens,
        outlinedTokens,
        textTokens,
        tonalTokens,
      ],
      { delegatesFocus: true },
    );
  }
}

define('mx-button', Button);

declare global {
  interface HTMLElementTagNameMap {
    'mx-button': Button;
  }
}
