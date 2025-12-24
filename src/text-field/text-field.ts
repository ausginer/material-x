import type { EmptyObject } from 'type-fest';
import { createAccessors } from '../core/controllers/createAccessors.ts';
import { useConnected } from '../core/controllers/useConnected.ts';
import { useSlot } from '../core/controllers/useSlot.ts';
import { Str } from '../core/elements/attribute.ts';
import {
  define,
  getInternals,
  html,
  ReactiveElement,
} from '../core/elements/reactive-element.ts';
import { useCore } from '../core/utils/useCore.ts';
import filledStyles from './styles/default/filled.css.ts?type=css' with { type: 'css' };

const TEMPLATE = html`<slot name="lead" id="lead"></slot>
  <slot name="label" id="label"></slot>
  <div id="input" contenteditable></div>
  <slot name="trail" id="trail"></slot>
  <slot name="support" id="support"></slot>`;

export type TextFieldProperties = Readonly<{
  type?: 'outlined';
}>;

export type TextFieldEvents = EmptyObject;
export type TextFieldCSSProperties = EmptyObject;

/**
 * @attribute type
 */
export default class TextField extends ReactiveElement {
  static {
    createAccessors(this, {
      type: Str,
    });
  }

  constructor() {
    super();
    useCore(this, TEMPLATE, { role: 'textbox' }, [filledStyles], {
      delegatesFocus: true,
    });
    useConnected(this, () => {
      this.tabIndex = 0;
    });

    // TODO: Remove when :has-slotted pseudo class becomes baseline
    for (const id of ['#lead', '#trail']) {
      useSlot(this, id, (slot, elements) => {
        if (elements.length > 0) {
          slot.classList.add('has-slotted');
        } else {
          slot.classList.remove('has-slotted');
        }
      });
    }
  }

  isPopulated(): boolean {
    return getInternals(this).states.has('populated');
  }

  hasErrors(): boolean {
    return getInternals(this).states.has('error');
  }
}

define('mx-text-field', TextField);
