import { Bool } from '@ydinjs/core/attribute.js';
import { useAttributes, via } from '@ydinjs/core/controllers/useAttributes.js';
import { useClickActivation } from '@ydinjs/core/controllers/useClickActivation.js';
import { useEvents } from '@ydinjs/core/controllers/useEvents.js';
import { internals, type ControlledElement } from '@ydinjs/core/element.js';
import {
  type Checkable,
  useCheckable,
  type CheckableProps,
} from '@ydinjs/core/traits/checkable.js';
import type { Composed } from '@ydinjs/core/traits/composition.js';
import {
  type Disableable,
  useDisableable,
  type DisableableProps,
} from '@ydinjs/core/traits/disableable.js';
import {
  type Nameable,
  useNameable,
  type NameableProps,
} from '@ydinjs/core/traits/nameable.js';
import {
  type Validatable,
  useValidatable,
  type ValidatableProps,
} from '@ydinjs/core/traits/validatable.js';
import {
  useValuable,
  type Valuable,
  type ValuableProps,
} from '@ydinjs/core/traits/valuable.js';
import { toggleState } from '@ydinjs/core/utils/DOM.js';
import { useRipple } from '../animations/ripple/ripple.ts';
import { useCore } from '../utils/useCore.ts';
import css from './styles/main.css.ts' with { type: 'css' };

export type CheckableCoreProps = CheckableProps &
  ValuableProps &
  DisableableProps &
  NameableProps &
  ValidatableProps;

export type CheckableCoreTraits = readonly [
  typeof Checkable,
  typeof Valuable,
  typeof Disableable,
  typeof Nameable,
  typeof Validatable,
];

export type CheckableCore = InstanceType<
  Composed<typeof ControlledElement, CheckableCoreTraits>
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

  const input = host.shadowRoot!.querySelector<HTMLInputElement>('#input')!;
  const innards = internals(host);

  useCheckable(host, input);
  useValuable(host, input);
  useDisableable(host, input);
  useNameable(host, input);
  useValidatable(host, input);

  useAttributes(host, {
    checked: via(Bool, (_, value) => {
      toggleState(innards, 'checked', value);
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

  useRipple(host);

  // The component is controlled, but the native input's activation changes
  // its own `checked`. Once the consumer's `change` handlers have run, the
  // input shows the host's state again: the new state if a handler set it, and
  // the old one otherwise.
  useEvents(
    host,
    {
      change() {
        // A native `change` isn't composed, so the one inside the shadow tree
        // never crosses the host's boundary, and the host fires its own.
        host.dispatchEvent(new Event('change', { bubbles: true }));
        input.checked = host.checked;
      },
    },
    input,
  );

  useClickActivation(host, input);

  return input;
}
