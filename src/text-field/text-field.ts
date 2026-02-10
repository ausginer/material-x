import type { EmptyObject } from 'type-fest';
import '../button/icon-button.ts';
import { useARIATransfer } from '../core/controllers/useARIA.ts';
import { transfer, useAttributes } from '../core/controllers/useAttributes.ts';
import { useEvents } from '../core/controllers/useEvents.ts';
import { useHasSlottedPolyfill } from '../core/controllers/useHasSlottedPolyfill.ts';
import { useSlot } from '../core/controllers/useSlot.ts';
import { ATTRIBUTE, Bool, Str } from '../core/elements/attribute.ts';
import {
  define,
  getInternals,
  ReactiveElement,
} from '../core/elements/reactive-element.ts';
import {
  impl,
  trait,
  type ConstructorWithTraits,
  type Interface,
  type Props,
  type Trait,
} from '../core/elements/traits.ts';
import {
  Disableable,
  type DisableableProps,
} from '../core/traits/disableable.ts';
import { $, notify, toggleState } from '../core/utils/DOM.ts';
import { join } from '../core/utils/runtime.ts';
import { useCore } from '../core/utils/useCore.ts';
import '../icon/icon.ts';
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };
import outlinedStyles from './styles/outlined/main.css.ts' with { type: 'css' };
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

type FieldElement = HTMLInputElement | HTMLTextAreaElement;

class FieldImplementation {
  readonly #input: HTMLInputElement;
  readonly #textarea: HTMLTextAreaElement;
  #current: FieldElement;

  constructor(input: HTMLInputElement, textarea: HTMLTextAreaElement) {
    this.#input = input;
    this.#textarea = textarea;
    this.#current = input;
  }

  get field(): FieldElement {
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

    notify(this.#current, 'input', 'change');
  }
}

type TextFieldLikeDescriptor = {
  type: TextFieldType;
  inputmode: TextFieldInputMode;
  outlined: boolean;
  multiline: boolean;
  value: null;
};

const $textFieldLike: unique symbol = Symbol('TextFieldLike');

export const TextFieldLike: Trait<
  TextFieldLikeDescriptor,
  typeof $textFieldLike
> = trait<TextFieldLikeDescriptor, typeof $textFieldLike>(
  {
    type: Str,
    inputmode: Str,
    outlined: Bool,
    multiline: Bool,
    value: null,
  },
  $textFieldLike,
);

export type TextFieldLike = Interface<typeof TextFieldLike>;
export type TextFieldLikeProps = Props<typeof TextFieldLike>;

export type TextFieldProperties = TextFieldLikeProps & DisableableProps;
export type TextFieldEvents = EmptyObject;
export type TextFieldCSSProperties = Readonly<{
  '--md-outlined-text-field-notch-bg'?: string;
}>;

const TextFieldCore: ConstructorWithTraits<
  ReactiveElement,
  [typeof TextFieldLike, typeof Disableable]
> = impl(ReactiveElement, [TextFieldLike, Disableable]);

const ariaParamsMap = {
  label: 'aria-labelledby',
  support: 'aria-describedby',
  counter: 'aria-describedby',
} as const;

/**
 * @attribute type
 * @attribute inputmode
 * @attribute outlined
 * @attribute multiline
 * @attribute disabled
 */
export default class TextField extends TextFieldCore {
  static formAssociated = true;

  readonly #impl: FieldImplementation;

  constructor() {
    super();
    useCore(this, textFieldTemplate, {}, [defaultStyles, outlinedStyles], {
      delegatesFocus: true,
    });

    const input = $<HTMLInputElement>(this, '#single')!;
    const textarea = $<HTMLTextAreaElement>(this, '#multi')!;

    this.#impl = new FieldImplementation(input, textarea);
    const internals = getInternals(this);

    useARIATransfer(this, input);
    useARIATransfer(this, textarea);

    useAttributes(this, {
      multiline: (_, newValue) => {
        this.#impl.switch(newValue !== null);
      },
      type: transfer(input, 'type'),
      disabled: join(
        transfer(input, 'disabled'),
        transfer(textarea, 'disabled'),
      ),
      inputmode: join(
        transfer(input, 'inputmode'),
        transfer(textarea, 'inputmode'),
      ),
    });

    for (const [id, param] of Object.entries(ariaParamsMap)) {
      useSlot(this, `#${id} slot`, (_, elements) => {
        if (!ATTRIBUTE.getRaw(this, param)) {
          for (const field of this.#impl) {
            const current =
              ATTRIBUTE.getRaw(field, param)
                ?.split(' ')
                .filter((value) => value.length > 0) ?? [];
            const values = new Set(current);

            if (elements.length > 0) {
              values.add(id);
            } else {
              values.delete(id);
            }

            const next = Array.from(values).join(' ');
            ATTRIBUTE.setRaw(field, param, next.length > 0 ? next : null);
          }
        }
      });
    }

    for (const field of this.#impl) {
      useEvents(
        this,
        {
          input({ target }) {
            toggleState(
              internals,
              'populated',
              // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
              !!(target as FieldElement).value,
            );
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
            internals.setFormValue((target as FieldElement).value);
          },
        },
        field,
      );
    }

    // TODO: Remove when :has-slotted pseudo class becomes baseline
    useHasSlottedPolyfill(this);
  }

  get isPopulated(): boolean {
    return getInternals(this).states.has('populated');
  }

  override get value(): string {
    return this.#impl.field.value;
  }

  override set value(value: string | null) {
    this.#impl.field.value = value ?? '';
    getInternals(this).setFormValue(value);
  }

  checkValidity(): boolean {
    const valid = getInternals(this).checkValidity();
    toggleState(getInternals(this), 'error', !valid);
    return valid;
  }

  reportValidity(): boolean {
    const valid = getInternals(this).reportValidity();
    toggleState(getInternals(this), 'error', !valid);
    return valid;
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
