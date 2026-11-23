/**
 * The feature proof's own reading of the box-quad stories' sliders, on the
 * built docs site, in Chromium, Firefox and WebKit:
 *
 * - every value each slider can take, stepped with the keyboard from `min` to
 *   `max`: the value shown beside it, and the overlay's bounds against the
 *   target's `getBoundingClientRect()`, read in the first animation frame after
 *   the key, with no extra frame to settle;
 * - each native key (arrows, Page Up, Page Down, Home, End), and a pointer drag;
 * - what Storybook's preview channel carries while the sliders move;
 * - the accessible name at two values, from the accessibility tree;
 * - the docs page: what each story's sliders change, and the controls table;
 * - unmount: `ResizeObserver`s and `scroll` listeners still held after each
 *   story is replaced by another in the same preview;
 * - _Pointer Delta_: a drag, then both sliders, then a second drag;
 * - page errors and console errors throughout.
 *
 * Run from the repository root after `aube exec just docs-build`:
 * `node packages/box-quad/.plan/reviews/storybook-2/probes/sliders-proof.ts`.
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
const url = (id: string, mode = 'story'): string =>
  `${origin}${BASE}iframe.html?id=box-quad--${id}&viewMode=${mode}`;

const SLIDERS: Readonly<
  Record<string, ReadonlyArray<readonly [string, number, number, number]>>
> = {
  'live-demo': [
    ['rotation', -55, 55, 1],
    ['skew', -20, 20, 1],
  ],
  'nested-spaces': [
    ['ancestorRotation', -45, 45, 1],
    ['ancestorZoom', 0.5, 2, 0.05],
    ['targetRotation', -45, 45, 1],
  ],
  'pointer-delta': [
    ['ancestorRotation', -180, 180, 1],
    ['ancestorZoom', 0.5, 2, 0.05],
  ],
};
const TARGETS: Readonly<Record<string, string>> = {
  'live-demo': '[class*="target-card"]',
  'nested-spaces': '[class*="nested-target"]',
};

/** Counts live `ResizeObserver`s and live `scroll` listeners per window. */
function instrument(): void {
  const live = { observers: 0, scroll: 0, created: 0 };
  (globalThis as Record<string, unknown>)['__live'] = live;
  const Native = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class extends Native {
    #on = false;
    #mine = false;
    override observe(target: Element, options?: ResizeObserverOptions): void {
      if (target.matches('[class*="stage"]') && !this.#on) {
        this.#on = true;
        this.#mine = true;
        live.observers += 1;
        live.created += 1;
      }
      super.observe(target, options);
    }
    override disconnect(): void {
      if (this.#mine && this.#on) {
        this.#on = false;
        live.observers -= 1;
      }
      super.disconnect();
    }
  };
  const add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (
    this: EventTarget,
    ...args: Parameters<typeof add>
  ) {
    const options = args[2];
    if (
      args[0] === 'scroll' &&
      // The story's own listener: something else on the page also adds one to
      // this element, with no options.
      typeof options === 'object' &&
      options?.signal &&
      this instanceof Element &&
      this.matches('[class*="nested-scroller"]')
    ) {
      live.scroll += 1;
      options.signal.onabort = () => {
        live.scroll -= 1;
      };
    }
    add.apply(this, args);
  };
}

async function open(page: Page, id: string, mode?: string): Promise<void> {
  await page.goto(url(id, mode));
  await page.waitForSelector('#storybook-root > *, #storybook-docs > *');
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}

/** What is shown in the frame a slider changes: the value, and the overlay's miss. */
function installFrameReader(page: Page, target: string | undefined) {
  return page.evaluate((selector) => {
    const root = document.querySelector('#storybook-root')!;
    const log: unknown[] = [];
    (globalThis as Record<string, unknown>)['__log'] = log;
    root.addEventListener('input', (event) => {
      // React's own listener is at the root container and runs first or at the
      // same node; a rAF callback runs before the next paint either way.
      requestAnimationFrame(() => {
        const input = event.target as HTMLInputElement;
        const entry: Record<string, unknown> = {
          value: input.value,
          shown: input.parentElement!.querySelector('output')!.textContent,
        };
        if (selector) {
          const rect = root.querySelector(selector)!.getBoundingClientRect();
          const svg = root.querySelector('svg')!;
          const matrix = svg.getScreenCTM()!;
          const points = [...svg.querySelector('polygon')!.points].map((p) =>
            new DOMPoint(p.x, p.y).matrixTransform(matrix),
          );
          const xs = points.map((p) => p.x);
          const ys = points.map((p) => p.y);
          entry['miss'] = Math.max(
            Math.abs(Math.min(...xs) - rect.left),
            Math.abs(Math.max(...xs) - rect.right),
            Math.abs(Math.min(...ys) - rect.top),
            Math.abs(Math.max(...ys) - rect.bottom),
          );
        }
        log.push(entry);
      });
    });
  }, target);
}

type Entry = Readonly<{ value: string; shown: string; miss?: number }>;
const takeLog = (page: Page): Promise<Entry[]> =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => {
          resolve(
            (
              (globalThis as Record<string, unknown>)['__log'] as Entry[]
            ).splice(0),
          );
        });
      }),
  );

let failed = false;
const check = (ok: boolean, text: string): void => {
  failed ||= !ok;
  console.log(`  ${ok ? 'pass' : 'FAIL'}  ${text}`);
};

for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch();
  console.log(`\n## ${type.name()} ${browser.version()}`);
  const page = await browser.newPage({
    viewport: { width: 1000, height: 900 },
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  await page.addInitScript(instrument);

  for (const [id, sliders] of Object.entries(SLIDERS)) {
    await open(page, id);
    // The story's own render events land first.
    await page.waitForTimeout(1500);
    await installFrameReader(page, TARGETS[id]);
    // Storybook's own channel, from now on.
    await page.evaluate(() => {
      const events: string[] = [];
      (globalThis as Record<string, unknown>)['__events'] = events;
      const channel = (globalThis as Record<string, unknown>)[
        '__STORYBOOK_ADDONS_CHANNEL__'
      ] as { emit(name: string, ...rest: unknown[]): void };
      const emit = channel.emit.bind(channel);
      channel.emit = (name, ...rest) => {
        events.push(name);
        emit(name, ...rest);
      };
    });

    for (const [name, min, max, step] of sliders) {
      const range = page.locator(`#storybook-root input[name="${name}"]`);
      await range.focus();
      await page.keyboard.press('Home');
      await takeLog(page);
      const steps = Math.round((max - min) / step);
      for (let index = 0; index < steps; index += 1) {
        await page.keyboard.press('ArrowRight');
      }
      const log = await takeLog(page);
      const values = log.map((entry) => Number(entry.value));
      const unit = name.endsWith('Zoom') ? '' : '°';
      const mismatched = log.filter(
        (entry) => entry.shown !== `${Number(entry.value)}${unit}`,
      );
      const longest = Math.max(...log.map((entry) => entry.shown.length));
      const miss = Math.max(0, ...log.map((entry) => entry.miss ?? 0));
      check(
        log.length === steps &&
          values.at(-1) === max &&
          mismatched.length === 0 &&
          miss < 0.05,
        `${id} ${name}: ${log.length} of ${steps} keyboard steps, last ${values.at(-1)}, shown text differs: ${mismatched.length}, longest shown ${longest} characters, worst overlay miss ${miss.toExponential(1)} px`,
      );
      const keys: string[] = [];
      for (const key of [
        'Home',
        'End',
        'PageDown',
        'PageUp',
        'ArrowLeft',
        'ArrowDown',
        'ArrowUp',
      ]) {
        await page.keyboard.press(key);
        keys.push(`${key} ${await range.inputValue()}`);
      }
      console.log(`        keys: ${keys.join(', ')}`);
      const box = (await range.boundingBox())!;
      await page.mouse.move(box.x + 8, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
        steps: 20,
      });
      await page.mouse.up();
      const dragged = await takeLog(page);
      const last = dragged.at(-1);
      check(
        dragged.length > 5 &&
          Math.abs(Number(last!.value) - (min + max) / 2) <= (max - min) * 0.05,
        `${id} ${name}: pointer drag, ${dragged.length} changes, ends at ${last?.value}, worst miss ${Math.max(0, ...dragged.map((e) => e.miss ?? 0)).toExponential(1)} px`,
      );
    }

    const events = await page.evaluate(
      () => (globalThis as Record<string, unknown>)['__events'] as string[],
    );
    check(
      events.length === 0,
      `${id}: channel events from the preview: ${events.length}${events.length ? ` (${[...new Set(events)].join(', ')})` : ''}`,
    );
    const aria = await page.locator('#storybook-root').ariaSnapshot();
    console.log(
      `        aria:\n${aria
        .split('\n')
        .map((line) => `          ${line}`)
        .join('\n')}`,
    );
  }

  // Accessible names, as the engine's role query resolves them, at two values.
  await open(page, 'live-demo');
  for (const value of ['-18', '30']) {
    await page
      .locator('input[name="rotation"]')
      .evaluate((input: HTMLInputElement, v) => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )!.set!.call(input, v);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }, value);
    const exact = await page
      .getByRole('slider', { name: 'Rotation', exact: true })
      .count();
    const withValue = await page
      .getByRole('slider', { name: new RegExp(`^Rotation ?${value}°$`) })
      .count();
    console.log(
      `  note  rotation ${value}: sliders named exactly "Rotation": ${exact}; named "Rotation ${value}°": ${withValue}`,
    );
  }

  if (type === chromium) {
    // Blink's accessibility tree, not Playwright's own name algorithm.
    const session = await page.context().newCDPSession(page);
    const { nodes } = (await session.send('Accessibility.getFullAXTree')) as {
      nodes: ReadonlyArray<{
        role?: { value: string };
        name?: { value: string };
        value?: { value: string };
        ignored: boolean;
        properties?: ReadonlyArray<{ name: string; value: { value: unknown } }>;
      }>;
    };
    for (const node of nodes) {
      if (
        !node.ignored &&
        ['slider', 'status'].includes(node.role?.value ?? '')
      ) {
        const props = (node.properties ?? [])
          .filter((p) =>
            ['valuetext', 'live', 'valuemin', 'valuemax', 'focusable'].includes(
              p.name,
            ),
          )
          .map((p) => `${p.name}=${String(p.value.value)}`);
        console.log(
          `  note  Blink ${node.role!.value}: name "${node.name?.value}" value "${String(node.value?.value ?? '')}" ${props.join(' ')}`,
        );
      }
    }
  }

  // The docs page.
  await open(page, 'docs', 'docs');
  await page.waitForTimeout(1500);
  const page0 = await page.evaluate(() => ({
    stories: [...document.querySelectorAll('[id^="story--"]')].map((e) => e.id),
    ranges: document.querySelectorAll('#storybook-docs input[type="range"]')
      .length,
    tables: document.querySelectorAll('#storybook-docs .docblock-argstable')
      .length,
    empty: /not configured|no inputs|no args/i.test(
      document.querySelector('#storybook-docs')!.textContent ?? '',
    ),
    text:
      (document.querySelector('#storybook-docs')!.textContent ?? '').match(
        /.{0,80}(controls|args).{0,80}/gi,
      ) ?? [],
  }));
  console.log(
    `  docs  stories ${page0.stories.length} [${page0.stories.join(' ')}], ranges ${page0.ranges}, arg tables ${page0.tables}, empty-args text ${page0.empty}`,
  );
  for (const line of page0.text) console.log(`        mentions: ${line}`);
  const ranges = page.locator('#storybook-docs input[type="range"]');
  const state = () =>
    page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLInputElement>(
          '#storybook-docs input[type="range"]',
        ),
      ].map((input) => ({
        value: input.value,
        shown: input.parentElement!.querySelector('output')!.textContent,
      })),
    );
  const polygons = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('#storybook-docs polygon')].map((p) =>
        p.getAttribute('points'),
      ),
    );
  let crossTalk = 0;
  let still = 0;
  for (let index = 0; index < (await ranges.count()); index += 1) {
    const before = await state();
    const drawn = await polygons();
    await ranges.nth(index).focus();
    await page.keyboard.press('ArrowRight');
    await page.evaluate(
      () =>
        new Promise((r) => {
          requestAnimationFrame(() => requestAnimationFrame(r));
        }),
    );
    const after = await state();
    const now = await polygons();
    if (
      before[index]!.value === after[index]!.value ||
      before[index]!.shown === after[index]!.shown
    )
      still += 1;
    crossTalk += after.filter(
      (entry, i) => i !== index && entry.value !== before[i]!.value,
    ).length;
    const redrawn = now.filter((points, i) => points !== drawn[i]).length;
    if (redrawn > 1) crossTalk += 1;
  }
  check(
    still === 0 && crossTalk === 0,
    `docs: each range moves only its own story; ranges that didn't move ${still}, other ranges or polygons that changed ${crossTalk}`,
  );

  // Unmount: replace the story in one preview, and count what stays.
  await open(page, 'live-demo');
  const live = () =>
    page.evaluate(() => ({
      ...((globalThis as Record<string, unknown>)['__live'] as object),
    })) as Promise<{ observers: number; scroll: number; created: number }>;
  const trail: string[] = [];
  let leak = false;
  const expected: Readonly<Record<string, readonly [number, number]>> = {
    'live-demo': [1, 0],
    'nested-spaces': [1, 1],
    'pointer-delta': [0, 0],
    'failed-reads': [4, 0],
  };
  for (const id of [
    'live-demo',
    'nested-spaces',
    'pointer-delta',
    'failed-reads',
    'live-demo',
    'nested-spaces',
    'failed-reads',
    'pointer-delta',
  ]) {
    await page.evaluate((storyId) => {
      const channel = (globalThis as Record<string, unknown>)[
        '__STORYBOOK_ADDONS_CHANNEL__'
      ] as { emit(name: string, payload: unknown): void };
      channel.emit('setCurrentStory', { storyId, viewMode: 'story' });
    }, `box-quad--${id}`);
    await page.waitForTimeout(400);
    const first = page.locator('#storybook-root input[type="range"]').first();
    if ((await first.count()) > 0) {
      await first.focus();
      for (let i = 0; i < 10; i += 1) await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(100);
    }
    const now = await live();
    const [observers, scroll] = expected[id]!;
    leak ||= now.observers !== observers || now.scroll !== scroll;
    trail.push(`${id} ${now.observers}/${now.scroll}`);
  }
  check(
    !leak,
    `unmount: live ResizeObservers/scroll listeners after each story: ${trail.join(', ')}; ${(await live()).created} observers created`,
  );

  // Pointer Delta: drag, move both sliders, drag again.
  await open(page, 'pointer-delta');
  const box = page.locator('#storybook-root [class*="pointer-box"]');
  const distances: string[] = [];
  let worst = 0;
  for (const [rotation, zoom] of [
    ['30', '1.5'],
    ['-150', '0.5'],
    ['95', '2'],
  ] as const) {
    for (const [name, value] of [
      ['ancestorRotation', rotation],
      ['ancestorZoom', zoom],
    ] as const) {
      await page
        .locator(`input[name="${name}"]`)
        .evaluate((input: HTMLInputElement, v) => {
          Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            'value',
          )!.set!.call(input, v);
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }, value);
    }
    await page.waitForTimeout(100);
    const start = (await box.boundingBox())!;
    const x = start.x + start.width / 2;
    const y = start.y + start.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 30, y - 24, { steps: 8 });
    const end = (await box.boundingBox())!;
    await page.mouse.up();
    const d = Math.hypot(
      end.x + end.width / 2 - x - 30,
      end.y + end.height / 2 - y + 24,
    );
    worst = Math.max(worst, d);
    distances.push(`${rotation}/${zoom} ${d.toFixed(3)}`);
  }
  check(
    worst <= 1,
    `Pointer Delta at three slider pairs in one visit, distance (px): ${distances.join(', ')}`,
  );
  check(
    errors.length === 0,
    `page and console errors: ${errors.length}${errors.length ? ` (${[...new Set(errors)].join('; ')})` : ''}`,
  );
  await browser.close();
}

server.close();
console.log(`\n${failed ? 'A check FAILED' : 'Every check passes'}`);
