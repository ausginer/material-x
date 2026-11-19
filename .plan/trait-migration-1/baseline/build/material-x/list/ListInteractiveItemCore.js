import { useRipple } from "../core/animations/ripple/ripple.js";
import css from "../core/styles/focus/focus.css.js";
import { useFocusForwarding } from "../core/traits/focus-forwarding.js";
import { LIST_ITEM_CORE_TRAITS, useListItemCore } from "./ListItemCore.js";
import { Bool } from "@ydinjs/core/attribute.js";
import { useARIA } from "@ydinjs/core/controllers/useARIA.js";
import { useAttributes, via } from "@ydinjs/core/controllers/useAttributes.js";
import { internals } from "@ydinjs/core/element.js";
import { useDisableable } from "@ydinjs/core/traits/disableable.js";
import { toggleState } from "@ydinjs/core/utils/DOM.js";
import "@ydinjs/core/traits/selectable.js";
[...LIST_ITEM_CORE_TRAITS];
function useInteractiveListItemCore(host, template) {
	const target = useListItemCore(host, template, [css], { delegatesFocus: true });
	useDisableable(host, target);
	useARIA(host, target);
	useFocusForwarding(host, target);
	useRipple(host, target, target);
	useAttributes(host, {
		selected: via(Bool, (_, newValue) => {
			toggleState(internals(host), "selected", newValue);
		}),
		disabled: via(Bool, (_, newValue) => {
			toggleState(internals(host), "disabled", newValue);
		})
	});
	return target;
}
export { useInteractiveListItemCore };

//# sourceMappingURL=ListInteractiveItemCore.js.map