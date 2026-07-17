import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../../src/checkbox/checkbox.ts';
import { nextFrame, settleAnimations, whenFontsReady } from '../browser.ts';

function createFixture(name: string): HTMLDivElement {
  const fixture = document.createElement('div');
  fixture.className = 'mx-test-fixture';
  fixture.dataset['testid'] = name;
  document.body.append(fixture);
  return fixture;
}

function appendCheckbox(
  fixture: HTMLElement,
  attributes: Readonly<Record<string, string>> = {},
): HTMLElement {
  const element = document.createElement('mx-checkbox');

  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }

  fixture.append(element);
  return element;
}

/**
 * The checked and indeterminate glyphs are revealed by a `forwards` keyframe
 * animation, so every raster settles the shadow animations first; otherwise the
 * capture races the reveal and the glyph appears partially clipped.
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

describe('checkbox visual regression', () => {
  it('should match the selection state matrix', async () => {
    const fixture = createFixture('checkbox-states');
    appendCheckbox(fixture);
    appendCheckbox(fixture, { checked: '' });
    appendCheckbox(fixture, { indeterminate: '' });
    appendCheckbox(fixture, { checked: '', indeterminate: '' });

    await settleFixture(fixture);
    await expect
      .element(page.getByTestId('checkbox-states'))
      .toMatchScreenshot('checkbox-states.png');
  });

  it('should match the disabled state matrix', async () => {
    const fixture = createFixture('checkbox-disabled');
    appendCheckbox(fixture, { disabled: '' });
    appendCheckbox(fixture, { checked: '', disabled: '' });
    appendCheckbox(fixture, { indeterminate: '', disabled: '' });

    await settleFixture(fixture);
    await expect
      .element(page.getByTestId('checkbox-disabled'))
      .toMatchScreenshot('checkbox-disabled.png');
  });

  it('should match the hovered checkbox', async () => {
    const fixture = createFixture('checkbox-hovered');
    const element = appendCheckbox(fixture, { checked: '' });

    await settleFixture(fixture);
    await userEvent.hover(element);

    await expect
      .element(page.getByTestId('checkbox-hovered'))
      .toMatchScreenshot('checkbox-hovered.png');
  });

  it('should match the keyboard-focused checkbox', async () => {
    const fixture = createFixture('checkbox-focused');
    appendCheckbox(fixture);

    await settleFixture(fixture);
    await userEvent.tab();

    await expect
      .element(page.getByTestId('checkbox-focused'))
      .toMatchScreenshot('checkbox-focused.png');
  });
});
