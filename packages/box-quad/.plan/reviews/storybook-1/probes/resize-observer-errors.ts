/**
 * Which box-quad story raises "ResizeObserver loop completed with undelivered
 * notifications", in which engine and at which viewport width. Each story is
 * opened in a fresh page, held for 500 ms, and its page errors counted.
 *
 * Run from the repository root after `aube exec just docs-build`:
 * `node packages/box-quad/.plan/reviews/storybook-1/probes/resize-observer-errors.ts`.
 */
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';

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

for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch();
  console.log(`\n## ${type.name()} ${browser.version()}`);

  for (const width of [1000, 375]) {
    for (const [id, mode] of [
      ['live-demo', 'story'],
      ['nested-spaces', 'story'],
      ['pointer-delta', 'story'],
      ['failed-reads', 'story'],
      ['docs', 'docs'],
    ] as const) {
      const page = await browser.newPage({ viewport: { width, height: 720 } });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(
        `${origin}${BASE}iframe.html?id=box-quad--${id}&viewMode=${mode}`,
      );
      await page.waitForSelector('#storybook-root > *, #storybook-docs > *');
      await page.waitForTimeout(500);
      const shown = await page.evaluate(
        () =>
          document.querySelector(
            '.sb-show-errordisplay, .sb-errordisplay:not([hidden])',
          ) !== null &&
          document.body.classList.contains('sb-show-errordisplay'),
      );
      console.log(
        `  width ${width} ${id.padEnd(14)} page errors: ${errors.length}${errors.length ? ` (${[...new Set(errors)].join(' | ')})` : ''}; Storybook error display: ${shown}`,
      );
      await page.close();
    }
  }

  await browser.close();
}

server.close();
