import { Bool } from '@ydinjs/core/attribute.js';
import { useAttributes, via } from '@ydinjs/core/controllers/useAttributes.js';
import { useEvents } from '@ydinjs/core/controllers/useEvents.js';
import {
  ControlledElement,
  internals,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import {
  AnyElement,
  attributes,
  type Props,
} from '@ydinjs/core/traits/attribute-traits.js';
import {
  compose,
  trait,
  type Composed,
} from '@ydinjs/core/traits/composition.js';
import { toggleState } from '@ydinjs/core/utils/DOM.js';
import type { EmptyObject } from 'type-fest';
import {
  type CheckableCoreTraits,
  useCheckableCore,
  type CheckableCoreProps,
} from '../core/elements/CheckableCore.ts';
// oxlint-disable-next-line import/no-duplicates
import '../icon/icon.ts';
import type Icon from '../icon/icon.ts';
import checkboxTemplate from './checkbox.tpl.html' with { type: 'html' };
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };

const CHECKED_ICON = 'check_small';
const INDETERMINATE_ICON = 'check_indeterminate_small';

@trait
@attributes({ indeterminate: Bool })
export class Indeterminable extends AnyElement {
  accessor indeterminate!: boolean;
}
export type IndeterminatableProps = Props<typeof Indeterminable>;

export type CheckboxProperties = CheckableCoreProps & IndeterminatableProps;
export type CheckboxEvents = Readonly<{
  change: Event;
  input: Event;
  invalid: Event;
}>;

export type CheckboxCSSProperties = EmptyObject;

const CheckboxConstructor: Composed<
  ControlledElementConstructor,
  [...CheckableCoreTraits, typeof Indeterminable]
> = compose(ControlledElement);

/**
 * @tag mx-checkbox
 *
 * @summary Checkboxes allow users to select one or more items from a set,
 * or turn an option on or off.
 *
 * @description
 * This is a controlled component — it does not manage its own state. The host
 * application is responsible for updating `checked` and `indeterminate`
 * attributes in response to `change`/`input` events.
 *
 * **`indeterminate` takes visual priority over `checked`.** When `indeterminate`
 * is set, the indeterminate icon is shown regardless of the `checked` value.
 * To reflect a definite checked/unchecked state, the controller must first
 * clear `indeterminate`.
 *
 * **Validation.** The element has no native validators. `setCustomValidity()`
 * sets its validity and the `error` attribute sets its error display. Nothing
 * else changes either, a form reset included. Set `error` and `required`
 * rather than `aria-invalid` and `aria-required` on the host.
 *
 * **Form participation.** The element is form-associated and submits its
 * `value` (defaults to `"on"`) when `checked`. It can be associated with an
 * external `<label>` via the standard `for`/`id` mechanism.
 *
 * @attr {boolean} checked - Whether the checkbox is checked.
 * @attr {boolean} indeterminate - Whether the checkbox is in an indeterminate
 *   state. Visually overrides `checked` — clear this attribute first to show
 *   the checked/unchecked icon.
 * @attr {boolean} disabled - Disables interaction and form participation.
 * @attr {string} name - Name submitted with form data.
 * @attr {boolean} error - Shows the error display: `:state(error)`, and the
 *   input announced as invalid. It draws no error appearance yet.
 *   Set by the consumer only.
 * @attr {boolean} required - Announces the control as required. It doesn't
 *   change validity, block submission or make `:required` match.
 * @attr {string} value - The value submitted with a form when checked.
 *   Defaults to `"on"`.
 *
 * @cssprop --md-checkbox-check-duration - Overrides check/indeterminate animation
 *   duration.
 * @cssprop --md-checkbox-check-easing - Overrides check/indeterminate animation
 *   easing.
 *
 * @csspart impl - Internal host element (the visible checkbox box).
 *
 * @event change - Fired after `input` when the user activates the checkbox.
 * Activation doesn't change `checked` or `indeterminate`.
 * @event invalid - Fired at the host when a validity check finds it invalid.
 *   It doesn't bubble and is cancelable.
 * @event input - Fired after `click` when the user activates the checkbox.
 */
export default class Checkbox extends CheckboxConstructor {
  static override formAssociated = true;

  constructor() {
    super();

    const input = useCheckableCore(
      this,
      [checkboxTemplate],
      {},
      [defaultStyles],
      { delegatesFocus: true },
    );

    const innards = internals(this);
    const icon = this.shadowRoot!.querySelector<Icon>('.icon')!;

    useAttributes(this, {
      checked: via(Bool, (_, value) => {
        if (!this.indeterminate) {
          icon.textContent = value ? CHECKED_ICON : '';
        }
      }),
      indeterminate: via(Bool, (_, value) => {
        icon.textContent = value
          ? INDETERMINATE_ICON
          : this.checked
            ? CHECKED_ICON
            : '';

        input.indeterminate = value;
        toggleState(innards, 'indeterminate', value);
      }),
    });

    // Activation clears the native input's `indeterminate`. Like `checked` in
    // the core, it shows the host's state again after the `change` handlers.
    useEvents(
      this,
      {
        change: () => {
          input.indeterminate = this.indeterminate;
        },
      },
      input,
    );
  }
}

customElements.define('mx-checkbox', Checkbox);

declare global {
  interface HTMLElementTagNameMap {
    'mx-checkbox': Checkbox;
  }
}
