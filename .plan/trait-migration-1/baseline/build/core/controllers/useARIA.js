import operator from "../attribute.js";
import { useConnected } from "./useConnected.js";
import { useMutationObserver } from "./useMutationObserver.js";
// src/controllers/useARIA.ts
/**
* Synchronizes `aria-*` attributes from a host element to a target element.
*
* Existing `aria-*` attributes are copied when the host connects, and further
* `aria-*` attribute mutations are mirrored through a `MutationObserver`.
* Attributes outside the `aria-*` namespace are ignored.
*
* @param host - The host element whose `aria-*` attributes should be observed.
* @param target - The target element that receives the synchronized values.
* @param transform - Optional transformer applied before each write. Defaults
*   to an identity transform.
*/
function useARIA(host, target, transform = (_, value) => value) {
	useConnected(host, () => {
		for (const { name } of host.attributes) if (name.startsWith("aria-")) operator.setRaw(target, name, transform(name, operator.getRaw(host, name)));
	});
	useMutationObserver(host, (records) => {
		for (const { type, attributeName: name } of records) if (type === "attributes" && name?.startsWith("aria-")) operator.setRaw(target, name, transform(name, operator.getRaw(host, name)));
	}, { attributes: true });
}
export { useARIA };

//# sourceMappingURL=useARIA.js.map