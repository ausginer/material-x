import { $ } from '@ydinjs/core/utils/DOM.js';
import { describe, expect, it } from 'vitest';
import type Checkbox from '../../src/checkbox/checkbox.ts';
import '../../src/checkbox/checkbox.ts';

/**
 * `mx-checkbox` deltas only. The checked/value/name/disabled sync, activation
 * sequence, focus delegation and form participation shared with `mx-radio` are
 * covered once in `test/core/elements/CheckableCore.browser.test.ts`.
 */
const CHECKED_ICON = 'check_small';
const INDETERMINATE_ICON = 'check_indeterminate_small';

function createCheckbox(): Checkbox {
  const element = document.createElement('mx-checkbox');
  document.body.append(element);
  return element;
}

function getControl(element: Checkbox): HTMLInputElement {
  const control = $<HTMLInputElement>(element, '#input');

  if (!control) {
    throw new Error('Missing internal control');
  }

  return control;
}

function getIcon(element: Checkbox): HTMLElement {
  const icon = $<HTMLElement>(element, '.icon');

  if (!icon) {
    throw new Error('Missing internal icon');
  }

  return icon;
}

describe('mx-checkbox control', () => {
  it('should use a native checkbox control', () => {
    expect(getControl(createCheckbox()).type).toBe('checkbox');
  });
});

describe('mx-checkbox icon', () => {
  it('should render the check icon when checked', () => {
    const element = createCheckbox();

    element.toggleAttribute('checked', true);

    expect(getIcon(element).textContent).toBe(CHECKED_ICON);
  });

  it('should clear the check icon when unchecked again', () => {
    const element = createCheckbox();
    element.toggleAttribute('checked', true);

    element.toggleAttribute('checked', false);

    expect(getIcon(element).textContent).toBe('');
  });
});

describe('mx-checkbox indeterminate', () => {
  it('should render the indeterminate icon when indeterminate', () => {
    const element = createCheckbox();

    element.indeterminate = true;

    expect(getIcon(element).textContent).toBe(INDETERMINATE_ICON);
  });

  it('should synchronize indeterminate to the native control', () => {
    const element = createCheckbox();

    element.indeterminate = true;

    expect(getControl(element).indeterminate).toBe(true);
  });

  it('should expose indeterminate as a host custom state', () => {
    const element = createCheckbox();

    element.indeterminate = true;

    expect(element.matches(':state(indeterminate)')).toBe(true);
  });

  it('should clear the indeterminate custom state when reset', () => {
    const element = createCheckbox();
    element.indeterminate = true;

    element.indeterminate = false;

    expect(element.matches(':state(indeterminate)')).toBe(false);
  });

  it('should take visual priority over checked', () => {
    const element = createCheckbox();
    element.toggleAttribute('checked', true);

    element.indeterminate = true;

    expect(getIcon(element).textContent).toBe(INDETERMINATE_ICON);
  });

  it('should keep the indeterminate icon when checked changes while indeterminate', () => {
    const element = createCheckbox();
    element.indeterminate = true;

    element.toggleAttribute('checked', true);

    expect(getIcon(element).textContent).toBe(INDETERMINATE_ICON);
  });

  it('should restore the check icon when indeterminate is cleared while checked', () => {
    const element = createCheckbox();
    element.toggleAttribute('checked', true);
    element.indeterminate = true;

    element.indeterminate = false;

    expect(getIcon(element).textContent).toBe(CHECKED_ICON);
  });

  it('should restore the empty icon when indeterminate is cleared while unchecked', () => {
    const element = createCheckbox();
    element.indeterminate = true;

    element.indeterminate = false;

    expect(getIcon(element).textContent).toBe('');
  });

  it('should still contribute its value to the form data when indeterminate and checked', () => {
    const form = document.createElement('form');
    const element = createCheckbox();
    element.setAttribute('name', 'choice');
    element.setAttribute('value', 'yes');
    element.toggleAttribute('checked', true);
    element.indeterminate = true;
    form.append(element);
    document.body.append(form);

    expect([...new FormData(form).entries()]).toContainEqual(['choice', 'yes']);
  });
});
