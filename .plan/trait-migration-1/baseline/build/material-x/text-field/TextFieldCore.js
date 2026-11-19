import { useNotchedOutline } from "../core/animations/notched-outline/notched-outline.js";
import { notify } from "../core/utils/events.js";
import { useHasSlottedPolyfill } from "../core/utils/polyfills.js";
import { useCore } from "../core/utils/useCore.js";
import css from "./styles/default/main.css.js";
import css$1 from "./styles/outlined/main.css.js";
import tpl from "./text-field-core.tpl.html.js";
import attribute, { Bool, Str } from "@ydinjs/core/attribute.js";
import { useARIA } from "@ydinjs/core/controllers/useARIA.js";
import { transfer, useAttributes, via } from "@ydinjs/core/controllers/useAttributes.js";
import { ControlledElement, internals } from "@ydinjs/core/element.js";
import "@ydinjs/core/traits/attributes.js";
import { $disableable, DISABLEABLE_ATTRS, useDisableable } from "@ydinjs/core/traits/disableable.js";
import { $, toggleState } from "@ydinjs/core/utils/DOM.js";
import { useEvents } from "@ydinjs/core/controllers/useEvents.js";
import { $nameable, NAMEABLE_ATTRS, useNameable } from "@ydinjs/core/traits/nameable.js";
import { $valuable, VALUABLE_ATTRS } from "@ydinjs/core/traits/valuable.js";
import { useSlot } from "@ydinjs/core/controllers/useSlot.js";
// src/text-field/TextFieldCore.ts
const $textFieldLike = Symbol("TextFieldLike");
const ARIA_PARAMS = {
	"aria-labelledby": ["label"],
	"aria-describedby": ["support", "counter"]
};
function getFallback(slots) {
	const ids = slots.flatMap(({ id, slot }) => slot.assignedElements().length > 0 ? [id] : []);
	return ids.length > 0 ? ids.join(" ") : null;
}
function useTextFieldARIA(host, input) {
	const ariaParams = Object.fromEntries(Object.entries(ARIA_PARAMS).map(([attr, ids]) => [attr, ids.map((id) => ({
		id,
		slot: $(host, `#${id} slot`)
	}))]));
	useARIA(host, input, (name, value) => name in ariaParams && value == null ? getFallback(ariaParams[name]) : value);
	for (const [attr, slots] of Object.entries(ariaParams)) for (const { slot } of slots) useSlot(host, slot, () => {
		if (attribute.getRaw(host, attr) == null) attribute.setRaw(input, attr, getFallback(slots));
	});
}
let input;
class TextFieldCore extends ControlledElement {
	static observedAttributes = [.../* @__PURE__ */ new Set([
		...ControlledElement.observedAttributes ?? [],
		"type",
		"inputmode",
		"outlined",
		"disabled",
		"value",
		"name"
	])];
	get "type"() {
		return attribute.get(this, "type", Str);
	}
	set "type"(value) {
		attribute.set(this, "type", value, Str);
	}
	get "inputmode"() {
		return attribute.get(this, "inputmode", Str);
	}
	set "inputmode"(value) {
		attribute.set(this, "inputmode", value, Str);
	}
	get "outlined"() {
		return attribute.get(this, "outlined", Bool);
	}
	set "outlined"(value) {
		attribute.set(this, "outlined", value, Bool);
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
	get "name"() {
		return attribute.get(this, "name", NAMEABLE_ATTRS.name);
	}
	set "name"(value) {
		attribute.set(this, "name", value, NAMEABLE_ATTRS.name);
	}
	static {
		Object.defineProperties(this.prototype, {
			[$textFieldLike]: { value: true },
			[$disableable]: { value: true },
			[$valuable]: { value: true },
			[$nameable]: { value: true }
		});
	}
	static {
		input = (element) => element.#input;
	}
	#input;
	constructor(template) {
		super();
		useCore(this, [template, tpl], {}, [css, css$1], { delegatesFocus: true });
		const field = $(this, ".input");
		const label = $(this, ".label");
		const innards = internals(this);
		useNameable(this, field);
		useDisableable(this, field);
		useAttributes(this, {
			inputmode: transfer(field, "inputmode"),
			outlined: via(Bool, (_, newValue) => {
				toggleState(innards, "outlined", newValue);
			})
		});
		useTextFieldARIA(this, field);
		useNotchedOutline(this, label);
		useEvents(this, {
			input() {
				toggleState(innards, "populated", !!field.value);
				innards.setFormValue(field.value);
			},
			change: () => {
				notify(this, "change");
			}
		}, field);
		useHasSlottedPolyfill(this);
		this.#input = field;
	}
	get isPopulated() {
		return internals(this).states.has("populated");
	}
	get value() {
		return this.#input.value;
	}
	set value(value) {
		this.#input.value = value ?? "";
		toggleState(internals(this), "populated", !!this.#input.value);
		internals(this).setFormValue(value);
	}
	checkValidity() {
		const valid = internals(this).checkValidity();
		toggleState(internals(this), "error", !valid);
		return valid;
	}
	reportValidity() {
		const valid = internals(this).reportValidity();
		toggleState(internals(this), "error", !valid);
		return valid;
	}
	setValidity(flags, message) {
		internals(this).setValidity(flags, message, this);
	}
}
export { TextFieldCore, input };

//# sourceMappingURL=TextFieldCore.js.map