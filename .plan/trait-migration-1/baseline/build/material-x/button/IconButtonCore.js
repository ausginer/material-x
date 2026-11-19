import "../core/traits/focus-forwarding.js";
import { BUTTON_CORE_TRAITS } from "./ButtonCore.js";
import { SWITCH_CORE_TRAITS } from "./SwitchCore.js";
import { Str } from "@ydinjs/core/attribute.js";
import { useAttributes } from "@ydinjs/core/controllers/useAttributes.js";
import { internals } from "@ydinjs/core/element.js";
import { trait } from "@ydinjs/core/traits/attributes.js";
import { switchState } from "@ydinjs/core/utils/DOM.js";
import "@ydinjs/core/traits/typeable.js";
// src/button/IconButtonCore.ts
const $iconButtonLike = Symbol("IconButtonLike");
const IconButtonLike = /*@__PURE__*/ trait({ width: Str }, $iconButtonLike);
[...BUTTON_CORE_TRAITS];
[...SWITCH_CORE_TRAITS];
function useIconButtonCore(host) {
	useAttributes(host, { width: (oldValue, newValue) => switchState(internals(host), oldValue, newValue) });
}
export { $iconButtonLike, $iconButtonLike as __mxflat_$iconButtonLike_4e90b0c5, IconButtonLike, useIconButtonCore };

//# sourceMappingURL=IconButtonCore.js.map