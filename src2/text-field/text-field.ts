import type { EmptyObject } from 'type-fest';
import { createAccessors } from '../core/controllers/createAccessors.ts';
import { useAttribute } from '../core/controllers/useAttribute.ts';
import { useConnected } from '../core/controllers/useConnected.ts';
import { useEvents } from '../core/controllers/useEvents.ts';
import { useSlot } from '../core/controllers/useSlot.ts';
import { ATTRIBUTE, Str } from '../core/elements/attribute.ts';
import {
  define,
  getInternals,
  ReactiveElement,
} from '../core/elements/reactive-element.ts';
import { $, $$ } from '../core/utils/DOM.ts';
import { useCore } from '../core/utils/useCore.ts';
import '../button/icon-button.ts';
import '../icon/icon.ts';
import defaultStyles from './styles/default/main.ctr.css' with { type: 'css' };
import defaultTokens from './styles/default/main.tokens.css.ts' with { type: 'css' };
import numericStyles from './styles/numeric/main.ctr.css' with { type: 'css' };
import numericTokens from './styles/numeric/main.tokens.css.ts' with { type: 'css' };
import textFieldTemplate from './text-field.tpl.html' with { type: 'html' };

export type TextFieldInputMode =
  | 'numeric'
  | 'tel'
  | 'search'
  | 'url'
  | 'decimal'
  | 'email'
  | 'none';

export type TextFieldType = 'outlined';

export type TextFieldProperties = Readonly<{
  type?: TextFieldType;
  mode?: TextFieldInputMode;
}>;

export type TextFieldEvents = EmptyObject;
export type TextFieldCSSProperties = EmptyObject;

/**
 * @attribute type
 * @attribute mode
 */
export default class TextField extends ReactiveElement {
  static formAssociated = true;

  static {
    createAccessors(this, {
      type: Str,
      mode: Str,
      value: Str,
    });
  }

  declare type: TextFieldType | null;
  declare mode: TextFieldInputMode | null;
  declare value: string | null;

  constructor() {
    super();
    useCore(
      this,
      textFieldTemplate,
      { role: 'textbox' },
      [defaultStyles, defaultTokens, numericStyles, numericTokens],
      { delegatesFocus: true },
    );

    useConnected(this, () => {
      this.tabIndex = 0;
    });

    const input = $<HTMLDivElement>(this, '#input')!;

    useAttribute(this, 'mode', (_, newValue) => {
      ATTRIBUTE.setRaw(input, 'inputmode', newValue);
    });

    useAttribute(this, 'value', (_, newValue) => {
      input.textContent = newValue;
    });

    const root = this.shadowRoot!;
    const internals = getInternals(this);

    useEvents(
      this,
      {
        input() {
          if (input.textContent !== '') {
            internals.states.add('populated');
          } else {
            internals.states.delete('populated');
          }
        },
        paste(event) {
          event.preventDefault();

          const selection = window.getSelection();

          if (!selection) {
            return;
          }

          const [staticRange] = selection.getComposedRanges({
            shadowRoots: [root],
          });

          if (!staticRange) {
            return;
          }

          const range = new Range();
          range.setStart(staticRange.startContainer, staticRange.startOffset);
          range.setEnd(staticRange.endContainer, staticRange.endOffset);

          const insertion = event.clipboardData?.getData('text/plain') ?? '';
          range.deleteContents();

          const textNode = document.createTextNode(insertion);
          range.insertNode(textNode);

          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
        },
      },
      input,
    );

    // TODO: Remove when :has-slotted pseudo class becomes baseline
    for (const element of $$<HTMLSlotElement>(this, 'slot')!) {
      useSlot(this, element, (slot, elements) => {
        if (elements.length > 0) {
          slot.classList.add('has-slotted');
        } else {
          slot.classList.remove('has-slotted');
        }
      });
    }
  }

  get isPopulated(): boolean {
    return getInternals(this).states.has('populated');
  }

  checkValidity(): boolean {
    return getInternals(this).checkValidity();
  }

  reportValidity(): boolean {
    return getInternals(this).reportValidity();
  }

  setValidity(flags?: ValidityStateFlags, message?: string): void {
    getInternals(this).setValidity(flags, message, this);
  }
}

define('mx-text-field', TextField);

declare global {
  interface HTMLElementTagNameMap {
    'mx-text-field': TextField;
  }
}
