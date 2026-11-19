import { $focusForwarding, __mxflat_controls_7b84b960 as controls } from "../core/traits/focus-forwarding.js";
import tpl from "./list-button-item.tpl.html.js";
import { useInteractiveListItemCore } from "./ListInteractiveItemCore.js";
import attribute from "@ydinjs/core/attribute.js";
import { ControlledElement, define } from "@ydinjs/core/element.js";
import "@ydinjs/core/traits/attributes.js";
import { $disableable, DISABLEABLE_ATTRS } from "@ydinjs/core/traits/disableable.js";
import { $selectable, SELECTABLE_ATTRS, useSelectable } from "@ydinjs/core/traits/selectable.js";
// src/list/list-button-item.ts
/**
* @tag mx-list-button-item
*
* @summary Interactive list items trigger actions with native button behavior.
*
* @attr {boolean} selected - Applies selected visual state.
* @attr {boolean} disabled - Disables interaction.
*
* @slot - Primary label text.
* @slot start - Leading icon, avatar, or image.
* @slot end - Trailing icon or control.
* @slot overline - Overline text.
* @slot supporting-text - Supporting text below the label.
* @slot trailing-supporting-text - Trailing supporting text.
*
* @csspart impl - Internal native button element.
*
* @event click - Fired when the item is activated.
*/
class ListButtonItem extends ControlledElement {
	static observedAttributes = [.../* @__PURE__ */ new Set([
		...ControlledElement.observedAttributes ?? [],
		"disabled",
		"selected"
	])];
	get "disabled"() {
		return attribute.get(this, "disabled", DISABLEABLE_ATTRS.disabled);
	}
	set "disabled"(value) {
		attribute.set(this, "disabled", value, DISABLEABLE_ATTRS.disabled);
	}
	get "selected"() {
		return attribute.get(this, "selected", SELECTABLE_ATTRS.selected);
	}
	set "selected"(value) {
		attribute.set(this, "selected", value, SELECTABLE_ATTRS.selected);
	}
	focus(options) {
		controls.get(this).focus(options);
	}
	static {
		Object.defineProperties(this.prototype, {
			[$disableable]: { value: true },
			[$selectable]: { value: true },
			[$focusForwarding]: { value: true }
		});
	}
	constructor() {
		super();
		const target = useInteractiveListItemCore(this, tpl);
		useSelectable(this, target);
	}
}
define("mx-list-button-item", ListButtonItem);
export { ListButtonItem as default };

//# sourceMappingURL=list-button-item.js.map