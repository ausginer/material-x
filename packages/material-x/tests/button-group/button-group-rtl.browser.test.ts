import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../src/button-group/connected-button-group.ts';
import '../../src/button/switch-button.ts';
import { nextFrame } from '../browser.ts';

/** Three switches, the first at the inline start. */
async function createGroup(
  dir: 'ltr' | 'rtl',
  on: 'group' | 'ancestor',
): Promise<readonly HTMLElement[]> {
  const ancestor = document.createElement('div');
  const group = document.createElement('mx-connected-button-group');
  const switches = ['one', 'two', 'three'].map((value) => {
    const element = document.createElement('mx-switch-button');
    element.setAttribute('value', value);
    element.textContent = value;
    return element;
  });
  group.append(...switches);
  ancestor.append(group);
  (on === 'group' ? group : ancestor).dir = dir;
  document.body.append(ancestor);
  await nextFrame();

  return switches;
}

const centerOf = (element: HTMLElement): number => {
  const { left, width } = element
    .shadowRoot!.querySelector('.host')!
    .getBoundingClientRect();

  return left + width / 2;
};

describe.each([
  { dir: 'ltr', on: 'group' },
  { dir: 'rtl', on: 'group' },
  { dir: 'rtl', on: 'ancestor' },
] as const)(
  'mx-connected-button-group arrow keys, dir="$dir" on the $on',
  ({ dir, on }) => {
    it.each([
      { key: 'ArrowRight', side: 1 },
      { key: 'ArrowLeft', side: -1 },
    ])(
      'should move focus to the neighbor that $key points at',
      async ({ key, side }) => {
        const switches = await createGroup(dir, on);
        const middle = switches[1]!;
        const expected = switches.find(
          (element) => Math.sign(centerOf(element) - centerOf(middle)) === side,
        );
        middle.focus();

        await userEvent.keyboard(`{${key}}`);

        expect(document.activeElement).toBe(expected);
      },
    );
  },
);
