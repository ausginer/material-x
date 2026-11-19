import { $buttonLike, BUTTON_ATTRS } from "../button/ButtonCore.js";
import { $buttonGroupLike, useButtonGroupCore } from "./ButtonGroupCore.js";
import tpl from "./button-group.tpl.html.js";
import css from "./styles/connected/main.css.js";
import attribute from "@ydinjs/core/attribute.js";
import { ControlledElement, define } from "@ydinjs/core/element.js";
import "@ydinjs/core/traits/attributes.js";
import { $disableable, DISABLEABLE_ATTRS } from "@ydinjs/core/traits/disableable.js";
import { $valuable, VALUABLE_ATTRS } from "@ydinjs/core/traits/valuable.js";
import { useRovingTabindex } from "@ydinjs/core/controllers/useRovingTabindex.js";
import { useSlot } from "@ydinjs/core/controllers/useSlot.js";
// src/button-group/connected-button-group.ts
/**
* @tag mx-connected-button-group
*
* @summary Connected button groups arrange checkable buttons as a segmented
* control.
*
* @attr {"outlined"|"elevated"|"text"|"tonal"} color - Shared color variant
* for child buttons.
* @attr {"xsmall"|"medium"|"large"|"xlarge"} size - Shared size for child
* buttons.
* @attr {"round"|"square"} shape - Shared shape for child buttons.
* @attr {boolean} disabled - Group disabled state.
* @attr {string} value - Selected group value.
*
* @slot - Checkable button elements.
*
* @cssprop --md-button-group-between-space - Overrides spacing between buttons.
* @cssprop --md-button-group-interaction-width-multiplier - Overrides active
* overlap width factor.
* @cssprop --md-button-group-inner-corner-size - Overrides the inner corner
* radius of a button at rest. A selected or pressed button keeps its own
* corners.
*/
class ConnectedButtonGroup extends ControlledElement {
	static observedAttributes = [.../* @__PURE__ */ new Set([
		...ControlledElement.observedAttributes ?? [],
		"color",
		"size",
		"shape",
		"disabled",
		"value"
	])];
	get "color"() {
		return attribute.get(this, "color", BUTTON_ATTRS.color);
	}
	set "color"(value) {
		attribute.set(this, "color", value, BUTTON_ATTRS.color);
	}
	get "size"() {
		return attribute.get(this, "size", BUTTON_ATTRS.size);
	}
	set "size"(value) {
		attribute.set(this, "size", value, BUTTON_ATTRS.size);
	}
	get "shape"() {
		return attribute.get(this, "shape", BUTTON_ATTRS.shape);
	}
	set "shape"(value) {
		attribute.set(this, "shape", value, BUTTON_ATTRS.shape);
	}
	get "disabled"() {
		return attribute.get(this, "disabled", DISABLEABLE_ATTRS.disabled);
	}
	set "disabled"(value) {
		attribute.set(this, "disabled", value, DISABLEABLE_ATTRS.disabled);
	}
	get "value"() {
		return attribute.get(this, "value", VALUABLE_ATTRS.value);
	}
	set "value"(value) {
		attribute.set(this, "value", value, VALUABLE_ATTRS.value);
	}
	static {
		Object.defineProperties(this.prototype, {
			[$buttonLike]: { value: true },
			[$disableable]: { value: true },
			[$buttonGroupLike]: { value: true },
			[$valuable]: { value: true }
		});
	}
	constructor() {
		super();
		useButtonGroupCore(this, tpl, { role: "group" }, [css]);
		useRovingTabindex(this);
		useSlot(this, "slot", (_, newElements) => {
			newElements.forEach((element) => {
				delete element.dataset["first"];
				delete element.dataset["last"];
			});
			if (newElements[0]) newElements[0].dataset["first"] = "";
			if (newElements.at(-1)) newElements.at(-1).dataset["last"] = "";
		});
	}
}
define("mx-connected-button-group", ConnectedButtonGroup);
export { ConnectedButtonGroup as default };

//# sourceMappingURL=connected-button-group.js.map