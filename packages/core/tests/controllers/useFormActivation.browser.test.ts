import { describe, expect, it } from 'vitest';
import { useFormActivation } from '../../src/controllers/useFormActivation.ts';
import { ControlledElement } from '../../src/element.ts';
import { host } from '../browser.ts';

/** A plain form-associated host with the `type` field that `Typeable` adds. */
class FormButton extends ControlledElement {
  static readonly formAssociated = true;
  type: string | null = null;
}

type Fixture = Readonly<{
  element: FormButton;
  input: HTMLInputElement;
  /** The submitter of each `submit` event that the form receives. */
  submitters: Array<HTMLElement | null>;
}>;

function setup(type: string | null): Fixture {
  const element = host<FormButton>(useFormActivation, FormButton);
  const form = document.createElement('form');
  const input = document.createElement('input');
  const submitters: Array<HTMLElement | null> = [];

  element.type = type;
  input.defaultValue = 'initial';
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitters.push(event.submitter);
  });
  form.append(input, element);
  document.body.append(form);
  input.value = 'changed';

  return { element, input, submitters };
}

describe('useFormActivation', () => {
  it('should submit the form with the host as the submitter by default', () => {
    const { element, submitters } = setup(null);

    element.click();

    expect(submitters).toStrictEqual([element]);
  });

  it('should reset the form when the type is reset', () => {
    const { element, input, submitters } = setup('reset');

    element.click();

    expect({ value: input.value, submits: submitters.length }).toStrictEqual({
      value: 'initial',
      submits: 0,
    });
  });

  it('should neither submit nor reset the form when the type is button', () => {
    const { element, input, submitters } = setup('button');

    element.click();

    expect({ value: input.value, submits: submitters.length }).toStrictEqual({
      value: 'changed',
      submits: 0,
    });
  });
});
