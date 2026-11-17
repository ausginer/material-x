/**
 * Loads the built docs site in Chromium and fails if any page of it breaks
 * (`repo:RD-14` property 6). It reads `.docs` as `just docs-build` leaves it
 * and builds nothing.
 *
 * It serves `.docs` at the base path the build was made for, then opens the
 * manager's `index.html`, `iframe.html` for every entry of `index.json`, and
 * `api/index.html`. An entry passes when Storybook's preview reports it
 * rendered, and the manager when the preview it embeds reports that;
 * `api/index.html` passes on its `load` event. Any uncaught exception, console
 * error, failed or 4xx/5xx request under the server's origin, render error that
 * Storybook reports, or timeout fails the run.
 *
 * The result depends only on the build and the pinned browser: every request
 * outside the server's origin is answered by the check with an empty `200`
 * and never reaches the network, so a third-party host's availability or
 * latency neither fails nor passes a page.
 *
 * A page is observed from navigation until its `load` event or its completion
 * signal, whichever is later, and not after. An error the page raises only
 * after that is outside the check.
 */
import { readFile, stat } from 'node:fs/promises';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { root } from './utils.ts';

const docs = new URL('.docs/', root);
const PAGE_TIMEOUT = 30_000;
const CONCURRENCY = 4;

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.mjs': 'text/javascript',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.wasm': 'application/wasm',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

// The preview's terminal events. One that names an error fails the entry.
const RENDERED_EVENTS = ['storyRendered', 'docsRendered'];
const ERROR_EVENTS = [
  'configError',
  'playFunctionThrewException',
  'storyErrored',
  'storyMissing',
  'storyThrewException',
];

type IndexEntry = Readonly<{
  id: string;
  type: 'story' | 'docs';
}>;

type Target = Readonly<{
  name: string;
  path: string;
  // Whether the page runs Storybook's preview, itself or embedded in the
  // manager, which reports its render.
  preview: boolean;
}>;

const started = performance.now();

// Vite emits every asset under `${base}assets/`, so the preview's own entry
// script names the base the build was made for.
const iframeHtml = await readFile(new URL('iframe.html', docs), 'utf8');
const baseMatch =
  /<script type="module"[^>]*\ssrc="([^"]*\/)assets\/iframe-/u.exec(iframeHtml);
if (!baseMatch) {
  throw new Error('No base path found in .docs/iframe.html');
}
const base = baseMatch[1]!;

const index = JSON.parse(
  await readFile(new URL('index.json', docs), 'utf8'),
) as Readonly<{ entries: Readonly<Record<string, IndexEntry>> }>;
const entries = Object.values(index.entries);
if (entries.length === 0) {
  throw new Error('.docs/index.json lists no entries');
}

const targets: readonly Target[] = [
  { name: 'index.html', path: '', preview: true },
  ...entries.map((entry) => ({
    name: `${entry.type} ${entry.id}`,
    path: `iframe.html?id=${encodeURIComponent(entry.id)}&viewMode=${entry.type}`,
    preview: true,
  })),
  { name: 'api/index.html', path: 'api/index.html', preview: false },
];

async function serve(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost');
  if (!pathname.startsWith(base)) {
    response.writeHead(404).end();
    return;
  }

  let file = new URL(
    `.${decodeURIComponent(pathname.slice(base.length - 1))}`,
    docs,
  );
  try {
    if ((await stat(file)).isDirectory()) {
      file = new URL(`${file.pathname.replace(/\/?$/u, '/')}index.html`, file);
    }
    const body = await readFile(file);
    response
      .writeHead(200, {
        'content-type':
          CONTENT_TYPES[extname(file.pathname)] ?? 'application/octet-stream',
      })
      .end(body);
  } catch {
    response.writeHead(404).end();
  }
}

const server = createServer((request, response) => {
  void serve(request, response);
});

await new Promise<void>((resolve) => {
  server.listen(0, '127.0.0.1', resolve);
});
const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

// Runs in each preview page before its scripts. Storybook publishes its channel
// by assigning `globalThis.__STORYBOOK_ADDONS_CHANNEL__`, so an accessor there
// subscribes to the channel before the preview can render anything.
function observePreview(events: readonly string[]): void {
  const report = (
    globalThis as unknown as Record<
      string,
      (name: string, detail: string) => void
    >
  )['__docsSmokeReport']!;
  let current: unknown;
  Object.defineProperty(globalThis, '__STORYBOOK_ADDONS_CHANNEL__', {
    configurable: true,
    get: () => current,
    set: (
      channel: {
        on(name: string, listener: (...args: unknown[]) => void): void;
      } | null,
    ) => {
      if (channel && channel !== current) {
        for (const name of events) {
          channel.on(name, (...args: unknown[]) => {
            let detail: string;
            try {
              detail = JSON.stringify(args);
            } catch {
              detail = String(args);
            }
            report(name, detail);
          });
        }
      }
      current = channel;
    },
  });
}

async function check(browser: Browser, target: Target): Promise<string[]> {
  const failures: string[] = [];
  const page: Page = await browser.newPage();
  const { promise: settled, resolve } = Promise.withResolvers<undefined>();
  const settle = (): void => {
    resolve(undefined);
  };

  page.on('pageerror', (error) => {
    // A parse error has an empty stack.
    failures.push(
      `uncaught: ${error.stack === undefined || error.stack === '' ? String(error) : error.stack}`,
    );
    settle();
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const { url, lineNumber } = message.location();
      failures.push(`console error: ${message.text()} (${url}:${lineNumber})`);
    }
  });
  page.on('requestfailed', (request) => {
    if (request.url().startsWith(origin)) {
      failures.push(
        `request failed: ${request.url()} (${request.failure()?.errorText})`,
      );
    }
  });
  page.on('response', (response) => {
    if (response.url().startsWith(origin) && response.status() >= 400) {
      failures.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });

  await page.route(
    (url) => url.origin !== origin,
    (route) => route.fulfill({ status: 200, body: '' }),
  );

  // Both reach every frame of the page, so the manager's embedded preview
  // reports through them as an entry's page does.
  if (target.preview) {
    await page.exposeFunction(
      '__docsSmokeReport',
      (name: string, detail: string) => {
        if (ERROR_EVENTS.includes(name)) {
          failures.push(`${name}: ${detail}`);
        }
        settle();
      },
    );
    await page.addInitScript(observePreview, [
      ...RENDERED_EVENTS,
      ...ERROR_EVENTS,
    ]);
  }

  const timer = setTimeout(() => {
    failures.push(`timeout: no result in ${PAGE_TIMEOUT} ms`);
    settle();
  }, PAGE_TIMEOUT);

  try {
    await page.goto(`${origin}${base}${target.path}`, {
      timeout: PAGE_TIMEOUT,
      waitUntil: 'load',
    });
    if (!target.preview) {
      settle();
    }
  } catch (error) {
    failures.push(`navigation: ${(error as Error).message}`);
    settle();
  }

  await settled;
  clearTimeout(timer);
  await page.close();
  return failures;
}

const browser = await chromium.launch();
let failed = 0;
try {
  let next = 0;
  // Each worker checks the next unclaimed target until none is left.
  const work = async (): Promise<void> => {
    const target = targets[next];
    if (!target) {
      return;
    }
    next += 1;
    const failures = await check(browser, target);
    if (failures.length > 0) {
      failed += 1;
      console.error(`FAIL ${target.name}\n  ${failures.join('\n  ')}`);
    }
    await work();
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, work));
} finally {
  await browser.close();
  server.close();
}

const seconds = ((performance.now() - started) / 1000).toFixed(1);
process.stdout.write(
  `${targets.length - failed} of ${targets.length} pages passed at ${origin}${base} in ${seconds} s\n`,
);
if (failed > 0) {
  process.exitCode = 1;
}
