import type { ReactiveElement } from '../elements/reactive-element.ts';
import { query } from '../utils/DOM.ts';
import { useEvents } from './useEvents.ts';

export type SlotControllerUpdateCallback<T extends Element> = (
  slot: HTMLSlotElement,
  elements: readonly T[],
) => void;

export function useSlot<T extends Element = Element>(
  host: ReactiveElement,
  slotSelector: string,
  callback: SlotControllerUpdateCallback<T>,
): void {
  const slot = query<HTMLSlotElement>(host, slotSelector)!;

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
