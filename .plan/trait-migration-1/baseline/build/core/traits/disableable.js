import { Bool } from "../attribute.js";
import { transfer, useAttributes } from "../controllers/useAttributes.js";
import { trait } from "./attributes.js";
// src/traits/disableable.ts
const $disableable = Symbol("Disableable");
const DISABLEABLE_ATTRS = { disabled: Bool };
/**
* Element trait that exposes a presence-based `disabled` boolean field.
*/
const Disableable = /*@__PURE__*/ trait(DISABLEABLE_ATTRS, $disableable);
/**
* Wires the `disabled` attribute of `host` to the corresponding attribute on
* `target` via a transfer callback.
*/
function useDisableable(host, target) {
	useAttributes(host, { disabled: transfer(target, "disabled") });
}
export { $disableable, $disableable as __mxflat_$disableable_a4774ef4, DISABLEABLE_ATTRS, Disableable, useDisableable };

//# sourceMappingURL=disableable.js.map