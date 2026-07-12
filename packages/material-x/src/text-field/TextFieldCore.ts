// oxlint-disable import/no-mutable-exports
import ATTR, { Bool, Str, type ConverterOf } from 'ydin/attribute.js';
import { useARIA } from 'ydin/controllers/useARIA.js';
import {
  transfer,
  useAttributes,
  via,
} from 'ydin/controllers/useAttributes.js';
import { useEvents } from 'ydin/controllers/useEvents.js';
import { useSlot } from 'ydin/controllers/useSlot.js';
import {
  ControlledElement,
  internals,
  type ControlledElementConstructor,
} from 'ydin/element.js';
import {
  Disableable,
  useDisableable,
  type DisableableProps,
} from 'ydin/traits/disableable.js';
import { Nameable, useNameable } from 'ydin/traits/nameable.js';
import {
  impl,
  trait,
  type Interface,
  type Props,
  type Trait,
  type TraitedConstructor,
} from 'ydin/traits/traits.js';
import { Valuable, type ValuableProps } from 'ydin/traits/valuable.js';
import { $, toggleState } from 'ydin/utils/DOM.js';
import { useNotchedOutline } from '../core/animations/notched-outline/notched-outline.ts';
import { notify } from '../core/utils/events.ts';
import { useHasSlottedPolyfill } from '../core/utils/polyfills.ts';
import { useCore } from '../core/utils/useCore.ts';
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };
import outlinedStyles from './styles/outlined/main.css.ts' with { type: 'css' };
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
export type TextFieldEvents = Readonly<{
  change: Event;
  input: InputEvent;
}>;
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
  '--md-text-field-supporting-text-row-gap'?: string;
}>;

export const TEXT_FIELD_CORE_TRAITS: readonly [
  typeof TextFieldLike,
  typeof Disableable,
  typeof Valuable,
  typeof Nameable,
] = [TextFieldLike, Disableable, Valuable, Nameable];

const TextFieldCoreConstructor: TraitedConstructor<
  ControlledElement,
  ControlledElementConstructor,
  typeof TEXT_FIELD_CORE_TRAITS
> = impl(ControlledElement, TEXT_FIELD_CORE_TRAITS);

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

export let input: (element: TextFieldCore) => InputElement;

export class TextFieldCore extends TextFieldCoreConstructor {
  static {
    input = (element: TextFieldCore): InputElement => element.#input;
  }

  readonly #input: InputElement;

  constructor(template: HTMLTemplateElement) {
    super();

    useCore(
      this,
      [template, textFieldCoreTemplate],
      {},
      [defaultStyles, outlinedStyles],
      {
        delegatesFocus: true,
      },
    );

    const field = $<InputElement>(this, '.input')!;
    const label = $<HTMLLabelElement>(this, '.label')!;

    const innards = internals(this);

    useNameable(this, field);
    useDisableable(this, field);

    useAttributes(this, {
      inputmode: transfer(field, 'inputmode'),
      outlined: via(Bool, (_, newValue) => {
        toggleState(innards, 'outlined', newValue);
      }),
    });

    useTextFieldARIA(this, field);
    useNotchedOutline(this, label);

    useEvents(
      this,
      {
        input() {
          toggleState(innards, 'populated', !!field.value);
          innards.setFormValue(field.value);
        },
        change: () => {
          notify(this, 'change');
        },
      },
      field,
    );

    // TODO: Remove when :has-slotted and :host:has() are baseline.
    useHasSlottedPolyfill(this);

    this.#input = field;
  }

  get isPopulated(): boolean {
    return internals(this).states.has('populated');
  }

  // @ts-expect-error: https://github.com/microsoft/TypeScript/issues/54879
  override get value(): string | null {
    return this.#input.value;
  }

  override set value(value: string | null) {
    this.#input.value = value ?? '';
    toggleState(internals(this), 'populated', !!this.#input.value);
    internals(this).setFormValue(value);
  }

  checkValidity(): boolean {
    const valid = internals(this).checkValidity();
    toggleState(internals(this), 'error', !valid);
    return valid;
  }

  reportValidity(): boolean {
    const valid = internals(this).reportValidity();
    toggleState(internals(this), 'error', !valid);
    return valid;
  }

  setValidity(flags?: ValidityStateFlags, message?: string): void {
    internals(this).setValidity(flags, message, this);
  }
}
