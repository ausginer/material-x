import { Str } from "../attribute.js";
import { transfer, useAttributes } from "../controllers/useAttributes.js";
import { trait } from "./attributes.js";
// src/traits/valuable.ts
const $valuable = Symbol("Valuable");
const VALUABLE_ATTRS = { value: Str };
/**
* Element trait that exposes a string-backed nullable `value` field.
*/
const Valuable = /*@__PURE__*/ trait(VALUABLE_ATTRS, $valuable);
/**
* Wires the `value` attribute of `host` to the corresponding attribute on
* `target` via a transfer callback.
*/
function useValuable(host, target) {
	useAttributes(host, { value: transfer(target, "value") });
}
export { $valuable, $valuable as __mxflat_$valuable_e1d406a5, VALUABLE_ATTRS, Valuable, useValuable };

//# sourceMappingURL=valuable.js.map