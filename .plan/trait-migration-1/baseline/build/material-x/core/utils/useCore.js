import { internals } from "@ydinjs/core/element.js";
import { useShadowDOM } from "@ydinjs/core/controllers/useShadowDOM.js";
// src/core/utils/useCore.ts
function useCore(host, templates, aria, styles, init) {
	Object.assign(internals(host), aria);
	useShadowDOM(host, templates, styles, init);
}
export { useCore };

//# sourceMappingURL=useCore.js.map