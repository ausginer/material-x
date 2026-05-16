import { transfer, useAttributes } from 'ydin/controllers/useAttributes.js';
import { useEvents } from 'ydin/controllers/useEvents.js';
import { internals } from 'ydin/element.js';
import {
  Checkable,
  useCheckable,
  type CheckableProps,
} from 'ydin/traits/checkable.js';
import { impl, type TraitedConstructor } from 'ydin/traits/traits.js';
import {
  VALUABLE_ATTRS,
  Valuable,
  useValuable,
  type ValuableProps,
} from 'ydin/traits/valuable.js';
import { $, notify } from 'ydin/utils/DOM.js';
import { CONNECTED_GROUP_CTX } from '../button-group/button-group-context.ts';
import { useContext } from '../core/utils/useContext.ts';
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

  const innards = internals(host);

  useContext(
    host,
    CONNECTED_GROUP_CTX,
    VALUABLE_ATTRS,
    (_, oldValue, newValue) => {
      if (oldValue === host.value) {
        innards.states.delete('checked');
        target.ariaChecked = 'false';
      } else if (newValue === host.value) {
        innards.states.add('checked');
        target.ariaChecked = 'true';
      }
    },
  );

  useEvents(host, {
    pointerdown() {
      notify(host, 'input', 'change');
    },
  });
}
