import { Str } from "../attribute.js";
import { transfer, useAttributes } from "../controllers/useAttributes.js";
import { trait } from "./attributes.js";
// src/traits/typeable.ts
const $typeable = Symbol("Typeable");
const TYPEABLE_ATTRS = { type: Str };
/**
* Element trait that exposes a string-backed nullable `type` field.
*/
const Typeable = /*@__PURE__*/ trait(TYPEABLE_ATTRS, $typeable);
/**
* Wires the `type` attribute of `host` to the corresponding attribute on
* `target` via a transfer callback.
*/
function useTypeable(host, target) {
	useAttributes(host, { type: transfer(target, "type") });
}
export { $typeable, $typeable as __mxflat_$typeable_5a0d1ab0, TYPEABLE_ATTRS, Typeable, useTypeable };

//# sourceMappingURL=typeable.js.map