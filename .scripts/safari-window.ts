/**
 * Safari opens its window with a viewport shorter than the 1280 × 720 test
 * frame, and WebDriver delivers no pointer action outside the window's
 * viewport. So, before a file's tests, the window grows until the frame fits in
 * it (`repo:RD-12` property 3). The frame itself is never scaled.
 */
import { defineBrowserCommand } from '@vitest/browser';
import type { BrowserCommand } from 'vitest/node';

/** The frame's far corner and the top-level window's sizes. */
type Fit = Readonly<{
  right: number;
  bottom: number;
  innerWidth: number;
  innerHeight: number;
  outerWidth: number;
  outerHeight: number;
}>;

interface WebdriverBrowser {
  execute<R>(script: () => R): Promise<R>;
  setWindowSize(width: number, height: number): Promise<void>;
}

function read(browser: WebdriverBrowser): Promise<Fit> {
  // Runs in the test frame, which is same-origin with the top-level page.
  return browser.execute(() => {
    const { top } = window;
    const rect = window.frameElement!.getBoundingClientRect();

    return {
      right: rect.right,
      bottom: rect.bottom,
      innerWidth: top!.innerWidth,
      innerHeight: top!.innerHeight,
      outerWidth: top!.outerWidth,
      outerHeight: top!.outerHeight,
    };
  });
}

const fits = (fit: Fit): boolean =>
  fit.right <= fit.innerWidth && fit.bottom <= fit.innerHeight;

const describe = (fit: Fit): string =>
  `frame to ${fit.right} × ${fit.bottom} in a ${fit.innerWidth} × ${fit.innerHeight} viewport`;

export const fitSafariWindow: BrowserCommand = defineBrowserCommand(
  async (context): Promise<void> => {
    const { browser } = context as unknown as Readonly<{
      browser: WebdriverBrowser;
    }>;
    const before = await read(browser);

    if (fits(before)) {
      return;
    }

    await browser.setWindowSize(
      before.outerWidth +
        Math.max(0, Math.ceil(before.right - before.innerWidth)),
      before.outerHeight +
        Math.max(0, Math.ceil(before.bottom - before.innerHeight)),
    );

    const after = await read(browser);

    if (!fits(after)) {
      throw new Error(
        `Safari's window can't show the test frame: ${describe(after)}`,
      );
    }

    console.warn(
      `Safari's window grew from a ${describe(before)} to a ${describe(after)}`,
    );
  },
);
