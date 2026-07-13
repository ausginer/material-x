import { Bool } from '@ydinjs/core/attribute.js';
import { useAttributes, via } from '@ydinjs/core/controllers/useAttributes.js';
import { useEvents } from '@ydinjs/core/controllers/useEvents.js';
import { internals, type ControlledElement } from '@ydinjs/core/element.js';
import {
  Checkable,
  useCheckable,
  type CheckableProps,
} from '@ydinjs/core/traits/checkable.js';
import type { Traited } from '@ydinjs/core/traits/traits.js';
import {
  VALUABLE_ATTRS,
  Valuable,
  useValuable,
  type ValuableProps,
} from '@ydinjs/core/traits/valuable.js';
import { toggleState } from '@ydinjs/core/utils/DOM.js';
import { BUTTON_GROUP_CTX } from '../button-group/button-group-context.ts';
import { notify, useClickActivation } from '../core/utils/events.ts';
import { useContext } from '../core/utils/useContext.ts';
import { BUTTON_CORE_TRAITS, useButtonCore } from './ButtonCore.ts';
import controlStyles from './styles/default/switch-control.css.ts' with { type: 'css' };

export type SwitchProps = CheckableProps & ValuableProps;
export type SwitchEvents = Readonly<{
  change: Event;
  input: Event;
}>;

export const SWITCH_CORE_TRAITS: readonly [
  ...typeof BUTTON_CORE_TRAITS,
  typeof Checkable,
  typeof Valuable,
] = [...BUTTON_CORE_TRAITS, Checkable, Valuable];

export type SwitchCore = Traited<ControlledElement, typeof SWITCH_CORE_TRAITS>;

export function useSwitchCore(
  host: SwitchCore,
  template: HTMLTemplateElement,
  styles: ReadonlyArray<CSSStyleSheet | string>,
  init?: Partial<ShadowRootInit>,
): void {
  const target = useButtonCore(
    host,
    template,
    [...styles, controlStyles],
    init,
  ) as HTMLInputElement;

  target.role = 'switch';

  useCheckable(host, target);
  useValuable(host, target);

  const innards = internals(host);

  const submitValue = (checked: boolean) => {
    innards.setFormValue(checked ? (host.value ?? 'on') : null);
  };

  useAttributes(host, {
    checked: via(Bool, (_, value) => {
      toggleState(innards, 'checked', value);
      submitValue(value);
    }),
    value(_, newValue) {
      if (target.checked) {
        innards.setFormValue(newValue);
      }
    },
  });

  useContext(
    host,
    BUTTON_GROUP_CTX,
    VALUABLE_ATTRS,
    (_, oldValue, newValue) => {
      if (oldValue === host.value) {
        innards.states.delete('checked');
        target.checked = false;
        submitValue(false);
      } else if (newValue === host.value) {
        innards.states.add('checked');
        target.checked = true;
        submitValue(true);
      }
    },
  );

  useEvents(
    host,
    {
      change() {
        submitValue(target.checked);
        notify(host, 'change');
      },
    },
    target,
  );

  useClickActivation(host, target);
}
