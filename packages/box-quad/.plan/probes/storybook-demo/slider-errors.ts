/**
 * Whether moving the stories' sliders raises a page error, in Chromium, Firefox
 * and WebKit. Each slider of _Live Demo_, _Nested Spaces_ and _Pointer Delta_
 * is focused and moved 20 steps with the keyboard, each step a frame apart. The
 * probe counts the page errors, and the `childList` records under
 * `#storybook-root` while the sliders move: Storybook's highlight addon starts
 * a `ResizeObserver` on `<body>` for each added or removed node, which is what
 * raised WebKit's loop error before the readouts were written through their
 * text nodes.
 *
 * Run from the repository root after `aube exec just docs-build`:
 * `node packages/box-quad/.plan/probes/storybook-demo/slider-errors.ts`.
 */
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';

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
const STORIES = ['live-demo', 'nested-spaces', 'pointer-delta'];
const STEPS = 20;
let failed = false;

for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch();
  console.log(`\n## ${type.name()} ${browser.version()}`);

  for (const id of STORIES) {
    const page = await browser.newPage({
      viewport: { width: 1000, height: 720 },
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(
      `${origin}${BASE}iframe.html?id=box-quad--${id}&viewMode=story`,
    );
    await page.waitForSelector('#storybook-root input[type="range"]');
    await page.evaluate(() => {
      const state = { childList: 0 };
      (globalThis as Record<string, unknown>)['__records'] = state;
      new MutationObserver((records) => {
        state.childList += records.filter(
          (record) => record.type === 'childList',
        ).length;
      }).observe(document.querySelector('#storybook-root')!, {
        childList: true,
        subtree: true,
      });
    });
    const ranges = page.locator('#storybook-root input[type="range"]');
    const names: string[] = [];

    for (let index = 0; index < (await ranges.count()); index += 1) {
      const range = ranges.nth(index);
      names.push((await range.getAttribute('name'))!);
      await range.focus();

      for (let step = 0; step < STEPS; step += 1) {
        await page.keyboard.press(
          step < STEPS / 2 ? 'ArrowRight' : 'ArrowLeft',
        );
        await page.evaluate(
          () =>
            new Promise((resolve) => {
              requestAnimationFrame(resolve);
            }),
        );
      }
    }

    // Let any ResizeObserver delivery and its error report land.
    await page.waitForTimeout(300);
    const { childList } = await page.evaluate(
      () =>
        (globalThis as Record<string, unknown>)['__records'] as {
          childList: number;
        },
    );
    failed ||= errors.length > 0 || childList > 0;
    console.log(
      `  ${id.padEnd(14)} ${names.join(', ')}: ${STEPS} steps each, page errors: ${errors.length}${errors.length ? ` (${errors.join('; ')})` : ''}, childList records: ${childList}`,
    );
    await page.close();
  }

  await browser.close();
}

server.close();
console.log(
  `\n${failed ? 'An error or a node change was seen' : 'No page error and no node change'}`,
);
