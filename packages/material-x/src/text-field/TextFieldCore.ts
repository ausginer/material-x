// oxlint-disable import/no-mutable-exports
import {
  Bool,
  setAttribute,
  Str,
  type ConverterOf,
} from '@ydinjs/core/attribute.js';
import { useARIA } from '@ydinjs/core/controllers/useARIA.js';
import {
  transfer,
  useAttributes,
  via,
} from '@ydinjs/core/controllers/useAttributes.js';
import { useEvents } from '@ydinjs/core/controllers/useEvents.js';
import { useSlot } from '@ydinjs/core/controllers/useSlot.js';
import {
  ControlledElement,
  internals,
  use,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import {
  AnyElement,
  attributes,
  type Props,
} from '@ydinjs/core/traits/attribute-traits.js';
import {
  compose,
  trait,
  type Composed,
} from '@ydinjs/core/traits/composition.js';
import {
  type Disableable,
  useDisableable,
  type DisableableProps,
} from '@ydinjs/core/traits/disableable.js';
import { type Nameable, useNameable } from '@ydinjs/core/traits/nameable.js';
import {
  type Validatable,
  useValidatable,
  type ValidatableProps,
} from '@ydinjs/core/traits/validatable.js';
import type { Valuable, ValuableProps } from '@ydinjs/core/traits/valuable.js';
import { toggleState } from '@ydinjs/core/utils/DOM.js';
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

@trait
@attributes({
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  type: Str as ConverterOf<TextFieldType>,
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  inputmode: Str as ConverterOf<TextFieldInputMode>,
  outlined: Bool,
  readonly: Bool,
})
export class TextFieldLike extends AnyElement {
  accessor type!: TextFieldType | null;
  accessor inputmode!: TextFieldInputMode | null;
  accessor outlined!: boolean;
  accessor readonly!: boolean;
}

export type TextFieldLikeProps = Props<typeof TextFieldLike>;

export type TextFieldProperties = TextFieldLikeProps &
  DisableableProps &
  ValuableProps &
  ValidatableProps;
export type TextFieldEvents = Readonly<{
  change: Event;
  input: InputEvent;
  invalid: Event;
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

export type TextFieldCoreTraits = readonly [
  typeof TextFieldLike,
  typeof Disableable,
  typeof Valuable,
  typeof Nameable,
  typeof Validatable,
];

const TextFieldCoreConstructor: Composed<
  ControlledElementConstructor,
  TextFieldCoreTraits
> = compose(ControlledElement);

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
      ids.map((id) => ({
        id,
        slot: host.shadowRoot!.querySelector<HTMLSlotElement>(`#${id} slot`)!,
      })),
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
        if (host.getAttribute(attr) == null) {
          setAttribute(input, attr, getFallback(slots));
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
  /**
   * Set once the user edits the value or a script sets it. Until then, the
   * value follows the `value` attribute. Upgrade and a form reset clear it.
   */
  #isDirty = false;

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

    const field = this.shadowRoot!.querySelector<InputElement>('.input')!;
    const label = this.shadowRoot!.querySelector<HTMLLabelElement>('.label')!;

    const innards = internals(this);

    this.#input = field;
    this.#sync();

    useNameable(this, field);
    useDisableable(this, field);
    useValidatable(this, field);

    useAttributes(this, {
      inputmode: transfer(field, 'inputmode'),
      readonly: transfer(field, 'readonly'),
      value: (_, newValue) => {
        if (!this.#isDirty) {
          field.value = newValue ?? '';
          this.#sync();
        }
      },
      outlined: via(Bool, (_, newValue) => {
        toggleState(innards, 'outlined', newValue);
      }),
      error: via(Bool, (_, newValue) => {
        toggleState(innards, 'error', newValue);
      }),
    });

    use(this, {
      formReset: () => {
        field.value = this.getAttribute('value') ?? '';
        this.#isDirty = false;
        this.#sync();
      },
    });

    useTextFieldARIA(this, field);
    useNotchedOutline(this, label);

    useEvents(
      this,
      {
        input: () => {
          this.#isDirty = true;
          this.#sync();
        },
        change: () => {
          notify(this, 'change');
        },
      },
      field,
    );

    // TODO: Remove when :has-slotted and :host:has() are baseline.
    useHasSlottedPolyfill(this);
  }

  get isPopulated(): boolean {
    return internals(this).states.has('populated');
  }

  override get value(): string | null {
    return this.#input.value;
  }

  override set value(value: string | null) {
    this.#input.value = value ?? '';
    this.#isDirty = true;
    this.#sync();
  }

  /** Shows the internal field's value in the populated state and the form value. */
  #sync(): void {
    toggleState(internals(this), 'populated', !!this.#input.value);
    internals(this).setFormValue(this.#input.value);
  }
}
