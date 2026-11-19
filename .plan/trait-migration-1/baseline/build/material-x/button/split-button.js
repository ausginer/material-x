import { $buttonLike, BUTTON_ATTRS } from "./ButtonCore.js";
import "../button-group/connected-button-group.js";
import { notify } from "../core/utils/events.js";
import { useCore } from "../core/utils/useCore.js";
import "../icon/icon.js";
import "./button.js";
import "./icon-button.js";
import tpl from "./split-button.tpl.html.js";
import css from "./styles/split/main.css.js";
import attribute, { Bool } from "@ydinjs/core/attribute.js";
import { transfer, useAttributes } from "@ydinjs/core/controllers/useAttributes.js";
import { ControlledElement, define, internals } from "@ydinjs/core/element.js";
import { trait } from "@ydinjs/core/traits/attributes.js";
import { $disableable, DISABLEABLE_ATTRS } from "@ydinjs/core/traits/disableable.js";
import { $, toggleState } from "@ydinjs/core/utils/DOM.js";
import { useEvents } from "@ydinjs/core/controllers/useEvents.js";
// src/button/split-button.ts
const $splitButtonLike = Symbol("SplitButtonLike");
const SplitButtonLike = /*@__PURE__*/ trait({ open: Bool }, $splitButtonLike);
/**
* @tag mx-split-button
*
* @summary Split buttons combine a primary action with a secondary toggle
* action.
*
* @attr {"outlined"|"elevated"|"text"|"tonal"} color - Visual style variant.
* Omit to use the default filled style.
* @attr {"xsmall"|"medium"|"large"|"xlarge"} size - Button size. Omit to use
* the default (small) size.
* @attr {"round"|"square"} shape - Button shape. Omit to use round corners.
* @attr {boolean} disabled - Disables both actions.
* @attr {boolean} open - Marks the trailing toggle as opened.
*
* @slot - Primary action label/content.
* @slot icon - Primary action leading icon content.
*
* @csspart impl - Internal button-group wrapper.
* @csspart group - Internal button-group wrapper.
* @csspart leading - Leading action button host.
* @csspart trailing - Trailing toggle button host.
* @csspart leading-impl - Re-exported leading internal control part.
* @csspart trailing-impl - Re-exported trailing internal control part.
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
* @event secondaryaction - Fired when the trailing action is activated.
*/
class SplitButton extends ControlledElement {
	static observedAttributes = [.../* @__PURE__ */ new Set([
		...ControlledElement.observedAttributes ?? [],
		"color",
		"size",
		"shape",
		"disabled",
		"open"
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
	get "open"() {
		return attribute.get(this, "open", Bool);
	}
	set "open"(value) {
		attribute.set(this, "open", value, Bool);
	}
	static {
		Object.defineProperties(this.prototype, {
			[$buttonLike]: { value: true },
			[$disableable]: { value: true },
			[$splitButtonLike]: { value: true }
		});
	}
	static formAssociated = true;
	constructor() {
		super();
		useCore(this, [tpl], {}, [css]);
		useEvents(this, { click: (event) => {
			event.stopPropagation();
			notify(this, "secondaryaction");
		} }, $(this, "mx-icon-button") ?? void 0);
		const innards = internals(this);
		useAttributes(this, { open(_, newValue) {
			toggleState(innards, "open", Bool.from(newValue));
		} });
		const group = $(this, "mx-connected-button-group");
		useAttributes(this, Object.fromEntries(Object.keys(BUTTON_ATTRS).map((attr) => [attr, transfer(group, attr)])));
	}
}
define("mx-split-button", SplitButton);
export { SplitButtonLike, SplitButton as default };

//# sourceMappingURL=split-button.js.map