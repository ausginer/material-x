import { Bool, type ConverterOf } from '../attribute.ts';
import { setOwnARIA } from '../controllers/useARIA.ts';
import { useAttributes } from '../controllers/useAttributes.ts';
import { internals, type ControlledElement } from '../element.ts';
import { attributes, Controlled, type Props } from './attribute-traits.ts';
import { trait } from './composition.ts';

export const VALIDATABLE_ATTRS: Readonly<{
  error: ConverterOf<boolean>;
  required: ConverterOf<boolean>;
}> = {
  error: Bool,
  required: Bool,
};

const anchors = new WeakMap<HTMLElement, HTMLElement>();

/**
 * Element trait that gives a form-associated element the validation surface
 * of a native control, with validity and its display both set by the
 * consumer.
 *
 * - **Validity** is the element's custom validity, set by
 *   {@link Validatable.setCustomValidity}. The platform derives from it what
 *   it derives for a native control: submission blocking, the `invalid` event,
 *   `:invalid` and `:valid`, `validity` and `validationMessage`. The element
 *   has no native validators.
 * - **The error display** is the `error` attribute. Nothing else sets or
 *   clears it: no method, event, submission or form reset.
 *
 * A form reset leaves both as they are, so clear them in the form's `reset`
 * listener.
 *
 * @remarks Set `error` and `required` rather than `aria-invalid` and
 * `aria-required` on the host: the element's control carries those states.
 */
@trait
@attributes(VALIDATABLE_ATTRS)
export class Validatable extends Controlled {
  /**
   * Whether the element shows its error display. Its accessible control is
   * announced as invalid while it is set.
   */
  accessor error!: boolean;
  /**
   * Whether the element's accessible control is announced as required. It
   * doesn't change validity, doesn't block submission and doesn't make
   * `:required` match: select `[required]` in styles, and validate in the
   * consumer's code.
   */
  accessor required!: boolean;

  /** The element's validity state, as a native control's `validity`. */
  get validity(): ValidityState {
    return internals(this).validity;
  }

  /** The custom validity message, or `''` while the element is valid. */
  get validationMessage(): string {
    return internals(this).validationMessage;
  }

  /** Whether the element is a candidate for constraint validation. */
  get willValidate(): boolean {
    return internals(this).willValidate;
  }

  /** The element's form owner. */
  get form(): HTMLFormElement | null {
    return internals(this).form;
  }

  /** The labels associated with the element. */
  get labels(): NodeList {
    return internals(this).labels;
  }

  /**
   * Returns whether the element is valid, and fires `invalid` at it when it
   * isn't. Changes no attribute or state.
   */
  checkValidity(): boolean {
    return internals(this).checkValidity();
  }

  /**
   * Returns whether the element is valid. When it isn't, fires `invalid` at
   * it and, unless a listener cancels the event, reports the message to the
   * user. Changes no attribute or state.
   */
  reportValidity(): boolean {
    return internals(this).reportValidity();
  }

  /**
   * Sets the element's custom validity: a non-empty message makes it invalid
   * with that message, and `''` makes it valid.
   */
  setCustomValidity(message: string): void {
    internals(this).setValidity(
      { customError: message !== '' },
      message,
      anchors.get(this),
    );
  }
}

/**
 * Framework-facing props derived from {@link Validatable}.
 */
export type ValidatableProps = Props<typeof Validatable>;

function present(value: string | null): string | null {
  return value == null ? null : 'true';
}

/**
 * Registers `target`, the element's accessible control, as the anchor that
 * reported validation messages point at, and gives it `aria-invalid="true"`
 * while `error` is set and `aria-required="true"` while `required` is set.
 * Sets no custom state.
 */
export function useValidatable(
  host: Validatable & ControlledElement,
  target: HTMLElement,
): void {
  anchors.set(host, target);
  useAttributes(host, {
    error: (_, value) => setOwnARIA(target, 'aria-invalid', present(value)),
    required: (_, value) => setOwnARIA(target, 'aria-required', present(value)),
  });
}
