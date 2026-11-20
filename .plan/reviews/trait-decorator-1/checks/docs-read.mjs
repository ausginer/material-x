// Serves a built Storybook directory under /material-x/ and records, for each
// docs entry, the rendered docs text, and for each story, its argTypes as the
// preview resolves them (name, description, type, table category and default).
// Usage: node docs-read.mjs <playwright module path> <built dir> <out json>
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const [playwrightPath, root, out] = process.argv.slice(2);
const { chromium } = (await import(playwrightPath)).default;
const BASE = '/material-x/';
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.map': 'application/json',
};
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!path.startsWith(BASE)) {
    res.writeHead(404).end();
    return;
  }
  let file = normalize(join(root, path.slice(BASE.length)));
  if (file.endsWith('/')) file = join(file, 'index.html');
  try {
    const body = await readFile(file);
    res
      .writeHead(200, {
        'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      })
      .end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}${BASE}`;
const index = JSON.parse(await readFile(join(root, 'index.json'), 'utf8'));
const browser = await chromium.launch();
const result = { docs: {}, stories: {} };
try {
  const page = await browser.newPage();
  for (const [id, entry] of Object.entries(index.entries)) {
    if (entry.type === 'docs') {
      await page.goto(`${origin}iframe.html?id=${id}&viewMode=docs`);
      await page
        .waitForFunction(
          () =>
            (document.querySelector('#storybook-docs')?.innerText ?? '').trim()
              .length > 0,
          null,
          { timeout: 30000 },
        )
        .catch(() => {});
      await page.waitForTimeout(300);
      result.docs[id] = await page.evaluate(
        () => document.querySelector('#storybook-docs')?.innerText ?? null,
      );
    } else {
      await page.goto(`${origin}iframe.html?id=${id}&viewMode=story`);
      result.stories[id] = await page.evaluate(async (storyId) => {
        const preview = window.__STORYBOOK_PREVIEW__;
        for (let i = 0; i < 100 && !preview?.storyStoreValue; i++)
          await new Promise((r) => setTimeout(r, 100));
        const story = await preview.storyStoreValue.loadStory({ storyId });
        return Object.fromEntries(
          Object.entries(story.argTypes).map(([k, v]) => [
            k,
            {
              name: v.name,
              description: v.description ?? null,
              type: v.type ?? null,
              category: v.table?.category ?? null,
              default: v.table?.defaultValue ?? null,
              control: v.control ?? null,
            },
          ]),
        );
      }, id);
    }
  }
} finally {
  await browser.close();
  server.close();
}
await writeFile(out, JSON.stringify(result, null, 1));
console.log(
  `${Object.keys(result.docs).length} docs pages, ${Object.keys(result.stories).length} stories`,
);
