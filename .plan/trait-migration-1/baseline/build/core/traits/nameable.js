import { Str } from "../attribute.js";
import { transfer, useAttributes } from "../controllers/useAttributes.js";
import { trait } from "./attributes.js";
// src/traits/nameable.ts
const $nameable = Symbol("Nameable");
const NAMEABLE_ATTRS = { name: Str };
/**
* Element trait that exposes a string-backed nullable `name` field.
*/
const Nameable = /*@__PURE__*/ trait(NAMEABLE_ATTRS, $nameable);
/**
* Wires the `name` attribute of `host` to the corresponding attribute on
* `target` via a transfer callback.
*/
function useNameable(host, target) {
	useAttributes(host, { name: transfer(target, "name") });
}
export { $nameable, $nameable as __mxflat_$nameable_d7b7babf, NAMEABLE_ATTRS, Nameable, useNameable };

//# sourceMappingURL=nameable.js.map