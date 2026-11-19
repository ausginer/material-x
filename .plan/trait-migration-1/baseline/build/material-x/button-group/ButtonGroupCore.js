import { BUTTON_ATTRS, BUTTON_CORE_TRAITS } from "../button/ButtonCore.js";
import { useCore } from "../core/utils/useCore.js";
import { BUTTON_GROUP_CTX, useButtonGroupProvider } from "./button-group-context.js";
import { useAttributes } from "@ydinjs/core/controllers/useAttributes.js";
import { internals } from "@ydinjs/core/element.js";
import { trait } from "@ydinjs/core/traits/attributes.js";
import { DISABLEABLE_ATTRS } from "@ydinjs/core/traits/disableable.js";
import { switchState } from "@ydinjs/core/utils/DOM.js";
import { VALUABLE_ATTRS } from "@ydinjs/core/traits/valuable.js";
// src/button-group/ButtonGroupCore.ts
const $buttonGroupLike = Symbol("ButtonGroupLike");
const ButtonGroupLike = /*@__PURE__*/ trait({}, $buttonGroupLike);
[...BUTTON_CORE_TRAITS];
const BUTTON_CORE_ATTR_NAMES = Object.keys({
	...BUTTON_ATTRS,
	...DISABLEABLE_ATTRS,
	...VALUABLE_ATTRS
});
function useButtonGroupCore(host, template, aria, styles) {
	useCore(host, [template], aria, styles);
	const innards = internals(host);
	useAttributes(host, { size: (oldValue, newValue) => switchState(innards, oldValue, newValue) });
	useButtonGroupProvider(host, BUTTON_GROUP_CTX, BUTTON_CORE_ATTR_NAMES);
}
export { $buttonGroupLike, $buttonGroupLike as __mxflat_$buttonGroupLike_41cc879e, ButtonGroupLike, useButtonGroupCore };

//# sourceMappingURL=ButtonGroupCore.js.map