import { Bool } from 'ydin/attribute.js';
import {
  transfer,
  useAttributes,
  via,
} from 'ydin/controllers/useAttributes.js';
import { useEvents } from 'ydin/controllers/useEvents.js';
import {
  ControlledElement,
  getInternals,
  type ControlledElementConstructor,
} from 'ydin/element.js';
import { Checkable, type CheckableProps } from 'ydin/traits/checkable.js';
import { Disableable, type DisableableProps } from 'ydin/traits/disableable.js';
import { impl, type TraitedConstructor } from 'ydin/traits/traits.js';
import { Valuable, type ValuableProps } from 'ydin/traits/valuable.js';
import { $, notify, toggleState } from 'ydin/utils/DOM.js';
import { useRipple } from '../animations/ripple/ripple.ts';
import { useCore } from '../utils/useCore.ts';

export type CheckableCoreProps = CheckableProps &
  ValuableProps &
  DisableableProps;

export const CheckableCore: TraitedConstructor<
  ControlledElement,
  ControlledElementConstructor,
  [typeof Checkable, typeof Valuable, typeof Disableable]
> = impl(ControlledElement, [Checkable, Valuable, Disableable]);
export type CheckableCore = InstanceType<typeof CheckableCore>;

// oxlint-disable-next-line max-params
export function useCheckableCore(
  host: CheckableCore,
  templates: readonly HTMLTemplateElement[],
  aria: Partial<ARIAMixin>,
  styles: ReadonlyArray<CSSStyleSheet | string>,
  init?: Partial<ShadowRootInit>,
): HTMLInputElement {
  useCore(host, templates, aria, styles, init);

  const input = $<HTMLInputElement>(host, '#input')!;
  const internals = getInternals(host);

  useAttributes(host, {
    checked: via(Bool, (_, value) => {
      input.checked = value;
      toggleState(internals, 'checked', value);
      internals.setFormValue(value ? (host.value ?? 'on') : null);
    }),
    disabled: transfer(input, 'disabled'),
    value(_, newValue) {
      if (input.checked) {
        internals.setFormValue(newValue);
      }
    },
  });

  useRipple(host, {
    easing: '--_ripple-easing',
    duration: '--_ripple-duration',
  });

  useEvents(
    host,
    {
      input() {
        notify(host, 'input', 'change');
      },
    },
    input,
  );

  return input;
}
