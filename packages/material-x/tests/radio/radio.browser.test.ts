import { $ } from '@ydinjs/core/utils/DOM.js';
import { describe, expect, it } from 'vitest';
import type Radio from '../../src/radio/radio.ts';
import '../../src/radio/radio.ts';

/**
 * `mx-radio` deltas only. The checked/value/name/disabled sync, activation
 * sequence, focus delegation and form participation shared with `mx-checkbox`
 * are covered once in `tests/core/elements/CheckableCore.browser.test.ts`.
 */
function createRadio(name?: string): Radio {
  const element = document.createElement('mx-radio');

  if (name !== undefined) {
    element.setAttribute('name', name);
  }

  document.body.append(element);
  return element;
}

function getControl(element: Radio): HTMLInputElement {
  const control = $<HTMLInputElement>(element, '#input');

  if (!control) {
    throw new Error('Missing internal control');
  }

  return control;
}

describe('mx-radio control', () => {
  it('should use a native radio control', () => {
    expect(getControl(createRadio()).type).toBe('radio');
  });
});

describe('mx-radio grouping', () => {
  /**
   * `mx-radio` is a controlled component: single-selection is the host
   * application's job. Native radio grouping cannot apply here because each
   * control lives in its own shadow root, so two same-named radios staying
   * checked together is the documented contract, not a defect. See
   * `src/radio/spec-consistency.md`.
   */
  it('should not deselect a same-named sibling when another is checked', () => {
    const first = createRadio('choice');
    const second = createRadio('choice');
    first.toggleAttribute('checked', true);

    second.toggleAttribute('checked', true);

    expect(first.checked).toBe(true);
    expect(second.checked).toBe(true);
  });

  it('should not deselect a same-named sibling on user activation', () => {
    const first = createRadio('choice');
    const second = createRadio('choice');
    first.toggleAttribute('checked', true);

    second.click();

    expect(getControl(first).checked).toBe(true);
  });

  it('should submit every checked same-named radio in the form data', () => {
    const form = document.createElement('form');
    const first = createRadio('choice');
    const second = createRadio('choice');
    first.setAttribute('value', 'a');
    second.setAttribute('value', 'b');
    first.toggleAttribute('checked', true);
    second.toggleAttribute('checked', true);
    form.append(first, second);
    document.body.append(form);

    expect([...new FormData(form).getAll('choice')]).toEqual(['a', 'b']);
  });
});
