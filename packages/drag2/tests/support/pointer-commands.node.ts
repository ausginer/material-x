/**
 * Playwright's real input pipeline, exposed to the browser suite as commands.
 *
 * **M-6 exists because a dispatched event is not an input event** (D-97). The
 * census counts writes per rendering opportunity, and the only regime that can
 * answer it is a pointer stream the *user agent* has to decide how to deliver:
 * whether to coalesce, and how many movements to carry in one `pointermove`.
 * `element.dispatchEvent` skips that decision entirely — it delivers exactly
 * what the caller wrote, at exactly the caller's rate, which is the artificial
 * many-samples-per-frame regime D-96 already ruled out as evidence.
 *
 * These commands therefore drive `page.mouse`, which reaches Chromium through
 * `Input.dispatchMouseEvent` — the same path a real device takes, and the only
 * one whose coalescing behaviour is the browser's own.
 *
 * **Node side, and deliberately not a test file.** The drag2 node project
 * matches `tests/**\/*.node.test.ts`, so this module is loaded by the config
 * rather than collected as a suite.
 */
import { defineBrowserCommand } from '@vitest/browser';
import type { BrowserCommand } from 'vitest/node';

type Page = Readonly<{
  mouse: Readonly<{
    move(x: number, y: number, options?: { steps?: number }): Promise<void>;
    down(): Promise<void>;
    up(): Promise<void>;
  }>;
}>;

/**
 * The provider's Playwright page. Typed structurally rather than imported from
 * `playwright`: this package does not depend on it, and the three methods below
 * are the whole of what M-6 needs.
 */
const pageOf = (context: unknown): Page =>
  (context as Readonly<{ page: Page }>).page;

export const dragBrowserCommands: Record<string, BrowserCommand<any[]>> = {
  /** Press at viewport `(x, y)`. */
  pointerPress: defineBrowserCommand<[number, number]>(
    async (context, x, y): Promise<void> => {
      const { mouse } = pageOf(context);

      await mouse.move(x, y);
      await mouse.down();
    },
  ),

  /**
   * Move to `(x, y)` in `steps` interpolated movements, **as fast as the driver
   * will emit them**. Playwright issues the steps back to back inside one call,
   * which is the fastest stream this pipeline can produce; whether that is
   * faster than presentation is the question the coalescing control answers,
   * and it is not assumed here.
   */
  pointerSweep: defineBrowserCommand<[number, number, number]>(
    async (context, x, y, steps): Promise<void> => {
      await pageOf(context).mouse.move(x, y, { steps });
    },
  ),

  /**
   * A probe, not a workload: `count` moves issued **without awaiting each**, so
   * the driver is not waiting for Chromium to acknowledge one dispatch before
   * sending the next. Used once, to establish whether the sequential rate is a
   * property of the round trip or a ceiling of the pipeline itself.
   */
  pointerFlood: defineBrowserCommand<[number, number, number]>(
    async (context, count, wave): Promise<void> => {
      const { mouse } = pageOf(context);

      for (let sent = 0; sent < count; sent += wave) {
        const issued: Array<Promise<void>> = [];

        for (let i = 0; i < wave; i += 1) {
          const step = sent + i;

          issued.push(mouse.move(100 + (step % 200), 100 + (step % 200)));
        }

        // oxlint-disable-next-line no-await-in-loop -- the wave is the workload
        await Promise.all(issued);
      }
    },
  ),

  /** Release. */
  pointerRelease: defineBrowserCommand<[]>(async (context): Promise<void> => {
    await pageOf(context).mouse.up();
  }),
};
