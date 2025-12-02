import { useAttribute } from '../core/controllers/useAttribute.ts';
import { useEvents } from '../core/controllers/useEvents.ts';
import type { Attribute } from '../core/elements/attribute.ts';
import {
  internals,
  type ReactiveElement,
} from '../core/elements/reactive-element.ts';
import type { ButtonLike } from './useButtonCore.ts';

export interface SwitchLike extends ButtonLike {
  checked: boolean;
}

const switches = new WeakSet<Element>();

const CHANGE_EVENTS = ['input', 'change'] as const;

export type SwitchAttributes = Readonly<{
  checked?: boolean;
  value?: string;
}>;

export function useSwitch(
  host: ReactiveElement,
  attribute: Attribute<boolean, ReactiveElement>,
): void {
  const int = internals(host);

  useAttribute(attribute, (_, newValue) => {
    if (newValue) {
      int.states.add('checked');
    } else {
      int.states.delete('checked');
    }
  });

  useEvents(host, {
    pointerdown() {
      CHANGE_EVENTS.forEach((name) =>
        host.dispatchEvent(new Event(name, { bubbles: true, composed: true })),
      );
    },
  });

  switches.add(host);
}

export function isSwitchLike(node: unknown): node is SwitchLike {
  // @ts-expect-error: simplify check
  return switches.has(node);
}
