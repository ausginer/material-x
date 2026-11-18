import { Bool } from '@ydinjs/core/attribute.js';
import { useAttributes, via } from '@ydinjs/core/controllers/useAttributes.js';
import { useEvents } from '@ydinjs/core/controllers/useEvents.js';
import { internals, type ControlledElement } from '@ydinjs/core/element.js';
import type { Traited } from '@ydinjs/core/traits/attributes.js';
import {
  Checkable,
  type CheckableProps,
} from '@ydinjs/core/traits/checkable.js';
import {
  VALUABLE_ATTRS,
  Valuable,
  type ValuableProps,
} from '@ydinjs/core/traits/valuable.js';
import { toggleState } from '@ydinjs/core/utils/DOM.js';
import { BUTTON_GROUP_CTX } from '../button-group/button-group-context.ts';
import { FocusForwarding } from '../core/traits/focus-forwarding.ts';
import { notify, useClickActivation } from '../core/utils/events.ts';
import { useContext } from '../core/utils/useContext.ts';
import { BUTTON_CORE_TRAITS, useButtonCore } from './ButtonCore.ts';

export type SwitchProps = CheckableProps & ValuableProps;
export type SwitchEvents = Readonly<{
  change: Event;
  input: Event;
}>;

export const SWITCH_CORE_TRAITS: readonly [
  ...typeof BUTTON_CORE_TRAITS,
  typeof Checkable,
  typeof Valuable,
  typeof FocusForwarding,
] = [...BUTTON_CORE_TRAITS, Checkable, Valuable, FocusForwarding];

export type SwitchCore = Traited<ControlledElement, typeof SWITCH_CORE_TRAITS>;

/**
 * Sets up a switch whose `.host` is a `<button role="switch">`. The switch is
 * controlled: activation dispatches `input` and `change` and changes no state.
 * `aria-checked`, the `checked` custom state and the form value follow the
 * host's `checked` only.
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

  useAttributes(host, {
    checked: via(Bool, (_, value) => {
      toggleState(innards, 'checked', value);
      target.ariaChecked = String(value);
      innards.setFormValue(value ? (host.value ?? 'on') : null);
    }),
    value(_, newValue) {
      if (host.checked) {
        innards.setFormValue(newValue ?? 'on');
      }
    },
  });

  // The group's `value` controls `checked` only while it is set: it selects the
  // switch with an equal `value`. A switch with no `value` is never selected.
  // Removing the group's `value` clears the previous selection and leaves every
  // other switch to the consumer. On join, `oldValue` is `null`.
  useContext(
    host,
    BUTTON_GROUP_CTX,
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
        notify(host, 'input', 'change');
      },
    },
    target,
  );

  useClickActivation(host, target);
}
