// src/utils/DOM.ts
function $(host, selectors) {
	return host.shadowRoot?.querySelector(selectors);
}
function $$(host, selectors) {
	return host.shadowRoot?.querySelectorAll(selectors);
}
/**
* Default initialization for events dispatched by notifiers created with
* {@link createEventNotifier}.
*
* @remarks Event-specific definitions override these values.
*/
const DEFAULT_EVENT_INIT = {
	bubbles: true,
	composed: true,
	cancelable: true
};
/**
* Creates a type-safe notifier from event initialization definitions.
*
* @remarks Each notification creates a fresh {@link Event}. Definitions are
* merged over {@link DEFAULT_EVENT_INIT}, allowing individual events to
* override bubbling, composition, or cancellation behavior.
*
* @typeParam T - Event names defined by `definitions`.
* @param definitions - Initialization overrides keyed by event name.
* @returns A notifier restricted to the configured event names.
*/
function createEventNotifier(definitions) {
	return (target, ...types) => {
		for (const type of types) target.dispatchEvent(new Event(type, {
			...DEFAULT_EVENT_INIT,
			...definitions[type]
		}));
	};
}
/**
* Adds or removes a custom state from `ElementInternals.states`.
*
* @param internals - Host internals whose state set should be updated.
* @param state - State token to add or remove.
* @param condition - Whether the state should be present.
*/
function toggleState(internals, state, condition) {
	if (condition) internals.states.add(state);
	else internals.states.delete(state);
}
/**
* Switches a custom state from one value to another in `ElementInternals.states`.
*
* Removes `oldState` if non-null and adds `newState` if non-null. Use for
* value-based attributes where the attribute value is the state name itself
* (e.g. `color='elevated'` → state `elevated`). Pass old and new serialized
* attribute values directly — null is treated as "no state".
*
* @param internals - Host internals whose state set should be updated.
* @param oldState - State token to remove, or null.
* @param newState - State token to add, or null.
*/
function switchState(internals, oldState, newState) {
	if (oldState != null) internals.states.delete(oldState);
	if (newState != null) internals.states.add(newState);
}
var FrameRequestHandler = class {
	#scheduled = false;
	#handle = -1;
	schedule(callback) {
		if (!this.#scheduled) {
			this.#handle = requestAnimationFrame(callback);
			this.#scheduled = true;
		}
	}
	cancel() {
		cancelAnimationFrame(this.#handle);
		this.#scheduled = false;
	}
};
export { $, $$, DEFAULT_EVENT_INIT, FrameRequestHandler, createEventNotifier, switchState, toggleState };

//# sourceMappingURL=DOM.js.map