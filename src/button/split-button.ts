import type { EmptyObject } from 'type-fest';
import '../button-group/connected-button-group.ts';
import { useCore } from '../core/controllers/useCore.ts';
import { useEvents } from '../core/controllers/useEvents.ts';
import {
  define,
  html,
  internals,
  ReactiveElement,
} from '../core/elements/reactive-element.ts';
import { query } from '../core/utils/DOM.ts';
import '../icon/icon.ts';
import './button.ts';
import './icon-button.ts';
import splitButtonStyles from './styles/split-button.css.ts?type=css' with { type: 'css' };
import type { ButtonLike, CoreButtonAttributes } from './useButtonCore.ts';

const TEMPLATE = html`<mx-connected-button-group>
  <mx-button><slot name="icon" slot="icon"></slot><slot></slot></mx-button>
  <mx-icon-button>
    <mx-icon>keyboard_arrow_down</mx-icon>
  </mx-icon-button>
</mx-connected-button-group>`;

export type SplitButtonAttributes = Readonly<
  CoreButtonAttributes & {
    open?: boolean;
  }
>;

export type SplitButtonProperties = EmptyObject;

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
  static readonly observedAttributes = ['disabled'] as const;

  constructor() {
    super();
    const self = this;

    const _internals = internals(self);
    useCore(self, TEMPLATE, {}, [splitButtonStyles]);
    useEvents(
      self,
      {
        click(event) {
          event.stopPropagation();
          self.dispatchEvent(new Event('toggle'));
        },
      },
      query(self, 'mx-icon-button')!,
    );
  }
}

define('mx-split-button', SplitButton);

declare global {
  interface HTMLElementTagNameMap {
    'mx-split-button': SplitButton;
  }
}
