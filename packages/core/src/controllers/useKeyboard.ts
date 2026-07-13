import type { ControlledElement } from '../element.ts';
import { useEvents } from './useEvents.ts';

/**
 * Handles a keyboard event for a specific key and phase.
 */
export type KeyboardListener = (e: KeyboardEvent) => void;

/**
 * Optional key listeners grouped by keydown / keyup phase.
 */
export type KeyboardListenerSet = Readonly<{
  down?: KeyboardListener;
  up?: KeyboardListener;
}>;

/**
 * Registers key-specific keyboard listeners on a host or custom target.
 *
 * @remarks This is a thin key-phase adapter built on top of `useEvents`.
 *
 * @param host - Host element controlling the listener lifecycle.
 * @param listeners - Mapping from `KeyboardEvent.key` to phase listeners.
 * @param target - Element that should receive keyboard events. Defaults to the
 *   host itself.
 */
export function useKeyboard(
  host: ControlledElement,
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
