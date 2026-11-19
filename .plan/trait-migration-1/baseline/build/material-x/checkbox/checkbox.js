import { useCheckableCore } from "../core/elements/CheckableCore.js";
import "../icon/icon.js";
import tpl from "./checkbox.tpl.html.js";
import css from "./styles/default/main.css.js";
import attribute, { Bool } from "@ydinjs/core/attribute.js";
import { useAttributes, via } from "@ydinjs/core/controllers/useAttributes.js";
import { ControlledElement, define, internals } from "@ydinjs/core/element.js";
import { trait } from "@ydinjs/core/traits/attributes.js";
import { $disableable, DISABLEABLE_ATTRS } from "@ydinjs/core/traits/disableable.js";
import { $, toggleState } from "@ydinjs/core/utils/DOM.js";
import { useEvents } from "@ydinjs/core/controllers/useEvents.js";
import { $nameable, NAMEABLE_ATTRS } from "@ydinjs/core/traits/nameable.js";
import { $checkable, CHECKABLE_ATTRS } from "@ydinjs/core/traits/checkable.js";
import { $valuable, VALUABLE_ATTRS } from "@ydinjs/core/traits/valuable.js";
// src/checkbox/checkbox.ts
const CHECKED_ICON = "check_small";
const INDETERMINATE_ICON = "check_indeterminate_small";
const $indeterminable = Symbol("Indeterminable");
const Indeterminable = /*@__PURE__*/ trait({ indeterminate: Bool }, $indeterminable);
/**
* @tag mx-checkbox
*
* @summary Checkboxes allow users to select one or more items from a set,
* or turn an option on or off.
*
* @description
* This is a controlled component — it does not manage its own state. The host
* application is responsible for updating `checked` and `indeterminate`
* attributes in response to `change`/`input` events.
*
* **`indeterminate` takes visual priority over `checked`.** When `indeterminate`
* is set, the indeterminate icon is shown regardless of the `checked` value.
* To reflect a definite checked/unchecked state, the controller must first
* clear `indeterminate`.
*
* **Form participation.** The element is form-associated and submits its
* `value` (defaults to `"on"`) when `checked`. It can be associated with an
* external `<label>` via the standard `for`/`id` mechanism.
*
* @attr {boolean} checked - Whether the checkbox is checked.
* @attr {boolean} indeterminate - Whether the checkbox is in an indeterminate
*   state. Visually overrides `checked` — clear this attribute first to show
*   the checked/unchecked icon.
* @attr {boolean} disabled - Disables interaction and form participation.
* @attr {string} name - Name submitted with form data.
* @attr {string} value - The value submitted with a form when checked.
*   Defaults to `"on"`.
*
* @cssprop --md-checkbox-check-duration - Overrides check/indeterminate animation
*   duration.
* @cssprop --md-checkbox-check-easing - Overrides check/indeterminate animation
*   easing.
*
* @csspart impl - Internal host element (the visible checkbox box).
*
* @event change - Fired after `input` when the user activates the checkbox.
* Activation doesn't change `checked` or `indeterminate`.
* @event input - Fired after `click` when the user activates the checkbox.
*/
class Checkbox extends ControlledElement {
	static observedAttributes = [.../* @__PURE__ */ new Set([
		...ControlledElement.observedAttributes ?? [],
		"checked",
		"value",
		"disabled",
		"name",
		"indeterminate"
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
	get "indeterminate"() {
		return attribute.get(this, "indeterminate", Bool);
	}
	set "indeterminate"(value) {
		attribute.set(this, "indeterminate", value, Bool);
	}
	static {
		Object.defineProperties(this.prototype, {
			[$checkable]: { value: true },
			[$valuable]: { value: true },
			[$disableable]: { value: true },
			[$nameable]: { value: true },
			[$indeterminable]: { value: true }
		});
	}
	static formAssociated = true;
	constructor() {
		super();
		const input = useCheckableCore(this, [tpl], {}, [css], { delegatesFocus: true });
		const innards = internals(this);
		const icon = $(this, ".icon");
		useAttributes(this, {
			checked: via(Bool, (_, value) => {
				if (!this.indeterminate) icon.textContent = value ? CHECKED_ICON : "";
			}),
			indeterminate: via(Bool, (_, value) => {
				icon.textContent = value ? INDETERMINATE_ICON : this.checked ? CHECKED_ICON : "";
				input.indeterminate = value;
				toggleState(innards, "indeterminate", value);
			})
		});
		useEvents(this, { change: () => {
			input.indeterminate = this.indeterminate;
		} }, input);
	}
}
define("mx-checkbox", Checkbox);
export { Indeterminable, Checkbox as default };

//# sourceMappingURL=checkbox.js.map