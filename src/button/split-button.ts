import type { EmptyObject } from 'type-fest';
import '../button-group/connected-button-group.ts';
import { transfer, useAttributes } from '../core/controllers/useAttributes.ts';
import { useEvents } from '../core/controllers/useEvents.ts';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import { $, DEFAULT_EVENT_INIT } from '../core/utils/DOM.ts';
import { useCore } from '../core/utils/useCore.ts';
import '../icon/icon.ts';
import './button.ts';
import './icon-button.ts';
import splitButtonTemplate from './split-button.tpl.html' with { type: 'html' };
import splitButtonStyles from './styles/split/main.ctr.css' with { type: 'css' };
import splitButtonTokens from './styles/split/main.tokens.css.ts' with { type: 'css' };
import {
  createButtonAccessors,
  DEFAULT_BUTTON_ATTRIBUTES,
  type ButtonColor,
  type ButtonCoreProperties,
  type ButtonLike,
  type ButtonShape,
  type ButtonSize,
} from './useButtonCore.ts';

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
    useCore(this, splitButtonTemplate, {}, [
      splitButtonStyles,
      splitButtonTokens,
    ]);

    useEvents(
      this,
      {
        click: (event) => {
          event.stopPropagation();
          this.dispatchEvent(new Event('toggle', DEFAULT_EVENT_INIT));
        },
      },
      $(this, 'mx-icon-button')!,
    );

    const group = $(this, 'mx-connected-button-group')!;
    useAttributes(
      this,
      Object.fromEntries(
        Object.keys(DEFAULT_BUTTON_ATTRIBUTES).map((attr) => [
          attr,
          transfer(group, attr),
        ]),
      ),
    );
  }
}

define('mx-split-button', SplitButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-split-button': SplitButton;
  }
}
