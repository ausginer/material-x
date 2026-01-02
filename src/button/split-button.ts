import type { EmptyObject } from 'type-fest';
import '../button-group/connected-button-group.ts';
import { useAttribute } from '../core/controllers/useAttribute.ts';
import { useEvents } from '../core/controllers/useEvents.ts';
import { ATTRIBUTE } from '../core/elements/attribute.ts';
import {
  define,
  html,
  ReactiveElement,
} from '../core/elements/reactive-element.ts';
import { $ } from '../core/utils/DOM.ts';
import { useCore } from '../core/utils/useCore.ts';
import '../icon/icon.ts';
import './button.ts';
import './icon-button.ts';
import splitButtonStyles from './styles/split/main.css.ts?type=css' with { type: 'css' };
import {
  createButtonAccessors,
  type ButtonLike,
  type ButtonCoreProperties,
  type ButtonColor,
  type ButtonSize,
  type ButtonShape,
  DEFAULT_BUTTON_ATTRIBUTES,
} from './useButtonCore.ts';

const TEMPLATE = html`
  <mx-connected-button-group part="group">
    <mx-button part="leading">
      <slot name="icon" slot="icon"></slot><slot></slot>
    </mx-button>
    <mx-icon-button part="trailing">
      <mx-icon>keyboard_arrow_down</mx-icon>
    </mx-icon-button>
  </mx-connected-button-group>
`;

export type SplitButtonProperties = Readonly<
  ButtonCoreProperties & {
    open?: boolean;
  }
>;

export type SplitButtonEvents = Readonly<{
  toggle: Event;
}>;

export type SplitButtonCSSProperties = EmptyObject;

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
export default class SplitButton extends ReactiveElement implements ButtonLike {
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
    useCore(this, TEMPLATE, {}, [splitButtonStyles]);
    useEvents(
      this,
      {
        click: (event) => {
          event.stopPropagation();
          this.dispatchEvent(
            new Event('toggle', { bubbles: true, composed: true }),
          );
        },
      },
      $(this, 'mx-icon-button')!,
    );

    const group = $(this, 'mx-connected-button-group')!;
    Object.keys(DEFAULT_BUTTON_ATTRIBUTES).forEach((attr) => {
      useAttribute(this, attr, (_, newValue) => {
        ATTRIBUTE.setRaw(group, attr, newValue);
      });
    });
  }
}

define('mx-split-button', SplitButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-split-button': SplitButton;
  }
}
