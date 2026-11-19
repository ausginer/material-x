import "../core/styles/elevation/elevation.runtime.js";
import css from "../core/styles/elevation/elevation.css.js";
import { useHasSlottedPolyfill } from "../core/utils/polyfills.js";
import { useCore } from "../core/utils/useCore.js";
import tpl from "./list-item-shared.tpl.html.js";
import css$1 from "./styles/item/main.css.js";
import { internals } from "@ydinjs/core/element.js";
import { $, toggleState } from "@ydinjs/core/utils/DOM.js";
import { useSlot } from "@ydinjs/core/controllers/useSlot.js";
import { useReorderableItem } from "@ydinjs/core/traits/reorderable.js";
// src/list/ListItemCore.ts
const LIST_ITEM_CORE_TRAITS = [];
/**
* Turns a slotted `[data-handle]` grip into a focusable, button-like control so
* the reorder gesture is operable from the keyboard, not just the pointer: the
* {@link useReorderable} keyboard path is armed by space/enter on this handle.
* Consumer-supplied `role`, `tabindex`, and accessible name are left untouched.
*/
function enhanceHandle(nodes) {
	const handle = nodes.find((n) => n instanceof HTMLElement && "handle" in n.dataset);
	if (!handle) return;
	if (!handle.hasAttribute("tabindex")) handle.tabIndex = 0;
	if (!handle.hasAttribute("role")) handle.setAttribute("role", "button");
	if (!handle.hasAttribute("aria-label") && !handle.hasAttribute("aria-labelledby")) handle.setAttribute("aria-label", "Reorder");
	handle.style.touchAction = "none";
}
function useListItemCore(host, template, styles = [], init) {
	useCore(host, [template], {}, [
		css,
		css$1,
		...styles
	], init);
	const target = $(host, ".host");
	target.append(tpl.content.cloneNode(true));
	useHasSlottedPolyfill(host);
	useReorderableItem(host, target);
	useSlot(host, ".lead", (_, nodes) => {
		toggleState(internals(host), "lead-large", nodes.some((n) => n instanceof HTMLElement && "large" in n.dataset));
		enhanceHandle(nodes);
	});
	useSlot(host, ".trail", (_, nodes) => {
		enhanceHandle(nodes);
	});
	return target;
}
export { LIST_ITEM_CORE_TRAITS, useListItemCore };

//# sourceMappingURL=ListItemCore.js.map