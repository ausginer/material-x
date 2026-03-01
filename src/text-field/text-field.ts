import '../button/icon-button.ts';
import { transfer, useAttributes } from '../core/controllers/useAttributes.ts';
import { define } from '../core/elements/reactive-element.ts';
import '../icon/icon.ts';
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };
import outlinedStyles from './styles/outlined/main.css.ts' with { type: 'css' };
import textFieldTemplate from './text-field.tpl.html' with { type: 'html' };
import { getInput, TextFieldCore } from './TextFieldCore.ts';

export type {
  TextFieldProperties,
  TextFieldEvents,
  TextFieldCSSProperties,
} from './TextFieldCore.ts';

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
 * @cssprop --md-text-field-notch-bg - Overrides outlined label notch
 * background.
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
 * @cssprop --md-text-field-supporting-text-gap - Overrides gap above
 * supporting text.
 *
 * @event input - Fired when the input value changes.
 * @event change - Fired when value is committed.
 */
export default class TextField extends TextFieldCore {
  static formAssociated = true;

  constructor() {
    super(textFieldTemplate, [defaultStyles, outlinedStyles]);

    useAttributes(this, {
      type: transfer(getInput(this), 'type'),
    });
  }
}

define('mx-text-field', TextField);

declare global {
  interface HTMLElementTagNameMap {
    'mx-text-field': TextField;
  }
}
