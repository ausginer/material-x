// oxlint-disable import/no-mutable-exports
import type { EmptyObject } from 'type-fest';
import { useARIATransfer } from '../core/controllers/useARIA.ts';
import { transfer, useAttributes } from '../core/controllers/useAttributes.ts';
import { useEvents } from '../core/controllers/useEvents.ts';
import { useSlot } from '../core/controllers/useSlot.ts';
import { ATTRIBUTE, Bool, Str } from '../core/elements/attribute.ts';
import {
  getInternals,
  ReactiveElement,
} from '../core/elements/reactive-element.ts';
import { type ConstructorWithTraits, impl } from '../core/elements/traits.ts';
import {
  trait,
  type Interface,
  type Props,
  type Trait,
} from '../core/elements/traits.ts';
import {
  Disableable,
  type DisableableProps,
} from '../core/traits/disableable.ts';
import { $, toggleState } from '../core/utils/DOM.ts';
import { useHasSlottedPolyfill } from '../core/utils/polyfills.ts';
import { join } from '../core/utils/runtime.ts';
import { useCore } from '../core/utils/useCore.ts';
import textFieldCoreTemplate from './text-field-core.tpl.html' with { type: 'html' };

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

type TextFieldLikeDescriptor = {
  type: TextFieldType;
  inputmode: TextFieldInputMode;
  outlined: boolean;
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
    value: null,
  },
  $textFieldLike,
);

export type TextFieldLike = Interface<typeof TextFieldLike>;
export type TextFieldLikeProps = Omit<Props<typeof TextFieldLike>, 'value'> & {
  value?: string;
};

export type TextFieldProperties = TextFieldLikeProps & DisableableProps;
export type TextFieldEvents = EmptyObject;
export type TextFieldCSSProperties = Readonly<{
  '--md-text-field-notch-bg'?: string;
  '--md-text-field-container-height'?: string;
  '--md-text-field-input-line-height'?: string;
  '--md-text-field-container-padding-inline'?: string;
  '--md-text-field-container-icon-padding-inline'?: string;
  '--md-text-field-leading-icon-size'?: string;
  '--md-text-field-trailing-icon-size'?: string;
  '--md-text-field-focus-duration'?: string;
  '--md-text-field-focus-easing'?: string;
  '--md-text-field-prefix-gap'?: string;
  '--md-text-field-suffix-gap'?: string;
  '--md-text-field-supporting-text-gap'?: string;
}>;

export const TextFieldCoreBase: ConstructorWithTraits<
  ReactiveElement,
  [typeof TextFieldLike, typeof Disableable]
> = impl(ReactiveElement, [TextFieldLike, Disableable]);
export type TextFieldCoreBase = typeof TextFieldCoreBase;

const ariaParamsMap = {
  label: 'aria-labelledby',
  support: 'aria-describedby',
  counter: 'aria-describedby',
} as const;

export let getInput: (
  element: TextFieldCore,
) => HTMLInputElement | HTMLTextAreaElement;

export class TextFieldCore extends TextFieldCoreBase {
  static {
    getInput = (
      element: TextFieldCore,
    ): HTMLInputElement | HTMLTextAreaElement => element.#input;
  }

  readonly #input: HTMLInputElement | HTMLTextAreaElement;

  constructor(
    template: HTMLTemplateElement,
    styles: ReadonlyArray<CSSStyleSheet | string>,
  ) {
    super();

    useCore(this, [template, textFieldCoreTemplate], {}, styles, {
      delegatesFocus: true,
    });

    const input = $<HTMLInputElement | HTMLTextAreaElement>(this, '.input')!;

    const internals = getInternals(this);

    useARIATransfer(this, input);

    useAttributes(this, {
      disabled: join(transfer(input, 'disabled')),
      inputmode: join(transfer(input, 'inputmode')),
    });

    for (const [id, param] of Object.entries(ariaParamsMap)) {
      useSlot(this, `#${id} slot`, (_, elements) => {
        if (!ATTRIBUTE.getRaw(this, param)) {
          const current =
            ATTRIBUTE.getRaw(input, param)
              ?.split(' ')
              .filter((value) => value.length > 0) ?? [];
          const values = new Set(current);

          if (elements.length > 0) {
            values.add(id);
          } else {
            values.delete(id);
          }

          const next = Array.from(values).join(' ');
          ATTRIBUTE.setRaw(input, param, next.length > 0 ? next : null);
        }
      });
    }

    useEvents(
      this,
      {
        input({ target }) {
          toggleState(
            internals,
            'populated',

            // oxlint-disable-next-line typescript/no-unsafe-type-assertion
            !!(target as FieldElement).value,
          );
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion
          internals.setFormValue((target as FieldElement).value);
        },
      },
      input,
    );

    // TODO: Remove when :has-slotted pseudo class is baseline.
    useHasSlottedPolyfill(this);

    this.#input = input;
  }

  get isPopulated(): boolean {
    return getInternals(this).states.has('populated');
  }

  override get value(): string {
    return this.#input.value;
  }

  override set value(value: string | null) {
    this.#input.value = value ?? '';
    toggleState(getInternals(this), 'populated', !!this.#input.value);
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
