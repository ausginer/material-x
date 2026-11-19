import { trait } from "@ydinjs/core/traits/primitives.js";
// src/core/traits/focus-forwarding.ts
const $focusForwarding = Symbol("FocusForwarding");
const controls = /* @__PURE__ */ new WeakMap();
/**
* Makes `host.focus()` focus the control that {@link useFocusForwarding}
* registered, the element that delegating focus picks. Firefox doesn't delegate
* focus from a host whose box is `display: contents`, which every adopter's host
* is, so the shadow root's `delegatesFocus` alone leaves focus where it was
* there (`repo:RF-33`). The shadow root still delegates focus, and this trait
* goes once Firefox delegates through such a host.
*
* `focus()` is a method of the prototype, so a subclass overrides it and
* reaches the control through `super.focus()`.
*/
const FocusForwarding = /*@__PURE__*/ trait((base) => class extends base {
	focus(options) {
		controls.get(this).focus(options);
	}
}, $focusForwarding);
/** Registers `control` as the element that `host.focus()` focuses. */
function useFocusForwarding(host, control) {
	controls.set(host, control);
}
export { $focusForwarding, $focusForwarding as __mxflat_$focusForwarding_fc7f5458, FocusForwarding, controls as __mxflat_controls_7b84b960, controls, useFocusForwarding };

//# sourceMappingURL=focus-forwarding.js.map