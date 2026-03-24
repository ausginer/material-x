import { useEvents } from 'ydin/controllers';
import {
  impl,
  type ConstructorWithTraits,
  type ReactiveElement,
} from 'ydin/elements';
import {
  Checkable,
  type CheckableProps,
  Valuable,
  type ValuableProps,
} from 'ydin/traits';
import { $, notify } from 'ydin/utils';
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
