import operator, { Str } from "../attribute.js";
import { useAttributes } from "../controllers/useAttributes.js";
import { useEvents } from "../controllers/useEvents.js";
import { trait } from "./attributes.js";
// src/traits/linkable.ts
const $linkable = Symbol("Linkable");
const LINKABLE_ATTRS = {
	href: Str,
	target: Str
};
/**
* Element trait that exposes `href` and `target` navigation fields.
*/
const Linkable = /*@__PURE__*/ trait(LINKABLE_ATTRS, $linkable);
/**
* Mirrors `href` and `target` from `host` to a shadow-DOM anchor.
*
* @param host - Host element that owns the navigation attributes.
* @param target - Shadow-DOM anchor that performs native navigation.
*/
function useLinkable(host, target) {
	useAttributes(host, {
		target(_, value) {
			target.target = value ?? "";
		},
		href(_, value) {
			operator.setRaw(target, "href", value);
		}
	});
}
/**
* Manages `disabled` state on a shadow-DOM anchor, keeping `href` and focus
* in sync with the host's disabled attribute.
*
* @remarks
* Call after {@link useLinkable}. While disabled: clears `href`, sets
* `tabIndex` to `-1`, marks `aria-disabled`; on re-enable, restores
* host-authored values. Also blocks click propagation while disabled.
*
* @param host - Host element that owns navigation and disabled attributes.
* @param target - Shadow-DOM anchor that performs native navigation.
*/
function useDisableableLinkable(host, target) {
	useAttributes(host, {
		href() {
			if (host.hasAttribute("disabled")) operator.setRaw(target, "href", null);
		},
		disabled(_, value) {
			if (value != null) {
				target.ariaDisabled = "true";
				target.tabIndex = -1;
				operator.setRaw(target, "href", null);
			} else {
				target.ariaDisabled = operator.getRaw(host, "aria-disabled");
				operator.setRaw(target, "tabindex", operator.getRaw(host, "tabindex"));
				operator.setRaw(target, "href", operator.getRaw(host, "href"));
			}
		}
	});
	useEvents(host, { click: (event) => {
		if (host.hasAttribute("disabled")) {
			event.preventDefault();
			event.stopPropagation();
		}
	} }, target);
}
export { $linkable, $linkable as __mxflat_$linkable_fe0f1416, LINKABLE_ATTRS, Linkable, useDisableableLinkable, useLinkable };

//# sourceMappingURL=linkable.js.map