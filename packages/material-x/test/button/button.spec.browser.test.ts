import { describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { $ } from 'ydin/utils/DOM.js';
import '../../src/button/button.ts';
import { pixels, resolveComputed } from '../browser.ts';
import {
  BUTTON_SIZE_CASES,
  type ButtonSizeCase,
} from './button.spec.fixtures.ts';

function createButton(testCase: ButtonSizeCase, shape?: 'square'): HTMLElement {
  const button = document.createElement('mx-button');

  const icon = document.createElement('span');
  icon.slot = 'icon';
  icon.textContent = 'star';
  button.append(icon, document.createTextNode('Button'));

  if (testCase.attribute) {
    button.setAttribute('size', testCase.attribute);
  }

  if (shape) {
    button.setAttribute('shape', shape);
  }

  document.body.append(button);
  return button;
}

function getImplementation(button: HTMLElement): HTMLButtonElement {
  const implementation = $<HTMLButtonElement>(button, '.host');

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

async function sizeTokens(testCase: ButtonSizeCase) {
  return await commands.resolveTokenContract({
    contract: testCase.contract,
    state: 'default',
    tokens: [
      'container.height',
      'container.shape.square',
      'label-text.font-size',
      'label-text.line-height',
      'label-text.font-weight',
      'label-text.font-name',
      'leading-space',
      'trailing-space',
      'icon.size',
      'icon-label-space',
    ],
  });
}

describe.each(BUTTON_SIZE_CASES)(
  'mx-button $name visual contract',
  (testCase) => {
    it('should render the tokenized container height', async () => {
      const expected = await sizeTokens(testCase);
      const implementation = getImplementation(createButton(testCase));

      expect(implementation.getBoundingClientRect().height).toBe(
        pixels(expected.values['container.height']!),
      );
    });

    it('should derive the round radius from the rendered height', () => {
      const implementation = getImplementation(createButton(testCase));
      const { height } = implementation.getBoundingClientRect();

      expect(pixels(getComputedStyle(implementation).borderRadius)).toBe(
        height / 2,
      );
    });

    it('should render the tokenized square radius', async () => {
      const expected = await sizeTokens(testCase);
      const implementation = getImplementation(
        createButton(testCase, 'square'),
      );

      expect(pixels(getComputedStyle(implementation).borderRadius)).toBe(
        pixels(expected.values['container.shape.square']!),
      );
    });

    it('should render the tokenized label font size', async () => {
      const expected = await sizeTokens(testCase);
      const implementation = getImplementation(createButton(testCase));

      expect(getComputedStyle(implementation).fontSize).toBe(
        expected.values['label-text.font-size'],
      );
    });

    it('should render the tokenized label line height', async () => {
      const expected = await sizeTokens(testCase);
      const implementation = getImplementation(createButton(testCase));

      expect(getComputedStyle(implementation).lineHeight).toBe(
        expected.values['label-text.line-height'],
      );
    });

    it('should render the tokenized label font weight', async () => {
      const expected = await sizeTokens(testCase);
      const implementation = getImplementation(createButton(testCase));

      expect(getComputedStyle(implementation).fontWeight).toBe(
        resolveComputed(
          'font-weight',
          String(expected.values['label-text.font-weight']),
        ),
      );
    });

    it('should render the tokenized label font family', async () => {
      const expected = await sizeTokens(testCase);
      const implementation = getImplementation(createButton(testCase));

      expect(getComputedStyle(implementation).fontFamily).toBe(
        resolveComputed(
          'font-family',
          String(expected.values['label-text.font-name']),
        ),
      );
    });

    it('should render the tokenized inline padding', async () => {
      const expected = await sizeTokens(testCase);
      const style = getComputedStyle(getImplementation(createButton(testCase)));

      expect(style.getPropertyValue('padding-inline-start')).toBe(
        expected.values['leading-space'],
      );
      expect(style.getPropertyValue('padding-inline-end')).toBe(
        expected.values['trailing-space'],
      );
    });

    it('should render the tokenized icon-to-label gap', async () => {
      const expected = await sizeTokens(testCase);
      const implementation = getImplementation(createButton(testCase));

      expect(getComputedStyle(implementation).columnGap).toBe(
        expected.values['icon-label-space'],
      );
    });

    it('should render the tokenized icon size', async () => {
      const expected = await sizeTokens(testCase);
      const icon = getSlottedIcon(createButton(testCase));

      expect(getComputedStyle(icon).fontSize).toBe(
        expected.values['icon.size'],
      );
    });
  },
);
