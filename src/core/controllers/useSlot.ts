import type { ReactiveElement } from '../elements/reactive-element.ts';
import { query } from '../utils/DOM.ts';
import { useConnected } from './useConnected.ts';
import { useEvents } from './useEvents.ts';

export type SlotControllerUpdateCallback = (
  elements: readonly Element[],
) => void;

export function useSlot(
  host: ReactiveElement,
  slotSelector: string,
  callback: SlotControllerUpdateCallback,
): void {
  const slot = query<HTMLSlotElement>(host, slotSelector)!;
  const slotchange = () => callback(slot.assignedElements());

  useConnected(host, slotchange);
  useEvents(host, { slotchange });
}
