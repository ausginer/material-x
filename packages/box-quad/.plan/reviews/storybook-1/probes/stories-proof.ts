/**
 * The feature proof's own reading of the box-quad stories, on the built docs
 * site, in Chromium, Firefox and WebKit. It checks each overlay against an
 * observation that box-quad doesn't make: the axis-aligned bounds of the
 * overlay's four corners, mapped to the viewport through the SVG's
 * `getScreenCTM()`, against the target's `getBoundingClientRect()`. A rotated
 * or zoomed quad and its element have the same bounds, so this holds at any
 * arg, which the implementer's reading checks only at rotation 0.
 *
 * - Live Demo at the defaults and at the four slider extremes.
 * - Nested Spaces at the defaults and at extremes, and after the scroll
 *   container scrolls by 90 px.
 * - Failed Reads: each panel's _Read_ and whether its overlay is drawn.
 * - The docs page: the credit's text and link.
 * - Phone width, 375 × 667: each story renders with no page error, Live Demo's
 *   scroller scrolls, and the overlays still bound their targets.
 *
 * Run from the repository root after `aube exec just docs-build`:
 * `node packages/box-quad/.plan/reviews/storybook-1/probes/stories-proof.ts`.
 */
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname } from 'node:path';
import { chromium, firefox, webkit, type Page } from 'playwright';

const docs = new URL('../../../../../../.docs/', import.meta.url);
const BASE = '/material-x/';
const TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
};

const server = createServer((request, response) => {
  const path = new URL(request.url!, 'http://x').pathname;

  if (!path.startsWith(BASE)) {
    response.writeHead(404).end();
    return;
  }

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

const url = (id: string, args = '', mode = 'story'): string =>
  `${origin}${BASE}iframe.html?id=box-quad--${id}&viewMode=${mode}${args ? `&args=${args}` : ''}`;

async function open(page: Page, address: string): Promise<void> {
  await page.goto(address);
  await page.waitForSelector('#storybook-root > *, #storybook-docs > *');
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}

/**
 * The largest difference between the bounds of the first overlay's corners and
 * the bounds of `target`, in viewport pixels.
 */
function boundsDifference(page: Page, target: string): Promise<number> {
  return page.evaluate((selector) => {
    const svg = document.querySelector<SVGSVGElement>('#storybook-root svg')!;
    const matrix = svg.getScreenCTM()!;
    const points = Array.from(svg.querySelectorAll('circle'), (circle) =>
      new DOMPoint(
        circle.cx.baseVal.value,
        circle.cy.baseVal.value,
      ).matrixTransform(matrix),
    );
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const rect = document.querySelector(selector)!.getBoundingClientRect();
    return Math.max(
      Math.abs(Math.min(...xs) - rect.left),
      Math.abs(Math.max(...xs) - rect.right),
      Math.abs(Math.min(...ys) - rect.top),
      Math.abs(Math.max(...ys) - rect.bottom),
    );
  }, target);
}

const LIVE_TARGET = '#storybook-root [style*="skewX"]';
const NESTED_TARGET = '#storybook-root [class*="nested-target"]';
const LIMIT = 0.05;
let failures = 0;

function report(label: string, difference: number): void {
  const ok = difference <= LIMIT;
  failures += ok ? 0 : 1;
  console.log(
    `  ${label.padEnd(58)} ${difference.toExponential(2)}  ${ok ? 'pass' : 'FAIL'}`,
  );
}

for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch();
  const page = await browser.newPage({
    viewport: { width: 1000, height: 720 },
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  console.log(
    `\n## ${type.name()} ${browser.version()}: overlay bounds against getBoundingClientRect(), limit ${LIMIT} px`,
  );

  for (const args of [
    'rotation:-18;skew:8',
    'rotation:-55;skew:-20',
    'rotation:-55;skew:20',
    'rotation:55;skew:-20',
    'rotation:55;skew:20',
  ]) {
    await open(page, url('live-demo', args));
    report(`Live Demo ${args}`, await boundsDifference(page, LIVE_TARGET));
  }

  for (const args of [
    'ancestorRotation:12;ancestorZoom:1.25;targetRotation:-20',
    'ancestorRotation:-45;ancestorZoom:2;targetRotation:45',
    'ancestorRotation:45;ancestorZoom:0.5;targetRotation:-45',
  ]) {
    await open(page, url('nested-spaces', args));
    report(
      `Nested Spaces ${args}`,
      await boundsDifference(page, NESTED_TARGET),
    );
    await page.evaluate(() => {
      document
        .querySelector('#storybook-root [class*="nested-scroller"]')!
        .scrollBy(0, 90);
    });
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        }),
    );
    report(
      '  after scrolling by 90 px',
      await boundsDifference(page, NESTED_TARGET),
    );
  }

  await open(page, url('failed-reads'));
  const panels = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll('#storybook-root figure'),
      (figure) => ({
        caption: figure.querySelector('figcaption')!.textContent,
        drawn:
          figure.querySelector('svg g')!.getAttribute('display') !== 'none',
      }),
    ),
  );
  console.log('  Failed Reads');
  for (const [index, panel] of panels.entries()) {
    const expected = index === 3;
    const ok =
      panel.caption.endsWith(`Read: ${expected}`) && panel.drawn === expected;
    failures += ok ? 0 : 1;
    console.log(
      `    ${panel.caption}, overlay drawn: ${panel.drawn}  ${ok ? 'pass' : 'FAIL'}`,
    );
  }

  await open(page, url('docs', '', 'docs'));
  const credit = await page.evaluate(() => {
    const link = Array.from(
      document.querySelectorAll('#storybook-docs a'),
    ).find((anchor) => anchor.textContent === 'live demo');
    return {
      text: link?.parentElement?.textContent ?? null,
      href: link?.getAttribute('href') ?? null,
      stories: document.querySelectorAll('#storybook-docs .docs-story').length,
    };
  });
  console.log(`  Docs page: ${JSON.stringify(credit)}`);

  await page.setViewportSize({ width: 375, height: 667 });
  console.log('  Phone width, 375 x 667');
  await open(page, url('live-demo'));
  const scroll = await page.evaluate(() => {
    const scroller = document.querySelector<HTMLElement>(
      '#storybook-root [class*="scroller"]',
    )!;
    const before = scroller.scrollWidth > scroller.clientWidth;
    scroller.scrollLeft = 200;
    return { scrolls: before, scrollLeft: scroller.scrollLeft };
  });
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
  console.log(`    Live Demo scroller: ${JSON.stringify(scroll)}`);
  report(
    '  Live Demo, scrolled by 200 px',
    await boundsDifference(page, LIVE_TARGET),
  );
  await open(page, url('nested-spaces'));
  report(
    '  Nested Spaces, defaults',
    await boundsDifference(page, NESTED_TARGET),
  );
  for (const id of ['pointer-delta', 'failed-reads']) {
    await open(page, url(id));
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    console.log(`    ${id}: page scrolls horizontally: ${overflow}`);
  }

  console.log(
    `  page errors: ${errors.length === 0 ? 'none' : errors.join(' | ')}`,
  );
  failures += errors.length;
  await browser.close();
}

server.close();
console.log(
  `\n${failures === 0 ? 'All readings pass' : `${failures} reading(s) FAILED`}`,
);
