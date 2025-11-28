import { useAttribute } from '../core/controllers/useAttribute.ts';
import { useEvents } from '../core/controllers/useEvents.ts';
import { useInternals } from '../core/controllers/useInternals.ts';
import type { Attribute } from '../core/elements/attribute.ts';
import type { ReactiveElement } from '../core/elements/reactive-element.ts';

const CHANGE_EVENTS = ['input', 'change'] as const;

export type SwitchAttributes = Readonly<{
  checked?: boolean;
  value?: string;
}>;

export function useSwitch(
  host: ReactiveElement,
  attribute: Attribute<boolean, ReactiveElement>,
): void {
  const internals = useInternals(host);

  useAttribute(attribute, (_, newValue) => {
    if (newValue) {
      internals.states.add('checked');
    } else {
      internals.states.delete('checked');
    }
  });

  useEvents(host, {
    pointerdown() {
      CHANGE_EVENTS.forEach((name) =>
        host.dispatchEvent(new Event(name, { bubbles: true, composed: true })),
      );
    },
  });
}
