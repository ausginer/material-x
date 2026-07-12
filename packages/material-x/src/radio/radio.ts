import type { EmptyObject } from 'type-fest';
import {
  ControlledElement,
  define,
  type ControlledElementConstructor,
} from 'ydin/element.js';
import { impl, type TraitedConstructor } from 'ydin/traits/traits.js';
import {
  CHECKABLE_CORE_TRAITS,
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

export type RadioConstructor = TraitedConstructor<
  ControlledElement,
  ControlledElementConstructor,
  typeof CHECKABLE_CORE_TRAITS
>;

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
 * @cssprop --md-radio-check-duration - Overrides selection animation duration.
 * @cssprop --md-radio-check-easing - Overrides selection animation easing.
 *
 * @csspart impl - Internal host element (the visible radio control).
 *
 * @event change - Fired when this radio button becomes selected (user interaction only).
 * @event input - Fired when this radio button becomes selected (user interaction only).
 */
const Radio: RadioConstructor = impl(
  ControlledElement,
  CHECKABLE_CORE_TRAITS,
)(
  (Base) =>
    class extends Base {
      static readonly formAssociated = true;

      constructor() {
        super();
        useCheckableCore(this, [radioTemplate], {}, [defaultStyles], {
          delegatesFocus: true,
        });
      }
    },
);
type Radio = InstanceType<typeof Radio>;

export default Radio;

define('mx-radio', Radio);

declare global {
  interface HTMLElementTagNameMap {
    'mx-radio': Radio;
  }
}
