import { $ } from '@ydinjs/core/utils/DOM.js';
import { describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import '../../../src/checkbox/checkbox.ts';
import '../../../src/radio/radio.ts';
import { pixels } from '../../browser.ts';
import {
  CHECKABLE_SPEC_CASES,
  type CheckableSpecCase,
} from './CheckableCore.spec.fixtures.ts';

/**
 * Visual contract shared by every `CheckableCore` element: the touch target is
 * the tokenized state-layer box, it is fully rounded, and the glyph is rendered
 * at the tokenized icon size. Component-specific tokens (the checkbox outline
 * and container box, the radio glyph geometry) live in each variant's spec.
 */
function createCheckable(testCase: CheckableSpecCase): HTMLElement {
  const element = document.createElement(testCase.tag);
  document.body.append(element);
  return element;
}

function getIcon(element: HTMLElement, selector: string): HTMLElement {
  const icon = $<HTMLElement>(element, selector);

  if (!icon) {
    throw new Error(`Missing icon for selector ${selector}`);
  }

  return icon;
}

async function coreTokens(testCase: CheckableSpecCase) {
  return await commands.resolveTokenContract({
    contract: testCase.contract,
    state: 'default',
    tokens: ['state-layer.size', 'icon.size'],
  });
}

describe.each(CHECKABLE_SPEC_CASES)(
  '$name core visual contract',
  (testCase) => {
    it('should render the tokenized state-layer size as the touch target', async () => {
      const expected = await coreTokens(testCase);
      const element = createCheckable(testCase);

      const { width, height } = element.getBoundingClientRect();
      const size = pixels(expected.values['state-layer.size']!);

      expect(width).toBe(size);
      expect(height).toBe(size);
    });

    it('should derive the full state-layer radius from the rendered size', () => {
      const element = createCheckable(testCase);
      const { height } = element.getBoundingClientRect();

      expect(pixels(getComputedStyle(element).borderRadius)).toBe(height / 2);
    });

    it('should render the tokenized icon size', async () => {
      const expected = await coreTokens(testCase);
      const element = createCheckable(testCase);

      expect(
        getComputedStyle(getIcon(element, testCase.iconSelector)).fontSize,
      ).toBe(expected.values['icon.size']);
    });
  },
);
