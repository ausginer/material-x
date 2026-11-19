import { useCheckableCore } from "../core/elements/CheckableCore.js";
import "../icon/icon.js";
import tpl from "./radio.tpl.html.js";
import css from "./styles/default/main.css.js";
import attribute from "@ydinjs/core/attribute.js";
import { ControlledElement, define } from "@ydinjs/core/element.js";
import "@ydinjs/core/traits/attributes.js";
import { $disableable, DISABLEABLE_ATTRS } from "@ydinjs/core/traits/disableable.js";
import { $nameable, NAMEABLE_ATTRS } from "@ydinjs/core/traits/nameable.js";
import { $checkable, CHECKABLE_ATTRS } from "@ydinjs/core/traits/checkable.js";
import { $valuable, VALUABLE_ATTRS } from "@ydinjs/core/traits/valuable.js";
// src/radio/radio.ts
/**
* @tag mx-radio
*
* @summary Radio buttons allow users to select one option from a set.
*
* @description
* This is a controlled component — it does not manage its own state. The host
* application is responsible for updating `checked` in response to
* `change`/`input` events.
*
* **Form participation.** The element is form-associated and submits its
* `value` when `checked`. It can be associated with an external `<label>`
* via the standard `for`/`id` mechanism.
*
* **Single selection is not enforced.** Each radio renders its own
* `<input type="radio">` inside its own shadow root, so native radio grouping
* does not apply: same-named radios can all be `checked` at once. Enforcing one
* selection per group, arrow-key roving, and `role="radiogroup"` semantics are
* the host application's responsibility.
*
* @attr {boolean} checked - Whether this radio button is selected.
* @attr {boolean} disabled - Disables interaction and form participation.
* @attr {string} name - The form-data key submitted with `value`, shared by the
*   radios of a group. Does not by itself enforce single selection.
* @attr {string} value - The value submitted with a form when checked.
*   Defaults to `"on"`.
*
* @cssprop --md-radio-check-duration - Overrides selection animation duration.
* @cssprop --md-radio-check-easing - Overrides selection animation easing.
*
* @csspart impl - Internal host element (the visible radio control).
*
* @event change - Fired after `input` when the user activates an unchecked
* radio.
* Activation doesn't change `checked`.
* @event input - Fired after `click` when the user activates an unchecked radio.
*/
class Radio extends ControlledElement {
	static observedAttributes = [.../* @__PURE__ */ new Set([
		...ControlledElement.observedAttributes ?? [],
		"checked",
		"value",
		"disabled",
		"name"
	])];
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
	static {
		Object.defineProperties(this.prototype, {
			[$checkable]: { value: true },
			[$valuable]: { value: true },
			[$disableable]: { value: true },
			[$nameable]: { value: true }
		});
	}
	static formAssociated = true;
	constructor() {
		super();
		useCheckableCore(this, [tpl], {}, [css], { delegatesFocus: true });
	}
}
define("mx-radio", Radio);
export { Radio as default };

//# sourceMappingURL=radio.js.map