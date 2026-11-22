import {
  ControlledElement,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
import type { EmptyObject } from 'type-fest';
import {
  type CheckableCoreTraits,
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
  invalid: Event;
};
export type RadioCSSProperties = EmptyObject;

const RadioConstructor: Composed<
  ControlledElementConstructor,
  CheckableCoreTraits
> = compose(ControlledElement);

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
 * **Validation.** The element has no native validators. `setCustomValidity()`
 * sets its validity and the `error` attribute sets its error display. Nothing
 * else changes either, a form reset included. Set `error` and `required`
 * rather than `aria-invalid` and `aria-required` on the host.
 *
 * **Form participation.** The element is form-associated and submits its
 * `value` when `checked`. It can be associated with an external `<label>`
 * via the standard `for`/`id` mechanism.
 *
 * **Single selection is not enforced.** Each radio renders its own
 * `<input type="radio">` inside its own shadow root, so native radio grouping
 * does not apply: same-named radios can all be `checked` at once. Enforcing one
 * selection per group, arrow-key roving, and `role="radiogroup"` semantics are
 * the host application's responsibility.
 *
 * @attr {boolean} checked - Whether this radio button is selected.
 * @attr {boolean} disabled - Disables interaction and form participation.
 * @attr {string} name - The form-data key submitted with `value`, shared by the
 *   radios of a group. Does not by itself enforce single selection.
 * @attr {boolean} error - Shows the error display: `:state(error)`, and the
 *   control announced as invalid. Material defines no error appearance for
 *   it, so it draws nothing.
 *   Set by the consumer only.
 * @attr {boolean} required - Announces the control as required. It doesn't
 *   change validity, block submission or make `:required` match.
 * @attr {string} value - The value submitted with a form when checked.
 *   Defaults to `"on"`.
 *
 * @cssprop --md-radio-check-duration - Overrides selection animation duration.
 * @cssprop --md-radio-check-easing - Overrides selection animation easing.
 *
 * @csspart impl - Internal host element (the visible radio control).
 *
 * @event change - Fired after `input` when the user activates an unchecked
 * radio.
 * Activation doesn't change `checked`.
 * @event invalid - Fired at the host when a validity check finds it invalid.
 *   It doesn't bubble and is cancelable.
 * @event input - Fired after `click` when the user activates an unchecked radio.
 */
export default class Radio extends RadioConstructor {
  static override formAssociated = true;

  constructor() {
    super();
    useCheckableCore(this, [radioTemplate], {}, [defaultStyles], {
      delegatesFocus: true,
    });
  }
}

customElements.define('mx-radio', Radio);

declare global {
  interface HTMLElementTagNameMap {
    'mx-radio': Radio;
  }
}
