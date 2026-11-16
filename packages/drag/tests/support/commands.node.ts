/**
 * Real input, exposed to the browser suite as commands. Node side:
 * `tests/support/browser-commands.ts` declares these for the browser.
 *
 * Each command runs on the provider that runs the test: Playwright's page for
 * Chromium and Firefox, and WebDriver actions for Safari, with the same
 * arguments, result and coordinates. A command that WebDriver can't perform,
 * which is every CDP command and the reduced-motion emulation, throws there and
 * names itself. The CDP commands are Chromium only, and a test that uses them
 * runs only there.
 */
import { defineBrowserCommand } from '@vitest/browser';
import type { BrowserCommand } from 'vitest/node';
import { Key } from 'webdriverio';
import {
  type SnapshotSession,
  takeHeapSnapshot,
} from './heap-snapshot.node.ts';

interface CdpSession {
  send(method: string, params?: unknown): Promise<unknown>;
}

interface Page {
  readonly mouse: {
    move(x: number, y: number, options?: { steps?: number }): Promise<void>;
    down(): Promise<void>;
    up(): Promise<void>;
  };
  readonly keyboard: { press(key: string): Promise<void> };
  emulateMedia(options: Readonly<{ reducedMotion: string }>): Promise<void>;
  context(): { newCDPSession(page: unknown): Promise<CdpSession> };
}

const pageOf = (context: unknown): Page =>
  (context as Readonly<{ page: Page }>).page;

/** The part of a WebdriverIO browser that the commands use. */
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

interface KeyChain {
  down(value: string): KeyChain;
  up(value: string): KeyChain;
  perform(skipRelease?: boolean): Promise<void>;
}

interface WebdriverBrowser {
  action(
    type: 'pointer',
    params: Readonly<{
      id: string;
      parameters: Readonly<{ pointerType: 'mouse' }>;
    }>,
  ): ActionChain;
  action(type: 'key', params: Readonly<{ id: string }>): KeyChain;
}

const providerOf = (context: unknown): string =>
  (context as Readonly<{ provider: Readonly<{ name: string }> }>).provider.name;

const browserOf = (context: unknown): WebdriverBrowser =>
  (context as Readonly<{ browser: WebdriverBrowser }>).browser;

/*
 * One pointer and one keyboard per WebDriver session, under fixed ids, and no
 * command releases them: a press lasts from `pointerDown` to `pointerUp`, as
 * Playwright's mouse does. The pointer's position is kept here, because a move
 * with steps interpolates from it, and Playwright's pointer starts at the
 * origin.
 */
const POINTER = {
  id: 'drag-pointer',
  parameters: { pointerType: 'mouse' },
} as const;
const KEYBOARD = { id: 'drag-keyboard' } as const;
const positions = new WeakMap<
  WebdriverBrowser,
  Readonly<{ x: number; y: number }>
>();

function pointer(context: unknown): ActionChain {
  return browserOf(context).action('pointer', POINTER);
}

/** A command that only the Playwright provider can perform. */
function playwrightOnly<A extends unknown[], R = void>(
  name: string,
  run: (context: unknown, ...args: A) => Promise<R>,
): BrowserCommand<A> {
  return defineBrowserCommand<A>(async (context, ...args): Promise<R> => {
    const provider = providerOf(context);

    if (provider !== 'playwright') {
      throw new Error(
        `${name} has no implementation for the ${provider} provider`,
      );
    }

    return await run(context, ...args);
  });
}

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
      if (providerOf(context) === 'playwright') {
        await pageOf(context).mouse.move(x, y, steps ? { steps } : undefined);
        return;
      }

      // As Playwright's `steps`: that many moves, evenly spaced from the
      // pointer's position, each its own event.
      const browser = browserOf(context);
      const from = positions.get(browser) ?? { x: 0, y: 0 };
      const count = Math.max(steps ?? 1, 1);
      let chain = pointer(context);

      for (let step = 1; step <= count; step += 1) {
        chain = chain.move({
          x: Math.round(from.x + ((x - from.x) * step) / count),
          y: Math.round(from.y + ((y - from.y) * step) / count),
          origin: 'viewport',
          duration: 0,
        });
      }

      await chain.perform(true);
      positions.set(browser, { x, y });
    },
  ),
  pointerDown: defineBrowserCommand<[]>(async (context): Promise<void> => {
    if (providerOf(context) === 'playwright') {
      await pageOf(context).mouse.down();
      return;
    }

    await pointer(context).down({ button: 0 }).perform(true);
  }),
  pointerUp: defineBrowserCommand<[]>(async (context): Promise<void> => {
    if (providerOf(context) === 'playwright') {
      await pageOf(context).mouse.up();
      return;
    }

    await pointer(context).up({ button: 0 }).perform(true);
  }),
  keyPress: defineBrowserCommand<[string]>(
    async (context, key): Promise<void> => {
      if (providerOf(context) === 'playwright') {
        await pageOf(context).keyboard.press(key);
        return;
      }

      // Playwright's key names, as WebDriver's key codes.
      const value = (Key as Readonly<Record<string, string>>)[key] ?? key;

      await browserOf(context)
        .action('key', KEYBOARD)
        .down(value)
        .up(value)
        .perform(true);
    },
  ),
  emulateReducedMotion: playwrightOnly<[boolean]>(
    'emulateReducedMotion',
    async (context, reduced): Promise<void> => {
      await pageOf(context).emulateMedia({
        // Explicit, because `null` leaves the emulation in place in WebKit.
        reducedMotion: reduced ? 'reduce' : 'no-preference',
      });
    },
  ),
  /** One touch event with CDP, which reaches the platform's own pipeline. */
  touch: playwrightOnly<[string, readonly TouchPoint[]]>(
    'touch',
    async (context, type, points): Promise<void> => {
      const cdp = await cdpOf(context);

      await cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: points,
      });
    },
  ),
  forceGarbageCollection: playwrightOnly<[]>(
    'forceGarbageCollection',
    async (context): Promise<void> => {
      const cdp = await cdpOf(context);

      await cdp.send('HeapProfiler.collectGarbage');
    },
  ),
  /**
   * How many live objects a heap snapshot holds whose constructor is `name`. A
   * module-private class is reachable this way and no other.
   */
  countHeapObjects: playwrightOnly<[string], number>(
    'countHeapObjects',
    async (context, name): Promise<number> => {
      const cdp = (await cdpOf(context)) as SnapshotSession;

      await cdp.send('HeapProfiler.collectGarbage');

      const snapshot = await takeHeapSnapshot(cdp);
      const fields = snapshot.snapshot.meta.node_fields;
      const types = snapshot.snapshot.meta.node_types[0] as readonly string[];
      const typeField = fields.indexOf('type');
      const nameField = fields.indexOf('name');
      const objectType = types.indexOf('object');
      const { nodes, strings } = snapshot;
      let count = 0;

      for (let i = 0; i < nodes.length; i += fields.length) {
        if (
          nodes[i + typeField] === objectType &&
          strings[nodes[i + nameField]!] === name
        ) {
          count += 1;
        }
      }

      return count;
    },
  ),
  startHeapSampling: playwrightOnly<[number]>(
    'startHeapSampling',
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
  /**
   * Bytes allocated by `path:function`, for frames whose url's path starts with
   * `urlPart`. The key's path is the rest of the url's path, so a frame is keyed
   * by where its module is, not by its file's base name.
   */
  stopHeapSampling: playwrightOnly<[string], Record<string, number>>(
    'stopHeapSampling',
    async (context, urlPart): Promise<Record<string, number>> => {
      const cdp = await cdpOf(context);
      const { profile } = (await cdp.send('HeapProfiler.stopSampling')) as {
        profile: { head: HeapNode };
      };
      const bytes: Record<string, number> = {};
      // A built-in such as `push` has no url, and its bytes belong to its caller.
      const visit = (node: HeapNode, caller: string | null): void => {
        const { url, functionName } = node.callFrame;
        const path = url && new URL(url).pathname;
        const key = path.startsWith(urlPart)
          ? `${path.slice(urlPart.length)}:${functionName}`
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
