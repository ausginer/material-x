import { use } from "../element.js";
// src/controllers/useEvents.ts
/**
* Registers DOM event listeners that are active only while the host is
* connected.
*
* @remarks Listeners are attached on connect and removed on disconnect through
* an internal `AbortController`.
*
* @param host - Host element controlling the listener lifecycle.
* @param listeners - Event listeners keyed by DOM event name.
* @param target - Element that should receive the listeners. Defaults to the
*   host itself.
*/
function useEvents(host, listeners, target = host) {
	let controller = new AbortController();
	use(host, {
		connected() {
			for (const [name, entry] of Object.entries(listeners)) {
				const [listener, options] = Array.isArray(entry) ? entry : [entry];
				target.addEventListener(name, listener, {
					...options,
					signal: controller.signal
				});
			}
		},
		disconnected() {
			controller.abort();
			controller = new AbortController();
		}
	});
}
export { useEvents };

//# sourceMappingURL=useEvents.js.map