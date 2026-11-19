// src/utils/runtime.ts
function identity(value) {
	return value;
}
/**
* Iterates an iterable and tolerates callbacks that may return real promises.
*
* Synchronous throws are routed through `onError`. When a callback returns a
* real `Promise`, its rejection is forwarded through `.catch(onError)`.
*
* @remarks Thenable objects are outside the supported contract; only actual
* `Promise` instances are handled asynchronously here.
*
* @typeParam T - Item type produced by the iterable.
* @param iterable - Source iterable to consume.
* @param callback - Callback invoked for each iterated item.
* @param onError - Error handler for sync throws and promise rejections.
*/
function forEachMaybePromise(iterable, callback, onError = (error) => {
	throw error;
}) {
	for (const item of iterable) try {
		const result = callback(item);
		if (result instanceof Promise) result.catch(onError);
	} catch (error) {
		onError(error);
	}
}
export { forEachMaybePromise, identity };

//# sourceMappingURL=runtime.js.map