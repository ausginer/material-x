import {
  define,
  html,
  ReactiveElement,
} from '../core/elements/reactive-element.ts';
import mainElevatedStyles from './styles/elevated/main.css.ts?type=css' with { type: 'css' };
import mainOutlinedStyles from './styles/outlined/main.css.ts?type=css' with { type: 'css' };
import mainSizeStyles from './styles/size/main.css.ts?type=css' with { type: 'css' };
import mainTextStyles from './styles/text/main.css.ts?type=css' with { type: 'css' };
import mainTonalStyles from './styles/tonal/main.css.ts?type=css' with { type: 'css' };
import { useButtonCore, type CoreButtonAttributes } from './useButtonCore.ts';
import { useButtonPressAnimation } from './useButtonPressAnimation.ts';

export type ButtonAttributes = CoreButtonAttributes;

const TEMPLATE = html`<slot name="icon"></slot><slot></slot>`;

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
 * @attr {boolean|undefined} disabled
 * @attr {string} size
 * @attr {string} shape
 */
export default class Button extends ReactiveElement {
  static readonly formAssociated = true;
  static readonly observedAttributes = ['disabled'] as const;

  constructor() {
    super();
    useButtonCore(this, TEMPLATE, 'button', [
      mainElevatedStyles,
      mainOutlinedStyles,
      mainSizeStyles,
      mainTextStyles,
      mainTonalStyles,
    ]);
    useButtonPressAnimation(this);
  }
}

define('mx-button', Button);

declare global {
  interface HTMLElementTagNameMap {
    'mx-button': Button;
  }
}
