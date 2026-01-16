import { useEvents } from '../core/controllers/useEvents.ts';
import { Str } from '../core/elements/attribute.ts';
import {
  impl,
  trait,
  type Accessors,
  type ConstructorWithTraits,
  type Trait,
  type TraitProps,
} from '../core/elements/impl.ts';
import type { ReactiveElement } from '../core/elements/reactive-element.ts';
import type { Disableable } from '../core/traits/disabled.ts';
import { $, DEFAULT_EVENT_INIT } from '../core/utils/DOM.ts';
import { useTargetedARIA } from '../core/utils/useCore.ts';
import { ButtonCore, type ButtonLike } from './useButtonCore.ts';

const switches = new WeakSet<Element>();

const CHANGE_EVENTS = ['input', 'change'] as const;

export type SwitchAttributes = Readonly<{
  checked?: boolean;
  value?: string;
}>;

export const SwitchLike: Trait<
  ReactiveElement,
  Accessors<{ href: Str; target: Str }>
> = trait({ href: Str, target: Str });

export type SwitchLike = ButtonLike & TraitProps<typeof SwitchLike>;

export const SwitchCore: ConstructorWithTraits<
  ReactiveElement,
  [typeof ButtonLike, typeof Disableable, typeof SwitchLike]
> = impl(ButtonCore, SwitchLike);

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
