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

/** The glyph's clip-path once fully revealed, as the browser serializes it. */
const REVEALED_CLIP_PATH = 'inset(0px 0% 0px 0px)';

/**
 * The glyph's resting clip-path with the reveal animation suppressed.
 *
 * The check and indeterminate glyphs are revealed by a keyframe animation, so
 * the selected state must declare its own revealed appearance rather than lean
 * on `forwards` to hold the final frame — otherwise a checked box paints empty
 * anywhere the animation does not run (`prefers-reduced-motion`, print). This
 * cancels the animations to observe the state the CSS describes on its own.
 */
function revealedClipPathWithoutAnimation(element: Checkbox): string {
  for (const animation of element.shadowRoot?.getAnimations() ?? []) {
    animation.cancel();
  }

  return getComputedStyle(getIcon(element)).clipPath;
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

  it('should reveal the check glyph without relying on the animation', () => {
    const element = createCheckbox();
    element.toggleAttribute('checked', true);

    expect(revealedClipPathWithoutAnimation(element)).toBe(REVEALED_CLIP_PATH);
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

  it('should reveal the indeterminate glyph without relying on the animation', () => {
    const element = createCheckbox();
    element.indeterminate = true;

    expect(revealedClipPathWithoutAnimation(element)).toBe(REVEALED_CLIP_PATH);
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
