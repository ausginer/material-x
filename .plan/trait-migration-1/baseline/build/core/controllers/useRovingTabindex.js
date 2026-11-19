import { ControlledElement } from "../element.js";
import { Checkable } from "../traits/checkable.js";
import { Disableable } from "../traits/disableable.js";
import { Valuable } from "../traits/valuable.js";
import { createEventNotifier } from "../utils/DOM.js";
import { useAttributes } from "./useAttributes.js";
import { useEvents } from "./useEvents.js";
import { useKeyboard } from "./useKeyboard.js";
import { useSlot } from "./useSlot.js";
// src/controllers/useRovingTabindex.ts
const notifySelection = createEventNotifier({
	input: { cancelable: false },
	change: {
		cancelable: false,
		composed: false
	}
});
function notifyFocused(item) {
	if (!item || item.checked) return;
	notifySelection(item, "input", "change");
}
function isItem(node) {
	return node instanceof ControlledElement && node instanceof Valuable && node instanceof Checkable && node instanceof Disableable;
}
const EDGE_FIRST = 0;
const EDGE_LAST = -1;
const DIRECTION_LEFT = -1;
const DIRECTION_RIGHT = 1;
/**
* Internal view over the current managed roving items.
*
* This helper keeps slot-derived items and centralizes enabled-item filtering,
* tab stop selection, and edge / step navigation for
* `useRovingTabindex(...)`.
*/
var RovingItems = class {
	#host;
	#items = [];
	constructor(host) {
		this.#host = host;
	}
	set value(value) {
		this.#items = value;
	}
	contains(item) {
		return this.#items.includes(item);
	}
	/**
	* Enabled items that can participate in roving focus and selection.
	*/
	get enabled() {
		return this.#items.filter((item) => !item.disabled);
	}
	/**
	* Currently focused managed item, if focus is on the item element itself.
	*/
	get focused() {
		const focused = document.activeElement;
		return this.#items.find((item) => item === focused);
	}
	/**
	* Managed item that currently owns the roving tab stop.
	*/
	get tabbable() {
		return this.#items.find((item) => item.tabIndex === 0);
	}
	/**
	* Active navigation anchor.
	*
	* This prefers the directly focused item and otherwise falls back to the
	* current tabbable item.
	*/
	get active() {
		return this.focused ?? this.tabbable;
	}
	/**
	* Assigns the roving tab stop to the given item.
	*
	* When no item is provided, all managed items become untabbable.
	*
	* @param target - Item that should receive `tabIndex = 0`.
	*/
	setTabStop(target) {
		for (const item of this.#items) item.tabIndex = item === target ? 0 : -1;
	}
	/**
	* Selects the next tab stop candidate for the current host state.
	*
	* Candidates are chosen in this order:
	* 1. enabled item matching `host.value`
	* 2. current active enabled item
	* 3. first enabled item
	*
	* @returns The preferred tabbable item, if any enabled item exists.
	*/
	getTabStopCandidate() {
		const { enabled } = this;
		if (!enabled.length) return void 0;
		return enabled.find((item) => item.value === this.#host.value) ?? (this.active && !this.active.disabled && this.contains(this.active) ? this.active : void 0) ?? enabled[0];
	}
	/**
	* Applies focus and roving tabindex to a specific item.
	*
	* Disabled and missing items are ignored. When the target is already active,
	* only the tab stop is refreshed.
	*
	* @param item - Item that should receive focus.
	* @returns The focused item, or `undefined` when nothing happened.
	*/
	focus(item) {
		if (!item || item.disabled) return;
		if (this.active === item) {
			this.setTabStop(item);
			return item;
		}
		this.setTabStop(item);
		item.focus();
		return item;
	}
	/**
	* Focuses the first or last enabled item.
	*
	* @param edge - Edge to resolve, matching `Home` / `End` semantics.
	* @returns The focused edge item, if any enabled item exists.
	*/
	focusEdge(edge) {
		const { enabled } = this;
		if (!enabled.length) return void 0;
		const target = enabled.at(edge);
		return target ? this.focus(target) : void 0;
	}
	/**
	* Computes the next enabled item for arrow navigation with wrap-around.
	*
	* This uses the current active item as the navigation anchor. When there is
	* no active managed item, it falls back to the enabled item matching
	* `host.value`, then to the first enabled item.
	*
	* @param direction - Navigation direction relative to the active item.
	* @returns The next enabled item, without focusing it.
	*/
	step(direction) {
		const { enabled } = this;
		if (!enabled.length) return void 0;
		const { active } = this;
		let index = active ? enabled.indexOf(active) : -1;
		if (index === -1) {
			const fromValue = enabled.find((item) => item.value === this.#host.value);
			index = fromValue ? enabled.indexOf(fromValue) : 0;
		}
		return enabled[(index + direction + enabled.length) % enabled.length];
	}
};
function hasKeyModifier(event) {
	return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}
/**
* Registers roving tabindex behavior for checkable valuable items in a slot.
*
* Managed items are expected to implement `Checkable`, `Disableable`, and
* `Valuable` on top of `ControlledElement`. Elements that do not match that
* contract are ignored.
*
* The controller keeps exactly one enabled item tabbable, updates that tab
* stop from `host.value`, and handles `Home`, `End`, and arrow-key navigation
* with wrap-around semantics.
*
* @remarks Focus entering a managed item, or a composed descendant inside that
* item, updates the current tab stop immediately. Modified key combos
* (`Shift`, `Alt`, `Ctrl`, `Meta`) are ignored. In RTL layout, the current
* previous/next semantics are mirrored for all supported arrow keys.
*
* @param host - Valuable host element that controls the roving group state.
* @param slotSelector - Selector for the slot that provides managed item
*   elements. Defaults to the first `slot` in the host shadow root.
*/
function useRovingTabindex(host, slotSelector = "slot") {
	const items = new RovingItems(host);
	const createEdgeHandler = (edge) => (event) => {
		if (!hasKeyModifier(event)) {
			const target = items.focusEdge(edge);
			if (!target) return;
			event.preventDefault();
			notifyFocused(target);
		}
	};
	const createStepHandler = (direction) => (event) => {
		if (!hasKeyModifier(event)) {
			const target = items.focus(items.step(direction));
			if (!target) return;
			event.preventDefault();
			notifyFocused(target);
		}
	};
	useSlot(host, slotSelector, (_, nodes) => {
		items.value = nodes.filter(isItem);
		items.setTabStop(items.getTabStopCandidate());
	});
	const hasRtl = () => getComputedStyle(host).direction === "rtl";
	const right = createStepHandler(DIRECTION_RIGHT);
	const left = createStepHandler(DIRECTION_LEFT);
	const previous = (event) => hasRtl() ? right(event) : left(event);
	const next = (event) => hasRtl() ? left(event) : right(event);
	useKeyboard(host, {
		Home: { down: createEdgeHandler(EDGE_FIRST) },
		End: { down: createEdgeHandler(EDGE_LAST) },
		ArrowLeft: { down: previous },
		ArrowUp: { down: previous },
		ArrowRight: { down: next },
		ArrowDown: { down: next }
	});
	useAttributes(host, { value() {
		items.setTabStop(items.getTabStopCandidate());
	} });
	useEvents(host, { focusin(event) {
		const target = event.composedPath().find((node) => isItem(node) && !node.disabled && items.contains(node));
		if (target) items.setTabStop(target);
	} });
}
export { useRovingTabindex };

//# sourceMappingURL=useRovingTabindex.js.map