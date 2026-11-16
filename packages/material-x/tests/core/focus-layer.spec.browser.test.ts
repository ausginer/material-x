import { $ } from '@ydinjs/core/utils/DOM.js';
import { describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import '../../src/button/button.ts';
import '../../src/checkbox/checkbox.ts';
import '../../src/radio/radio.ts';
import { nextFrame, resolveComputed, settleAnimations } from '../browser.ts';

/**
 * The state layer that `mx-button`, `mx-radio` and `mx-checkbox` draw on the
 * ripple's `::before`, read against each component's focused and hovered
 * tokens. Keyboard focus draws the focused state's layer, and it shows over
 * hover; mouse focus draws none.
 */
type Case = Readonly<{
  tag: 'mx-button' | 'mx-checkbox' | 'mx-radio';
  contract: string;
  focused: string;
  hovered: string;
  /** The element that pointer input targets. */
  target: (element: HTMLElement) => HTMLElement;
  /** The element that draws the keyboard focus indicator. */
  indicator: (element: HTMLElement) => HTMLElement;
  /** The native control that keyboard focus reaches. */
  control: string;
}>;

const CASES: readonly Case[] = [
  {
    tag: 'mx-button',
    contract: 'button.color.filled',
    focused: 'focused',
    hovered: 'hovered',
    target: (element) => $<HTMLElement>(element, '.host')!,
    indicator: (element) => $<HTMLElement>(element, '.host')!,
    control: '.host',
  },
  {
    tag: 'mx-checkbox',
    contract: 'checkbox.default',
    focused: 'unselected.focus',
    hovered: 'unselected.hover',
    target: (element) => element,
    indicator: (element) => $<HTMLElement>(element, '.indicator')!,
    control: '.input',
  },
  {
    tag: 'mx-radio',
    contract: 'radio.default',
    focused: 'unselected.focus',
    hovered: 'unselected.hover',
    target: (element) => element,
    indicator: (element) => $<HTMLElement>(element, '.off')!,
    control: '.input',
  },
];

function create(tag: Case['tag']): HTMLElement {
  const element = document.createElement(tag);
  element.textContent = 'Label';
  document.body.append(element);
  return element;
}

/**
 * Presses Tab and asserts that it reached the host's native control, so a
 * failed reach doesn't read as a missing layer or indicator.
 */
async function tabTo(element: HTMLElement, control: string): Promise<void> {
  await userEvent.keyboard('{Tab}');

  expect(document.activeElement).toBe(element);
  expect(element.shadowRoot?.activeElement).toBe($(element, control));
}

function layer(element: HTMLElement): CSSStyleDeclaration {
  return getComputedStyle($<HTMLElement>(element, '.ripple')!, '::before');
}

async function expected(contract: string, state: string) {
  const { values } = await commands.resolveTokenContract({
    contract,
    state,
    tokens: ['state-layer.color', 'state-layer.opacity'],
  });

  return {
    color: resolveComputed('color', String(values['state-layer.color']!)),
    opacity: Number(values['state-layer.opacity']!),
  };
}

/** Reads the layer once its 15 ms opacity and color transitions have ended. */
async function observed(element: HTMLElement) {
  await nextFrame();
  await settleAnimations(element);
  const style = layer(element);
  return { color: style.backgroundColor, opacity: Number(style.opacity) };
}

describe.each(CASES)('$tag focus layer visual contract', (testCase) => {
  it('should draw the focused state layer on keyboard focus', async () => {
    const element = create(testCase.tag);

    await tabTo(element, testCase.control);

    expect(await observed(element)).toStrictEqual(
      await expected(testCase.contract, testCase.focused),
    );
  });

  it('should draw the focused state layer on keyboard focus with hover', async () => {
    const element = create(testCase.tag);

    await tabTo(element, testCase.control);
    await userEvent.hover(testCase.target(element));

    expect(await observed(element)).toStrictEqual(
      await expected(testCase.contract, testCase.focused),
    );
  });

  it('should draw the hovered state layer on hover alone', async () => {
    const element = create(testCase.tag);

    await userEvent.hover(testCase.target(element));

    expect(await observed(element)).toStrictEqual(
      await expected(testCase.contract, testCase.hovered),
    );
  });

  it('should draw no layer after a mouse click with the pointer moved off', async () => {
    const element = create(testCase.tag);
    const outside = document.createElement('div');
    outside.style.blockSize = '40px';
    document.body.append(outside);

    await userEvent.click(testCase.target(element));
    await userEvent.hover(outside);

    expect((await observed(element)).opacity).toBe(0);
  });
});

describe.each(CASES)('$tag focus indicator', (testCase) => {
  it('should draw the focus indicator on keyboard focus', async () => {
    const element = create(testCase.tag);

    await tabTo(element, testCase.control);

    expect(getComputedStyle(testCase.indicator(element)).outlineStyle).toBe(
      'solid',
    );
  });

  it('should draw no focus indicator after a mouse click', async () => {
    const element = create(testCase.tag);

    await userEvent.click(testCase.target(element));

    expect(getComputedStyle(testCase.indicator(element)).outlineStyle).toBe(
      'none',
    );
  });
});
