import { $ } from '@ydinjs/core/utils/DOM.js';
import { describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import '../../src/button-group/button-group.ts';
import '../../src/button-group/connected-button-group.ts';
import '../../src/button/button.ts';
import { nextFrame, pixels } from '../browser.ts';
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
  },
);
