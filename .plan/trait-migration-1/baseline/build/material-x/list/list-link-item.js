import { $focusForwarding, __mxflat_controls_7b84b960 as controls } from "../core/traits/focus-forwarding.js";
import tpl from "./list-link-item.tpl.html.js";
import { useInteractiveListItemCore } from "./ListInteractiveItemCore.js";
import attribute, { Bool } from "@ydinjs/core/attribute.js";
import { useAttributes, via } from "@ydinjs/core/controllers/useAttributes.js";
import { ControlledElement, define } from "@ydinjs/core/element.js";
import "@ydinjs/core/traits/attributes.js";
import { $disableable, DISABLEABLE_ATTRS } from "@ydinjs/core/traits/disableable.js";
import { $linkable, LINKABLE_ATTRS, useDisableableLinkable, useLinkable } from "@ydinjs/core/traits/linkable.js";
import { $selectable, SELECTABLE_ATTRS } from "@ydinjs/core/traits/selectable.js";
// src/list/list-link-item.ts
/**
* @tag mx-list-link-item
*
* @summary Interactive list items navigate with native anchor behavior.
*
* @attr {boolean} selected - Applies selected visual state.
* @attr {boolean} disabled - Disables navigation and focus.
* @attr {string} href - Link destination URL.
* @attr {string} target - Navigation target (for example `_blank`).
*
* @slot - Primary label text.
* @slot start - Leading icon, avatar, or image.
* @slot end - Trailing icon or control.
* @slot overline - Overline text.
* @slot supporting-text - Supporting text below the label.
* @slot trailing-supporting-text - Trailing supporting text.
*
* @csspart impl - Internal native anchor element.
*
* @event click - Fired when the item is activated.
*/
class ListLinkItem extends ControlledElement {
	static observedAttributes = [.../* @__PURE__ */ new Set([
		...ControlledElement.observedAttributes ?? [],
		"disabled",
		"selected",
		"href",
		"target"
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
	static {
		Object.defineProperties(this.prototype, {
			[$disableable]: { value: true },
			[$selectable]: { value: true },
			[$focusForwarding]: { value: true },
			[$linkable]: { value: true }
		});
	}
	constructor() {
		super();
		const target = useInteractiveListItemCore(this, tpl);
		useLinkable(this, target);
		useDisableableLinkable(this, target);
		useAttributes(this, { selected: via(Bool, (_, value) => {
			target.ariaCurrent = value ? "page" : null;
		}) });
	}
}
define("mx-list-link-item", ListLinkItem);
export { ListLinkItem as default };

//# sourceMappingURL=list-link-item.js.map