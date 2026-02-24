import type { EmptyObject } from 'type-fest';
import { define } from '../core/elements/reactive-element.ts';
import buttonTemplate from './button.tpl.html' with { type: 'html' };
import {
  ButtonCore,
  useButtonCore,
  type ButtonCoreProps,
  type ButtonSharedCSSProperties,
} from './ButtonCore.ts';
import elevatedStyles from './styles/elevated/main.css.ts' with { type: 'css' };
import outlinedStyles from './styles/outlined/main.css.ts' with { type: 'css' };
import textStyles from './styles/text/main.css.ts' with { type: 'css' };
import tonalStyles from './styles/tonal/main.css.ts' with { type: 'css' };

export type ButtonProperties = ButtonCoreProps;
export type ButtonEvents = EmptyObject;
export type ButtonCSSProperties = ButtonSharedCSSProperties;

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
export default class Button extends ButtonCore {
  static readonly formAssociated = true;

  constructor() {
    super();
    useButtonCore(
      this,
      buttonTemplate,
      [elevatedStyles, outlinedStyles, textStyles, tonalStyles],
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
