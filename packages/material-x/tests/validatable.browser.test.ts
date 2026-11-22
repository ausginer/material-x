import { describe, expect, it } from 'vitest';
import { commands, server } from 'vitest/browser';
import '../src/button/switch-button.ts';
import '../src/button/switch-icon-button.ts';
import '../src/checkbox/checkbox.ts';
import '../src/radio/radio.ts';
import '../src/text-field/multiline-text-field.ts';
import '../src/text-field/text-field.ts';
import { nextFrame } from './browser.ts';
import type { AccessibilityNode } from './support/accessibility-commands.node.ts';

/**
 * The validation contract that `Validatable` gives the six form controls:
 * validity follows `setCustomValidity` only, and the error display follows
 * `error` only.
 */
type ValidatableTag =
  | 'mx-text-field'
  | 'mx-multiline-text-field'
  | 'mx-checkbox'
  | 'mx-radio'
  | 'mx-switch-button'
  | 'mx-switch-icon-button';

type ValidatableCase<T extends ValidatableTag = ValidatableTag> = Readonly<{
  tag: T;
  /** The selector of the accessible control in the shadow tree. */
  control: string;
  /** The control's role in Chromium's accessibility tree. */
  role: string;
}>;

const TEXT_FIELD_CASES: ReadonlyArray<
  ValidatableCase<'mx-text-field' | 'mx-multiline-text-field'>
> = [
  { tag: 'mx-text-field', control: '.input', role: 'textbox' },
  { tag: 'mx-multiline-text-field', control: '.input', role: 'textbox' },
];

const CASES: readonly ValidatableCase[] = [
  ...TEXT_FIELD_CASES,
  { tag: 'mx-checkbox', control: '#input', role: 'checkbox' },
  { tag: 'mx-radio', control: '#input', role: 'radio' },
  { tag: 'mx-switch-button', control: '.host', role: 'switch' },
  { tag: 'mx-switch-icon-button', control: '.host', role: 'switch' },
];

type Fixture<T extends ValidatableTag = ValidatableTag> = Readonly<{
  form: HTMLFormElement;
  element: HTMLElementTagNameMap[T];
  control: HTMLElement;
  /** The number of `submit` events the form has fired. */
  submits: () => number;
}>;

function createFixture<T extends ValidatableTag>(
  { tag, control }: ValidatableCase<T>,
  container?: HTMLElement,
): Fixture<T> {
  const form = document.createElement('form');
  const element = document.createElement(tag);
  let submits = 0;

  element.setAttribute('name', 'field');
  element.setAttribute('value', 'value');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submits += 1;
  });
  (container ?? form).append(element);

  if (container) {
    form.append(container);
  }

  document.body.append(form);

  return {
    form,
    element,
    control: element.shadowRoot!.querySelector<HTMLElement>(control)!,
    submits: () => submits,
  };
}

function hasErrorState({ element }: Fixture): boolean {
  return element.matches(':state(error)');
}

function recordInvalid(target: EventTarget): Event[] {
  const events: Event[] = [];
  target.addEventListener('invalid', (event) => {
    event.preventDefault();
    events.push(event);
  });
  return events;
}

describe.each(CASES)('$tag validity', (testCase) => {
  it('should be valid when fresh', () => {
    const { element } = createFixture(testCase);

    expect({
      valid: element.validity.valid,
      message: element.validationMessage,
      willValidate: element.willValidate,
      matches: element.matches(':valid'),
    }).toEqual({ valid: true, message: '', willValidate: true, matches: true });
  });

  it('should become invalid with a custom message', () => {
    const { element } = createFixture(testCase);

    element.setCustomValidity('m');

    expect({
      customError: element.validity.customError,
      message: element.validationMessage,
      matches: element.matches(':invalid'),
    }).toEqual({ customError: true, message: 'm', matches: true });
  });

  it('should block form validation and submission while invalid', () => {
    const fixture = createFixture(testCase);

    fixture.element.setCustomValidity('m');
    recordInvalid(fixture.element);

    expect(fixture.form.checkValidity()).toBe(false);
    fixture.form.requestSubmit();
    expect(fixture.submits()).toBe(0);
  });

  it('should fire one non-bubbling cancelable invalid event at the host', () => {
    const fixture = createFixture(testCase);
    const atHost = recordInvalid(fixture.element);
    const atForm = recordInvalid(fixture.form);

    fixture.element.setCustomValidity('m');
    fixture.form.checkValidity();

    expect(
      atHost.map(({ bubbles, cancelable }) => ({ bubbles, cancelable })),
    ).toEqual([{ bubbles: false, cancelable: true }]);
    expect(atForm).toHaveLength(0);
  });

  it('should become valid and submit with an empty custom message', () => {
    const fixture = createFixture(testCase);

    fixture.element.setCustomValidity('m');
    fixture.element.setCustomValidity('');
    fixture.form.requestSubmit();

    expect(fixture.element.validity.valid).toBe(true);
    expect(fixture.submits()).toBe(1);
  });

  it('should keep custom validity and error across a form reset', () => {
    const { form, element } = createFixture(testCase);

    element.setCustomValidity('m');
    element.error = true;
    form.reset();

    expect({
      message: element.validationMessage,
      error: element.error,
    }).toEqual({ message: 'm', error: true });
  });

  it('should not validate a disabled host', () => {
    const { element } = createFixture(testCase);

    element.disabled = true;

    expect(element.willValidate).toBe(false);
  });

  it('should not validate a host in a disabled fieldset', () => {
    const fieldset = document.createElement('fieldset');
    fieldset.disabled = true;
    const { element } = createFixture(testCase, fieldset);

    expect(element.willValidate).toBe(false);
  });

  it('should read the form owner', () => {
    const { form, element } = createFixture(testCase);

    expect(element.form).toBe(form);
  });

  it('should read a label that points at the host', () => {
    const { form, element } = createFixture(testCase);
    const label = document.createElement('label');
    element.id = 'field';
    label.htmlFor = 'field';
    form.append(label);

    expect([...element.labels]).toEqual([label]);
  });
});

describe.each(CASES)('$tag error display', (testCase) => {
  it('should set the error state and aria-invalid while error is set', () => {
    const fixture = createFixture(testCase);

    fixture.element.error = true;

    expect({
      state: hasErrorState(fixture),
      ariaInvalid: fixture.control.getAttribute('aria-invalid'),
    }).toEqual({ state: true, ariaInvalid: 'true' });
  });

  it('should remove the error state and aria-invalid when error is cleared', () => {
    const fixture = createFixture(testCase);

    fixture.element.error = true;
    fixture.element.error = false;

    expect({
      state: hasErrorState(fixture),
      ariaInvalid: fixture.control.getAttribute('aria-invalid'),
    }).toEqual({ state: false, ariaInvalid: null });
  });

  it('should not show the error display when an invalid element is checked', () => {
    const fixture = createFixture(testCase);
    recordInvalid(fixture.element);

    fixture.element.setCustomValidity('m');
    fixture.element.checkValidity();
    fixture.element.reportValidity();

    expect({
      error: fixture.element.error,
      state: hasErrorState(fixture),
      ariaInvalid: fixture.control.getAttribute('aria-invalid'),
    }).toEqual({ error: false, state: false, ariaInvalid: null });
  });

  it('should keep the error display when a valid element is checked', () => {
    const fixture = createFixture(testCase);

    fixture.element.error = true;
    fixture.element.checkValidity();
    fixture.element.reportValidity();

    expect({
      error: fixture.element.error,
      state: hasErrorState(fixture),
      ariaInvalid: fixture.control.getAttribute('aria-invalid'),
    }).toEqual({ error: true, state: true, ariaInvalid: 'true' });
  });
});

describe.each(CASES)('$tag required', (testCase) => {
  it('should give the control aria-required while required is set', () => {
    const { element, control } = createFixture(testCase);

    element.required = true;

    expect(control).toHaveAttribute('aria-required', 'true');
  });

  it('should remove aria-required when required is cleared', () => {
    const { element, control } = createFixture(testCase);

    element.required = true;
    element.required = false;

    expect(control).not.toHaveAttribute('aria-required');
  });

  it('should leave validity and submission unchanged', () => {
    const fixture = createFixture(testCase);

    fixture.element.required = true;
    fixture.form.requestSubmit();

    expect({
      valid: fixture.element.validity.valid,
      willValidate: fixture.element.willValidate,
      submits: fixture.submits(),
    }).toEqual({ valid: true, willValidate: true, submits: 1 });
  });
});

describe.each(TEXT_FIELD_CASES)('$tag readonly', (testCase) => {
  it('should make the internal field read-only and the host not validate', () => {
    const { element, control } = createFixture(testCase);

    element.readonly = true;

    expect({
      readOnly: (control as HTMLInputElement).readOnly,
      willValidate: element.willValidate,
    }).toEqual({ readOnly: true, willValidate: false });
  });

  it('should restore both when readonly is removed', () => {
    const { element, control } = createFixture(testCase);

    element.readonly = true;
    element.readonly = false;

    expect({
      readOnly: (control as HTMLInputElement).readOnly,
      willValidate: element.willValidate,
    }).toEqual({ readOnly: false, willValidate: true });
  });
});

function findRole(
  node: AccessibilityNode,
  role: string,
): AccessibilityNode | undefined {
  if (node.role === role) {
    return node;
  }

  for (const child of node.children) {
    const found = findRole(child, role);

    if (found) {
      return found;
    }
  }

  return undefined;
}

// The tree is read through CDP, which Playwright opens only in Chromium.
// Firefox's and WebKit's trees are read by the record's probe.
describe.runIf(server.browser === 'chromium')(
  "Chromium's accessibility tree",
  () => {
    it.each(CASES)(
      'should report the $tag control as invalid',
      async (testCase) => {
        const container = document.createElement('div');
        container.id = 'fixture';
        container.role = 'group';
        container.ariaLabel = 'Fixture';
        const { element } = createFixture(testCase, container);
        element.error = true;
        element.required = true;
        await nextFrame();

        const control = findRole(
          await commands.readAccessibilityTree('#fixture'),
          testCase.role,
        );

        expect(control?.properties['invalid']).toBe('true');
      },
    );

    // Chromium's CDP reports `required` on no checkbox, radio or switch,
    // native ones included.
    it.each(TEXT_FIELD_CASES)(
      'should report the $tag control as required',
      async (testCase) => {
        const container = document.createElement('div');
        container.id = 'fixture';
        container.role = 'group';
        container.ariaLabel = 'Fixture';
        const { element } = createFixture(testCase, container);
        element.required = true;
        await nextFrame();

        const control = findRole(
          await commands.readAccessibilityTree('#fixture'),
          testCase.role,
        );

        expect(control?.properties['required']).toBe(true);
      },
    );
  },
);
