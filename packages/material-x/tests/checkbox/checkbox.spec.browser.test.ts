import { afterEach, describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import '../../src/checkbox/checkbox.ts';
import {
  nextFrame,
  pixels,
  resolveComputed,
  settleAnimations,
} from '../browser.ts';

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

/** A color token of a state of a contract, as the engine computes it. */
async function contractColor(
  contract: string,
  state: string,
  token: string,
): Promise<string> {
  const { values } = await commands.resolveTokenContract({
    contract,
    state,
    tokens: [token],
  });

  return resolveComputed('color', String(values[token]!));
}

/** An opacity token of a state of the default contract, as a number. */
async function opacity(state: string, token: string): Promise<number> {
  const { values } = await commands.resolveTokenContract({
    contract: CONTRACT,
    state,
    tokens: [token],
  });

  return Number(values[token]!);
}

/** A color token of a state of the default contract, as the engine computes it. */
async function color(state: string, token: string): Promise<string> {
  return await contractColor(CONTRACT, state, token);
}

/** A color token of a state of the error contract, as the engine computes it. */
async function errorColor(state: string, token: string): Promise<string> {
  return await contractColor(ERROR_CONTRACT, state, token);
}

/**
 * Runs `observe` with on-error set to a color of its own. The fixture theme's
 * on-error and on-primary are both white, so an icon row can't tell them apart
 * without it.
 */
async function withDistinctOnError<T>(
  observe: () => T | Promise<T>,
): Promise<T> {
  return await withColor('--md-sys-color-on-error', 'rgb(1, 2, 3)', observe);
}

/** Runs `observe` with the system color `name` set to `value` on the root. */
async function withColor<T>(
  name: string,
  value: string,
  observe: () => T | Promise<T>,
): Promise<T> {
  const root = document.documentElement;
  root.style.setProperty(name, value);

  try {
    return await observe();
  } finally {
    root.style.removeProperty(name);
  }
}

function rippleOf(
  element: HTMLElement,
  pseudo: '::before' | '::after',
): CSSStyleDeclaration {
  return getComputedStyle(
    element.shadowRoot!.querySelector('.ripple')!,
    pseudo,
  );
}

/** Holds the primary button down at the host's center. */
async function press(element: HTMLElement): Promise<void> {
  await nextFrame();
  const { left, top, width, height } = element.getBoundingClientRect();
  await commands.pointerPress(left + width / 2, top + height / 2);
}

/**
 * Activates a focused checkbox with Space, which runs the press wave from the
 * keyboard's click. The host doesn't match `:active` for it in any engine, and
 * the wave is read before its fade starts.
 */
async function activateByKeyboard(element: HTMLElement): Promise<void> {
  await nextFrame();
  element.focus();
  await nextFrame();
  await userEvent.keyboard('{Space}');
}

/**
 * Finishes the box's color transitions. The box is the host's `::after`, so its
 * transitions are the host's, which the shadow root doesn't report. Reading
 * the style first starts a transition that the interaction caused.
 */
async function settleBox(element: HTMLElement): Promise<void> {
  getBox(element).getPropertyValue('border-top-color');

  await Promise.all(
    element.getAnimations({ subtree: true }).map(async (animation) => {
      animation.finish();
      await animation.finished;
    }),
  );
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

describe('mx-checkbox state layer visual contract', () => {
  /*
   * The hover layer is the ripple's `::before` and the press wave its
   * `::after`. The unselected hovered and focused states' `on-surface` also
   * applies to a selected host and to a pressed one, and each state read here
   * has `primary` in Material's tokens.
   */
  it.each(SELECTED)(
    'should draw the selected hovered state layer color when %s',
    async (_, attributes) => {
      const element = createCheckbox(...attributes);
      await userEvent.hover(element);
      await nextFrame();
      await settleAnimations(element);

      expect(rippleOf(element, '::before').backgroundColor).toBe(
        await color('selected.hover', 'state-layer.color'),
      );
    },
  );

  it('should color the press ripple with the unselected pressed state layer', async () => {
    const element = createCheckbox();
    await press(element);

    expect(rippleOf(element, '::after').backgroundColor).toBe(
      await color('unselected.pressed', 'state-layer.color'),
    );
  });
});

describe('mx-checkbox press wave visual contract', () => {
  /*
   * The press wave is the ripple's `::after`. It draws the pressed state layer
   * of the host's selection for every activation: a pointer press, which also
   * hovers the host, and a keyboard one, which neither hovers it nor makes it
   * `:active`.
   */
  const PRESSED_STATES = [
    ['unselected', [], 'unselected.pressed'],
    ['checked', ['checked'], 'selected.pressed'],
    ['indeterminate', ['indeterminate'], 'selected.pressed'],
  ] as const;

  it.each(PRESSED_STATES)(
    'should draw the keyboard press wave as the pressed state layer when %s',
    async (_, attributes, state) => {
      const element = createCheckbox(...attributes);
      await activateByKeyboard(element);
      const wave = rippleOf(element, '::after');

      expect({
        color: wave.backgroundColor,
        opacity: Number(wave.opacity),
      }).toStrictEqual({
        color: await color(state, 'state-layer.color'),
        opacity: await opacity(state, 'state-layer.opacity'),
      });
    },
  );

  it.each(PRESSED_STATES.slice(0, 2))(
    'should draw the pointer press wave at the pressed state layer opacity when %s',
    async (_, attributes, state) => {
      const element = createCheckbox(...attributes);
      await press(element);

      expect(Number(rippleOf(element, '::after').opacity)).toBe(
        await opacity(state, 'state-layer.opacity'),
      );
    },
  );
});

describe('mx-checkbox unselected outline visual contract', () => {
  /*
   * A selected checkbox's outline is its container's color, so only the
   * unselected states draw an outline color of their own.
   */
  const INTERACTIONS = [
    [
      'hovered',
      'unselected.hover',
      async (element: HTMLElement) => {
        await userEvent.hover(element);
      },
    ],
    [
      'focused',
      'unselected.focus',
      async (element: HTMLElement) => {
        await nextFrame();
        element.focus();
      },
    ],
    ['pressed', 'unselected.pressed', press],
  ] as const;

  it.each(INTERACTIONS)(
    'should draw the unselected outline color when %s',
    async (_, state, interact) => {
      const element = createCheckbox();
      await interact(element);
      await settleBox(element);

      expect(getBox(element).borderTopColor).toBe(
        await color(state, 'outline.color'),
      );
    },
  );
});

describe('mx-checkbox disabled visual contract', () => {
  it('should draw the disabled outline color when unselected', async () => {
    const box = getBox(createCheckbox('disabled'));

    expect(box.borderTopColor).toBe(
      await color('unselected.disabled', 'outline.color'),
    );
  });

  // The expected value resolves surface under the same distinct color, so it
  // differs from on-primary, the enabled icon color.
  it.each(SELECTED)(
    'should draw the disabled icon color when %s',
    async (_, attributes) => {
      await withColor('--md-sys-color-surface', 'rgb(4, 5, 6)', async () => {
        const icon = iconOf(createCheckbox('disabled', ...attributes));

        expect(getComputedStyle(icon).color).toBe(
          await color('selected.disabled', 'icon.color'),
        );
      });
    },
  );
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
      await press(element);

      expect(rippleOf(element, '::after').backgroundColor).toBe(
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
