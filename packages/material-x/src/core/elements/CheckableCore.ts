import { Bool } from '@ydinjs/core/attribute.js';
import { useAttributes, via } from '@ydinjs/core/controllers/useAttributes.js';
import { useEvents } from '@ydinjs/core/controllers/useEvents.js';
import { internals, type ControlledElement } from '@ydinjs/core/element.js';
import {
  Checkable,
  useCheckable,
  type CheckableProps,
} from '@ydinjs/core/traits/checkable.js';
import {
  Disableable,
  useDisableable,
  type DisableableProps,
} from '@ydinjs/core/traits/disableable.js';
import {
  Nameable,
  useNameable,
  type NameableProps,
} from '@ydinjs/core/traits/nameable.js';
import type { Traited } from '@ydinjs/core/traits/attributes.js';
import {
  useValuable,
  Valuable,
  type ValuableProps,
} from '@ydinjs/core/traits/valuable.js';
import { $, toggleState } from '@ydinjs/core/utils/DOM.js';
import { useRipple } from '../animations/ripple/ripple.ts';
import { notify, useClickActivation } from '../utils/events.ts';
import { useCore } from '../utils/useCore.ts';
import css from './styles/main.css.ts' with { type: 'css' };

export type CheckableCoreProps = CheckableProps &
  ValuableProps &
  DisableableProps &
  NameableProps;

export const CHECKABLE_CORE_TRAITS: readonly [
  typeof Checkable,
  typeof Valuable,
  typeof Disableable,
  typeof Nameable,
] = [Checkable, Valuable, Disableable, Nameable];

export type CheckableCore = Traited<
  ControlledElement,
  typeof CHECKABLE_CORE_TRAITS
>;

// oxlint-disable-next-line max-params
export function useCheckableCore(
  host: CheckableCore,
  templates: readonly HTMLTemplateElement[],
  aria: Partial<ARIAMixin>,
  styles: ReadonlyArray<CSSStyleSheet | string>,
  init?: Partial<ShadowRootInit>,
): HTMLInputElement {
  useCore(host, templates, aria, [...styles, css], init);

  const input = $<HTMLInputElement>(host, '#input')!;
  const innards = internals(host);

  useCheckable(host, input);
  useValuable(host, input);
  useDisableable(host, input);
  useNameable(host, input);

  useAttributes(host, {
    checked: via(Bool, (_, value) => {
      toggleState(innards, 'checked', value);
      innards.setFormValue(value ? (host.value ?? 'on') : null);
    }),
    value(_, newValue) {
      if (input.checked) {
        innards.setFormValue(newValue);
      }
    },
  });

  useRipple(host);

  useEvents(
    host,
    {
      change() {
        notify(host, 'change');
      },
    },
    input,
  );

  useClickActivation(host, input);

  return input;
}
