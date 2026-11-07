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
  /**
   * How many live objects a heap snapshot holds whose constructor is `name`. A
   * module-private class is reachable this way and no other.
   */
  countHeapObjects: defineBrowserCommand<[string]>(
    async (context, name): Promise<number> => {
      const cdp = (await cdpOf(context)) as CdpSession &
        Readonly<{
          on(
            event: string,
            listener: (params: { chunk: string }) => void,
          ): void;
          off(
            event: string,
            listener: (params: { chunk: string }) => void,
          ): void;
        }>;
      const chunks: string[] = [];
      const collect = (params: { chunk: string }): void => {
        chunks.push(params.chunk);
      };

      cdp.on('HeapProfiler.addHeapSnapshotChunk', collect);
      await cdp.send('HeapProfiler.collectGarbage');
      await cdp.send('HeapProfiler.takeHeapSnapshot', {
        reportProgress: false,
      });
      cdp.off('HeapProfiler.addHeapSnapshotChunk', collect);

      const snapshot = JSON.parse(chunks.join('')) as HeapSnapshot;
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
  /**
   * Bytes allocated by `path:function`, for frames whose url's path starts with
   * `urlPart`. The key's path is the rest of the url's path, so a frame is keyed
   * by where its module is, not by its file's base name.
   */
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

type HeapSnapshot = Readonly<{
  snapshot: Readonly<{
    meta: Readonly<{
      node_fields: readonly string[];
      node_types: readonly unknown[];
    }>;
  }>;
  nodes: readonly number[];
  strings: readonly string[];
}>;

type HeapNode = Readonly<{
  callFrame: Readonly<{ url: string; functionName: string }>;
  selfSize: number;
  children: readonly HeapNode[];
}>;
