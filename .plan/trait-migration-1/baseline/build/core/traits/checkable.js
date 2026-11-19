import { Bool } from "../attribute.js";
import { useAttributes, via } from "../controllers/useAttributes.js";
import { trait } from "./attributes.js";
// src/traits/checkable.ts
const $checkable = Symbol("Checkable");
const CHECKABLE_ATTRS = { checked: Bool };
/**
* Element trait that exposes a presence-based `checked` boolean field.
*/
const Checkable = /*@__PURE__*/ trait(CHECKABLE_ATTRS, $checkable);
/**
* Wires the `checked` attribute of `host` to the corresponding attribute on
* `target` via a transfer callback.
*
* @remarks Does not wire form internals or custom states — use a dedicated
* setup for those.
*/
function useCheckable(host, target) {
	if (target instanceof HTMLInputElement) useAttributes(host, { checked: via(Bool, (_, value) => {
		target.checked = value;
	}) });
	else useAttributes(host, { "aria-checked": via(Bool, (_, value) => {
		target.ariaChecked = String(value);
	}) });
}
export { $checkable, $checkable as __mxflat_$checkable_90a5ac53, CHECKABLE_ATTRS, Checkable, useCheckable };

//# sourceMappingURL=checkable.js.map