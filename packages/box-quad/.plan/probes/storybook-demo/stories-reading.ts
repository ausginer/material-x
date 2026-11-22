/**
 * `BQ-18`'s reading of the box-quad stories, on the built docs site.
 *
 * - Firefox, with `layout.css.getBoxQuads.enabled`: _Live Demo_'s overlay
 *   corners, mapped to the viewport through the SVG's `getScreenCTM()`, against
 *   the target's native `getBoxQuads()`, at the defaults and the four slider
 *   extremes. Each corner is compared with the native point of the same index,
 *   so the order is read too.
 * - Chromium and WebKit: at rotation 0 and skew 0, the overlay corners against
 *   the target's `getBoundingClientRect()` corners.
 * - A screenshot of each story in the light and the dark theme, in Chromium.
 * - _Pointer Delta_: a drag with Playwright's mouse at a rotated and zoomed arg
 *   set, then the box's centre against the pointer, in the three engines.
 *
 * Run from the repository root after `aube exec just docs-build`:
 * `node packages/box-quad/.plan/probes/storybook-demo/stories-reading.ts`.
 * It serves `.docs` on loopback and writes the screenshots beside this file.
 */
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname } from 'node:path';
import {
  chromium,
  firefox,
  webkit,
  type Browser,
  type BrowserType,
  type Page,
} from 'playwright';

const root = new URL('../../../../../', import.meta.url);
const docs = new URL('.docs/', root);
const screenshots = new URL('screenshots/', import.meta.url);
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

function storyUrl(id: string, args = '', theme = 'light'): string {
  return `${origin}${BASE}iframe.html?id=box-quad--${id}&viewMode=story&theme=${theme}${args ? `&args=${args}` : ''}`;
}

async function openStory(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForSelector('#storybook-root > *');
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}

type Point = readonly [number, number];

/** The overlay's four corners in viewport coordinates, through `getScreenCTM()`. */
function readOverlayCorners(page: Page): Promise<Point[]> {
  return page.evaluate(() => {
    const svg = document.querySelector('#storybook-root svg')!;
    const matrix = (svg as SVGSVGElement).getScreenCTM()!;
    return Array.from(svg.querySelectorAll('circle'), (circle) => {
      const point = new DOMPoint(
        circle.cx.baseVal.value,
        circle.cy.baseVal.value,
      ).matrixTransform(matrix);
      return [point.x, point.y] as const;
    });
  });
}

function maxDifference(a: readonly Point[], b: readonly Point[]): number {
  return Math.max(
    ...a.flatMap(([x, y], index) => [
      Math.abs(x - b[index]![0]),
      Math.abs(y - b[index]![1]),
    ]),
  );
}

function format(points: readonly Point[]): string {
  return points
    .map(([x, y], index) => `p${index + 1} (${x.toFixed(2)}, ${y.toFixed(2)})`)
    .join(' ');
}

const TARGET = '#storybook-root [style*="skewX"]';

async function firefoxParity(browser: Browser): Promise<boolean> {
  const page = await browser.newPage();
  const cases: ReadonlyArray<readonly [number, number]> = [
    [-18, 8],
    [-55, -20],
    [-55, 20],
    [55, -20],
    [55, 20],
  ];
  let passed = true;
  console.log(
    `\n## Firefox ${browser.version()}, layout.css.getBoxQuads.enabled`,
  );
  console.log(
    'Live Demo overlay corners against native getBoxQuads(), max |difference| (px), limit 0.02',
  );

  for (const [rotation, skew] of cases) {
    await openStory(
      page,
      storyUrl('live-demo', `rotation:${rotation};skew:${skew}`),
    );
    const overlay = await readOverlayCorners(page);
    const native = await page.evaluate((selector) => {
      const target = document.querySelector(selector) as Element & {
        getBoxQuads(options: { box: string }): DOMQuad[];
      };
      const [quad] = target.getBoxQuads({ box: 'border' });
      return [quad!.p1, quad!.p2, quad!.p3, quad!.p4].map(
        (p) => [p.x, p.y] as const,
      );
    }, TARGET);
    const difference = maxDifference(overlay, native);
    const ok = difference <= 0.02;
    passed &&= ok;
    console.log(
      `rotation ${String(rotation).padStart(3)} skew ${String(skew).padStart(3)}  ${difference.toExponential(2)}  ${ok ? 'pass' : 'FAIL'}`,
    );

    if (rotation === -18) {
      console.log(`  overlay ${format(overlay)}`);
      console.log(`  native  ${format(native)}`);
    }
  }

  await page.close();
  return passed;
}

async function boundingRectParity(
  browser: Browser,
  name: string,
): Promise<boolean> {
  const page = await browser.newPage();
  await openStory(page, storyUrl('live-demo', 'rotation:0;skew:0'));
  const overlay = await readOverlayCorners(page);
  const rect = await page.evaluate((selector) => {
    const { left, top, right, bottom } = document
      .querySelector(selector)!
      .getBoundingClientRect();
    return [
      [left, top],
      [right, top],
      [right, bottom],
      [left, bottom],
    ] as Point[];
  }, TARGET);
  const difference = maxDifference(overlay, rect);
  // The two come from the same layout, so they are equal up to float rounding.
  const ok = difference <= 1e-9;
  console.log(`\n## ${name} ${browser.version()}`);
  console.log(
    'Live Demo at rotation 0, skew 0: overlay corners against getBoundingClientRect() corners',
  );
  console.log(`  overlay ${format(overlay)}`);
  console.log(`  rect    ${format(rect)}`);
  console.log(
    `  max |difference| ${difference.toExponential(2)}  ${ok ? 'pass' : 'FAIL'}`,
  );
  await page.close();
  return ok;
}

async function pointerDrag(browser: Browser, name: string): Promise<boolean> {
  const page = await browser.newPage();
  const args = 'ancestorRotation:-40;ancestorZoom:1.75';
  await openStory(page, storyUrl('pointer-delta', args));
  const box = page.locator('#storybook-root [class*="pointer-box"]');
  const start = await box.boundingBox();
  const startX = start!.x + start!.width / 2;
  const startY = start!.y + start!.height / 2;
  const endX = startX + 140;
  const endY = startY + 70;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 20 });
  // The centre of a rotated square's bounding rect is the square's centre.
  const end = await box.boundingBox();
  await page.mouse.up();
  const centreX = end!.x + end!.width / 2;
  const centreY = end!.y + end!.height / 2;
  const difference = Math.hypot(centreX - endX, centreY - endY);
  const ok = difference <= 1;
  console.log(`\n## ${name} ${browser.version()}: Pointer Delta, ${args}`);
  console.log(
    `  pointer (${startX.toFixed(2)}, ${startY.toFixed(2)}) -> (${endX.toFixed(2)}, ${endY.toFixed(2)}) in 20 steps`,
  );
  console.log(
    `  box centre (${centreX.toFixed(2)}, ${centreY.toFixed(2)}), distance ${difference.toFixed(3)} px  ${ok ? 'pass' : 'FAIL'}`,
  );
  await page.close();
  return ok;
}

const STORIES = ['live-demo', 'nested-spaces', 'pointer-delta', 'failed-reads'];

async function takeScreenshots(browser: Browser): Promise<void> {
  const page = await browser.newPage({
    viewport: { width: 1000, height: 720 },
  });
  console.log(
    `\n## Chromium ${browser.version()}: screenshots of #storybook-root`,
  );

  for (const id of STORIES) {
    for (const theme of ['light', 'dark']) {
      await openStory(page, storyUrl(id, '', theme));
      const file = `${id}-${theme}.png`;
      await page
        .locator('#storybook-root')
        .screenshot({ path: new URL(file, screenshots).pathname });
      console.log(`  screenshots/${file}`);
    }
  }

  await page.close();
}

/** The read and the overlay of each Failed Reads panel, in Chromium. */
async function failedReads(browser: Browser): Promise<boolean> {
  const page = await browser.newPage();
  await openStory(page, storyUrl('failed-reads'));
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
  const expected = [false, false, false, true];
  let ok = panels.length === expected.length;
  console.log(`\n## Chromium ${browser.version()}: Failed Reads`);

  for (const [index, panel] of panels.entries()) {
    const match =
      panel.caption.endsWith(`Read: ${expected[index]}`) &&
      panel.drawn === expected[index];
    ok &&= match;
    console.log(
      `  ${panel.caption}, overlay drawn: ${panel.drawn}  ${match ? 'pass' : 'FAIL'}`,
    );
  }

  await page.close();
  return ok;
}

async function withBrowser<T>(
  type: BrowserType,
  run: (browser: Browser) => Promise<T>,
  options?: Parameters<BrowserType['launch']>[0],
): Promise<T> {
  const browser = await type.launch(options);

  try {
    return await run(browser);
  } finally {
    await browser.close();
  }
}

const results: boolean[] = [];
results.push(
  await withBrowser(
    firefox,
    async (browser) =>
      (await firefoxParity(browser)) && (await pointerDrag(browser, 'Firefox')),
    { firefoxUserPrefs: { 'layout.css.getBoxQuads.enabled': true } },
  ),
);
results.push(
  await withBrowser(chromium, async (browser) => {
    const parity = await boundingRectParity(browser, 'Chromium');
    const drag = await pointerDrag(browser, 'Chromium');
    const failed = await failedReads(browser);
    await takeScreenshots(browser);
    return parity && drag && failed;
  }),
);
results.push(
  await withBrowser(
    webkit,
    async (browser) =>
      (await boundingRectParity(browser, 'WebKit')) &&
      (await pointerDrag(browser, 'WebKit')),
  ),
);
server.close();
console.log(
  `\n${results.every(Boolean) ? 'All readings pass' : 'A reading FAILED'}`,
);
