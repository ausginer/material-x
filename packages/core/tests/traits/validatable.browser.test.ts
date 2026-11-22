import { afterEach, describe, expect, it } from 'vitest';
import { ControlledElement } from '../../src/element.ts';
import { compose, type Composed } from '../../src/traits/composition.ts';
import {
  useValidatable,
  type Validatable,
} from '../../src/traits/validatable.ts';
import { cleanupDOM, defineCE, nameCE } from '../browser.ts';

const ValidatableBase: Composed<
  typeof ControlledElement,
  [typeof Validatable]
> = compose(ControlledElement);

class Field extends ValidatableBase {
  static formAssociated = true;

  readonly control: HTMLInputElement;

  constructor() {
    super();
    this.control = document.createElement('input');
    this.attachShadow({ mode: 'open' }).append(this.control);
    useValidatable(this, this.control);
  }
}

const tag = nameCE();
defineCE(tag, Field);

function createField(): readonly [HTMLFormElement, Field] {
  const form = document.createElement('form');
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const field = document.createElement(tag) as Field;
  form.append(field);
  document.body.append(form);
  return [form, field];
}

afterEach(cleanupDOM);

describe('Validatable', () => {
  it('should be valid when fresh', () => {
    const [, field] = createField();

    expect(field.validity.valid).toBe(true);
    expect(field.validationMessage).toBe('');
    expect(field.willValidate).toBe(true);
    expect(field.matches(':valid')).toBe(true);
  });

  it('should make the element invalid with a non-empty custom message', () => {
    const [, field] = createField();

    field.setCustomValidity('m');

    expect(field.validity.customError).toBe(true);
    expect(field.validationMessage).toBe('m');
    expect(field.matches(':invalid')).toBe(true);
  });

  it('should make the element valid with an empty custom message', () => {
    const [, field] = createField();

    field.setCustomValidity('m');
    field.setCustomValidity('');

    expect(field.validity.valid).toBe(true);
    expect(field.validationMessage).toBe('');
  });

  it('should fire a non-bubbling cancelable invalid event from checkValidity', () => {
    const [form, field] = createField();
    const events: Event[] = [];
    field.addEventListener('invalid', (event) => {
      events.push(event);
    });
    form.addEventListener('invalid', (event) => {
      events.push(event);
    });

    field.setCustomValidity('m');

    expect(field.checkValidity()).toBe(false);
    expect(events).toHaveLength(1);
    expect(events[0]!.bubbles).toBe(false);
    expect(events[0]!.cancelable).toBe(true);
  });

  it('should return the validity from reportValidity', () => {
    const [, field] = createField();
    field.addEventListener('invalid', (event) => event.preventDefault());

    field.setCustomValidity('m');

    expect(field.reportValidity()).toBe(false);
  });

  it('should leave error unchanged when checking validity', () => {
    const [, field] = createField();
    field.addEventListener('invalid', (event) => event.preventDefault());

    field.setCustomValidity('m');
    field.checkValidity();
    field.reportValidity();

    expect(field.error).toBe(false);
    expect(field.control).not.toHaveAttribute('aria-invalid');
  });

  it('should read the form owner and the labels', () => {
    const [form, field] = createField();
    const label = document.createElement('label');
    field.id = 'field';
    label.htmlFor = 'field';
    form.append(label);

    expect(field.form).toBe(form);
    expect([...field.labels]).toEqual([label]);
  });
});

describe('useValidatable', () => {
  it('should give the target aria-invalid while error is set', () => {
    const [, field] = createField();

    field.error = true;

    expect(field.control).toHaveAttribute('aria-invalid', 'true');
    expect(field).not.toHaveAttribute('aria-invalid');
  });

  it('should remove aria-invalid from the target when error is cleared', () => {
    const [, field] = createField();

    field.error = true;
    field.error = false;

    expect(field.control).not.toHaveAttribute('aria-invalid');
  });

  it('should give the target aria-required while required is set', () => {
    const [, field] = createField();

    field.required = true;

    expect(field.control).toHaveAttribute('aria-required', 'true');
    expect(field).not.toHaveAttribute('aria-required');
  });

  it('should remove aria-required from the target when required is cleared', () => {
    const [, field] = createField();

    field.required = true;
    field.required = false;

    expect(field.control).not.toHaveAttribute('aria-required');
  });

  it('should leave validity unchanged when required is set', () => {
    const [, field] = createField();

    field.required = true;

    expect(field.validity.valid).toBe(true);
    expect(field.willValidate).toBe(true);
  });

  it('should leave validity unchanged when error is set', () => {
    const [, field] = createField();

    field.error = true;

    expect(field.validity.valid).toBe(true);
  });
});
