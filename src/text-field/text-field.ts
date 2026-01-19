import type { EmptyObject } from 'type-fest';
import '../button/icon-button.ts';
import { transfer, useAttributes } from '../core/controllers/useAttributes.ts';
import { useEvents } from '../core/controllers/useEvents.ts';
import { useSlot } from '../core/controllers/useSlot.ts';
import { Bool, Str } from '../core/elements/attribute.ts';
import {
  impl,
  trait,
  type Accessors,
  type ConstructorWithTraits,
  type Trait,
  type TraitProps,
} from '../core/elements/impl.ts';
import {
  define,
  getInternals,
  ReactiveElement,
} from '../core/elements/reactive-element.ts';
import { Disableable } from '../core/traits/disableable.ts';
import { $, $$ } from '../core/utils/DOM.ts';
import { join } from '../core/utils/runtime.ts';
import { useCore } from '../core/utils/useCore.ts';
import '../icon/icon.ts';
import defaultStyles from './styles/default/main.ctr.css' with { type: 'css' };
import defaultTokens from './styles/default/main.tokens.css.ts' with { type: 'css' };
import numberStyles from './styles/number/main.ctr.css' with { type: 'css' };
import textFieldTemplate from './text-field.tpl.html' with { type: 'html' };

export type TextFieldType =
  | 'text'
  | 'password'
  | 'tel'
  | 'search'
  | 'url'
  | 'number'
  | 'email';

export type TextFieldInputMode =
  | 'text'
  | 'numeric'
  | 'tel'
  | 'search'
  | 'url'
  | 'decimal'
  | 'email'
  | 'none';

export type TextFieldProperties = Readonly<{
  outlined?: boolean;
  type?: TextFieldType;
  inputmode?: TextFieldInputMode;
}>;

export type TextFieldEvents = EmptyObject;
export type TextFieldCSSProperties = EmptyObject;

class FieldImplementation {
  readonly #input: HTMLInputElement;
  readonly #textarea: HTMLTextAreaElement;
  #current: HTMLInputElement | HTMLTextAreaElement;

  constructor(input: HTMLInputElement, textarea: HTMLTextAreaElement) {
    this.#input = input;
    this.#textarea = textarea;
    this.#current = input;
  }

  get field(): HTMLInputElement | HTMLTextAreaElement {
    return this.#current;
  }

  *[Symbol.iterator]() {
    yield this.#input;
    yield this.#textarea;
  }

  switch(multi = false): void {
    const next = multi ? this.#textarea : this.#input;

    if (this.#current === next) {
      return;
    }

    const from = this.#current;
    const to = next;

    const { value } = from;
    from.value = '';
    from.hidden = true;
    to.value = value;
    to.hidden = false;

    this.#current = to;
  }
}

export const TextFieldLike: Trait<
  ReactiveElement,
  Accessors<{
    type: Str;
    inputmode: Str;
    outlined: Bool;
    multiline: Bool;
  }>
> = trait({
  type: Str,
  inputmode: Str,
  outlined: Bool,
  multiline: Bool,
});

export type TextFieldLike = Disableable & TraitProps<typeof TextFieldLike>;

const TextFieldCore: ConstructorWithTraits<
  ReactiveElement,
  [typeof TextFieldLike, typeof Disableable]
> = impl(ReactiveElement, [TextFieldLike, Disableable]);

/**
 * @attribute type
 * @attribute inputmode
 * @attribute outlined
 * @attribute multiline
 */
export default class TextField extends TextFieldCore {
  static formAssociated = true;

  readonly #impl: FieldImplementation;

  constructor() {
    super();
    useCore(
      this,
      textFieldTemplate,
      {},
      [defaultStyles, defaultTokens, numberStyles],
      { delegatesFocus: true },
    );

    const input = $<HTMLInputElement>(this, '#single')!;
    const textarea = $<HTMLTextAreaElement>(this, '#multi')!;

    this.#impl = new FieldImplementation(input, textarea);

    useAttributes(this, {
      multiline: (_, newValue) => {
        this.#impl.switch(newValue !== null);
      },
      type: transfer(input, 'type'),
      inputmode: join(transfer(input, 'inputmode'), transfer(textarea, 'type')),
      value: (_, newValue) => {
        this.#impl.field.value = newValue ?? '';
      },
    });

    const internals = getInternals(this);

    const togglePopulated = () => {
      if (this.value) {
        internals.states.add('populated');
      } else {
        internals.states.delete('populated');
      }
    };

    for (const field of this.#impl) {
      useEvents(this, { input: togglePopulated }, field);
    }

    for (const stepperId of ['#inc', '#dec']) {
      useEvents(
        this,
        {
          click:
            stepperId === '#inc'
              ? () => {
                  input.stepUp();
                  togglePopulated();
                }
              : () => {
                  input.stepDown();
                  togglePopulated();
                },
        },
        $(this, stepperId)!,
      );
    }

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

  get value(): string {
    return this.#impl.field.value;
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

  interface HTMLElementEventMap {
    tfincrease: Event;
    tfdecrease: Event;
  }
}
