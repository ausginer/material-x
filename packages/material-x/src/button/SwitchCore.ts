import { transfer, useAttributes } from 'ydin/controllers/useAttributes.js';
import { useEvents } from 'ydin/controllers/useEvents.js';
import {
  Checkable,
  useCheckable,
  type CheckableProps,
} from 'ydin/traits/checkable.js';
import { impl, type TraitedConstructor } from 'ydin/traits/traits.js';
import {
  Valuable,
  useValuable,
  type ValuableProps,
} from 'ydin/traits/valuable.js';
import { $, notify } from 'ydin/utils/DOM.js';
import { ButtonCore, useButtonCore } from './ButtonCore.ts';

export type SwitchProps = CheckableProps & ValuableProps;

export const SwitchCore: TraitedConstructor<
  ButtonCore,
  typeof ButtonCore,
  [typeof Checkable, typeof Valuable]
> = impl(ButtonCore, [Checkable, Valuable]);
export type SwitchCore = InstanceType<typeof SwitchCore>;

export function useSwitchCore(
  host: SwitchCore,
  template: HTMLTemplateElement,
  styles: ReadonlyArray<CSSStyleSheet | string>,
  init?: Partial<ShadowRootInit>,
): void {
  useButtonCore(host, template, styles, init);

  const target = $<HTMLButtonElement>(host, '.host')!;

  target.role = 'switch';
  target.ariaChecked = 'false';

  useCheckable(host, target);
  useValuable(host, target);

  useAttributes(host, {
    checked: transfer(target, 'aria-checked', (value) =>
      value == null ? 'false' : 'true',
    ),
  });

  useEvents(host, {
    pointerdown() {
      notify(host, 'input', 'change');
    },
  });
}
