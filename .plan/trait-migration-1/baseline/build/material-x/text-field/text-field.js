import "../button/icon-button.js";
import "../icon/icon.js";
import tpl from "./text-field.tpl.html.js";
import { TextFieldCore, input } from "./TextFieldCore.js";
import { transfer, useAttributes } from "@ydinjs/core/controllers/useAttributes.js";
import { define } from "@ydinjs/core/element.js";
// src/text-field/text-field.ts
/**
* @tag mx-text-field
*
* @summary Text fields let users enter and edit single-line text.
*
* @attr {"text"|"password"|"tel"|"search"|"url"|"number"|"email"} type -
* Native input type.
* @attr {"text"|"numeric"|"tel"|"search"|"url"|"decimal"|"email"|"none"}
* inputmode - Virtual keyboard hint.
* @attr {boolean} outlined - Enables outlined style.
* @attr {boolean} disabled - Disables interaction and form participation.
* @attr {string} name - Name submitted with form data.
*
* @slot label - Label content.
* @slot support - Supporting text content.
* @slot counter - Counter content.
* @slot lead - Leading icon/content.
* @slot trail - Trailing icon/content.
* @slot prefix - Prefix content before input text.
* @slot suffix - Suffix content after input text.
*
* @csspart field - Internal native input field.
* @csspart lead - Leading presenter container.
* @csspart prefix - Prefix presenter container.
* @csspart label - Label presenter container.
* @csspart suffix - Suffix presenter container.
* @csspart trail - Trailing presenter container.
* @csspart support - Supporting text presenter container.
* @csspart counter - Counter presenter container.
*
* @cssprop --md-text-field-container-height - Overrides field height.
* @cssprop --md-text-field-input-line-height - Overrides input line height.
* @cssprop --md-text-field-container-padding-inline - Overrides horizontal
* field padding.
* @cssprop --md-text-field-container-icon-padding-inline - Overrides icon
* inline padding.
* @cssprop --md-text-field-leading-icon-size - Overrides leading icon size.
* @cssprop --md-text-field-trailing-icon-size - Overrides trailing icon size.
* @cssprop --md-text-field-focus-duration - Overrides focus transition
* duration.
* @cssprop --md-text-field-focus-easing - Overrides focus transition easing.
* @cssprop --md-text-field-prefix-gap - Overrides gap after prefix content.
* @cssprop --md-text-field-suffix-gap - Overrides gap before suffix content.
* @cssprop --md-text-field-supporting-text-row-gap - Overrides gap above
* supporting text.
*
* @event input - Fired when the input value changes.
* @event change - Fired when value is committed.
*/
class TextField extends TextFieldCore {
	static formAssociated = true;
	constructor() {
		super(tpl);
		useAttributes(this, { type: transfer(input(this), "type") });
	}
}
define("mx-text-field", TextField);
export { TextField as default };

//# sourceMappingURL=text-field.js.map