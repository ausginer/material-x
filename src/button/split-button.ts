import type { EmptyObject } from 'type-fest';
import '../button-group/connected-button-group.ts';
import { useCore } from '../core/controllers/useCore.ts';
import { useEvents } from '../core/controllers/useEvents.ts';
import { Bool } from '../core/elements/attribute.ts';
import {
  define,
  html,
  ReactiveElement,
} from '../core/elements/reactive-element.ts';
import { query } from '../core/utils/DOM.ts';
import '../icon/icon.ts';
import './button.ts';
import './icon-button.ts';
import splitButtonStyles from './styles/split-button.css.ts?type=css' with { type: 'css' };
import {
  useButtonAccessors,
  type ButtonLike,
  type CoreButtonProperties,
} from './useButtonCore.ts';

const TEMPLATE = html`<mx-connected-button-group>
  <mx-button><slot name="icon" slot="icon"></slot><slot></slot></mx-button>
  <mx-icon-button>
    <mx-icon>keyboard_arrow_down</mx-icon>
  </mx-icon-button>
</mx-connected-button-group>`;

export type SplitButtonProperties = Readonly<
  CoreButtonProperties & {
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
    useButtonAccessors(this, {
      disabled: Bool,
    });
  }

  declare disabled: boolean;

  constructor() {
    super();
    useCore(this, TEMPLATE, {}, [splitButtonStyles]);
    useEvents(
      this,
      {
        click: (event) => {
          event.stopPropagation();
          this.dispatchEvent(new Event('toggle'));
        },
      },
      query(this, 'mx-icon-button')!,
    );
  }
}

define('mx-split-button', SplitButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-split-button': SplitButton;
  }
}
