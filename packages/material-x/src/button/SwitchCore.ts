import type { AttributePrimitive } from 'ydin/attribute.js';
import { transfer, useAttributes } from 'ydin/controllers/useAttributes.js';
import { useContext } from 'ydin/controllers/useContext.js';
import { useEvents } from 'ydin/controllers/useEvents.js';
import { getInternals } from 'ydin/element.js';
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
import { CONNECTED_GROUP_CTX } from '../button-group/button-group-context.ts';
import { ButtonCore, useButtonCore } from './ButtonCore.ts';

export type SwitchProps = CheckableProps & ValuableProps;

export const SwitchCore: TraitedConstructor<
  ButtonCore,
  typeof ButtonCore,
  [typeof Checkable, typeof Valuable]
> = impl(ButtonCore, [Checkable, Valuable]);
export type SwitchCore = InstanceType<typeof SwitchCore>;

function updateByContext(
  internals: ElementInternals,
  target: HTMLElement,
  value: string | null,
  changed: readonly [
    oldValue: AttributePrimitive | null,
    newValue: AttributePrimitive | null,
  ],
) {
  const [oldValue, newValue] = changed;
  if (oldValue === value) {
    internals.states.delete('checked');
    target.ariaChecked = 'false';
  } else if (newValue === value) {
    internals.states.add('checked');
    target.ariaChecked = 'true';
  }
}

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

  const internals = getInternals(host);

  useContext(host, CONNECTED_GROUP_CTX, (data) => {
    if (data) {
      updateByContext(internals, target, host.value, [
        null,
        data.provider.value,
      ]);

      return data.emitter.on((_, oldValue, newValue) => {
        updateByContext(internals, target, host.value, [oldValue, newValue]);
      });
    }

    return undefined;
  });

  useEvents(host, {
    pointerdown() {
      notify(host, 'input', 'change');
    },
  });
}
