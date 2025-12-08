import type { Constructor } from 'type-fest';
import { useAccessors } from '../core/controllers/useAccessors.ts';
import { useEvents } from '../core/controllers/useEvents.ts';
import { Bool, Str, type Converter } from '../core/elements/attribute.ts';
import type { ReactiveElement } from '../core/elements/reactive-element.ts';
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

export function useSwitchAccessors(
  ctr: Constructor<ReactiveElement>,
  attributes?: Readonly<Record<string, Converter>>,
): void {
  useAccessors(ctr, {
    checked: Bool,
    value: Str,
    ...attributes,
  });
}

export function useSwitch(host: ReactiveElement): void {
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
