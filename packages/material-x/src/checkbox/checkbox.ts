import type { EmptyObject } from 'type-fest';
import { Bool } from 'ydin/attribute.js';
import { useAttributes, via } from 'ydin/controllers/useAttributes.js';
import { define, getInternals } from 'ydin/element.js';
import type {
  Interface,
  Props,
  Trait,
  TraitedConstructor,
} from 'ydin/traits/traits.js';
import { impl, trait } from 'ydin/traits/traits.js';
import { $, toggleState } from 'ydin/utils/DOM.js';
import {
  CheckableCore,
  useCheckableCore,
  type CheckableCoreProps,
} from '../core/elements/CheckableCore.ts';
import '../icon/icon.ts';
import type Icon from '../icon/icon.ts';
import checkboxTemplate from './checkbox.tpl.html' with { type: 'html' };
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };

export type CheckboxProperties = CheckableCoreProps;
export type CheckboxEvents = {
  change: Event;
  input: Event;
};
export type CheckboxCSSProperties = EmptyObject;

const CHECKED_ICON = 'check';
const INDETERMINATE_ICON = 'check_indeterminate_small';

const $indeterminable: unique symbol = Symbol('Indeterminable');

export const Indeterminable: Trait<
  { indeterminate: boolean },
  typeof $indeterminable
> = trait({ indeterminate: Bool }, $indeterminable);
export type Indeterminable = Interface<typeof Indeterminable>;
export type IndeterminatableProps = Props<typeof Indeterminable>;

export const CheckboxCore: TraitedConstructor<
  CheckableCore,
  typeof CheckableCore,
  [typeof Indeterminable]
> = impl(CheckableCore, [Indeterminable]);

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
 * @attr {string} value - The value submitted with a form when checked.
 *   Defaults to `"on"`.
 *
 * @csspart impl - Internal host element (the visible checkbox box).
 *
 * @event change - Fired when the checked state changes (user interaction only).
 * @event input - Fired when the checked state changes (user interaction only).
 */
export default class Checkbox extends CheckboxCore {
  static override readonly formAssociated = true;

  constructor() {
    super();

    const input = useCheckableCore(
      this,
      [checkboxTemplate],
      {},
      [defaultStyles],
      { delegatesFocus: true },
    );

    const internals = getInternals(this);
    const icon = $<Icon>(this, '.icon')!;

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
        toggleState(internals, 'indeterminate', value);
      }),
    });
  }
}

define('mx-checkbox', Checkbox);

declare global {
  interface HTMLElementTagNameMap {
    'mx-checkbox': Checkbox;
  }
}
