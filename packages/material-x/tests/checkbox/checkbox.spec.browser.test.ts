import { describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import '../../src/checkbox/checkbox.ts';
import { pixels, resolveComputed } from '../browser.ts';

const CONTRACT = 'checkbox.default';

/**
 * `mx-checkbox` visual-contract deltas. The state-layer box, full radius and
 * icon size shared with `mx-radio` are covered in
 * `tests/core/elements/CheckableCore.spec.browser.test.ts`.
 *
 * The visible box is the `:host::after` pseudo-element, so its geometry is read
 * through `getComputedStyle(host, '::after')` rather than a `DOMRect`.
 */
function createCheckbox(): HTMLElement {
  const element = document.createElement('mx-checkbox');
  document.body.append(element);
  return element;
}

function getBox(element: HTMLElement): CSSStyleDeclaration {
  return getComputedStyle(element, '::after');
}

async function checkboxTokens(tokens: readonly string[]) {
  return await commands.resolveTokenContract({
    contract: CONTRACT,
    state: 'default',
    tokens,
  });
}

describe('mx-checkbox container visual contract', () => {
  /*
   * A pseudo-element has no DOMRect, and Chromium reports its computed
   * `inline-size` rather than a layout-resolved content width, so geometry —
   * this layer's preferred oracle — is unavailable. Computed style is the
   * next-best oracle, but `inline-size` alone does not say what is painted:
   * that depends on `box-sizing`. The two are therefore asserted together, so
   * the pair means "the painted box, outline included, is container.size".
   * Sizing the box as content-box (the previous defect: 18px token painted as
   * 20px) fails the first assertion.
   */
  it('should size the visible box as a border box', () => {
    expect(getBox(createCheckbox()).boxSizing).toBe('border-box');
  });

  it('should render the tokenized container size as the visible box', async () => {
    const expected = await checkboxTokens(['container.size']);
    const box = getBox(createCheckbox());

    expect(pixels(box.inlineSize)).toBe(
      pixels(expected.values['container.size']!),
    );
  });

  it('should render the tokenized container shape', async () => {
    const expected = await checkboxTokens(['container.shape']);
    const box = getBox(createCheckbox());

    expect(pixels(box.borderRadius)).toBe(
      pixels(expected.values['container.shape']!),
    );
  });

  it('should render the tokenized outline width', async () => {
    const expected = await checkboxTokens(['outline.width']);
    const box = getBox(createCheckbox());

    expect(box.borderTopWidth).toBe(expected.values['outline.width']);
  });

  it('should render the tokenized outline color when unselected', async () => {
    const expected = await checkboxTokens(['outline.color']);
    const box = getBox(createCheckbox());

    expect(box.borderTopColor).toBe(
      resolveComputed('color', String(expected.values['outline.color'])),
    );
  });
});

describe('mx-checkbox icon visual contract', () => {
  it('should render the tokenized icon color', async () => {
    const expected = await checkboxTokens(['icon.color']);
    const element = createCheckbox();
    const icon = element.shadowRoot?.querySelector('.icon');

    if (!icon) {
      throw new Error('Missing internal icon');
    }

    expect(getComputedStyle(icon).color).toBe(
      resolveComputed('color', String(expected.values['icon.color'])),
    );
  });
});
