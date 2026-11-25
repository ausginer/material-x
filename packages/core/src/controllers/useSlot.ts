import type { ControlledElement } from '../element.ts';

/**
 * Callback invoked when the observed slot dispatches `slotchange`.
 *
 * The `nodes` argument mirrors `slot.assignedNodes()` for the current slot
 * state, so it includes text nodes and other non-element nodes.
 *
 * @param slot - The slot that dispatched the update.
 * @param nodes - The currently assigned child nodes for this slot.
 */
export type SlotControllerUpdateCallback = (
  slot: HTMLSlotElement,
  nodes: readonly Node[],
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
 * callback runs only when the platform dispatches `slotchange`. The platform
 * also dispatches it while the host is out of the document, before its first
 * connection and after a disconnection, so the callback can run then.
 *
 * @param host - The host element that owns the observed slot.
 * @param slotOrSelector - The slot to observe, either by selector or direct
 *   element reference.
 * @param callback - Callback invoked for each `slotchange` update.
 */
export function useSlot(
  host: ControlledElement,
  slotOrSelector: string | HTMLSlotElement,
  callback: SlotControllerUpdateCallback,
): void {
  const slot =
    typeof slotOrSelector === 'string'
      ? host.shadowRoot!.querySelector<HTMLSlotElement>(slotOrSelector)!
      : slotOrSelector;

  slot.addEventListener('slotchange', () => {
    callback(slot, slot.assignedNodes());
  });
}
