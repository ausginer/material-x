/**
 * Why WebKit raises "ResizeObserver loop completed with undelivered
 * notifications" on the box-quad stories that draw from a `ResizeObserver`.
 * Each `ResizeObserver` the page creates is wrapped before the page loads, and
 * the probe logs its creation, each delivery, and each page error in order. For
 * each delivery it also counts the `childList` and `characterData` records that
 * the callback itself makes under `#storybook-root`.
 *
 * Run from the repository root after `aube exec just docs-build`:
 * `node packages/box-quad/.plan/probes/storybook-demo/resize-observer-diagnosis.ts`.
 */
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname } from 'node:path';
import { webkit } from 'playwright';

const docs = new URL('../../../../../.docs/', import.meta.url);
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
console.log(`WebKit ${browser.version()}, width 1000`);

for (const id of ['live-demo', 'nested-spaces', 'failed-reads']) {
  const page = await browser.newPage({
    viewport: { width: 1000, height: 720 },
  });
  const lines: string[] = [];
  page.on('console', (message) => lines.push(message.text()));
  page.on('pageerror', (error) => lines.push(`page error: ${error.message}`));
  await page.addInitScript(() => {
    const Native = ResizeObserver;
    let count = 0;
    window.ResizeObserver = class extends Native {
      constructor(callback: ResizeObserverCallback) {
        const index = ++count;
        const source = /assets\/([a-z.-]+)-/u.exec(
          new Error().stack!.split('\n')[1]!,
        )![1];
        super((entries, observer) => {
          const recorder = new MutationObserver(() => {});
          recorder.observe(document.getElementById('storybook-root')!, {
            subtree: true,
            childList: true,
            characterData: true,
          });
          callback(entries, observer);
          const types = recorder.takeRecords().map((record) => record.type);
          recorder.disconnect();
          console.log(
            `observer ${index} (${source}) delivers ${entries
              .map((entry) => entry.target.nodeName.toLowerCase())
              .join(', ')}: its callback makes ${
              types.filter((type) => type === 'childList').length
            } childList and ${
              types.filter((type) => type === 'characterData').length
            } characterData records`,
          );
        });
        console.log(`observer ${index} created by ${source}`);
      }
    };
  });
  await page.goto(
    `${origin}${BASE}iframe.html?id=box-quad--${id}&viewMode=story`,
  );
  await page.waitForSelector('#storybook-root > *');
  await page.waitForTimeout(500);
  console.log(`\n## ${id}`);

  for (const line of lines.filter((text) => !text.startsWith('Successfully'))) {
    console.log(`  ${line}`);
  }

  await page.close();
}

await browser.close();
server.close();
