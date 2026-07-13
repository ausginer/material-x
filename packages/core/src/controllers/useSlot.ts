import type { ControlledElement } from '../element.ts';
import { $ } from '../utils/DOM.ts';
import { useEvents } from './useEvents.ts';

/**
 * Callback invoked when the observed slot dispatches `slotchange`.
 *
 * The `nodes` argument mirrors `slot.assignedNodes()` for the current slot
 * state, so it includes text nodes and other non-element nodes.
 *
 * @typeParam T - The node type expected from the observed slot.
 * @param slot - The slot that dispatched the update.
 * @param nodes - The currently assigned child nodes for this slot.
 */
export type SlotControllerUpdateCallback<T extends Node> = (
  slot: HTMLSlotElement,
  nodes: readonly T[],
) => void;

/**
 * Observes a slot and runs a callback whenever its assigned nodes change.
 *
 * The slot can be passed either as a selector resolved inside
 * `host.shadowRoot`, or as a direct `HTMLSlotElement` reference. Updates are
 * driven by the browser `slotchange` event, and the callback receives the
 * current `assignedNodes()` snapshot for that slot.
 *
 * @remarks This controller does not emit an initial update manually. The
 * callback runs only when the platform dispatches `slotchange`.
 *
 * @typeParam T - The node type expected from the observed slot.
 * @param host - The host element that owns the observed slot.
 * @param slotOrSelector - The slot to observe, either by selector or direct
 *   element reference.
 * @param callback - Callback invoked for each `slotchange` update.
 */
export function useSlot<T extends Node = Node>(
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
        callback(slot, slot.assignedNodes() as T[]);
      },
    },
    slot,
  );
}
