import type { EmptyObject } from 'type-fest';
import { define } from 'ydin/element.js';
import {
  CheckableCore,
  useCheckableCore,
  type CheckableCoreProps,
} from '../core/elements/CheckableCore.ts';
import '../icon/icon.ts';
import radioTemplate from './radio.tpl.html' with { type: 'html' };
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };

export type RadioProperties = CheckableCoreProps;
export type RadioEvents = {
  change: Event;
  input: Event;
};
export type RadioCSSProperties = EmptyObject;

/**
 * @tag mx-radio
 *
 * @summary Radio buttons allow users to select one option from a set.
 *
 * @description
 * This is a controlled component — it does not manage its own state. The host
 * application is responsible for updating `checked` in response to
 * `change`/`input` events.
 *
 * **Form participation.** The element is form-associated and submits its
 * `value` when `checked`. It can be associated with an external `<label>`
 * via the standard `for`/`id` mechanism.
 *
 * @attr {boolean} checked - Whether this radio button is selected.
 * @attr {boolean} disabled - Disables interaction and form participation.
 * @attr {string} name - Groups radio buttons; only one per group can be checked.
 * @attr {string} value - The value submitted with a form when checked.
 *   Defaults to `"on"`.
 *
 * @csspart impl - Internal host element (the visible radio control).
 *
 * @event change - Fired when this radio button becomes selected (user interaction only).
 * @event input - Fired when this radio button becomes selected (user interaction only).
 */
export default class Radio extends CheckableCore {
  static override readonly formAssociated = true;

  constructor() {
    super();
    useCheckableCore(this, [radioTemplate], {}, [defaultStyles], {
      delegatesFocus: true,
    });
  }
}

define('mx-radio', Radio);

declare global {
  interface HTMLElementTagNameMap {
    'mx-radio': Radio;
  }
}
