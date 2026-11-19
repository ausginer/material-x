import { internals } from "@ydinjs/core/element.js";
import { createEventNotifier } from "@ydinjs/core/utils/DOM.js";
import { useEvents } from "@ydinjs/core/controllers/useEvents.js";
// src/core/utils/events.ts
const notify = createEventNotifier({
	input: { cancelable: false },
	change: {
		cancelable: false,
		composed: false
	},
	secondaryaction: { cancelable: false }
});
/**
* Delegates clicks originating directly on a custom-element host to its
* internal native control.
*
* @remarks Clicks originating from the internal control pass through
* unchanged. A direct host click is suppressed and replaced by the native
* control's activation so consumers observe one native event sequence.
*
* @param host - Custom-element host receiving direct activation.
* @param target - Internal native control that owns activation behavior.
*/
function useClickActivation(host, target) {
	useEvents(host, { click: [(event) => {
		if (event.composedPath()[0] !== host) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		target.click();
	}, { capture: true }] });
}
/**
* Wires outer-form participation for a form-associated button host.
*
* @remarks On activation the host acts like a native submit/reset button of the
* ancestor form reached through its `ElementInternals`: `type="submit"` (the
* default) requests submission and attributes it to the host as the submitter,
* `type="reset"` resets the form, and `type="button"` does nothing. The
* internal native control lives in the shadow tree and cannot reach the outer
* form on its own, so the host drives the form explicitly.
*
* @param host - Form-associated custom-element host. Its optional `type` field
*   selects the behavior and defaults to `"submit"`.
*/
function useFormActivation(host) {
	const innards = internals(host);
	useEvents(host, { click(event) {
		if (event.defaultPrevented) return;
		const { form } = innards;
		if (!form) return;
		const type = host.type ?? "submit";
		if (type === "button") return;
		if (type === "reset") {
			form.reset();
			return;
		}
		form.addEventListener("submit", (submitEvent) => {
			Object.defineProperty(submitEvent, "submitter", {
				configurable: true,
				value: host
			});
		}, {
			once: true,
			capture: true
		});
		form.requestSubmit();
	} });
}
export { notify, useClickActivation, useFormActivation };

//# sourceMappingURL=events.js.map