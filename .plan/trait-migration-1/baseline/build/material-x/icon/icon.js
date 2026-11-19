import { useCore } from "../core/utils/useCore.js";
import tpl from "./icon.tpl.html.js";
import css from "./styles/icon.ctr.css.js";
import { ControlledElement, define } from "@ydinjs/core/element.js";
// src/icon/icon.ts
/**
* @tag mx-icon
*
* @summary Icons display a single symbol from an icon font.
*
* @slot - Icon glyph text/content.
*
* @cssprop --md-icon-size - Overrides icon font size.
* @cssprop --md-icon-font - Overrides icon font family.
*/
class Icon extends ControlledElement {
	constructor() {
		super();
		useCore(this, [tpl], {}, [css]);
	}
}
define("mx-icon", Icon);
export { Icon as default };

//# sourceMappingURL=icon.js.map