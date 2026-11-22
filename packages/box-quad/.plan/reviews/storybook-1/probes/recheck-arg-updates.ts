/**
 * The recheck's WebKit reading of arg changes: each story that draws from a
 * `ResizeObserver` is rendered, then given 10 arg updates through Storybook's
 * preview channel, and its page errors are counted. An arg change re-runs the
 * layout effect, which creates a new observer whose first delivery draws.
 *
 * Run from the repository root after `aube exec just docs-build`:
 * `node packages/box-quad/.plan/reviews/storybook-1/probes/recheck-arg-updates.ts`.
 */
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname } from 'node:path';
import { webkit } from 'playwright';

const docs = new URL('../../../../../../.docs/', import.meta.url);
const BASE = '/material-x/';
const TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
const server = createServer((request, response) => {
  const path = new URL(request.url!, 'http://x').pathname;
  readFile(new URL(path.slice(BASE.length) || 'index.html', docs)).then(
    (body) => {
      response
        .writeHead(200, {
          'content-type': TYPES[extname(path)] ?? 'application/octet-stream',
        })
        .end(body);
    },
    () => {
      response.writeHead(404).end();
    },
  );
});
await new Promise<void>((resolve) => {
  server.listen(0, '127.0.0.1', resolve);
});
const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const browser = await webkit.launch();

for (const [id, key, values] of [
  ['live-demo', 'rotation', [-55, -30, -10, 0, 10, 20, 30, 40, 50, 55]],
  [
    'nested-spaces',
    'ancestorZoom',
    [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 1.1, 0.9, 1.3],
  ],
] as const) {
  const page = await browser.newPage({
    viewport: { width: 1000, height: 720 },
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(
    `${origin}${BASE}iframe.html?id=box-quad--${id}&viewMode=story`,
  );
  await page.waitForSelector('#storybook-root > *');
  await page.waitForTimeout(300);
  const before = errors.length;
  let applied = 0;

  for (const value of values) {
    await page.evaluate(
      ([storyId, name, next]) => {
        (
          window as unknown as {
            __STORYBOOK_ADDONS_CHANNEL__: {
              emit(event: string, data: unknown): void;
            };
          }
        ).__STORYBOOK_ADDONS_CHANNEL__.emit('updateStoryArgs', {
          storyId,
          updatedArgs: { [name]: next },
        });
      },
      [`box-quad--${id}`, key, value] as const,
    );
    await page.waitForTimeout(100);
    const read = await page.evaluate(
      () => document.querySelector('#storybook-root [data-first]')?.textContent,
    );
    applied += read === undefined ? 0 : 1;
  }

  const shown = await page.evaluate(() =>
    document
      .querySelector(
        '#storybook-root [style*="rotate"], #storybook-root [style*="zoom"]',
      )
      ?.getAttribute('style'),
  );
  console.log(
    `WebKit ${browser.version()} ${id}: page errors on load ${before}, after 10 updates of ${key} ${errors.length - before}; last style ${JSON.stringify(shown)}`,
  );
  await page.close();
}

await browser.close();
server.close();
