import { use } from "../element.js";
import { useEvents } from "./useEvents.js";
// src/controllers/useContext.ts
const CONTEXT_EVENT_INIT = {
	bubbles: true,
	cancelable: false,
	composed: true
};
var ContextEvent = class extends Event {
	value;
};
/**
* Creates a unique context identifier that providers and consumers can share.
*
* The token is the event type that a consumer dispatches and its provider
* listens for. It is unique on the page, also across copies of this package,
* and isn't a secret. Creating one is safe in any context, secure or not, and
* touches no document.
*
* @typeParam T - The stable value shape exposed through this context.
* @returns A unique opaque context token.
*/
function createContext() {
	return `ydin-context-${Math.random()}`;
}
/**
* Registers a provider for descendants that resolve the same context.
*
* The provided `value` is expected to stay stable by reference for as long as
* the provider is connected. If the exposed state changes over time, keep the
* same object and publish updates through a nested `EventEmitter` or another
* manual observable mechanism instead of replacing the whole value object.
*
* @remarks Provider and consumer composition on the same host is unsupported.
* For same-host coordination, use a local `EventEmitter` directly.
*
* @typeParam T - The stable value shape exposed through this context.
* @param host - The provider host element.
* @param ctx - The context channel to resolve.
* @param value - The stable provider value shared with descendants.
*/
function useProvider(host, ctx, value) {
	useEvents(host, { [ctx](event) {
		event.stopPropagation();
		event.value = value;
	} });
}
/**
* Resolves the nearest provider value when the host connects or reconnects.
*
* This controller performs context lookup on connection boundaries only. It
* does not react to provider value replacement after connection, so consumers
* should treat the resolved value as a long-lived object and subscribe to
* updates inside it, for example through a nested `EventEmitter`.
*
* The effect may return a cleanup function for manual subscriptions.
*
* @typeParam T - The stable value shape exposed through this context.
* @param host - The consumer host element.
* @param ctx - The context channel to resolve.
* @param effect - Callback invoked with the resolved provider value.
*/
function useContext(host, ctx, effect) {
	let disposer;
	use(host, {
		connected() {
			const event = new ContextEvent(ctx, CONTEXT_EVENT_INIT);
			host.dispatchEvent(event);
			disposer = effect(event.value);
		},
		disconnected() {
			disposer?.();
		}
	});
}
export { createContext, useContext, useProvider };

//# sourceMappingURL=useContext.js.map