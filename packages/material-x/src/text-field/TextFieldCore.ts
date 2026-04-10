// oxlint-disable import/no-mutable-exports
import type { EmptyObject } from 'type-fest';
import type { ConverterOf } from 'ydin/attribute.js';
import ATTR, { Bool, Str } from 'ydin/attribute.js';
import { useARIA } from 'ydin/controllers/useARIA.js';
import { transfer, useAttributes } from 'ydin/controllers/useAttributes.js';
import { useEvents } from 'ydin/controllers/useEvents.js';
import { useSlot } from 'ydin/controllers/useSlot.js';
import {
  ControlledElement,
  getInternals,
  type ControlledElementConstructor,
} from 'ydin/element.js';
import { Disableable, type DisableableProps } from 'ydin/traits/disableable.js';
import {
  impl,
  trait,
  type Interface,
  type Props,
  type Trait,
  type TraitedConstructor,
} from 'ydin/traits/traits.js';
import type { ValuableProps } from 'ydin/traits/valuable.js';
import { Valuable } from 'ydin/traits/valuable.js';
import { $, toggleState } from 'ydin/utils/DOM.js';
import { useNotchedOutline } from '../core/animations/notched-outline/notched-outline.ts';
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

const $textFieldLike: unique symbol = Symbol('TextFieldLike');

export const TextFieldLike: Trait<
  {
    type: TextFieldType | null;
    inputmode: TextFieldInputMode | null;
    outlined: boolean;
  },
  typeof $textFieldLike
> = trait(
  {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    type: Str as ConverterOf<TextFieldType>,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    inputmode: Str as ConverterOf<TextFieldInputMode>,
    outlined: Bool,
  },
  $textFieldLike,
);

export type TextFieldLike = Interface<typeof TextFieldLike>;
export type TextFieldLikeProps = Props<typeof TextFieldLike>;

export type TextFieldProperties = TextFieldLikeProps &
  DisableableProps &
  ValuableProps;
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

export const TextFieldCoreBase: TraitedConstructor<
  ControlledElement,
  ControlledElementConstructor,
  [typeof TextFieldLike, typeof Disableable, typeof Valuable]
> = impl(ControlledElement, [TextFieldLike, Disableable, Valuable]);
export type TextFieldCoreBase = InstanceType<typeof TextFieldCoreBase>;

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

function useTextFieldARIA(host: ControlledElement, input: InputElement): void {
  const ariaParams = Object.fromEntries(
    Object.entries(ARIA_PARAMS).map(([attr, ids]) => [
      attr,
      ids.map((id) => ({ id, slot: $<HTMLSlotElement>(host, `#${id} slot`)! })),
    ]),
  );

  useARIA(host, input, (name, value) =>
    name in ariaParams && value == null
      ? // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        getFallback(ariaParams[name as keyof typeof ARIA_PARAMS])
      : value,
  );

  for (const [attr, slots] of Object.entries(ariaParams)) {
    for (const { slot } of slots) {
      useSlot(host, slot, () => {
        if (ATTR.getRaw(host, attr) == null) {
          ATTR.setRaw(input, attr, getFallback(slots));
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
  }

  get isPopulated(): boolean {
    return getInternals(this).states.has('populated');
  }

  // @ts-expect-error: https://github.com/microsoft/TypeScript/issues/54879
  override get value(): string | null {
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
