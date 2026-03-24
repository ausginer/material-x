// oxlint-disable import/no-mutable-exports
import type { EmptyObject } from 'type-fest';
import { useNotchedOutline } from '../core/animations/notched-outline/notched-outline.ts';
import {
  useARIATransfer,
  transfer,
  useAttributes,
  useEvents,
  useSlot,
} from 'ydin/controllers';
import {
  ATTRIBUTE,
  Bool,
  Str,
  getInternals,
  ReactiveElement,
  impl,
  trait,
  type ConstructorWithTraits,
  type Interface,
  type Props,
  type Trait,
} from 'ydin/elements';
import { Disableable, type DisableableProps } from 'ydin/traits';
import { $, toggleState } from 'ydin/utils';
import { useHasSlottedPolyfill } from '../core/utils/polyfills.ts';
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

type InputElement = HTMLInputElement | HTMLTextAreaElement;

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

const ARIA_PARAMS = {
  'aria-labelledby': ['label'],
  'aria-describedby': ['support', 'counter'],
} as const;

function getFallback(
  slots: ReadonlyArray<Readonly<{ id: string; slot: HTMLSlotElement }>>,
): string | null {
  const ids = slots.flatMap(({ id, slot }) =>
    slot.assignedElements().length > 0 ? [id] : [],
  );

  return ids.length > 0 ? ids.join(' ') : null;
}

function useTextFieldARIA(host: ReactiveElement, input: InputElement): void {
  const ariaParams = Object.fromEntries(
    Object.entries(ARIA_PARAMS).map(([attr, ids]) => [
      attr,
      ids.map((id) => ({ id, slot: $<HTMLSlotElement>(host, `#${id} slot`)! })),
    ]),
  );

  useARIATransfer(host, input, (name, value) =>
    name in ariaParams && value == null
      ? // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        getFallback(ariaParams[name as keyof typeof ARIA_PARAMS])
      : value,
  );

  for (const [attr, slots] of Object.entries(ariaParams)) {
    for (const { slot } of slots) {
      useSlot(host, slot, () => {
        if (ATTRIBUTE.getRaw(host, attr) == null) {
          ATTRIBUTE.setRaw(input, attr, getFallback(slots));
        }
      });
    }
  }
}

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
  readonly #internals: ElementInternals;

  constructor(
    template: HTMLTemplateElement,
    styles: ReadonlyArray<CSSStyleSheet | string>,
  ) {
    super();

    useCore(this, [template, textFieldCoreTemplate], {}, styles, {
      delegatesFocus: true,
    });

    const input = $<HTMLInputElement | HTMLTextAreaElement>(this, '.input')!;
    const label = $<HTMLLabelElement>(this, '.label')!;

    const internals = getInternals(this);

    useAttributes(this, {
      disabled: transfer(input, 'disabled'),
      inputmode: transfer(input, 'inputmode'),
    });

    useTextFieldARIA(this, input);
    useNotchedOutline(this, label);

    useEvents(
      this,
      {
        input() {
          toggleState(internals, 'populated', !!input.value);
          internals.setFormValue(input.value);
        },
      },
      input,
    );

    // TODO: Remove when :has-slotted pseudo class is baseline.
    useHasSlottedPolyfill(this);

    this.#input = input;
    this.#internals = internals;
  }

  get isPopulated(): boolean {
    return this.#internals.states.has('populated');
  }

  override get value(): string {
    return this.#input.value;
  }

  override set value(value: string | null) {
    this.#input.value = value ?? '';
    toggleState(this.#internals, 'populated', !!this.#input.value);
    this.#internals.setFormValue(value);
  }

  checkValidity(): boolean {
    const valid = this.#internals.checkValidity();
    toggleState(this.#internals, 'error', !valid);
    return valid;
  }

  reportValidity(): boolean {
    const valid = this.#internals.reportValidity();
    toggleState(this.#internals, 'error', !valid);
    return valid;
  }

  setValidity(flags?: ValidityStateFlags, message?: string): void {
    this.#internals.setValidity(flags, message, this);
  }
}
