import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '../../src/icon/icon.ts';
import '../../src/top-app-bar/top-app-bar.ts';
import { nextFrame, whenFontsReady } from '../browser.ts';

function createIcon(slot: string): HTMLElement {
  const icon = document.createElement('mx-icon');
  icon.slot = slot;
  icon.textContent = 'check';
  return icon;
}

/** A bar on a page that scrolls, with its color change switched off. */
async function createBar(): Promise<HTMLElement> {
  const bar = document.createElement('mx-top-app-bar');
  bar.dataset['testid'] = 'bar';
  bar.style.cssText = 'transition: none; inline-size: 480px;';
  const heading = document.createElement('h1');
  heading.textContent = 'Headline';
  bar.append(
    createIcon('lead'),
    heading,
    createIcon('trail'),
    createIcon('trail'),
  );
  const tall = document.createElement('div');
  tall.style.blockSize = '3000px';
  document.body.append(bar, tall);
  await whenFontsReady();
  await nextFrame();
  return bar;
}

afterEach(() => {
  scrollTo({ top: 0, behavior: 'instant' });
});

// The state follows the document's scroll position, so one document can't show
// both states at once, and each has its own screenshot.
describe('mx-top-app-bar visual regression', () => {
  it('should match the bar at rest', async () => {
    await createBar();

    await expect
      .element(page.getByTestId('bar'))
      .toMatchScreenshot('top-app-bar-rest.png');
  });

  it('should match the scrolled bar', async () => {
    const bar = await createBar();
    scrollTo({ top: 300, behavior: 'instant' });
    await expect.poll(() => bar.matches(':state(scrolled)')).toBe(true);

    await expect
      .element(page.getByTestId('bar'))
      .toMatchScreenshot('top-app-bar-scrolled.png');
  });
});
