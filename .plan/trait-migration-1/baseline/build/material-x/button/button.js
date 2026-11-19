import { $buttonLike, BUTTON_ATTRS, useButtonCore } from "./ButtonCore.js";
import { $focusForwarding, __mxflat_controls_7b84b960 as controls } from "../core/traits/focus-forwarding.js";
import { useFormActivation } from "../core/utils/events.js";
import tpl from "./button.tpl.html.js";
import css from "./styles/elevated/main.css.js";
import css$1 from "./styles/outlined/main.css.js";
import css$2 from "./styles/text/main.css.js";
import css$3 from "./styles/tonal/main.css.js";
import attribute from "@ydinjs/core/attribute.js";
import { ControlledElement, define } from "@ydinjs/core/element.js";
import "@ydinjs/core/traits/attributes.js";
import { $disableable, DISABLEABLE_ATTRS } from "@ydinjs/core/traits/disableable.js";
import { $nameable, NAMEABLE_ATTRS, useNameable } from "@ydinjs/core/traits/nameable.js";
import { $typeable, TYPEABLE_ATTRS, useTypeable } from "@ydinjs/core/traits/typeable.js";
// src/button/button.ts
/**
* @tag mx-button
*
* @summary Buttons communicate actions users can take in dialogs, forms, cards,
* and toolbars.
*
* @attr {"outlined"|"elevated"|"text"|"tonal"} color - Visual style variant.
* Omit to use the default filled style.
* @attr {"xsmall"|"medium"|"large"|"xlarge"} size - Button size. Omit to use
* the default (small) size.
* @attr {"round"|"square"} shape - Button shape. Omit to use round corners.
* @attr {boolean} disabled - Disables interaction and form participation.
* @attr {string} name - Name submitted with form data.
* @attr {"submit"|"button"|"reset"} type - Native button type. Defaults to
*   `"submit"` when inside a form.
*
* @slot - Button label/content.
* @slot icon - Leading icon content.
*
* @csspart impl - Internal native button element.
*
* @cssprop --md-button-container-height - Overrides button height.
* @cssprop --md-button-leading-space - Overrides start padding.
* @cssprop --md-button-trailing-space - Overrides end padding.
* @cssprop --md-button-icon-size - Overrides icon size.
* @cssprop --md-button-icon-label-space - Overrides spacing between icon and
* label.
* @cssprop --md-button-label-text-line-height - Overrides label line height.
* @cssprop --md-button-press-duration - Overrides press transition duration.
* @cssprop --md-button-press-easing - Overrides press transition easing.
*
* @event click - Fired when the button is activated.
*/
class Button extends ControlledElement {
	static observedAttributes = [.../* @__PURE__ */ new Set([
		...ControlledElement.observedAttributes ?? [],
		"color",
		"size",
		"shape",
		"disabled",
		"name",
		"type"
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
	get "name"() {
		return attribute.get(this, "name", NAMEABLE_ATTRS.name);
	}
	set "name"(value) {
		attribute.set(this, "name", value, NAMEABLE_ATTRS.name);
	}
	get "type"() {
		return attribute.get(this, "type", TYPEABLE_ATTRS.type);
	}
	set "type"(value) {
		attribute.set(this, "type", value, TYPEABLE_ATTRS.type);
	}
	focus(options) {
		controls.get(this).focus(options);
	}
	static {
		Object.defineProperties(this.prototype, {
			[$buttonLike]: { value: true },
			[$disableable]: { value: true },
			[$nameable]: { value: true },
			[$typeable]: { value: true },
			[$focusForwarding]: { value: true }
		});
	}
	static formAssociated = true;
	constructor() {
		super();
		const target = useButtonCore(this, tpl, [
			css,
			css$1,
			css$2,
			css$3
		], { delegatesFocus: true });
		useNameable(this, target);
		useTypeable(this, target);
		useFormActivation(this);
	}
}
define("mx-button", Button);
export { Button as default };

//# sourceMappingURL=button.js.map