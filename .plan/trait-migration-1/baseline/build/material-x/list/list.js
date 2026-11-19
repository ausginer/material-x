import { identity, parseMs } from "../core/utils/fns.js";
import { useCore } from "../core/utils/useCore.js";
import tpl from "./list.tpl.html.js";
import css from "./styles/default/main.css.js";
import attribute, { Bool } from "@ydinjs/core/attribute.js";
import { ControlledElement, define } from "@ydinjs/core/element.js";
import "@ydinjs/core/traits/attributes.js";
import { useCSSProps } from "@ydinjs/core/controllers/useCSSProps.js";
import { $reorderable, useReorderable } from "@ydinjs/core/traits/reorderable.js";
// src/list/list.ts
const CSS_PROPS = {
	easing: ["--fm", identity],
	duration: ["--fl", parseMs]
};
/**
* @tag mx-list
*
* @summary Lists are continuous groups of text or image-based content.
*
* @attr {boolean} reorderable - Enables drag-and-drop reordering of items.
*   An item may designate a `data-handle` element (e.g. in its lead or trail
*   slot) as the drag grip; if it has none, its whole surface starts the drag.
*   A drag begins only on a primary press that moves past a small threshold, so
*   plain clicks and taps on nested controls are unaffected.
*
* @slot - List item elements.
*
* @event reorder - Fired when the user drops an item at a new position.
*   The event exposes the dragged `item` and its `from` and `to` indices
*   directly.
*   The consumer is responsible for updating the DOM order, and should do so
*   synchronously in the handler — a deferred reorder makes the dropped item
*   snap back to its old slot for a frame before landing.
*
* @cssprop --md-list-container-color - Overrides the list container color.
* @cssprop --md-list-container-shape - Overrides the list container shape.
*/
class List extends ControlledElement {
	static observedAttributes = [.../* @__PURE__ */ new Set([...ControlledElement.observedAttributes ?? [], "reorderable"])];
	get "reorderable"() {
		return attribute.get(this, "reorderable", Bool);
	}
	set "reorderable"(value) {
		attribute.set(this, "reorderable", value, Bool);
	}
	static {
		Object.defineProperties(this.prototype, { [$reorderable]: { value: true } });
	}
	constructor() {
		super();
		useCore(this, [tpl], { role: "list" }, [css]);
		const cssProps = useCSSProps(this, CSS_PROPS);
		useReorderable(this, cssProps);
	}
}
define("mx-list", List);
export { List as default };

//# sourceMappingURL=list.js.map