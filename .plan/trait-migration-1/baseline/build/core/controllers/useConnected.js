import { use } from "../element.js";
// src/controllers/useConnected.ts
/**
* Registers a `connected` lifecycle callback on a host element.
*
* @remarks This is a thin convenience helper over `use(host, { connected })`.
*
* @param element - Host element whose `connected` lifecycle should be observed.
* @param callback - Callback invoked each time the host connects.
*/
function useConnected(element, callback) {
	use(element, { connected: callback });
}
export { useConnected };

//# sourceMappingURL=useConnected.js.map