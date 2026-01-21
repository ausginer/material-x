import { useEvents } from '../core/controllers/useEvents.ts';
import {
  impl,
  type AppliedTraits,
  type ConstructorWithTraits,
} from '../core/elements/impl.ts';
import type { ReactiveElement } from '../core/elements/reactive-element.ts';
import { Checkable, type CheckableProps } from '../core/traits/checkable.ts';
import { Valuable, type ValuableProps } from '../core/traits/valuable.ts';
import { $, notify } from '../core/utils/DOM.ts';
import { useTargetedARIA } from '../core/utils/useCore.ts';
import { ButtonCore } from './ButtonCore.ts';

export type SwitchProps = CheckableProps & ValuableProps;

export const SwitchCore: ConstructorWithTraits<
  ReactiveElement,
  [...AppliedTraits<typeof ButtonCore>, typeof Checkable, typeof Valuable]
> = impl(ButtonCore, [Checkable, Valuable]);

export function useSwitch(host: ReactiveElement): void {
  const target = $<HTMLElement>(host, '.host')!;

  target.role = 'switch';
  useTargetedARIA(host, target);

  useEvents(host, {
    pointerdown() {
      notify(host, 'input', 'change');
    },
  });
}
