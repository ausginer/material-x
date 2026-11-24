import { describe, expect, it } from 'vitest';
import '../../src/button-group/connected-button-group.ts';
import '../../src/button/button.ts';
import '../../src/button/icon-button.ts';
import '../../src/button/link-button.ts';
import '../../src/button/split-button.ts';
import '../../src/button/switch-button.ts';
import '../../src/button/switch-icon-button.ts';
import { nextFrame } from '../browser.ts';
import { coveredIndicator, focusFirst } from '../focus-indicator.ts';

const BUTTONS = [
  'mx-button',
  'mx-link-button',
  'mx-icon-button',
  'mx-switch-button',
  'mx-switch-icon-button',
] as const;

type Fixture = Readonly<{
  frame: HTMLElement;
  /** The first button's box, which has keyboard focus. */
  box: HTMLElement;
  next: HTMLElement;
}>;

function boxOf(button: Element): HTMLElement {
  return button.shadowRoot!.querySelector<HTMLElement>('.host')!;
}

async function mount(
  fixture: HTMLElement,
  buttons: () => readonly Element[],
): Promise<Fixture> {
  const frame = document.createElement('div');
  frame.style.cssText =
    'position: relative; padding: 12px; background: white; inline-size: fit-content;';
  frame.append(fixture);
  document.body.append(frame);
  await nextFrame();
  await focusFirst(frame);

  const [first, next] = buttons();
  const box = boxOf(first!);
  expect(box.matches(':focus-visible')).toBe(true);

  return { frame, box, next: next as HTMLElement };
}

async function createGroup(tag: (typeof BUTTONS)[number]): Promise<Fixture> {
  const group = document.createElement('mx-connected-button-group');

  for (const value of ['one', 'two', 'three']) {
    const button = document.createElement(tag);
    button.setAttribute('value', value);
    button.textContent = value;

    if (tag === 'mx-link-button') {
      button.setAttribute('href', '#link');
    }

    group.append(button);
  }

  return await mount(group, () => [...group.children]);
}

async function createSplitButton(): Promise<Fixture> {
  const split = document.createElement('mx-split-button');
  split.textContent = 'Save';

  return await mount(split, () => [
    ...split.shadowRoot!.querySelectorAll('mx-button, mx-icon-button'),
  ]);
}

async function createButton(): Promise<Fixture> {
  const row = document.createElement('div');
  const buttons = [1, 2].map(() => document.createElement('mx-button'));
  buttons.forEach((button) => {
    button.textContent = 'Button';
  });
  row.append(...buttons);

  return await mount(row, () => buttons);
}

const GROUPS: ReadonlyArray<
  Readonly<{ name: string; create: () => Promise<Fixture> }>
> = [
  ...BUTTONS.map((tag) => ({
    name: `${tag} in mx-connected-button-group`,
    create: async () => await createGroup(tag),
  })),
  { name: 'the leading button of mx-split-button', create: createSplitButton },
];

describe('focus indicator in a group', () => {
  it.each(GROUPS)(
    'should not be covered by the button next to $name',
    async ({ create }) => {
      const { frame, box, next } = await create();

      const { painted, covered } = await coveredIndicator(
        frame,
        { box, side: 'right' },
        [next],
      );

      expect(covered).toBe(0);
      // The row reads a whole edge, and not a few pixels.
      expect(painted).toBeGreaterThan(box.getBoundingClientRect().height);
    },
  );
});

describe('focused button in the page', () => {
  it.each([...GROUPS, { name: 'mx-button alone', create: createButton }])(
    'should stay below a positioned element that follows $name',
    async ({ create }) => {
      const { frame, box } = await create();
      const cover = document.createElement('div');
      cover.style.cssText = 'position: absolute; inset: 0;';
      frame.append(cover);
      const { left, top, width, height } = box.getBoundingClientRect();

      expect(
        document.elementFromPoint(left + width / 2, top + height / 2),
      ).toBe(cover);
    },
  );
});
