import { BUTTON_GROUP_CTX } from "../button-group/button-group-context.js";
import { FocusForwarding } from "../core/traits/focus-forwarding.js";
import { notify, useClickActivation } from "../core/utils/events.js";
import { useContext } from "../core/utils/useContext.js";
import { BUTTON_CORE_TRAITS, useButtonCore } from "./ButtonCore.js";
import { Bool } from "@ydinjs/core/attribute.js";
import { useAttributes, via } from "@ydinjs/core/controllers/useAttributes.js";
import { internals } from "@ydinjs/core/element.js";
import { toggleState } from "@ydinjs/core/utils/DOM.js";
import { useEvents } from "@ydinjs/core/controllers/useEvents.js";
import { Checkable } from "@ydinjs/core/traits/checkable.js";
import { VALUABLE_ATTRS, Valuable } from "@ydinjs/core/traits/valuable.js";
// src/button/SwitchCore.ts
const SWITCH_CORE_TRAITS = [
	...BUTTON_CORE_TRAITS,
	Checkable,
	Valuable,
	FocusForwarding
];
/**
* Sets up a switch whose `.host` is a `<button role="switch">`. The switch is
* controlled: activation dispatches `input` and `change` and changes no state.
* `aria-checked`, the `checked` custom state and the form value follow the
* host's `checked` only.
*/
function useSwitchCore(host, template, styles, init) {
	const target = useButtonCore(host, template, styles, init);
	const innards = internals(host);
	useAttributes(host, {
		checked: via(Bool, (_, value) => {
			toggleState(innards, "checked", value);
			target.ariaChecked = String(value);
			innards.setFormValue(value ? host.value ?? "on" : null);
		}),
		value(_, newValue) {
			if (host.checked) innards.setFormValue(newValue ?? "on");
		}
	});
	useContext(host, BUTTON_GROUP_CTX, VALUABLE_ATTRS, (_, oldValue, newValue) => {
		if (newValue != null) host.checked = newValue === host.value;
		else if (oldValue != null && oldValue === host.value) host.checked = false;
	});
	target.commandForElement = target;
	target.command = "--activate";
	useEvents(host, { command() {
		notify(host, "input", "change");
	} }, target);
	useClickActivation(host, target);
}
export { SWITCH_CORE_TRAITS, useSwitchCore };

//# sourceMappingURL=SwitchCore.js.map