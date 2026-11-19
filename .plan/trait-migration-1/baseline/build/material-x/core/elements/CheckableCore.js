import { useRipple } from "../animations/ripple/ripple.js";
import { notify, useClickActivation } from "../utils/events.js";
import { useCore } from "../utils/useCore.js";
import css from "./styles/main.css.js";
import { Bool } from "@ydinjs/core/attribute.js";
import { useAttributes, via } from "@ydinjs/core/controllers/useAttributes.js";
import { internals } from "@ydinjs/core/element.js";
import { useDisableable } from "@ydinjs/core/traits/disableable.js";
import { $, toggleState } from "@ydinjs/core/utils/DOM.js";
import { useEvents } from "@ydinjs/core/controllers/useEvents.js";
import { useNameable } from "@ydinjs/core/traits/nameable.js";
import { useCheckable } from "@ydinjs/core/traits/checkable.js";
import { useValuable } from "@ydinjs/core/traits/valuable.js";
// src/core/elements/CheckableCore.ts
function useCheckableCore(host, templates, aria, styles, init) {
	useCore(host, templates, aria, [...styles, css], init);
	const input = $(host, "#input");
	const innards = internals(host);
	useCheckable(host, input);
	useValuable(host, input);
	useDisableable(host, input);
	useNameable(host, input);
	useAttributes(host, {
		checked: via(Bool, (_, value) => {
			toggleState(innards, "checked", value);
			innards.setFormValue(value ? host.value ?? "on" : null);
		}),
		value(_, newValue) {
			if (host.checked) innards.setFormValue(newValue ?? "on");
		}
	});
	useRipple(host);
	useEvents(host, { change() {
		notify(host, "change");
		input.checked = host.checked;
	} }, input);
	useClickActivation(host, input);
	return input;
}
export { useCheckableCore };

//# sourceMappingURL=CheckableCore.js.map