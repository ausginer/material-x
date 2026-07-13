import { $ } from '@ydinjs/core/utils/DOM.js';
import { describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import '../../src/button/button.ts';
import { resolveComputed } from '../browser.ts';

type ColorCase = Readonly<{
  name: string;
  color: string | null;
  contract: string;
}>;

const COLOR_CASES: readonly ColorCase[] = [
  { name: 'filled', color: null, contract: 'button.color.filled' },
  { name: 'elevated', color: 'elevated', contract: 'button.color.elevated' },
  { name: 'tonal', color: 'tonal', contract: 'button.color.tonal' },
  { name: 'outlined', color: 'outlined', contract: 'button.color.outlined' },
  { name: 'text', color: 'text', contract: 'button.color.text' },
];

type CreateOptions = Readonly<{ disabled?: boolean }>;

function createButton(
  color: string | null,
  { disabled = false }: CreateOptions = {},
): HTMLElement {
  const button = document.createElement('mx-button');

  const icon = document.createElement('span');
  icon.slot = 'icon';
  icon.textContent = 'star';
  button.append(icon, document.createTextNode('Button'));

  if (color) {
    button.setAttribute('color', color);
  }

  if (disabled) {
    button.toggleAttribute('disabled', true);
  }

  document.body.append(button);
  return button;
}

function getImplementation(button: HTMLElement): HTMLElement {
  const implementation = $<HTMLElement>(button, '.host');

  if (!implementation) {
    throw new Error('Missing button implementation');
  }

  return implementation;
}

function getSlottedIcon(button: HTMLElement): HTMLElement {
  const icon = button.querySelector<HTMLElement>('[slot="icon"]');

  if (!icon) {
    throw new Error('Missing slotted icon');
  }

  return icon;
}

function colorTokens(contract: string, state = 'default') {
  return commands.resolveTokenContract({
    contract,
    state,
    tokens: ['container.color', 'label-text.color', 'icon.color'],
  });
}

describe.each(COLOR_CASES)('mx-button $name colour contract', (testCase) => {
  it('should render the tokenized container colour', async () => {
    const expected = await colorTokens(testCase.contract);
    const implementation = getImplementation(createButton(testCase.color));

    expect(getComputedStyle(implementation).backgroundColor).toBe(
      resolveComputed(
        'background-color',
        String(expected.values['container.color']),
      ),
    );
  });

  it('should render the tokenized label colour', async () => {
    const expected = await colorTokens(testCase.contract);
    const implementation = getImplementation(createButton(testCase.color));

    expect(getComputedStyle(implementation).color).toBe(
      resolveComputed('color', String(expected.values['label-text.color'])),
    );
  });

  it('should render the tokenized icon colour', async () => {
    const expected = await colorTokens(testCase.contract);
    const icon = getSlottedIcon(createButton(testCase.color));

    expect(getComputedStyle(icon).color).toBe(
      resolveComputed('color', String(expected.values['icon.color'])),
    );
  });
});

describe('mx-button outlined contract', () => {
  it('should render the tokenized outline width and colour', async () => {
    const expected = await commands.resolveTokenContract({
      contract: 'button.color.outlined',
      state: 'default',
      tokens: ['outline.width', 'outline.color'],
    });
    const style = getComputedStyle(getImplementation(createButton('outlined')));

    expect(style.borderInlineStartWidth).toBe(expected.values['outline.width']);
    expect(style.borderInlineStartColor).toBe(
      resolveComputed('color', String(expected.values['outline.color'])),
    );
  });
});

describe('mx-button elevation contract', () => {
  it('should resolve elevation 1 by default and 0 when disabled', async () => {
    const enabled = await commands.resolveTokenContract({
      contract: 'button.color.elevated',
      state: 'default',
      tokens: ['container.elevation'],
    });
    const disabled = await commands.resolveTokenContract({
      contract: 'button.color.elevated',
      state: 'disabled',
      tokens: ['container.elevation'],
    });

    expect(enabled.values['container.elevation']).toBe('1');
    expect(disabled.values['container.elevation']).toBe('0');
  });

  it('should cast a shadow while enabled', () => {
    const elevated = getImplementation(createButton('elevated'));
    const flat = getImplementation(createButton(null));

    // A level-1 elevation renders a non-zero shadow; a level-0 (filled) button
    // is the independent reference for "no elevation".
    expect(getComputedStyle(elevated).boxShadow).not.toBe(
      getComputedStyle(flat).boxShadow,
    );
  });

  it('should flatten to the level-0 shadow when disabled', () => {
    const disabledElevated = getImplementation(
      createButton('elevated', { disabled: true }),
    );
    const flat = getImplementation(createButton(null));

    // Spec: the elevated button drops to elevation 0 when disabled, matching a
    // filled button's level-0 shadow.
    expect(getComputedStyle(disabledElevated).boxShadow).toBe(
      getComputedStyle(flat).boxShadow,
    );
  });
});

describe('mx-button disabled appearance', () => {
  it('should apply the tokenized label opacity', async () => {
    const expected = await commands.resolveTokenContract({
      contract: 'button.color.elevated',
      state: 'disabled',
      tokens: ['label-text.color', 'label-text.opacity'],
    });
    const implementation = getImplementation(
      createButton('elevated', { disabled: true }),
    );

    // The disabled label is the base colour mixed with transparency by the
    // tokenized opacity; resolving the same `color-mix` in a probe is the
    // independent oracle for the rendered colour.
    const opacity = Number(expected.values['label-text.opacity']);
    const mixed = resolveComputed(
      'color',
      `color-mix(in srgb, ${String(
        expected.values['label-text.color'],
      )}, transparent ${(100 - opacity * 100).toString()}%)`,
    );

    expect(getComputedStyle(implementation).color).toBe(mixed);
  });
});

describe('mx-button hovered state', () => {
  it('should raise the elevated shadow on real hover', async () => {
    const implementation = getImplementation(createButton('elevated'));
    const resting = getComputedStyle(implementation).boxShadow;

    await userEvent.hover(implementation);

    // Elevated buttons raise from elevation 1 to 3 on hover; the shadow must
    // change under a real pointer `:hover`.
    expect(getComputedStyle(implementation).boxShadow).not.toBe(resting);
  });
});
