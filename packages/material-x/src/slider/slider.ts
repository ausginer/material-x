import {
  Bool,
  Num,
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
import { useConnected } from '@ydinjs/core/controllers/useConnected.js';
import { useEvents } from '@ydinjs/core/controllers/useEvents.js';
import { useMutationObserver } from '@ydinjs/core/controllers/useMutationObserver.js';
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
import type {
  Disableable,
  DisableableProps,
} from '@ydinjs/core/traits/disableable.js';
import type { Nameable, NameableProps } from '@ydinjs/core/traits/nameable.js';
import {
  type Validatable,
  useValidatable,
  type ValidatableProps,
} from '@ydinjs/core/traits/validatable.js';
import { switchState, toggleState } from '@ydinjs/core/utils/DOM.js';
import { useCore } from '../core/utils/useCore.ts';
import sliderTemplate from './slider.tpl.html' with { type: 'html' };
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };
import sizeStyles from './styles/size/main.css.ts' with { type: 'css' };

export type SliderSize = 'small' | 'medium' | 'large' | 'xlarge';

@trait
@attributes({
  value: Num,
  min: Num,
  max: Num,
  step: Num,
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  size: Str as ConverterOf<SliderSize>,
  indicator: Bool,
  valuetext: Str,
})
export class SliderLike extends AnyElement {
  accessor value!: number | null;
  accessor min!: number | null;
  accessor max!: number | null;
  accessor step!: number | null;
  accessor size!: SliderSize | null;
  accessor indicator!: boolean;
  accessor valuetext!: string | null;
}

export type SliderLikeProps = Props<typeof SliderLike>;

export type SliderProperties = SliderLikeProps &
  DisableableProps &
  NameableProps &
  ValidatableProps;
export type SliderEvents = Readonly<{
  change: Event;
  input: Event;
  invalid: Event;
}>;
export type SliderCSSProperties = Readonly<{
  '--md-slider-active-track-color'?: string;
  '--md-slider-inactive-track-color'?: string;
  '--md-slider-handle-color'?: string;
  '--md-slider-stop-indicator-color'?: string;
}>;

const SliderConstructor: Composed<
  ControlledElementConstructor,
  [typeof SliderLike, typeof Disableable, typeof Nameable, typeof Validatable]
> = compose(ControlledElement);

/**
 * The host's `aria-*` that the control doesn't take as they are: the native
 * range reports its own value and bounds, and ids don't resolve in the shadow
 * tree, so {@link useSliderReferences} passes the referenced elements.
 */
const UNMIRRORED_ARIA: readonly string[] = [
  'aria-valuenow',
  'aria-valuemin',
  'aria-valuemax',
  'aria-labelledby',
  'aria-describedby',
];

/**
 * Names and describes `input` by elements. The name's sources, in order, are
 * the host's `aria-labelledby`, the label slot, the host's `aria-label`, which
 * `useARIA` mirrors, and the `<label>`s of the host.
 *
 * @remarks Call after `useARIA`, which removes the attributes that hold the
 * references.
 */
function useSliderReferences(
  host: ControlledElement,
  input: HTMLInputElement,
): void {
  const label = host.shadowRoot!.querySelector<HTMLElement>('.label')!;
  const slot = label.querySelector('slot')!;
  const innards = internals(host);

  const resolve = () => {
    let labelledBy: readonly Element[] | null = host.ariaLabelledByElements;

    if (!labelledBy?.length) {
      if (slot.assignedElements().length > 0) {
        labelledBy = [label];
      } else if (host.hasAttribute('aria-label')) {
        labelledBy = null;
      } else {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        labelledBy = [...innards.labels] as HTMLLabelElement[];
      }
    }

    // Null removes the attribute, and an empty list would leave it empty.
    input.ariaLabelledByElements = labelledBy?.length ? labelledBy : null;

    const describedBy = host.ariaDescribedByElements;
    input.ariaDescribedByElements = describedBy?.length ? describedBy : null;
  };

  useConnected(host, resolve);
  useMutationObserver(host, resolve, {
    attributeFilter: ['aria-label', 'aria-labelledby', 'aria-describedby'],
  });
  useSlot(host, slot, resolve);
  useEvents(host, { focus: resolve }, input);
}

/**
 * @tag mx-slider
 *
 * @summary Sliders let users select a value from a range.
 *
 * @description
 * **The value is the user's.** The handle follows the pointer and the keyboard
 * by itself, and `value` reads the current number. Set `value` at any time,
 * also in an `input` handler during a drag. `value`, `min`, `max` and `step`
 * give the same result in any order. If an `input` handler rewrites the value,
 * take the final value from `input`: WebKit then fires no `change`.
 *
 * **Name.** Put the name in the `label` slot, or use a `<label>`, a host
 * `aria-labelledby` or a host `aria-label`. If several are present, the order
 * is `aria-labelledby`, the slot, `aria-label`, `<label>`. A `<label>` or a
 * referenced element that appears after the slider is read when the slider
 * takes focus. A host `aria-label` also names the host's own accessible node,
 * so prefer the slot or a `<label>`, and don't use `aria-label` with either.
 *
 * **Validation.** The element has no native validators. `setCustomValidity()`
 * sets its validity and the `error` attribute sets its error display. Set
 * `error` rather than `aria-invalid` on the host. A slider always has a value,
 * so `required` has no meaning for it.
 *
 * @attr {number} value - Initial value. The slider follows it until the user
 *   moves the handle or a script sets the `value` property, and takes it again
 *   on a form reset. Setting the property doesn't change the attribute.
 *   Defaults to the midpoint of `min` and `max`.
 * @attr {number} min - Lower bound. Defaults to 0.
 * @attr {number} max - Upper bound. Defaults to 100.
 * @attr {number} step - Distance between two values. Defaults to 1.
 * @attr {"small"|"medium"|"large"|"xlarge"} size - Track and handle size. Omit
 *   for the extra small default.
 * @attr {boolean} indicator - Shows the value above the handle while the
 *   handle is held or has keyboard focus.
 * @attr {string} valuetext - The value in words, such as a number with a unit.
 *   The value indicator and assistive technology show it instead of the
 *   number. A host `aria-valuetext` replaces it for assistive technology only.
 * @attr {boolean} disabled - Disables interaction and form participation.
 * @attr {string} name - Name submitted with form data.
 * @attr {boolean} error - Shows the error display: `:state(error)`, and the
 *   control announced as invalid. It draws no error appearance.
 *   Set by the consumer only.
 * @attr {boolean} required - Has no meaning for a slider, as on a native range.
 *
 * @slot label - Label content.
 *
 * @csspart impl - Internal native range input. It is transparent.
 *
 * @cssprop --md-slider-active-track-color - Overrides the active track's
 *   color.
 * @cssprop --md-slider-inactive-track-color - Overrides the inactive track's
 *   color.
 * @cssprop --md-slider-handle-color - Overrides the handle's color.
 * @cssprop --md-slider-stop-indicator-color - Overrides the stop indicator's
 *   color.
 *
 * @event input - Fired when the user changes the value, at each move. Also
 *   fired when a press that becomes a scroll restores the value.
 * @event change - Fired when the user commits the value.
 * @event invalid - Fired at the host when a validity check finds it invalid.
 *   It doesn't bubble and is cancelable.
 */
export default class Slider extends SliderConstructor {
  static override formAssociated = true;

  readonly #input: HTMLInputElement;
  readonly #track: HTMLElement;
  readonly #handle: HTMLElement;
  /**
   * The number that the user or a script asked for last, `null` for the
   * midpoint, and `undefined` while the value follows the `value` attribute.
   * The input holds it clamped and rounded, so a later bound or step needs
   * the number itself.
   */
  #requested: number | null | undefined;

  constructor() {
    super();

    useCore(
      this,
      [sliderTemplate],
      { role: 'none' },
      [defaultStyles, sizeStyles],
      { delegatesFocus: true },
    );

    const root = this.shadowRoot!;
    const input = root.querySelector<HTMLInputElement>('.input')!;
    const innards = internals(this);

    this.#input = input;
    this.#track = root.querySelector<HTMLElement>('.track')!;
    this.#handle = root.querySelector<HTMLElement>('.handle')!;
    this.#write();

    useValidatable(this, input);

    const write = () => this.#write();

    useAttributes(this, {
      min: transfer(input, 'min'),
      max: transfer(input, 'max'),
      // Not `any`, which the native range accepts.
      step: transfer(input, 'step', (value) => Num.to(Num.from(value))),
    });
    useAttributes(this, {
      value: write,
      min: write,
      max: write,
      step: write,
      size: (oldValue, newValue) => switchState(innards, oldValue, newValue),
      indicator: via(Bool, (_, value) => {
        toggleState(innards, 'indicator', value);
        this.#writeIndicator();
      }),
      valuetext: (_, value) => {
        if (!this.hasAttribute('aria-valuetext')) {
          setAttribute(input, 'aria-valuetext', value);
        }

        this.#writeIndicator();
      },
      error: via(Bool, (_, value) => {
        toggleState(innards, 'error', value);
      }),
    });

    use(this, {
      // The callback is also the `disabled` attribute's.
      formDisabled: () => {
        input.disabled = this.matches(':disabled');
      },
      formReset: () => {
        this.#requested = undefined;
        this.#write();
      },
    });

    useARIA(this, input, (name, value) => {
      if (UNMIRRORED_ARIA.includes(name)) {
        return null;
      }

      return name === 'aria-valuetext' ? (value ?? this.valuetext) : value;
    });
    useSliderReferences(this, input);

    let pressedValue = '';

    useEvents(
      this,
      {
        input: () => {
          this.#requested = input.valueAsNumber;
          this.#sync();
        },
        change: () => {
          this.dispatchEvent(new Event('change', { bubbles: true }));
        },
        pointerdown: () => {
          pressedValue = input.value;
        },
        // The browser took the press for a scroll.
        pointercancel: () => {
          if (input.value !== pressedValue) {
            input.value = pressedValue;
            input.dispatchEvent(
              new Event('input', { bubbles: true, composed: true }),
            );
          }
        },
      },
      input,
    );
  }

  override get value(): number {
    return this.#input.valueAsNumber;
  }

  override set value(value: number | null) {
    this.#requested = value;
    this.#write();
  }

  /**
   * Writes the requested number to the input, which clamps and rounds it. An
   * empty string gives the input's own default, the midpoint.
   */
  #write(): void {
    const requested =
      this.#requested === undefined
        ? Num.from(this.getAttribute('value'))
        : this.#requested;

    this.#input.value = requested == null ? '' : String(requested);
    this.#sync();
  }

  /** Shows the input's value in the drawing and in the form value. */
  #sync(): void {
    const { value } = this.#input;
    const min = this.min ?? 0;
    // Equal bounds divide zero by zero.
    const fraction = (Number(value) - min) / ((this.max ?? 100) - min) || 0;

    this.#track.style.setProperty('--_fraction', String(fraction));
    internals(this).setFormValue(value);
    this.#writeIndicator();
  }

  #writeIndicator(): void {
    if (this.indicator) {
      this.#handle.dataset['value'] = this.valuetext ?? this.#input.value;
    }
  }
}

customElements.define('mx-slider', Slider);

declare global {
  interface HTMLElementTagNameMap {
    'mx-slider': Slider;
  }
}
