import { useEvents } from 'ydin/controllers/useEvents.js';
import { impl, type ConstructorWithTraits } from 'ydin/traits/traits.js';
import type { ReactiveElement } from 'ydin/reactive-element.js';
import { Checkable, type CheckableProps } from 'ydin/traits/checkable.js';
import { Valuable, type ValuableProps } from 'ydin/traits/valuable.js';
import { $, notify } from 'ydin/utils/DOM.js';
import { useTargetedARIA } from '../core/utils/useCore.ts';
import { ButtonCore } from './ButtonCore.ts';

export type SwitchProps = CheckableProps & ValuableProps;

export const SwitchCore: ConstructorWithTraits<
  InstanceType<typeof ButtonCore>,
  [typeof Checkable, typeof Valuable]
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
