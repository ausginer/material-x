import { $focusForwarding, __mxflat_controls_7b84b960 as controls, useFocusForwarding } from "../core/traits/focus-forwarding.js";
import { useRipple } from "../core/animations/ripple/ripple.js";
import css from "../core/styles/elevation/elevation.css.js";
import "../core/styles/elevation/elevation.runtime.js";
import css$1 from "../core/styles/focus/focus.css.js";
import { useCore } from "../core/utils/useCore.js";
import tpl from "./fab.tpl.html.js";
import css$2 from "./styles/color/main.css.js";
import css$3 from "./styles/default/main.css.js";
import css$4 from "./styles/extended/main.css.js";
import css$5 from "./styles/size/main.css.js";
import css$6 from "./styles/tonal/main.css.js";
import attribute, { Bool, Str } from "@ydinjs/core/attribute.js";
import { useARIA } from "@ydinjs/core/controllers/useARIA.js";
import { useAttributes } from "@ydinjs/core/controllers/useAttributes.js";
import { ControlledElement, define, internals } from "@ydinjs/core/element.js";
import { trait } from "@ydinjs/core/traits/attributes.js";
import { $disableable, DISABLEABLE_ATTRS, useDisableable } from "@ydinjs/core/traits/disableable.js";
import { $, switchState, toggleState } from "@ydinjs/core/utils/DOM.js";
// src/fab/fab.ts
const $fabLike = Symbol("FABLike");
const FABLike = /*@__PURE__*/ trait({
	size: Str,
	color: Str,
	extended: Str,
	tonal: Bool
}, $fabLike);
/**
* @tag mx-fab
*
* @summary Floating action buttons represent a promoted primary action.
*
* @attr {"medium"|"large"} size - Container size. Omit to use the default
* size.
* @attr {"primary"|"secondary"} color - Color variant. Omit to use the
* tertiary default.
* @attr {"open"|"closed"} extended - Extended label state.
* @attr {boolean} tonal - Enables tonal style.
* @attr {boolean} disabled - Disables interaction and form participation.
*
* @slot - Label content for extended FAB.
* @slot icon - Leading icon content.
*
* @csspart impl - Internal native button element.
*
* @cssprop --md-fab-container-height - Overrides container height.
* @cssprop --md-fab-container-width - Overrides container width.
* @cssprop --md-fab-icon-size - Overrides icon size.
* @cssprop --md-fab-icon-label-space - Overrides icon and label spacing.
* @cssprop --md-fab-unfold-duration - Overrides unfold transition duration.
* @cssprop --md-fab-unfold-easing - Overrides unfold transition easing.
* @cssprop --md-fab-level - Overrides default elevation level.
* @cssprop --md-fab-hover-level - Overrides hovered elevation level.
*
* @event click - Fired when the FAB is activated.
*/
class FAB extends ControlledElement {
	static observedAttributes = [.../* @__PURE__ */ new Set([
		...ControlledElement.observedAttributes ?? [],
		"size",
		"color",
		"extended",
		"tonal",
		"disabled"
	])];
	get "size"() {
		return attribute.get(this, "size", Str);
	}
	set "size"(value) {
		attribute.set(this, "size", value, Str);
	}
	get "color"() {
		return attribute.get(this, "color", Str);
	}
	set "color"(value) {
		attribute.set(this, "color", value, Str);
	}
	get "extended"() {
		return attribute.get(this, "extended", Str);
	}
	set "extended"(value) {
		attribute.set(this, "extended", value, Str);
	}
	get "tonal"() {
		return attribute.get(this, "tonal", Bool);
	}
	set "tonal"(value) {
		attribute.set(this, "tonal", value, Bool);
	}
	get "disabled"() {
		return attribute.get(this, "disabled", DISABLEABLE_ATTRS.disabled);
	}
	set "disabled"(value) {
		attribute.set(this, "disabled", value, DISABLEABLE_ATTRS.disabled);
	}
	focus(options) {
		controls.get(this).focus(options);
	}
	static {
		Object.defineProperties(this.prototype, {
			[$fabLike]: { value: true },
			[$disableable]: { value: true },
			[$focusForwarding]: { value: true }
		});
	}
	constructor() {
		super();
		useCore(this, [tpl], {}, [
			css,
			css$1,
			css$3,
			css$2,
			css$5,
			css$6,
			css$4
		], { delegatesFocus: true });
		const target = $(this, ".host");
		useARIA(this, target);
		useFocusForwarding(this, target);
		useRipple(this, target, target);
		useDisableable(this, target);
		const innards = internals(this);
		useAttributes(this, {
			extended: (_, newValue) => {
				toggleState(innards, "extended", Bool.from(newValue));
				toggleState(innards, "open", newValue === "open");
			},
			color: (oldValue, newValue) => switchState(innards, oldValue, newValue),
			size: (oldValue, newValue) => switchState(innards, oldValue, newValue),
			tonal: (_, newValue) => toggleState(innards, "tonal", Bool.from(newValue))
		});
	}
}
define("mx-fab", FAB);
export { FABLike, FAB as default };

//# sourceMappingURL=fab.js.map