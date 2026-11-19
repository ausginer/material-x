import { BUTTON_GROUP_CTX } from "../button-group/button-group-context.js";
import { useRipple } from "../core/animations/ripple/ripple.js";
import css from "../core/styles/elevation/elevation.css.js";
import "../core/styles/elevation/elevation.runtime.js";
import css$1 from "../core/styles/focus/focus.css.js";
import { useFocusForwarding } from "../core/traits/focus-forwarding.js";
import { useContext } from "../core/utils/useContext.js";
import { useCore } from "../core/utils/useCore.js";
import css$2 from "./styles/default/disabled.css.js";
import css$3 from "./styles/default/main.css.js";
import css$4 from "./styles/shape/main.css.js";
import css$5 from "./styles/size/main.css.js";
import { Bool, Str } from "@ydinjs/core/attribute.js";
import { useARIA } from "@ydinjs/core/controllers/useARIA.js";
import { useAttributes } from "@ydinjs/core/controllers/useAttributes.js";
import { internals } from "@ydinjs/core/element.js";
import { trait } from "@ydinjs/core/traits/attributes.js";
import { DISABLEABLE_ATTRS, Disableable, useDisableable } from "@ydinjs/core/traits/disableable.js";
import { $, switchState, toggleState } from "@ydinjs/core/utils/DOM.js";
// src/button/ButtonCore.ts
const BUTTON_ATTRS = {
	color: Str,
	size: Str,
	shape: Str
};
const $buttonLike = Symbol("ButtonLike");
const ButtonLike = /*@__PURE__*/ trait(BUTTON_ATTRS, $buttonLike);
const BUTTON_CORE_TRAITS = [ButtonLike, Disableable];
const BUTTON_CORE_ATTRS = {
	...BUTTON_ATTRS,
	...DISABLEABLE_ATTRS
};
function useButtonCore(host, template, styles, init) {
	const shadowInit = {
		delegatesFocus: true,
		...init
	};
	useCore(host, [template], {}, [
		css$4,
		css$3,
		css,
		css$1,
		css$5,
		...styles,
		css$2
	], shadowInit);
	const target = $(host, ".host");
	useDisableable(host, target);
	useARIA(host, target);
	useFocusForwarding(host, target);
	useRipple(host, target, target);
	const innards = internals(host);
	const switcher = (oldValue, newValue) => switchState(innards, oldValue, newValue);
	useAttributes(host, {
		color: switcher,
		size: switcher,
		shape: switcher,
		disabled: (_, newValue) => toggleState(innards, "disabled", Bool.from(newValue))
	});
	useContext(host, BUTTON_GROUP_CTX, BUTTON_CORE_ATTRS, (attr, oldValue, newValue) => {
		if (attr === "disabled") {
			target.disabled = host.disabled || newValue;
			toggleState(innards, "disabled", newValue);
		} else switchState(innards, oldValue, newValue);
	});
	return target;
}
export { $buttonLike, $buttonLike as __mxflat_$buttonLike_cfd06262, BUTTON_ATTRS, BUTTON_CORE_TRAITS, ButtonLike, useButtonCore };

//# sourceMappingURL=ButtonCore.js.map