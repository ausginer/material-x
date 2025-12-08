import type { EmptyObject } from 'type-fest';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import mainElevatedStyles from './styles/elevated/main.css.ts?type=css' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.css.ts?type=css' with { type: 'css' };
import mainSizeStyles from './styles/size/main.css.ts?type=css' with { type: 'css' };
import mainTextStyles from './styles/text/main.css.ts?type=css' with { type: 'css' };
import mainTonalStyles from './styles/tonal/main.css.ts?type=css' with { type: 'css' };
import { REGULAR_TEMPLATE } from './template.ts';
import {
  useButtonAccessors,
  useButtonCore,
  type ButtonColor,
  type ButtonLike,
  type ButtonShape,
  type ButtonSize,
  type CoreButtonProperties,
} from './useButtonCore.ts';

export type ButtonProperties = CoreButtonProperties;
export type ButtonEvents = EmptyObject;
export type ButtonCSSProperties = Readonly<{
  /**
   * Controls the button main color
   */
  '--md-button-container-color'?: string;
  /**
   *  Controls the button label color.
   */
  '--md-button-label-text-color'?: string;
  /**
   * Controls the button icon color.
   */
  '--md-button-icon-color'?: string;
  /**
   * Controls the button icon size.
   */
  '--md-button-icon-size'?: string;
  /**
   * Controls the button elevation level. Use integer number of px the button
   * should move up the z-axis.
   */
  '--md-button-container-elevation'?: string;
  /**
   * Controls the leading padding of the button.
   */
  '--md-button-leading-space'?: string;
  /**
   * Controls the trailing padding of the button.
   */
  '--md-button-trailing-space'?: string;
}>;

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
    useButtonAccessors(this);
  }

  declare color: ButtonColor | null;
  declare size: ButtonSize | null;
  declare shape: ButtonShape | null;
  declare disabled: boolean;

  constructor() {
    super();
    useButtonCore(this, REGULAR_TEMPLATE, 'button', [
      mainElevatedStyles,
      mainOutlinedStyles,
      mainSizeStyles,
      mainTextStyles,
      mainTonalStyles,
    ]);
  }
}

define('mx-button', Button);

declare global {
  interface HTMLElementTagNameMap {
    'mx-button': Button;
  }
}
