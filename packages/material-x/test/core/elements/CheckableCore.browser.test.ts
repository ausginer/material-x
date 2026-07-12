import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { $ } from 'ydin/utils/DOM.js';
import '../../../src/checkbox/checkbox.ts';
import '../../../src/radio/radio.ts';

/**
 * Shared behavior contract for `CheckableCore`-derived elements. `mx-checkbox`
 * and `mx-radio` both wire the same core (checked/value/name/disabled sync,
 * native activation sequence, custom state, form participation); their own
 * suites cover only their deltas.
 */
const CHECKABLE_TAGS = ['mx-checkbox', 'mx-radio'] as const;

type CheckableTag = (typeof CHECKABLE_TAGS)[number];

type CheckableHost = HTMLElement & {
  checked: boolean;
  disabled: boolean;
  value: string | null;
};

function createCheckable(tag: CheckableTag): CheckableHost {
  const element = document.createElement(tag) as CheckableHost;
  document.body.append(element);
  return element;
}

function getControl(element: HTMLElement): HTMLInputElement {
  const control = $<HTMLInputElement>(element, '#input');

  if (!control) {
    throw new Error('Missing internal control');
  }

  return control;
}

function recordEvents(target: HTMLElement): readonly Event[] {
  const events: Event[] = [];

  for (const type of ['click', 'input', 'change']) {
    target.addEventListener(type, (event) => {
      events.push(event);
    });
  }

  return events;
}

describe.each(CHECKABLE_TAGS)('%s state synchronization', (tag) => {
  it('should synchronize the checked property to the control', () => {
    const element = createCheckable(tag);

    element.checked = true;

    expect(getControl(element).checked).toBe(true);
  });

  it('should synchronize the checked attribute to the control', () => {
    const element = createCheckable(tag);

    element.toggleAttribute('checked', true);

    expect(getControl(element).checked).toBe(true);
  });

  it('should expose checked as a host custom state', () => {
    const element = createCheckable(tag);

    element.toggleAttribute('checked', true);

    expect(element.matches(':state(checked)')).toBe(true);
  });

  it('should clear the checked custom state when unchecked', () => {
    const element = createCheckable(tag);
    element.toggleAttribute('checked', true);

    element.toggleAttribute('checked', false);

    expect(element.matches(':state(checked)')).toBe(false);
  });

  it('should reflect the value attribute to the control', () => {
    const element = createCheckable(tag);

    element.setAttribute('value', 'accepted');

    expect(getControl(element).value).toBe('accepted');
  });

  it('should reflect the name attribute to the control', () => {
    const element = createCheckable(tag);

    element.setAttribute('name', 'agreement');

    expect(getControl(element).name).toBe('agreement');
  });

  it('should reflect the disabled property to the control', () => {
    const element = createCheckable(tag);

    element.disabled = true;

    expect(getControl(element).disabled).toBe(true);
  });

  it('should match the disabled pseudo-class when disabled', () => {
    const element = createCheckable(tag);

    element.toggleAttribute('disabled', true);

    expect(element.matches(':disabled')).toBe(true);
  });
});

describe.each(CHECKABLE_TAGS)('%s activation', (tag) => {
  it('should expose the native activation sequence on control click', () => {
    const element = createCheckable(tag);
    const events = recordEvents(element);

    getControl(element).click();

    expect(events.map(({ type }) => type)).toEqual([
      'click',
      'input',
      'change',
    ]);
  });

  it('should expose one activation sequence on host click', () => {
    const element = createCheckable(tag);
    const events = recordEvents(element);

    element.click();

    expect(events.map(({ type }) => type)).toEqual([
      'click',
      'input',
      'change',
    ]);
  });

  it('should reflect the checked control back on interaction', () => {
    const element = createCheckable(tag);

    element.click();

    expect(getControl(element).checked).toBe(true);
  });

  it('should activate with a real Space key press', async () => {
    const element = createCheckable(tag);
    const events = recordEvents(element);

    getControl(element).focus();
    await userEvent.keyboard(' ');

    expect(events.map(({ type }) => type)).toEqual([
      'click',
      'input',
      'change',
    ]);
  });

  it('should suppress activation when disabled', () => {
    const element = createCheckable(tag);
    element.disabled = true;
    const events = recordEvents(element);

    element.click();

    expect(getControl(element).checked).toBe(false);
    expect(events).toHaveLength(0);
  });

  it('should delegate focus to the native control', () => {
    const element = createCheckable(tag);

    element.focus();

    expect(element.shadowRoot?.activeElement).toBe(getControl(element));
  });
});

describe.each(CHECKABLE_TAGS)('%s form participation', (tag) => {
  it('should contribute its value to the form data when checked', () => {
    const form = document.createElement('form');
    const element = createCheckable(tag);
    element.setAttribute('name', 'choice');
    element.setAttribute('value', 'yes');
    element.toggleAttribute('checked', true);
    form.append(element);
    document.body.append(form);

    expect([...new FormData(form).entries()]).toContainEqual(['choice', 'yes']);
  });

  it('should contribute the default "on" value when checked without a value', () => {
    const form = document.createElement('form');
    const element = createCheckable(tag);
    element.setAttribute('name', 'choice');
    element.toggleAttribute('checked', true);
    form.append(element);
    document.body.append(form);

    expect([...new FormData(form).entries()]).toContainEqual(['choice', 'on']);
  });

  it('should omit its value from the form data when unchecked', () => {
    const form = document.createElement('form');
    const element = createCheckable(tag);
    element.setAttribute('name', 'choice');
    element.setAttribute('value', 'yes');
    form.append(element);
    document.body.append(form);

    expect([...new FormData(form).keys()]).not.toContain('choice');
  });
});
