import { Bool } from 'ydin/attribute.js';
import { useAttributes, via } from 'ydin/controllers/useAttributes.js';
import { useEvents } from 'ydin/controllers/useEvents.js';
import {
  ControlledElement,
  internals,
  type ControlledElementConstructor,
} from 'ydin/element.js';
import {
  Checkable,
  useCheckable,
  type CheckableProps,
} from 'ydin/traits/checkable.js';
import {
  Disableable,
  useDisableable,
  type DisableableProps,
} from 'ydin/traits/disableable.js';
import {
  Nameable,
  useNameable,
  type NameableProps,
} from 'ydin/traits/nameable.js';
import { impl, type TraitedConstructor } from 'ydin/traits/traits.js';
import {
  useValuable,
  Valuable,
  type ValuableProps,
} from 'ydin/traits/valuable.js';
import { $, toggleState } from 'ydin/utils/DOM.js';
import { useRipple } from '../animations/ripple/ripple.ts';
import { notify, useClickActivation } from '../utils/events.ts';
import { useCore } from '../utils/useCore.ts';
import css from './styles/main.css.ts' with { type: 'css' };

export type CheckableCoreProps = CheckableProps &
  ValuableProps &
  DisableableProps &
  NameableProps;

export const CheckableCore: TraitedConstructor<
  ControlledElement,
  ControlledElementConstructor,
  [typeof Checkable, typeof Valuable, typeof Disableable, typeof Nameable]
> = impl(ControlledElement, [Checkable, Valuable, Disableable, Nameable])(
  (Base) => class extends Base {},
);
export type CheckableCore = InstanceType<typeof CheckableCore>;

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
