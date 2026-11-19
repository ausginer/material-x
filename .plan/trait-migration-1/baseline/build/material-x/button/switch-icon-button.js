import { $buttonLike, BUTTON_ATTRS } from "./ButtonCore.js";
import { $focusForwarding, __mxflat_controls_7b84b960 as controls } from "../core/traits/focus-forwarding.js";
import { $iconButtonLike, useIconButtonCore } from "./IconButtonCore.js";
import css from "./styles/default/switch.css.js";
import css$1 from "./styles/elevated/main.css.js";
import css$2 from "./styles/elevated/switch.css.js";
import css$3 from "./styles/icon/main.css.js";
import css$4 from "./styles/icon/switch.css.js";
import css$5 from "./styles/outlined/main.css.js";
import css$6 from "./styles/outlined/switch.css.js";
import switch_css_default from "./styles/size/switch.css.js";
import css$7 from "./styles/tonal/main.css.js";
import css$8 from "./styles/tonal/switch.css.js";
import tpl from "./switch-icon-button.tpl.html.js";
import { useSwitchCore } from "./SwitchCore.js";
import attribute, { Str } from "@ydinjs/core/attribute.js";
import { ControlledElement, define } from "@ydinjs/core/element.js";
import "@ydinjs/core/traits/attributes.js";
import { $disableable, DISABLEABLE_ATTRS } from "@ydinjs/core/traits/disableable.js";
import { $checkable, CHECKABLE_ATTRS } from "@ydinjs/core/traits/checkable.js";
import { $valuable, VALUABLE_ATTRS } from "@ydinjs/core/traits/valuable.js";
// src/button/switch-icon-button.ts
/**
* @tag mx-switch-icon-button
*
* @summary Switch icon buttons expose icon-only button visuals with switch
* semantics.
*
* @attr {"outlined"|"elevated"|"tonal"|"standard"} color - Visual style
* variant. Omit to use the default filled style.
* @attr {"xsmall"|"medium"|"large"|"xlarge"} size - Button size. Omit to use
* the default (small) size.
* @attr {"round"|"square"} shape - Button shape. Omit to use round corners.
* @attr {"wide"|"narrow"} width - Container width style.
* @attr {string} value - Submitted form value.
* @attr {boolean} checked - Current switch checked state.
* @attr {boolean} disabled - Disables interaction and form participation.
*
* @slot - Icon content.
*
* @csspart impl - Internal native button with the switch role: the visual
* container and the focus target.
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
* @event input - Fired after `click` when the switch is activated. The switch
* is controlled: activation doesn't change `checked`.
* @event change - Fired after `input` when the switch is activated.
*/
class SwitchIconButton extends ControlledElement {
	static observedAttributes = [.../* @__PURE__ */ new Set([
		...ControlledElement.observedAttributes ?? [],
		"color",
		"size",
		"shape",
		"disabled",
		"checked",
		"value",
		"width"
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
	get "checked"() {
		return attribute.get(this, "checked", CHECKABLE_ATTRS.checked);
	}
	set "checked"(value) {
		attribute.set(this, "checked", value, CHECKABLE_ATTRS.checked);
	}
	get "value"() {
		return attribute.get(this, "value", VALUABLE_ATTRS.value);
	}
	set "value"(value) {
		attribute.set(this, "value", value, VALUABLE_ATTRS.value);
	}
	focus(options) {
		controls.get(this).focus(options);
	}
	get "width"() {
		return attribute.get(this, "width", Str);
	}
	set "width"(value) {
		attribute.set(this, "width", value, Str);
	}
	static {
		Object.defineProperties(this.prototype, {
			[$buttonLike]: { value: true },
			[$disableable]: { value: true },
			[$checkable]: { value: true },
			[$valuable]: { value: true },
			[$focusForwarding]: { value: true },
			[$iconButtonLike]: { value: true }
		});
	}
	static formAssociated = true;
	constructor() {
		super();
		useSwitchCore(this, tpl, [
			css$1,
			css$5,
			css$7,
			css$3,
			css,
			css$2,
			css$6,
			switch_css_default,
			css$8,
			css$4
		]);
		useIconButtonCore(this);
	}
}
define("mx-switch-icon-button", SwitchIconButton);
export { SwitchIconButton as default };

//# sourceMappingURL=switch-icon-button.js.map