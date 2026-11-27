import { afterEach, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import '../../src/checkbox/checkbox.ts';
import { nextFrame, pixels, resolveComputed } from '../browser.ts';

const CONTRACT = 'checkbox.default';

const ERROR_CONTRACT = 'checkbox.error';

/** The selections, as the attributes that set them. */
const SELECTIONS = [
  ['unselected', []],
  ['checked', ['checked']],
  ['indeterminate', ['indeterminate']],
] as const;

const SELECTED = SELECTIONS.slice(1);

/**
 * `mx-checkbox` visual-contract deltas. The state-layer box, full radius and
 * icon size shared with `mx-radio` are covered in
 * `tests/core/elements/CheckableCore.spec.browser.test.ts`.
 *
 * The visible box is the `:host::after` pseudo-element, so its geometry is read
 * through `getComputedStyle(host, '::after')` rather than a `DOMRect`.
 */
function createCheckbox(...attributes: readonly string[]): HTMLElement {
  const element = document.createElement('mx-checkbox');
  for (const name of attributes) {
    element.toggleAttribute(name, true);
  }
  document.body.append(element);
  return element;
}

function iconOf(element: HTMLElement): HTMLElement {
  return element.shadowRoot!.querySelector<HTMLElement>('.icon')!;
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

/** A color token of a state of the error contract, as the engine computes it. */
async function errorColor(state: string, token: string): Promise<string> {
  const { values } = await commands.resolveTokenContract({
    contract: ERROR_CONTRACT,
    state,
    tokens: [token],
  });

  return resolveComputed('color', String(values[token]!));
}

/**
 * Runs `observe` with on-error set to a color of its own. The fixture theme's
 * on-error and on-primary are both white, so an icon row can't tell them apart
 * without it.
 */
async function withDistinctOnError<T>(
  observe: () => T | Promise<T>,
): Promise<T> {
  const root = document.documentElement;
  root.style.setProperty('--md-sys-color-on-error', 'rgb(1, 2, 3)');

  try {
    return await observe();
  } finally {
    root.style.removeProperty('--md-sys-color-on-error');
  }
}

/** What a checkbox draws: its box's colors, the host's opacity and the icon's color. */
function drawn(element: HTMLElement): Readonly<Record<string, string>> {
  const box = getBox(element);

  return {
    container: box.backgroundColor,
    outline: box.borderTopColor,
    opacity: getComputedStyle(element).opacity,
    icon: getComputedStyle(iconOf(element)).color,
  };
}

afterEach(async () => {
  // A row that fails mid-press leaves the button down.
  await commands.pointerRelease().catch(() => {});
});

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

describe('mx-checkbox error visual contract', () => {
  it('should render the error outline color when unselected', async () => {
    const box = getBox(createCheckbox('error'));

    expect(box.borderTopColor).toBe(
      await errorColor('error.unselected.default', 'outline.color'),
    );
  });

  it.each(SELECTED)(
    'should render the error container color when %s',
    async (_, attributes) => {
      const box = getBox(createCheckbox('error', ...attributes));

      expect(box.backgroundColor).toBe(
        await errorColor('error.selected.default', 'container.color'),
      );
    },
  );

  // The expected value resolves on-error under the same distinct color.
  it.each(SELECTED)(
    'should render the error icon color when %s',
    async (_, attributes) => {
      await withDistinctOnError(async () => {
        const icon = iconOf(createCheckbox('error', ...attributes));

        expect(getComputedStyle(icon).color).toBe(
          await errorColor('error.selected.default', 'icon.color'),
        );
      });
    },
  );

  it.each(SELECTIONS)(
    'should color the press ripple with the pressed error state layer when %s',
    async (_, attributes) => {
      const element = createCheckbox('error', ...attributes);
      await nextFrame();
      const { left, top, width, height } = element.getBoundingClientRect();
      await commands.pointerPress(left + width / 2, top + height / 2);
      const ripple = getComputedStyle(
        element.shadowRoot!.querySelector('.ripple')!,
        '::after',
      );

      expect(ripple.backgroundColor).toBe(
        await errorColor('error.pressed', 'state-layer.color'),
      );
    },
  );
});

describe('mx-checkbox disabled with error', () => {
  /*
   * No token combines error with disabled. A disabled control takes no
   * correction, so it draws its disabled appearance, and `error` keeps only
   * its state and announcement. On-error has a color of its own, so the error
   * icon color differs from the disabled one.
   */
  it.each(SELECTIONS)(
    'should draw what a disabled %s checkbox draws without error',
    async (_, attributes) => {
      await withDistinctOnError(() => {
        const disabled = createCheckbox('disabled', ...attributes);
        const error = createCheckbox('disabled', 'error', ...attributes);

        expect(drawn(error)).toStrictEqual(drawn(disabled));
      });
    },
  );
});
