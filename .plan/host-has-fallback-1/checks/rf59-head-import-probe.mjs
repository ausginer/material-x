// RF-59 probe: does importing a material-x module that evaluates HOST_HAS_SUPPORTED throw when <body> doesn't exist yet?
// Serves slot c's built packages, streams each page's <head> at once and its <body> after HOLD_MS (0 = at once),
// and loads the real built modules in Chromium, Firefox and WebKit through Playwright.
// Usage: node rf59-head-import-probe.mjs <slot root> <scratch dir for the bundle>
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const [slot, scratch] = process.argv.slice(2);
const require = createRequire(join(slot, 'package.json'));
const pw = require('playwright');
const { rolldown } = require('rolldown');

// A consumer that bundles mx-text-field into one classic script (IIFE).
const bundle = await rolldown({
  input: join(slot, 'packages/material-x/text-field/text-field.js'),
  cwd: slot,
  logLevel: 'silent',
});
await bundle.write({
  file: join(scratch, 'text-field.iife.js'),
  format: 'iife',
});

const ROOTS = {
  '/material-x/': join(slot, 'packages/material-x/'),
  '/core/': join(slot, 'packages/core/'),
  '/bundle/': scratch + '/',
};
const TF = '/material-x/text-field/text-field.js';
const LI = '/material-x/list/list-item.js';
const CAPTURE = `<script>
window.__r = { errors: [], bodyAtError: [] };
addEventListener('error', (e) => { __r.errors.push(String(e.message)); __r.bodyAtError.push(document.body !== null); });
window.__rec = (e) => { __r.errors.push('rejected: ' + String(e)); __r.bodyAtError.push(document.body !== null); };
</script>`;
const IMPORTMAP = `<script type="importmap">{"imports":{"@ydinjs/core/":"/core/"}}</script>`;
const SCENARIOS = {
  'module-src': `<script type="module" src="${TF}"></script>`,
  'module-src-async': `<script type="module" async src="${TF}"></script>`,
  'module-inline': `<script type="module">import '${TF}';</script>`,
  'module-inline-async': `<script type="module" async>import '${TF}';</script>`,
  'classic-dynamic-import': `<script>import('${TF}').catch(__rec);</script>`,
  'classic-dynamic-import-list-item': `<script>import('${LI}').catch(__rec);</script>`,
  'classic-bundle': `<script src="/bundle/text-field.iife.js"></script>`,
  'classic-bundle-defer': `<script defer src="/bundle/text-field.iife.js"></script>`,
};
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/page') {
    const head = SCENARIOS[url.searchParams.get('s')];
    const hold = Number(url.searchParams.get('hold'));
    // A declared charset, and a head longer than 1024 bytes, so that no engine waits for more bytes to sniff the
    // encoding before it parses what it has (HTML's encoding sniffing).
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.write(
      `<!doctype html><html><head><meta charset="utf-8">${IMPORTMAP}${CAPTURE}${head}<!--${'x'.repeat(2048)}-->`,
    );
    await new Promise((r) => setTimeout(r, hold));
    res.end(`</head><body><mx-text-field></mx-text-field></body></html>`);
    return;
  }
  const root = Object.keys(ROOTS).find((p) => url.pathname.startsWith(p));
  if (!root) return res.writeHead(404).end();
  try {
    const body = await readFile(
      join(ROOTS[root], url.pathname.slice(root.length)),
    );
    res
      .writeHead(200, {
        'content-type':
          extname(url.pathname) === '.js'
            ? 'text/javascript'
            : 'application/octet-stream',
      })
      .end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

for (const engine of ['chromium', 'firefox', 'webkit']) {
  const browser = await pw[engine].launch();
  console.log(`## ${engine} ${browser.version()}`);
  for (const hold of [1500, 0]) {
    for (const s of Object.keys(SCENARIOS)) {
      const page = await browser.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      await page.goto(`${base}/page?s=${s}&hold=${hold}`, {
        waitUntil: 'load',
      });
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => ({
        ...__r,
        defined:
          !!customElements.get('mx-text-field') ||
          !!customElements.get('mx-list-item'),
        upgraded: document.querySelector('mx-text-field')?.shadowRoot != null,
        bodyBeforeLoadEnd: window.__bodySeen ?? null,
      }));
      console.log(
        `hold=${hold}\t${s.padEnd(34)}\tdefined=${r.defined}\tupgraded=${r.upgraded}\terrors=${JSON.stringify(r.errors)}\tbodyAtError=${JSON.stringify(r.bodyAtError)}\tpageerror=${JSON.stringify(pageErrors)}`,
      );
      await page.close();
    }
  }
  await browser.close();
}
server.close();
