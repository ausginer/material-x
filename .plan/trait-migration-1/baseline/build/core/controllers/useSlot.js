import { $ } from "../utils/DOM.js";
import { useEvents } from "./useEvents.js";
// src/controllers/useSlot.ts
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
function useSlot(host, slotOrSelector, callback) {
	const slot = typeof slotOrSelector === "string" ? $(host, slotOrSelector) : slotOrSelector;
	useEvents(host, { slotchange() {
		callback(slot, slot.assignedNodes());
	} }, slot);
}
export { useSlot };

//# sourceMappingURL=useSlot.js.map