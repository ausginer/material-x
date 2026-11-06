/**
 * Playwright's real input, exposed to the browser suite as commands. Node side:
 * `tests/support/browser-commands.ts` declares these for the browser.
 *
 * The CDP commands are Chromium only, and a test that uses them runs only there.
 */
import { defineBrowserCommand } from '@vitest/browser';
import type { BrowserCommand } from 'vitest/node';

type CdpSession = Readonly<{
  send(method: string, params?: unknown): Promise<unknown>;
}>;

type Page = Readonly<{
  mouse: Readonly<{
    move(x: number, y: number, options?: { steps?: number }): Promise<void>;
    down(): Promise<void>;
    up(): Promise<void>;
  }>;
  keyboard: Readonly<{ press(key: string): Promise<void> }>;
  emulateMedia(options: Readonly<{ reducedMotion: string }>): Promise<void>;
  context(): Readonly<{ newCDPSession(page: unknown): Promise<CdpSession> }>;
}>;

const pageOf = (context: unknown): Page =>
  (context as Readonly<{ page: Page }>).page;

const sessions = new WeakMap<Page, CdpSession>();

async function cdpOf(context: unknown): Promise<CdpSession> {
  const page = pageOf(context);
  let session = sessions.get(page);

  if (!session) {
    session = await page.context().newCDPSession(page);
    sessions.set(page, session);
  }

  return session;
}

type TouchPoint = Readonly<{ id: number; x: number; y: number }>;

export const dragBrowserCommands: Record<string, BrowserCommand<any[]>> = {
  pointerMove: defineBrowserCommand<[number, number, number?]>(
    async (context, x, y, steps): Promise<void> => {
      await pageOf(context).mouse.move(x, y, steps ? { steps } : undefined);
    },
  ),
  pointerDown: defineBrowserCommand<[]>(async (context): Promise<void> => {
    await pageOf(context).mouse.down();
  }),
  pointerUp: defineBrowserCommand<[]>(async (context): Promise<void> => {
    await pageOf(context).mouse.up();
  }),
  keyPress: defineBrowserCommand<[string]>(
    async (context, key): Promise<void> => {
      await pageOf(context).keyboard.press(key);
    },
  ),
  emulateReducedMotion: defineBrowserCommand<[boolean]>(
    async (context, reduced): Promise<void> => {
      await pageOf(context).emulateMedia({
        // Explicit, because `null` leaves the emulation in place in WebKit.
        reducedMotion: reduced ? 'reduce' : 'no-preference',
      });
    },
  ),
  /** One touch event with CDP, which reaches the platform's own pipeline. */
  touch: defineBrowserCommand<[string, readonly TouchPoint[]]>(
    async (context, type, points): Promise<void> => {
      const cdp = await cdpOf(context);

      await cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: points,
      });
    },
  ),
  /** A tap the platform's gesture recognizer turns into a click. */
  tap: defineBrowserCommand<[number, number]>(
    async (context, x, y): Promise<void> => {
      const cdp = await cdpOf(context);

      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
      await cdp.send('Input.synthesizeTapGesture', {
        x,
        y,
        gestureSourceType: 'touch',
      });
    },
  ),
  forceGarbageCollection: defineBrowserCommand<[]>(
    async (context): Promise<void> => {
      const cdp = await cdpOf(context);

      await cdp.send('HeapProfiler.collectGarbage');
    },
  ),
  startHeapSampling: defineBrowserCommand<[number]>(
    async (context, interval): Promise<void> => {
      const cdp = await cdpOf(context);

      await cdp.send('HeapProfiler.enable');
      await cdp.send('HeapProfiler.startSampling', {
        samplingInterval: interval,
        includeObjectsCollectedByMajorGC: true,
        includeObjectsCollectedByMinorGC: true,
      });
    },
  ),
  /** Bytes allocated by `file:function`, for frames from `urlPart`. */
  stopHeapSampling: defineBrowserCommand<[string]>(
    async (context, urlPart): Promise<Record<string, number>> => {
      const cdp = await cdpOf(context);
      const { profile } = (await cdp.send('HeapProfiler.stopSampling')) as {
        profile: { head: HeapNode };
      };
      const bytes: Record<string, number> = {};
      // A built-in such as `push` has no url, and its bytes belong to its caller.
      const visit = (node: HeapNode, caller: string | null): void => {
        const { url, functionName } = node.callFrame;
        const key = url.includes(urlPart)
          ? `${url.slice(url.lastIndexOf('/') + 1).split('?')[0]}:${functionName}`
          : url
            ? null
            : caller;

        if (node.selfSize > 0 && key) {
          bytes[key] = (bytes[key] ?? 0) + node.selfSize;
        }

        for (const child of node.children) {
          visit(child, key);
        }
      };

      visit(profile.head, null);
      return bytes;
    },
  ),
};

type HeapNode = Readonly<{
  callFrame: Readonly<{ url: string; functionName: string }>;
  selfSize: number;
  children: readonly HeapNode[];
}>;
