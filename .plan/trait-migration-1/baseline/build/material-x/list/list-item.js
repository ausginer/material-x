import tpl from "./list-item.tpl.html.js";
import { useListItemCore } from "./ListItemCore.js";
import { ControlledElement, define } from "@ydinjs/core/element.js";
import "@ydinjs/core/traits/attributes.js";
// src/list/list-item.ts
/**
* @tag mx-list-item
*
* @summary Static list items display content inside a list.
*
* @slot - Primary label text.
* @slot start - Leading icon, avatar, or image.
* @slot end - Trailing icon or control.
* @slot overline - Overline text.
* @slot supporting-text - Supporting text below the label.
* @slot trailing-supporting-text - Trailing supporting text.
*
* @csspart impl - Internal list item container.
*/
class ListItem extends ControlledElement {
	static {
		Object.defineProperties(this.prototype, {});
	}
	constructor() {
		super();
		useListItemCore(this, tpl);
	}
}
define("mx-list-item", ListItem);
export { ListItem as default };

//# sourceMappingURL=list-item.js.map