import type { ReactiveElement } from '../elements/reactive-element.ts';
import { $ } from '../utils/DOM.ts';
import { useEvents } from './useEvents.ts';

export type SlotControllerUpdateCallback<T extends Element> = (
  slot: HTMLSlotElement,
  elements: readonly T[],
) => void;

export function useSlot<T extends Element = Element>(
  host: ReactiveElement,
  slotOrSelector: string | HTMLSlotElement,
  callback: SlotControllerUpdateCallback<T>,
): void {
  const slot =
    typeof slotOrSelector === 'string'
      ? $<HTMLSlotElement>(host, slotOrSelector)!
      : slotOrSelector;

  useEvents(
    host,
    {
      slotchange() {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        callback(slot, slot.assignedElements() as T[]);
      },
    },
    slot,
  );
}
