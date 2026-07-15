import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../../src/radio/radio.ts';
import { nextFrame, settleAnimations, whenFontsReady } from '../browser.ts';

function createFixture(name: string): HTMLDivElement {
  const fixture = document.createElement('div');
  fixture.className = 'mx-test-fixture';
  fixture.dataset['testid'] = name;
  document.body.append(fixture);
  return fixture;
}

function appendRadio(
  fixture: HTMLElement,
  attributes: Readonly<Record<string, string>> = {},
): HTMLElement {
  const element = document.createElement('mx-radio');

  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }

  fixture.append(element);
  return element;
}

/**
 * Radio reveals its selected dot through a `clip-path` transition to a value
 * declared in a real rule, so the end state applies even with transitions
 * suppressed. Animations are still settled for symmetry with the checkbox
 * fixture and to stay correct if the reveal ever becomes a keyframe animation.
 */
async function settleFixture(fixture: HTMLElement): Promise<void> {
  await whenFontsReady();
  await Promise.all(
    [...fixture.children].map((child) =>
      settleAnimations(child as HTMLElement),
    ),
  );
  await nextFrame();
}

describe('radio visual regression', () => {
  it('should match the selection state matrix', async () => {
    const fixture = createFixture('radio-states');
    appendRadio(fixture);
    appendRadio(fixture, { checked: '' });

    await settleFixture(fixture);
    await expect
      .element(page.getByTestId('radio-states'))
      .toMatchScreenshot('radio-states.png');
  });

  it('should match the disabled state matrix', async () => {
    const fixture = createFixture('radio-disabled');
    appendRadio(fixture, { disabled: '' });
    appendRadio(fixture, { checked: '', disabled: '' });

    await settleFixture(fixture);
    await expect
      .element(page.getByTestId('radio-disabled'))
      .toMatchScreenshot('radio-disabled.png');
  });

  it('should match the hovered radio', async () => {
    const fixture = createFixture('radio-hovered');
    const element = appendRadio(fixture, { checked: '' });

    await settleFixture(fixture);
    await userEvent.hover(element);

    await expect
      .element(page.getByTestId('radio-hovered'))
      .toMatchScreenshot('radio-hovered.png');
  });

  it('should match the keyboard-focused radio', async () => {
    const fixture = createFixture('radio-focused');
    appendRadio(fixture);

    await settleFixture(fixture);
    await userEvent.tab();

    await expect
      .element(page.getByTestId('radio-focused'))
      .toMatchScreenshot('radio-focused.png');
  });
});
