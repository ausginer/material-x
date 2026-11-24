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
  down(options: Readonly<{ button: Button }>): Promise<void>;
  up(options: Readonly<{ button: Button }>): Promise<void>;
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
  down(params: Readonly<{ button: number }>): ActionChain;
  up(params: Readonly<{ button: number }>): ActionChain;
  perform(skipRelease?: boolean): Promise<void>;
}

interface CdpSession {
  send(method: string, params?: unknown): Promise<unknown>;
}

interface Page {
  readonly mouse: Mouse;
  emulateMedia(options: Readonly<Record<string, string>>): Promise<void>;
  context(): { newCDPSession(page: Page): Promise<CdpSession> };
}

type Button = 'left' | 'right';

type Context = Readonly<{
  provider: Readonly<{ name: string }>;
  page: Page;
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

/** The buttons as WebDriver numbers them. */
const BUTTONS: Readonly<Record<Button, number>> = { left: 0, right: 2 };

/*
 * One WebDriver pointer under a fixed id, and `perform(true)` doesn't release
 * it, so a press lasts from `pointerPress` to `pointerRelease`, as Playwright's
 * mouse does.
 */
const POINTER = {
  id: 'material-x-pointer',
  parameters: { pointerType: 'mouse' },
} as const;

const sessions = new WeakMap<Page, Promise<CdpSession>>();

export const inputBrowserCommands: Readonly<
  Record<string, BrowserCommand<any[]>>
> = {
  pointerPress: defineBrowserCommand<[number, number, Button?]>(
    async (context, x, y, button = 'left'): Promise<void> => {
      const { provider, page, browser } = context as unknown as Context;

      if (provider.name === 'playwright') {
        await page.mouse.move(x, y);
        await page.mouse.down({ button });
        return;
      }

      await browser
        .action('pointer', POINTER)
        .move({ x, y, origin: 'viewport', duration: 0 })
        .down({ button: BUTTONS[button] })
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
  emulateForcedColors: defineBrowserCommand<[boolean]>(
    async (context, forced): Promise<void> => {
      const { provider, page } = context as unknown as Context;

      if (provider.name !== 'playwright') {
        throw new Error('emulateForcedColors needs Playwright');
      }

      await page.emulateMedia({ forcedColors: forced ? 'active' : 'none' });
    },
  ),
  // `Input.dispatchTouchEvent` goes through Chromium's own gesture recognition,
  // so a pan scrolls the page and cancels the pointer, as a finger's does.
  touch: defineBrowserCommand<
    [
      'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
      ...Array<readonly [number, number, id?: number]>,
    ]
  >(async (context, type, ...points): Promise<void> => {
    const { provider, page } = context as unknown as Context;

    if (provider.name !== 'playwright') {
      throw new Error('touch needs Playwright');
    }

    // One session for a page, because a finger is down across calls.
    let session = sessions.get(page);

    if (!session) {
      session = page.context().newCDPSession(page);
      sessions.set(page, session);
    }

    await (
      await session
    ).send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map(([x, y, id], index) => ({
        x,
        y,
        id: id ?? index,
      })),
    });
  }),
  pointerRelease: defineBrowserCommand<[Button?]>(
    async (context, button = 'left'): Promise<void> => {
      const { provider, page, browser } = context as unknown as Context;

      if (provider.name === 'playwright') {
        await page.mouse.up({ button });
        return;
      }

      await browser
        .action('pointer', POINTER)
        .up({ button: BUTTONS[button] })
        .perform(true);
    },
  ),
};
