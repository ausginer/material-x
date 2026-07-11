import { Bool } from 'ydin/attribute.js';
import { useAttributes, via } from 'ydin/controllers/useAttributes.js';
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
import { toggleState } from 'ydin/utils/DOM.js';
import { BUTTON_GROUP_CTX } from '../button-group/button-group-context.ts';
import { notify, useClickActivation } from '../core/utils/events.ts';
import { useContext } from '../core/utils/useContext.ts';
import { ButtonCore, useButtonCore } from './ButtonCore.ts';
import controlStyles from './styles/default/switch-control.css.ts' with { type: 'css' };

export type SwitchProps = CheckableProps & ValuableProps;
export type SwitchEvents = Readonly<{
  change: Event;
  input: Event;
}>;

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
  const target = useButtonCore(
    host,
    template,
    [...styles, controlStyles],
    init,
  ) as HTMLInputElement;

  target.role = 'switch';

  useCheckable(host, target);

  useValuable(host, target);

  const innards = internals(host);

  useAttributes(host, {
    checked: via(Bool, (_, value) => {
      toggleState(innards, 'checked', value);
    }),
  });

  useContext(
    host,
    BUTTON_GROUP_CTX,
    VALUABLE_ATTRS,
    (_, oldValue, newValue) => {
      if (oldValue === host.value) {
        innards.states.delete('checked');
        target.checked = false;
      } else if (newValue === host.value) {
        innards.states.add('checked');
        target.checked = true;
      }
    },
  );

  useEvents(
    host,
    {
      change() {
        notify(host, 'change');
      },
    },
    target,
  );

  useClickActivation(host, target);
}
