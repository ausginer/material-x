import { $buttonLike, BUTTON_ATTRS, useButtonCore } from "./ButtonCore.js";
import { $focusForwarding, __mxflat_controls_7b84b960 as controls } from "../core/traits/focus-forwarding.js";
import tpl from "./link-button.tpl.html.js";
import css from "./styles/elevated/main.css.js";
import css$1 from "./styles/outlined/main.css.js";
import css$2 from "./styles/text/main.css.js";
import css$3 from "./styles/tonal/main.css.js";
import attribute from "@ydinjs/core/attribute.js";
import { ControlledElement, define } from "@ydinjs/core/element.js";
import "@ydinjs/core/traits/attributes.js";
import { $disableable, DISABLEABLE_ATTRS } from "@ydinjs/core/traits/disableable.js";
import { $ } from "@ydinjs/core/utils/DOM.js";
import { $linkable, LINKABLE_ATTRS, useDisableableLinkable, useLinkable } from "@ydinjs/core/traits/linkable.js";
// src/button/link-button.ts
/**
* @tag mx-link-button
*
* @summary Link buttons render as anchors for navigation actions with button
* styling.
*
* @attr {"outlined"|"elevated"|"text"|"tonal"} color - Visual style variant.
* Omit to use the default filled style.
* @attr {"xsmall"|"medium"|"large"|"xlarge"} size - Button size. Omit to use
* the default (small) size.
* @attr {"round"|"square"} shape - Button shape. Omit to use round corners.
* @attr {boolean} disabled - Disables interaction and removes navigation.
* @attr {string} href - Link destination URL.
* @attr {string} target - Navigation target (for example `_blank`).
*
* @slot - Button label/content.
* @slot icon - Leading icon content.
*
* @csspart impl - Internal native anchor element.
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
* @event click - Fired when the link button is activated.
*/
class LinkButton extends ControlledElement {
	static observedAttributes = [.../* @__PURE__ */ new Set([
		...ControlledElement.observedAttributes ?? [],
		"color",
		"size",
		"shape",
		"disabled",
		"href",
		"target"
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
	get "href"() {
		return attribute.get(this, "href", LINKABLE_ATTRS.href);
	}
	set "href"(value) {
		attribute.set(this, "href", value, LINKABLE_ATTRS.href);
	}
	get "target"() {
		return attribute.get(this, "target", LINKABLE_ATTRS.target);
	}
	set "target"(value) {
		attribute.set(this, "target", value, LINKABLE_ATTRS.target);
	}
	focus(options) {
		controls.get(this).focus(options);
	}
	static {
		Object.defineProperties(this.prototype, {
			[$buttonLike]: { value: true },
			[$disableable]: { value: true },
			[$linkable]: { value: true },
			[$focusForwarding]: { value: true }
		});
	}
	constructor() {
		super();
		useButtonCore(this, tpl, [
			css,
			css$1,
			css$2,
			css$3
		], { delegatesFocus: true });
		const anchor = $(this, ".host");
		useLinkable(this, anchor);
		useDisableableLinkable(this, anchor);
	}
}
define("mx-link-button", LinkButton);
export { LinkButton as default };

//# sourceMappingURL=link-button.js.map