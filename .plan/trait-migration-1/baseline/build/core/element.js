import { forEachMaybePromise } from "./utils/runtime.js";
// src/element.ts
/**
* Defines a custom element.
*
* @param name - The custom element tag name.
* @param component - The element constructor to register.
*/
function define(name, component) {
	customElements.define(name, component);
}
/**
* Registers a controller on a host element.
*
* @remarks This helper is supported only during host construction, before the
* first connection. Controllers added after the element has already connected
* are not backfilled with prior lifecycle callbacks.
*
* @param element - The host element controlled by the given controller.
* @param controller - The controller to register on the host.
*/
let use;
/**
* Returns the `ElementInternals` associated with a host element.
*
* @param element - The host element whose internals should be returned.
* @returns The host `ElementInternals` instance.
*/
let internals;
/**
* Base element that forwards DOM lifecycle and attribute callbacks to
* registered `ElementController`s.
*
* @remarks `ControlledElement` does not implement its own reactivity model.
* It acts as a lifecycle host that dispatches `connected`, `disconnected`, and
* `attrChanged` hooks to controllers registered via `use(...)`.
*/
var ControlledElement = class extends HTMLElement {
	static {
		use = (element, controller) => {
			element.#controllers.push(controller);
		};
		internals = (element) => element.#internals;
	}
	#internals = this.attachInternals();
	#controllers = [];
	attributeChangedCallback(...args) {
		this.#exec((controller) => controller.attrChanged?.(...args));
	}
	connectedCallback() {
		this.#exec((controller) => controller.connected?.());
	}
	disconnectedCallback() {
		this.#exec((controller) => controller.disconnected?.());
	}
	adoptedCallback() {
		this.#exec((controller) => controller.adopted?.());
	}
	movedCallback() {
		this.#exec((controller) => controller.moved?.());
	}
	formAssociatedCallback() {
		this.#exec((controller) => controller.formAssociated?.());
	}
	formDisabledCallback() {
		this.#exec((controller) => controller.formDisabled?.());
	}
	formResetCallback() {
		this.#exec((controller) => controller.formReset?.());
	}
	formStateRestoreCallback() {
		this.#exec((controller) => controller.formStateRestore?.());
	}
	#exec(callback) {
		forEachMaybePromise(this.#controllers, callback);
	}
};
export { ControlledElement, define, internals, use };

//# sourceMappingURL=element.js.map