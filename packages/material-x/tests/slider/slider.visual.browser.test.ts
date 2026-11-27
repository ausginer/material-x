import { afterEach, describe, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import type Slider from '../../src/slider/slider.ts';
import '../../src/slider/slider.ts';
import {
  nextFrame,
  nextPaint,
  settleAnimations,
  whenFontsReady,
} from '../browser.ts';

const VALUES = ['0', '40', '100'] as const;

function createFixture(name: string): HTMLDivElement {
  const fixture = document.createElement('div');
  fixture.className = 'mx-test-fixture';
  fixture.dataset['testid'] = name;
  // Room for the value indicator inside the captured box.
  fixture.style.paddingBlockStart = '80px';
  document.body.append(fixture);
  return fixture;
}

function appendSlider(
  fixture: HTMLElement,
  attrs: Readonly<Record<string, string>> = {},
): Slider {
  const slider = document.createElement('mx-slider');
  slider.style.inlineSize = '204px';

  for (const [name, value] of Object.entries(attrs)) {
    slider.setAttribute(name, value);
  }

  fixture.append(slider);
  return slider;
}

function appendValues(
  fixture: HTMLElement,
  attrs: Readonly<Record<string, string>> = {},
): void {
  for (const value of VALUES) {
    appendSlider(fixture, { ...attrs, value });
  }
}

async function capture(fixture: HTMLElement): Promise<void> {
  await whenFontsReady();
  await Promise.all(
    [...fixture.children].map((child) =>
      settleAnimations(child as HTMLElement),
    ),
  );
  await nextFrame();

  const name = fixture.dataset['testid']!;

  await expect.element(page.getByTestId(name)).toMatchScreenshot(`${name}.png`);
}

afterEach(async () => {
  await commands.pointerRelease().catch(() => {});
  await commands.emulateForcedColors(false);
});

describe('slider visual regression', () => {
  it.each(['xsmall', 'small', 'medium', 'large', 'xlarge'])(
    'should match the %s slider at three values',
    async (size) => {
      const fixture = createFixture(`slider-${size}`);
      appendValues(fixture, size === 'xsmall' ? {} : { size });

      await capture(fixture);
    },
  );

  it('should match the disabled slider', async () => {
    const fixture = createFixture('slider-disabled');
    appendValues(fixture, { disabled: '' });

    await capture(fixture);
  });

  it('should match the slider in RTL', async () => {
    const fixture = createFixture('slider-rtl');
    appendValues(fixture, { dir: 'rtl' });

    await capture(fixture);
  });

  it('should match the held slider with its value indicator', async () => {
    const fixture = createFixture('slider-held');
    const slider = appendSlider(fixture, { indicator: '', value: '40' });

    await whenFontsReady();
    await nextPaint();
    const { left, top, width, height } = slider.getBoundingClientRect();
    await commands.pointerPress(left + width * 0.6, top + height / 2);

    await capture(fixture);
  });

  it('should match the keyboard-focused slider', async () => {
    const fixture = createFixture('slider-focused');
    appendSlider(fixture, { indicator: '', value: '40' });

    await whenFontsReady();
    await nextPaint();
    await userEvent.tab();

    await capture(fixture);
  });

  it('should match the sliders in forced colors', async () => {
    await commands.emulateForcedColors(true);
    const fixture = createFixture('slider-forced-colors');
    appendValues(fixture);
    appendValues(fixture, { disabled: '' });

    await capture(fixture);
  });
});
