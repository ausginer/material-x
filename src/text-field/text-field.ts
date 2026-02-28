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
 * @attribute type
 * @attribute inputmode
 * @attribute outlined
 * @attribute disabled
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
