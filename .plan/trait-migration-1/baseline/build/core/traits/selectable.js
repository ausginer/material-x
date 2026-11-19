import { Bool } from "../attribute.js";
import { transfer, useAttributes } from "../controllers/useAttributes.js";
import { trait } from "./attributes.js";
// src/traits/selectable.ts
const $selectable = Symbol("Selectable");
const SELECTABLE_ATTRS = { selected: Bool };
/**
* Element trait that exposes a presence-based `selected` boolean field.
*/
const Selectable = /*@__PURE__*/ trait(SELECTABLE_ATTRS, $selectable);
/**
* Wires the `selected` attribute of `host` to `aria-selected` on `target`.
*/
function useSelectable(host, target) {
	useAttributes(host, { selected: transfer(target, "aria-selected", (value) => value == null ? "false" : "true") });
}
export { $selectable, $selectable as __mxflat_$selectable_5d5134e0, SELECTABLE_ATTRS, Selectable, useSelectable };

//# sourceMappingURL=selectable.js.map