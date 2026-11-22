import '../button/icon-button.ts';
import {
  transfer,
  useAttributes,
} from '@ydinjs/core/controllers/useAttributes.js';
import '../icon/icon.ts';
import textFieldTemplate from './text-field.tpl.html' with { type: 'html' };
import { input, TextFieldCore } from './TextFieldCore.ts';

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
 * @description
 * **Validation.** The element has no native validators. `setCustomValidity()`
 * sets its validity and the `error` attribute sets its error display. Nothing
 * else changes either, a form reset included. Set `error` and `required`
 * rather than `aria-invalid` and `aria-required` on the host. Put the error
 * message in the `support` slot.
 *
 * @attr {"text"|"password"|"tel"|"search"|"url"|"number"|"email"} type -
 * Native input type. It sets the keyboard, autofill and the native
 * sanitization of the text, and doesn't validate.
 * @attr {"text"|"numeric"|"tel"|"search"|"url"|"decimal"|"email"|"none"}
 * inputmode - Virtual keyboard hint.
 * @attr {boolean} outlined - Enables outlined style.
 * @attr {boolean} disabled - Disables interaction and form participation.
 * @attr {string} name - Name submitted with form data.
 * @attr {string} value - Default value. The field takes it at upgrade and on a
 * form reset, and follows changes to it until the user edits the value or a
 * script sets the `value` property. Setting the property doesn't change the
 * attribute. A clone takes the default value, not the edited value.
 * @attr {boolean} error - Shows the error display: `:state(error)`, Material's
 *   error appearance, and the input announced as invalid.
 *   Set by the consumer only.
 * @attr {boolean} required - Announces the control as required. It doesn't
 *   change validity, block submission or make `:required` match.
 * @attr {boolean} readonly - Makes the field read-only and removes it from
 *   validation.
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
 * @event invalid - Fired at the host when a validity check finds it invalid.
 *   It doesn't bubble and is cancelable.
 * @event input - Fired when the input value changes.
 * @event change - Fired when value is committed.
 */
export default class TextField extends TextFieldCore {
  static override formAssociated = true;

  constructor() {
    super(textFieldTemplate);

    useAttributes(this, {
      type: transfer(input(this), 'type'),
    });
  }
}

customElements.define('mx-text-field', TextField);

declare global {
  interface HTMLElementTagNameMap {
    'mx-text-field': TextField;
  }
}
