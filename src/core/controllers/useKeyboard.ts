import type { ReactiveElement } from '../elements/reactive-element.ts';
import { useEvents } from './useEvents.ts';

export type KeyboardListener = (e: KeyboardEvent) => void;

export type KeyboardListenerSet = Readonly<{
  down?: KeyboardListener;
  up?: KeyboardListener;
}>;

export function useKeyboard(
  host: ReactiveElement,
  listeners: Readonly<Record<string, KeyboardListenerSet>>,
  target: HTMLElement = host,
): void {
  useEvents(
    host,
    {
      keydown(e) {
        listeners[e.key]?.down?.(e);
      },
      keyup(e) {
        listeners[e.key]?.up?.(e);
      },
    },
    target,
  );
}
