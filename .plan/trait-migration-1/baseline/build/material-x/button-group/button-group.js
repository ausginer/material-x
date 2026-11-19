import { $buttonLike, BUTTON_ATTRS } from "../button/ButtonCore.js";
import { $buttonGroupLike, useButtonGroupCore } from "./ButtonGroupCore.js";
import tpl from "./button-group.tpl.html.js";
import css from "./styles/standard/main.css.js";
import { getTarget } from "./utils.js";
import attribute from "@ydinjs/core/attribute.js";
import { ControlledElement, define } from "@ydinjs/core/element.js";
import "@ydinjs/core/traits/attributes.js";
import { $disableable, DISABLEABLE_ATTRS } from "@ydinjs/core/traits/disableable.js";
import { useEvents } from "@ydinjs/core/controllers/useEvents.js";
import { $valuable, VALUABLE_ATTRS } from "@ydinjs/core/traits/valuable.js";
import { useSlot } from "@ydinjs/core/controllers/useSlot.js";
// src/button-group/button-group.ts
const LEADING_PROP = "--ha";
const TRAILING_PROP = "--hb";
/**
* @tag mx-button-group
*
* @summary Button groups arrange buttons in a single row with shared visual
* context.
*
* @attr {"outlined"|"elevated"|"text"|"tonal"} color - Shared color variant
* for child buttons.
* @attr {"xsmall"|"medium"|"large"|"xlarge"} size - Shared size for child
* buttons.
* @attr {"round"|"square"} shape - Shared shape for child buttons.
* @attr {boolean} disabled - Group disabled state.
*
* @slot - Button elements.
*
* @cssprop --md-button-group-between-space - Overrides spacing between buttons.
* @cssprop --md-button-group-interaction-width-multiplier - Overrides active
* overlap width factor.
* @cssprop --md-button-group-inner-corner-size - Overrides inner corner radius.
*/
class ButtonGroup extends ControlledElement {
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
		let elements = [];
		useSlot(this, "slot", (_, newElements) => {
			elements = newElements;
		});
		const pointerup = () => {
			elements.forEach((element) => {
				[LEADING_PROP, TRAILING_PROP].forEach((prop) => {
					element.style.removeProperty(prop);
				});
			});
		};
		useEvents(this, {
			pointerdown: (event) => {
				const target = getTarget(event);
				if (target) {
					const index = elements.indexOf(target);
					elements[index - 1]?.style.setProperty(LEADING_PROP, "-1");
					elements[index + 1]?.style.setProperty(TRAILING_PROP, "-1");
				}
			},
			pointerup,
			pointercancel: pointerup
		});
	}
}
define("mx-button-group", ButtonGroup);
export { ButtonGroup as default };

//# sourceMappingURL=button-group.js.map