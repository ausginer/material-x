/**
 * Real pointer input that `userEvent` can't express: a press held across an
 * observation, and a move while it is held. Also the reduced-motion
 * emulation, which only Playwright performs. Node side; `tests/support/browser-commands.ts` declares these
 * for the browser.
 *
 * Each command runs on the provider that runs the test: Playwright's mouse for
 * Chromium, Firefox and WebKit, and WebDriver actions for Safari. Coordinates
 * are the viewport's CSS pixels.
 */
import { defineBrowserCommand } from '@vitest/browser';
import type { BrowserCommand } from 'vitest/node';

interface Mouse {
  move(
    x: number,
    y: number,
    options?: Readonly<{ steps: number }>,
  ): Promise<void>;
  down(): Promise<void>;
  up(): Promise<void>;
}

interface ActionChain {
  move(
    params: Readonly<{
      x: number;
      y: number;
      origin: 'viewport';
      duration: number;
    }>,
  ): ActionChain;
  down(params: Readonly<{ button: 0 }>): ActionChain;
  up(params: Readonly<{ button: 0 }>): ActionChain;
  perform(skipRelease?: boolean): Promise<void>;
}

type Context = Readonly<{
  provider: Readonly<{ name: string }>;
  page: Readonly<{
    mouse: Mouse;
    emulateMedia(options: Readonly<{ reducedMotion: string }>): Promise<void>;
  }>;
  browser: Readonly<{
    action(
      type: 'pointer',
      params: Readonly<{
        id: string;
        parameters: Readonly<{ pointerType: 'mouse' }>;
      }>,
    ): ActionChain;
  }>;
}>;

/*
 * One WebDriver pointer under a fixed id, and `perform(true)` doesn't release
 * it, so a press lasts from `pointerPress` to `pointerRelease`, as Playwright's
 * mouse does.
 */
const POINTER = {
  id: 'material-x-pointer',
  parameters: { pointerType: 'mouse' },
} as const;

export const inputBrowserCommands: Readonly<
  Record<string, BrowserCommand<any[]>>
> = {
  pointerPress: defineBrowserCommand<[number, number]>(
    async (context, x, y): Promise<void> => {
      const { provider, page, browser } = context as unknown as Context;

      if (provider.name === 'playwright') {
        await page.mouse.move(x, y);
        await page.mouse.down();
        return;
      }

      await browser
        .action('pointer', POINTER)
        .move({ x, y, origin: 'viewport', duration: 0 })
        .down({ button: 0 })
        .perform(true);
    },
  ),
  pointerMove: defineBrowserCommand<[number, number, number]>(
    async (context, x, y, steps): Promise<void> => {
      const { provider, page, browser } = context as unknown as Context;

      if (provider.name === 'playwright') {
        await page.mouse.move(x, y, { steps });
        return;
      }

      await browser
        .action('pointer', POINTER)
        .move({ x, y, origin: 'viewport', duration: steps * 16 })
        .perform(true);
    },
  ),
  emulateReducedMotion: defineBrowserCommand<[boolean]>(
    async (context, reduced): Promise<void> => {
      const { provider, page } = context as unknown as Context;

      if (provider.name !== 'playwright') {
        throw new Error('emulateReducedMotion needs Playwright');
      }

      // Explicit, because `null` leaves the emulation in place in WebKit.
      await page.emulateMedia({
        reducedMotion: reduced ? 'reduce' : 'no-preference',
      });
    },
  ),
  pointerRelease: defineBrowserCommand<[]>(async (context): Promise<void> => {
    const { provider, page, browser } = context as unknown as Context;

    if (provider.name === 'playwright') {
      await page.mouse.up();
      return;
    }

    await browser.action('pointer', POINTER).up({ button: 0 }).perform(true);
  }),
};
