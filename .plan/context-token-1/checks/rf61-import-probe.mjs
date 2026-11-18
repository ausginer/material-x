// RF-61: does importing material-x's button group fail on a page served over plain HTTP from a host other than
// localhost? Serves a slot's built packages, and imports the real built modules in Chromium, Firefox and WebKit.
// Each engine opens the page twice: by the machine's own IPv4 address, which isn't a potentially trustworthy
// origin, and by localhost, which is.
// Usage: node rf61-import-probe.mjs <slot root>
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { networkInterfaces } from 'node:os';

const [slot] = process.argv.slice(2);
const pw = createRequire(join(slot, 'package.json'))('playwright');

const ROOTS = {
  '/material-x/': join(slot, 'packages/material-x/'),
  '/core/': join(slot, 'packages/core/'),
};
const TYPES = { '.js': 'text/javascript', '.css': 'text/css' };
// Each page imports one entry with a dynamic import() from a classic script, so a rejection is caught and recorded.
// The entry's element is in the body, so an upgrade shows that the module defined it. mx-checkbox is the control: its
// import graph doesn't reach button-group-context.js.
const ENTRIES = {
  'button-group/button-group.js': 'mx-button-group',
  'button/button.js': 'mx-button',
  'text-field/text-field.js': 'mx-text-field',
  'checkbox/checkbox.js': 'mx-checkbox',
};
const page = (entry) => `<!doctype html><html><head><meta charset="utf-8">
<script type="importmap">{"imports":{"@ydinjs/core/":"/core/"}}</script>
<script>
window.__r = { errors: [] };
addEventListener('error', (e) => __r.errors.push(String(e.message)));
window.__done = import('/material-x/${entry}').then(
  () => 'resolved',
  (e) => (__r.errors.push('rejected: ' + String(e)), 'rejected'),
);
</script></head><body><${ENTRIES[entry]}></${ENTRIES[entry]}></body></html>`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/page') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(page(url.searchParams.get('entry')));
  }
  const root = Object.keys(ROOTS).find((p) => url.pathname.startsWith(p));
  if (!root) return res.writeHead(404).end();
  try {
    const body = await readFile(
      join(ROOTS[root], url.pathname.slice(root.length)),
    );
    res.writeHead(200, {
      'content-type':
        TYPES[extname(url.pathname)] ?? 'application/octet-stream',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0, '0.0.0.0');
await new Promise((r) => server.once('listening', r));
const { port } = server.address();
const ip = Object.values(networkInterfaces())
  .flat()
  .find((a) => a.family === 'IPv4' && !a.internal).address;

for (const name of ['chromium', 'firefox', 'webkit']) {
  const browser = await pw[name].launch();
  for (const host of [ip, 'localhost']) {
    for (const [entry, tag] of Object.entries(ENTRIES)) {
      const tab = await browser.newPage();
      await tab.goto(`http://${host}:${port}/page?entry=${entry}`);
      const result = await tab.evaluate(
        async (tag) => ({
          secure: isSecureContext,
          import: await window.__done,
          defined: customElements.get(tag) !== undefined,
          upgraded: document.querySelector(tag).shadowRoot !== null,
          errors: __r.errors,
        }),
        tag,
      );
      const where = host === 'localhost' ? 'localhost' : 'LAN address';
      console.log(
        `${name} ${browser.version()}\t${where}\t${entry}\t${JSON.stringify(result)}`,
      );
      await tab.close();
    }
  }
  await browser.close();
}
server.close();
