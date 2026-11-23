/**
 * A control for resize-observer-errors.ts: every story of the built docs site
 * in WebKit, with the page errors each raises within 500 ms of rendering.
 *
 * Run from the repository root after `aube exec just docs-build`:
 * `node packages/box-quad/.plan/reviews/storybook-1/probes/webkit-errors-all-stories.ts`.
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
const index = JSON.parse(
  await readFile(new URL('index.json', docs), 'utf8'),
) as {
  entries: Record<string, { type: string }>;
};
const ids = Object.entries(index.entries)
  .filter(([, entry]) => entry.type === 'story')
  .map(([id]) => id);
const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 720 } });
let errors: string[] = [];
page.on('pageerror', (error) => errors.push(error.message));
const raising: string[] = [];

for (const id of ids) {
  errors = [];
  await page.goto(`${origin}${BASE}iframe.html?id=${id}&viewMode=story`);
  await page
    .waitForSelector('#storybook-root > *', { timeout: 10000 })
    .catch(() => {});
  await page.waitForTimeout(500);
  if (errors.length > 0) {
    raising.push(`${id}: ${[...new Set(errors)].join(' | ')}`);
  }
}

console.log(
  `WebKit ${browser.version()}: ${ids.length} stories, ${raising.length} raise a page error`,
);
for (const line of raising) {
  console.log(`  ${line}`);
}
await browser.close();
server.close();
