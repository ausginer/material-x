import { describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import '../../src/fab/fab.ts';
import { nextFrame, resolveComputed } from '../browser.ts';

const SIZES = [
  { name: 'small', attribute: null, contract: 'fab.extended.small' },
  { name: 'medium', attribute: 'medium', contract: 'fab.extended.medium' },
  { name: 'large', attribute: 'large', contract: 'fab.extended.large' },
] as const;

describe.each(SIZES)(
  'mx-fab extended $name label contract',
  ({ attribute, contract }) => {
    it('should render the tokenized label tracking', async () => {
      const { values } = await commands.resolveTokenContract({
        contract,
        state: 'default',
        tokens: ['label-text.font-tracking'],
      });
      const fab = document.createElement('mx-fab');
      fab.setAttribute('extended', 'open');

      if (attribute) {
        fab.setAttribute('size', attribute);
      }

      // The label would inherit this if it didn't read its own tracking.
      fab.style.letterSpacing = '3px';
      fab.textContent = 'Compose';
      document.body.append(fab);
      await nextFrame();
      const label = fab.shadowRoot!.querySelector('.label')!;

      expect(getComputedStyle(label).letterSpacing).toBe(
        resolveComputed(
          'letter-spacing',
          String(values['label-text.font-tracking']),
        ),
      );
    });
  },
);
