import { define } from '../core/elements/reactive-element.ts';
import { useFieldSizingContentPolyfill } from '../core/utils/polyfills.ts';
import multilineTextFieldTemplate from './multiline-text-field.tpl.html' with { type: 'html' };
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };
import outlinedStyles from './styles/outlined/main.css.ts' with { type: 'css' };
import { getInput, TextFieldCore } from './TextFieldCore.ts';

export type {
  TextFieldProperties,
  TextFieldEvents,
  TextFieldCSSProperties,
} from './TextFieldCore.ts';

/**
 * @tag mx-multiline-text-field
 *
 * @summary Multiline text fields let users enter and edit multi-line text.
 *
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
 * @slot prefix - Prefix content before textarea text.
 * @slot suffix - Suffix content after textarea text.
 *
 * @csspart field - Internal native textarea field.
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
 * @event input - Fired when the textarea value changes.
 * @event change - Fired when value is committed.
 */
export default class MultilineTextField extends TextFieldCore {
  static formAssociated = true;

  constructor() {
    super(multilineTextFieldTemplate, [defaultStyles, outlinedStyles]);

    // TODO: Remove when `field-sizing: content;` is baseline.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    useFieldSizingContentPolyfill(this, getInput(this) as HTMLTextAreaElement);
  }
}

define('mx-multiline-text-field', MultilineTextField);

declare global {
  interface HTMLElementTagNameMap {
    'mx-multiline-text-field': MultilineTextField;
  }
}
