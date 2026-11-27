import { describe, expect, it } from 'vitest';
import { commands, server, userEvent } from 'vitest/browser';
import '../../src/button/button.ts';
import '../../src/button/icon-button.ts';
import '../../src/button/switch-button.ts';
import '../../src/button/switch-icon-button.ts';
import '../../src/checkbox/checkbox.ts';
import '../../src/radio/radio.ts';
import { nextFrame, resolveComputed, settleAnimations } from '../browser.ts';

type Tag =
  | 'mx-button'
  | 'mx-icon-button'
  | 'mx-switch-button'
  | 'mx-switch-icon-button'
  | 'mx-checkbox'
  | 'mx-radio';

type Attribute = readonly [name: string, value: string];

/**
 * The contract state that holds a layer's tokens. A button-family selection
 * state takes its colour from the selection's own state and its opacity from
 * the plain interaction state: Material's tables define `state-layer.opacity`
 * per interaction state, and not per selection.
 */
type LayerState = string | Readonly<{ color: string; opacity: string }>;

/**
 * The state layer that `mx-button`, the switches, `mx-radio` and `mx-checkbox`
 * draw on the ripple's `::before`, read against each component's focused and
 * hovered tokens. Keyboard focus draws the focused state's layer, and it shows
 * over hover; mouse focus draws none.
 */
type Case = Readonly<{
  name: string;
  tag: Tag;
  attributes: readonly Attribute[];
  contract: string;
  focused: LayerState;
  hovered: LayerState;
  /** The element that pointer input targets. */
  target: (element: HTMLElement) => HTMLElement;
  /** The element that draws the keyboard focus indicator. */
  indicator: (element: HTMLElement) => HTMLElement;
  /** The native control that keyboard focus reaches. */
  control: string;
}>;

const SWITCH_CASES: readonly Case[] = (
  ['mx-switch-button', 'mx-switch-icon-button'] as const
).flatMap((tag) =>
  (['unselected', 'selected'] as const).map((selection): Case => ({
    name: `${tag} ${selection === 'selected' ? 'checked' : 'unchecked'}`,
    tag,
    attributes: selection === 'selected' ? [['checked', '']] : [],
    contract: `${tag.slice(3)}.color.filled`,
    focused: { color: `${selection}.focused`, opacity: 'focused' },
    hovered: { color: `${selection}.hovered`, opacity: 'hovered' },
    target: (element) =>
      element.shadowRoot!.querySelector<HTMLElement>('.host')!,
    indicator: (element) =>
      element.shadowRoot!.querySelector<HTMLElement>('.host')!,
    control: '.host',
  })),
);

const CASES: readonly Case[] = [
  {
    name: 'mx-button',
    tag: 'mx-button',
    attributes: [],
    contract: 'button.color.filled',
    focused: 'focused',
    hovered: 'hovered',
    target: (element) =>
      element.shadowRoot!.querySelector<HTMLElement>('.host')!,
    indicator: (element) =>
      element.shadowRoot!.querySelector<HTMLElement>('.host')!,
    control: '.host',
  },
  ...SWITCH_CASES,
  {
    name: 'mx-checkbox',
    tag: 'mx-checkbox',
    attributes: [],
    contract: 'checkbox.default',
    focused: 'unselected.focus',
    hovered: 'unselected.hover',
    target: (element) => element,
    indicator: (element) =>
      element.shadowRoot!.querySelector<HTMLElement>('.indicator')!,
    control: '.input',
  },
  // Material's error state layer has no selection, so it is the same when
  // checked.
  {
    name: 'mx-checkbox with error',
    tag: 'mx-checkbox',
    attributes: [['error', '']],
    contract: 'checkbox.error',
    focused: 'error.focus',
    hovered: 'error.hover',
    target: (element) => element,
    indicator: (element) =>
      element.shadowRoot!.querySelector<HTMLElement>('.indicator')!,
    control: '.input',
  },
  {
    name: 'mx-radio',
    tag: 'mx-radio',
    attributes: [],
    contract: 'radio.default',
    focused: 'unselected.focus',
    hovered: 'unselected.hover',
    target: (element) => element,
    indicator: (element) =>
      element.shadowRoot!.querySelector<HTMLElement>('.off')!,
    control: '.input',
  },
];

/**
 * A focus-layer mapping that a component declares beyond the default state of
 * {@link CASES}: a colour, or a selection state.
 */
type MappingCase = Readonly<{
  name: string;
  tag: Tag;
  /** The attributes that select the mapping; none for the default colour. */
  attributes: readonly Attribute[];
  contract: string;
  focused: LayerState;
  control: string;
}>;

const MAPPING_CASES: readonly MappingCase[] = [
  ...(['elevated', 'outlined', 'text', 'tonal'] as const).map(
    (color): MappingCase => ({
      name: `mx-button ${color}`,
      tag: 'mx-button',
      attributes: [['color', color]],
      contract: `button.color.${color}`,
      focused: 'focused',
      control: '.host',
    }),
  ),
  ...(['filled', 'tonal', 'standard'] as const).map((color): MappingCase => ({
    name: `mx-icon-button ${color}`,
    tag: 'mx-icon-button',
    attributes: color === 'filled' ? [] : [['color', color]],
    contract: `icon-button.color.${color}`,
    focused: 'focused',
    control: '.host',
  })),
  ...(['checked', 'indeterminate'] as const).map((state): MappingCase => ({
    name: `mx-checkbox ${state}`,
    tag: 'mx-checkbox',
    attributes: [[state, '']],
    contract: 'checkbox.default',
    focused: 'selected.focus',
    control: '.input',
  })),
  ...(['checked', 'indeterminate'] as const).map((state): MappingCase => ({
    name: `mx-checkbox ${state} with error`,
    tag: 'mx-checkbox',
    attributes: [
      [state, ''],
      ['error', ''],
    ],
    contract: 'checkbox.error',
    focused: 'error.focus',
    control: '.input',
  })),
  {
    name: 'mx-radio checked',
    tag: 'mx-radio',
    attributes: [['checked', '']],
    contract: 'radio.default',
    focused: 'selected.focus',
    control: '.input',
  },
  ...(
    [
      ['mx-switch-button', ['filled', 'elevated', 'outlined', 'tonal']],
      ['mx-switch-icon-button', ['filled', 'tonal', 'standard']],
    ] as const
  ).flatMap(([tag, colors]) =>
    colors.flatMap((color) =>
      (['unselected', 'selected'] as const).map((selection): MappingCase => ({
        name: `${tag} ${color} ${selection === 'selected' ? 'checked' : 'unchecked'}`,
        tag,
        attributes: [
          ...(color === 'filled' ? [] : [['color', color] as const]),
          ...(selection === 'selected' ? [['checked', ''] as const] : []),
        ],
        contract: `${tag.slice(3)}.color.${color}`,
        focused: { color: `${selection}.focused`, opacity: 'focused' },
        control: '.host',
      })),
    ),
  ),
];

function create(tag: Tag, attributes: readonly Attribute[]): HTMLElement {
  const element = document.createElement(tag);
  element.textContent = 'Label';
  for (const attribute of attributes) {
    element.setAttribute(...attribute);
  }
  document.body.append(element);
  return element;
}

/**
 * The key that moves focus to every control. Safari's default Tab skips
 * buttons, checkboxes and radios, and Option-Tab reaches them (`repo:RF-42`).
 */
const TAB = server.browser === 'safari' ? '{Alt>}{Tab}{/Alt}' : '{Tab}';

/**
 * Presses Tab and asserts that it reached the host's native control, so a
 * failed reach doesn't read as a missing layer or indicator.
 */
async function tabTo(element: HTMLElement, control: string): Promise<void> {
  await userEvent.keyboard(TAB);

  expect(document.activeElement).toBe(element);
  expect(element.shadowRoot?.activeElement).toBe(
    element.shadowRoot!.querySelector(control),
  );
}

function layer(element: HTMLElement): CSSStyleDeclaration {
  return getComputedStyle(
    element.shadowRoot!.querySelector<HTMLElement>('.ripple')!,
    '::before',
  );
}

async function resolve(contract: string, state: string, token: string) {
  const { values } = await commands.resolveTokenContract({
    contract,
    state,
    tokens: [token],
  });

  return String(values[token]!);
}

async function expected(contract: string, state: LayerState) {
  const { color, opacity } =
    typeof state === 'string' ? { color: state, opacity: state } : state;

  return {
    color: resolveComputed(
      'color',
      await resolve(contract, color, 'state-layer.color'),
    ),
    opacity: Number(await resolve(contract, opacity, 'state-layer.opacity')),
  };
}

/** Reads the layer once its 15 ms opacity and color transitions have ended. */
async function observed(element: HTMLElement) {
  await nextFrame();
  await settleAnimations(element);
  const style = layer(element);
  return { color: style.backgroundColor, opacity: Number(style.opacity) };
}

describe.each(CASES)('$name focus layer visual contract', (testCase) => {
  it('should draw the focused state layer on keyboard focus', async () => {
    const element = create(testCase.tag, testCase.attributes);

    await tabTo(element, testCase.control);

    expect(await observed(element)).toStrictEqual(
      await expected(testCase.contract, testCase.focused),
    );
  });

  it('should draw the focused state layer on keyboard focus with hover', async () => {
    const element = create(testCase.tag, testCase.attributes);

    await tabTo(element, testCase.control);
    await userEvent.hover(testCase.target(element));

    expect(await observed(element)).toStrictEqual(
      await expected(testCase.contract, testCase.focused),
    );
  });

  it('should draw the hovered state layer on hover alone', async () => {
    const element = create(testCase.tag, testCase.attributes);

    await userEvent.hover(testCase.target(element));

    expect(await observed(element)).toStrictEqual(
      await expected(testCase.contract, testCase.hovered),
    );
  });

  it('should draw no layer after a mouse click with the pointer moved off', async () => {
    const element = create(testCase.tag, testCase.attributes);
    const outside = document.createElement('div');
    outside.style.blockSize = '40px';
    document.body.append(outside);

    await userEvent.click(testCase.target(element));
    await userEvent.hover(outside);

    expect((await observed(element)).opacity).toBe(0);
  });
});

describe.each(CASES)('$name focus indicator', (testCase) => {
  it('should draw the focus indicator on keyboard focus', async () => {
    const element = create(testCase.tag, testCase.attributes);

    await tabTo(element, testCase.control);

    expect(getComputedStyle(testCase.indicator(element)).outlineStyle).toBe(
      'solid',
    );
  });

  it('should draw no focus indicator after a mouse click', async () => {
    const element = create(testCase.tag, testCase.attributes);

    await userEvent.click(testCase.target(element));

    expect(getComputedStyle(testCase.indicator(element)).outlineStyle).toBe(
      'none',
    );
  });
});

describe.each(MAPPING_CASES)(
  '$name focus layer visual contract',
  (testCase) => {
    it('should draw the focused state layer on keyboard focus', async () => {
      const element = create(testCase.tag, testCase.attributes);

      await tabTo(element, testCase.control);

      expect(await observed(element)).toStrictEqual(
        await expected(testCase.contract, testCase.focused),
      );
    });
  },
);
