import type { Constructor } from 'type-fest';
import { createAccessors } from '../core/controllers/createAccessors.ts';
import { useEvents } from '../core/controllers/useEvents.ts';
import { Bool, Str, type Converter } from '../core/elements/attribute.ts';
import type { ReactiveElement } from '../core/elements/reactive-element.ts';
import { $, DEFAULT_EVENT_INIT } from '../core/utils/DOM.ts';
import { useTargetedARIA } from '../core/utils/useCore.ts';
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
  createAccessors(ctr, {
    checked: Bool,
    value: Str,
    ...attributes,
  });
}

export function useSwitch(host: ReactiveElement): void {
  const target = $<HTMLElement>(host, '.host')!;

  target.role = 'switch';
  useTargetedARIA(host, target);

  useEvents(host, {
    pointerdown() {
      CHANGE_EVENTS.forEach((name) =>
        host.dispatchEvent(new Event(name, DEFAULT_EVENT_INIT)),
      );
    },
  });

  switches.add(host);
}

export function isSwitchLike(node: unknown): node is SwitchLike {
  // @ts-expect-error: simplify check
  return switches.has(node);
}
