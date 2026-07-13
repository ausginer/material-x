import { $ } from '@ydinjs/core/utils/DOM.js';
import { describe, expect, it } from 'vitest';
import '../../src/button/button.ts';

/*
 * Public CSS custom properties are a documented part of the button's API
 * (`@cssprop` on `mx-button`). These are not tproc tokens, so the oracle is the
 * literal value fed to the property; the contract is that the override reaches
 * the observable rendered property it claims to control.
 */

function createButton(
  overrides: Readonly<Record<string, string>>,
): HTMLElement {
  const button = document.createElement('mx-button');

  const icon = document.createElement('span');
  icon.slot = 'icon';
  icon.textContent = 'star';
  button.append(icon, document.createTextNode('Button'));

  for (const [property, value] of Object.entries(overrides)) {
    button.style.setProperty(property, value);
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
  return button.querySelector<HTMLElement>('[slot="icon"]')!;
}

describe('mx-button public CSS overrides', () => {
  it('should apply --md-button-leading-space to the inline start padding', () => {
    const style = getComputedStyle(
      getImplementation(createButton({ '--md-button-leading-space': '40px' })),
    );

    expect(style.getPropertyValue('padding-inline-start')).toBe('40px');
  });

  it('should apply --md-button-trailing-space to the inline end padding', () => {
    const style = getComputedStyle(
      getImplementation(createButton({ '--md-button-trailing-space': '40px' })),
    );

    expect(style.getPropertyValue('padding-inline-end')).toBe('40px');
  });

  it('should apply --md-button-icon-label-space to the gap', () => {
    const style = getComputedStyle(
      getImplementation(
        createButton({ '--md-button-icon-label-space': '20px' }),
      ),
    );

    expect(style.columnGap).toBe('20px');
  });

  it('should apply --md-button-label-text-line-height to the line height', () => {
    const style = getComputedStyle(
      getImplementation(
        createButton({ '--md-button-label-text-line-height': '30px' }),
      ),
    );

    expect(style.lineHeight).toBe('30px');
  });

  it('should apply --md-button-icon-size to the slotted icon size', () => {
    const button = createButton({ '--md-button-icon-size': '30px' });

    expect(getComputedStyle(getSlottedIcon(button)).fontSize).toBe('30px');
  });
});
