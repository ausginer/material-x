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
