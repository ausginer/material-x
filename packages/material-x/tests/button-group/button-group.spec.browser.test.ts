import { $ } from '@ydinjs/core/utils/DOM.js';
import { describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import '../../src/button-group/button-group.ts';
import '../../src/button-group/connected-button-group.ts';
import '../../src/button/button.ts';
import '../../src/button/switch-button.ts';
import { nextFrame, pixels, settleAnimations } from '../browser.ts';
import {
  GROUP_SIZE_CASES,
  type GroupSizeCase,
} from './button-group.spec.fixtures.ts';

function createGroup(
  tag: 'mx-button-group' | 'mx-connected-button-group',
  testCase: GroupSizeCase,
  count = 3,
): HTMLElement {
  const group = document.createElement(tag);

  if (testCase.attribute) {
    group.setAttribute('size', testCase.attribute);
  }

  for (let index = 0; index < count; index++) {
    const button = document.createElement('mx-button');
    button.textContent = `Button ${index}`;
    group.append(button);
  }

  document.body.append(group);
  return group;
}

const SWITCH_VALUES = ['one', 'two', 'three'] as const;

/** A connected group of switch buttons, which a group `value` selects. */
async function createSwitchGroup(
  testCase: GroupSizeCase,
): Promise<readonly [HTMLElement, readonly HTMLElement[]]> {
  const group = document.createElement('mx-connected-button-group');

  if (testCase.attribute) {
    group.setAttribute('size', testCase.attribute);
  }

  const switches = SWITCH_VALUES.map((value) => {
    const element = document.createElement('mx-switch-button');
    element.setAttribute('value', value);
    element.textContent = value;
    return element;
  });
  group.append(...switches);
  document.body.append(group);
  await nextFrame();

  return [group, switches];
}

function getImplementation(element: HTMLElement): HTMLElement {
  return $<HTMLElement>(element, '.host')!;
}

/**
 * The computed corner radii, in the order of `border-radius`: top-left,
 * top-right, bottom-right, bottom-left.
 */
async function readCorners(element: HTMLElement): Promise<readonly number[]> {
  await nextFrame();
  await settleAnimations(element);
  const style = getComputedStyle(getImplementation(element));

  return [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
    style.borderBottomLeftRadius,
  ].map(pixels);
}

/** The group's full shape, which a corner token names by reference. */
const FULL_SHAPE = 'var(--_shape-full)';

/**
 * The radius a corner token draws on `element`. Full is half the button's own
 * rendered height, and any other value is a length.
 */
async function expectedRadius(
  contract: string,
  state: string,
  token: string,
  element: HTMLElement,
): Promise<number> {
  const { values } = await commands.resolveTokenContract({
    contract,
    state,
    tokens: [token],
  });
  const value = String(values[token]!);

  return value === FULL_SHAPE
    ? getImplementation(element).getBoundingClientRect().height / 2
    : pixels(value);
}

/** Holds a real pointer press on the element's centre. */
async function press(element: HTMLElement): Promise<void> {
  const rect = getImplementation(element).getBoundingClientRect();
  await commands.pointerPress(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
  );
}

const POSITIONS = [
  { position: 'first', index: 0 },
  { position: 'middle', index: 1 },
  { position: 'last', index: 2 },
] as const;

describe.each(GROUP_SIZE_CASES)(
  'mx-button-group $name visual contract',
  (testCase) => {
    it('should render the tokenized between-space as the row gap', async () => {
      const expected = await commands.resolveTokenContract({
        contract: testCase.standardContract,
        state: 'default',
        tokens: ['between-space'],
      });
      const group = createGroup('mx-button-group', testCase);

      expect(getComputedStyle(group).columnGap).toBe(
        expected.values['between-space'],
      );
    });
  },
);

describe.each(GROUP_SIZE_CASES)(
  'mx-connected-button-group $name visual contract',
  (testCase) => {
    it('should render the tokenized inner-corner radius on a middle button', async () => {
      const expected = await commands.resolveTokenContract({
        contract: testCase.connectedContract,
        state: 'default',
        tokens: ['inner-corner.corner-size'],
      });
      const group = createGroup('mx-connected-button-group', testCase);
      await customElements.whenDefined('mx-button');
      await nextFrame();

      // A middle child carries neither `data-first` nor `data-last`, so all four
      // corners resolve to the group's inner-corner size — an independent
      // geometry observation of the token the group applies to its children.
      const middle = group.children[1] as HTMLElement;
      const host = $<HTMLElement>(middle, '.host')!;

      expect(pixels(getComputedStyle(host).borderTopLeftRadius)).toBe(
        pixels(expected.values['inner-corner.corner-size'] as string),
      );
    });

    it.each(POSITIONS)(
      'should render a selected $position button as a pill',
      async ({ index }) => {
        const [group, switches] = await createSwitchGroup(testCase);
        group.setAttribute('value', SWITCH_VALUES[index]);
        const selected = switches[index]!;
        const contract = testCase.connectedContract;
        const inner = await expectedRadius(
          contract,
          'selected',
          'inner-corner.corner-size',
          selected,
        );
        const outer = await expectedRadius(
          contract,
          'selected',
          'outer-corner.corner-size',
          selected,
        );
        const full =
          getImplementation(selected).getBoundingClientRect().height / 2;

        expect([inner, outer]).toEqual([full, full]);
        expect(await readCorners(selected)).toEqual([full, full, full, full]);
      },
    );

    it('should render the pressed inner corners on a pressed middle button', async () => {
      const [, switches] = await createSwitchGroup(testCase);
      const middle = switches[1]!;
      const expected = await expectedRadius(
        testCase.connectedContract,
        'pressed',
        'inner-corner.corner-size',
        middle,
      );

      await press(middle);
      try {
        expect(await readCorners(middle)).toEqual([
          expected,
          expected,
          expected,
          expected,
        ]);
      } finally {
        await commands.pointerRelease();
      }
    });

    it('should render the pressed inner corners on a selected middle button while pressed', async () => {
      const [group, switches] = await createSwitchGroup(testCase);
      group.setAttribute('value', SWITCH_VALUES[1]);
      const middle = switches[1]!;
      const expected = await expectedRadius(
        testCase.connectedContract,
        'pressed',
        'inner-corner.corner-size',
        middle,
      );

      await press(middle);
      try {
        expect(await readCorners(middle)).toEqual([
          expected,
          expected,
          expected,
          expected,
        ]);
      } finally {
        await commands.pointerRelease();
      }
    });

    it('should keep the resting inner corners on the neighbour of a selected button', async () => {
      const [group, switches] = await createSwitchGroup(testCase);
      group.setAttribute('value', SWITCH_VALUES[1]);
      const first = switches[0]!;
      const inner = await expectedRadius(
        testCase.connectedContract,
        'default',
        'inner-corner.corner-size',
        first,
      );

      const [, topRight, bottomRight] = await readCorners(first);

      expect([topRight, bottomRight]).toEqual([inner, inner]);
    });

    it('should render a selected first button as a pill in a square group', async () => {
      const [group, switches] = await createSwitchGroup(testCase);
      group.setAttribute('shape', 'square');
      group.setAttribute('value', SWITCH_VALUES[0]);
      const first = switches[0]!;
      const full = getImplementation(first).getBoundingClientRect().height / 2;

      expect(await readCorners(first)).toEqual([full, full, full, full]);
    });

    it('should render a selected button as a pill with the inner-corner override set', async () => {
      const [group, switches] = await createSwitchGroup(testCase);
      group.style.setProperty('--md-button-group-inner-corner-size', '2px');
      group.setAttribute('value', SWITCH_VALUES[1]);
      const middle = switches[1]!;
      const full = getImplementation(middle).getBoundingClientRect().height / 2;

      expect(await readCorners(middle)).toEqual([full, full, full, full]);
    });
  },
);
