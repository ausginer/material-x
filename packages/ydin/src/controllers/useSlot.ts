import type { ControlledElement } from '../element.ts';
import { $ } from '../utils/DOM.ts';
import { useEvents } from './useEvents.ts';

/**
 * Callback invoked when the observed slot dispatches `slotchange`.
 *
 * The `elements` argument mirrors `slot.assignedElements()` for the current
 * slot state, so it includes element nodes only.
 *
 * @typeParam T - The element type expected from the observed slot.
 * @param slot - The slot that dispatched the update.
 * @param elements - The currently assigned element children for this slot.
 */
export type SlotControllerUpdateCallback<T extends Element> = (
  slot: HTMLSlotElement,
  elements: readonly T[],
) => void;

/**
 * Observes a slot and runs a callback whenever its assigned elements change.
 *
 * The slot can be passed either as a selector resolved inside
 * `host.shadowRoot`, or as a direct `HTMLSlotElement` reference. Updates are
 * driven by the browser `slotchange` event, and the callback receives the
 * current `assignedElements()` snapshot for that slot.
 *
 * This controller does not emit an initial update manually. The callback runs
 * only when the platform dispatches `slotchange`. Because it relies on
 * `assignedElements()`, text nodes and other non-element nodes are excluded.
 *
 * @typeParam T - The element type expected from the observed slot.
 * @param host - The host element that owns the observed slot.
 * @param slotOrSelector - The slot to observe, either by selector or direct
 *   element reference.
 * @param callback - Callback invoked for each `slotchange` update.
 */
export function useSlot<T extends Element = Element>(
  host: ControlledElement,
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
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        callback(slot, slot.assignedElements() as T[]);
      },
    },
    slot,
  );
}
