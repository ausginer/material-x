import { Bool } from '@ydinjs/core/attribute.js';
import { setOwnARIA } from '@ydinjs/core/controllers/useARIA.js';
import { useAttributes, via } from '@ydinjs/core/controllers/useAttributes.js';
import { useEvents } from '@ydinjs/core/controllers/useEvents.js';
import { internals, type ControlledElement } from '@ydinjs/core/element.js';
import type {
  Checkable,
  CheckableProps,
} from '@ydinjs/core/traits/checkable.js';
import type { Composed } from '@ydinjs/core/traits/composition.js';
import {
  type Validatable,
  useValidatable,
  type ValidatableProps,
} from '@ydinjs/core/traits/validatable.js';
import {
  VALUABLE_ATTRS,
  type Valuable,
  type ValuableProps,
} from '@ydinjs/core/traits/valuable.js';
import { toggleState } from '@ydinjs/core/utils/DOM.js';
import {
  BUTTON_GROUP_CTX,
  BUTTON_GROUP_ELEMENTS,
} from '../button-group/button-group-context.ts';
import type { FocusForwarding } from '../core/traits/focus-forwarding.ts';
import { useClickActivation } from '../core/utils/events.ts';
import { useContext } from '../core/utils/useContext.ts';
import { useButtonCore, type ButtonCoreTraits } from './ButtonCore.ts';

export type SwitchProps = CheckableProps & ValuableProps & ValidatableProps;
export type SwitchEvents = Readonly<{
  change: Event;
  input: Event;
  invalid: Event;
}>;

export type SwitchCoreTraits = readonly [
  ...ButtonCoreTraits,
  typeof Checkable,
  typeof Valuable,
  typeof FocusForwarding,
  typeof Validatable,
];

export type SwitchCore = InstanceType<
  Composed<typeof ControlledElement, SwitchCoreTraits>
>;

/**
 * Sets up a switch whose `.host` is a `<button role="switch">`. The switch is
 * controlled: activation dispatches `input` and `change` and changes no state.
 * The `checked` custom state, the form value and the button's own
 * `aria-checked` follow the host's `checked` only. A host's `aria-checked`
 * comes before the own one.
 */
export function useSwitchCore(
  host: SwitchCore,
  template: HTMLTemplateElement,
  styles: ReadonlyArray<CSSStyleSheet | string>,
  init?: Partial<ShadowRootInit>,
): void {
  const target = useButtonCore(
    host,
    template,
    styles,
    init,
  ) as HTMLButtonElement;
  const innards = internals(host);

  useValidatable(host, target);

  // An unchecked switch says so before `checked` first changes.
  setOwnARIA(target, 'aria-checked', 'false');

  useAttributes(host, {
    checked: via(Bool, (_, value) => {
      toggleState(innards, 'checked', value);
      setOwnARIA(target, 'aria-checked', String(value));
      innards.setFormValue(value ? (host.value ?? 'on') : null);
    }),
    value(_, newValue) {
      if (host.checked) {
        innards.setFormValue(newValue ?? 'on');
      }
    },
    error: via(Bool, (_, value) => {
      toggleState(innards, 'error', value);
    }),
  });

  // The group's `value` controls `checked` only while it is set: it selects the
  // switch with an equal `value`. A switch with no `value` is never selected.
  // Removing the group's `value` clears the previous selection and leaves every
  // other switch to the consumer. On join, `oldValue` is `null`.
  useContext(
    host,
    BUTTON_GROUP_CTX,
    BUTTON_GROUP_ELEMENTS,
    VALUABLE_ATTRS,
    (_, oldValue, newValue) => {
      if (newValue != null) {
        host.checked = newValue === host.value;
      } else if (oldValue != null && oldValue === host.value) {
        host.checked = false;
      }
    },
  );

  // A button fires no `input` or `change`. The button's command runs as its
  // activation behaviour: after `click` has finished dispatching, and only if
  // no listener cancelled it. So `input` and `change` follow `click` as they
  // follow it on a native checkbox.
  target.commandForElement = target;
  target.command = '--activate';

  useEvents(
    host,
    {
      command() {
        host.dispatchEvent(
          new Event('input', { bubbles: true, composed: true }),
        );
        host.dispatchEvent(new Event('change', { bubbles: true }));
      },
    },
    target,
  );

  useClickActivation(host, target);
}
