import { forEachMaybePromise } from "./utils/runtime.js";
// src/emitter.ts
/**
* Minimal typed pub/sub primitive for variadic updates.
*
* Subscribers are deduplicated by reference through an internal `Set`.
*
* @remarks Dispatch iterates the live subscriber `Set`. A subscriber added
* during `emit(...)` may receive that same in-flight update. By default,
* subscriber errors follow `forEachMaybePromise` behavior and are rethrown.
* After registering `err(...)`, both sync throws and async rejections are
* routed through the installed error handler instead. If the error handler
* throws, dispatch is interrupted by that error.
*
* @typeParam T - The argument list delivered to subscribers.
*/
var EventEmitter = class {
	#dependencies = /* @__PURE__ */ new Set();
	#handler;
	/**
	* Registers a subscriber for future updates.
	*
	* @param callback - The subscriber to invoke on each `emit(...)`.
	* @returns Cleanup - that unsubscribes the callback by reference.
	*/
	on(callback) {
		this.#dependencies.add(callback);
		return () => {
			this.#dependencies.delete(callback);
		};
	}
	/**
	* Installs an error handler for subscriber failures during dispatch.
	*
	* @param handler - Error handler for subscriber sync throws and async
	*   rejections.
	*/
	err(handler) {
		this.#handler = handler;
	}
	/**
	* Dispatches an update to all currently registered subscribers.
	*
	* Each subscriber receives the same argument list that was passed to this
	* method.
	*
	* @param data - The argument list delivered to each subscriber.
	*/
	emit(...data) {
		forEachMaybePromise(this.#dependencies.values(), (subscriber) => subscriber(...data), this.#handler);
	}
};
export { EventEmitter };

//# sourceMappingURL=emitter.js.map