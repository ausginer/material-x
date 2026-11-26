// Which text leaves Firefox's own tree holds below an icon whose content is
// hidden in its shadow tree, by how it is hidden (in the template, or set by the
// constructor, in a microtask or at the connect) and by the order of definition.
// node firefox-hide.ts [rounds]
// Derived from firefox-upgrade.ts.
// The elements here are plain custom elements, with nothing of material-x.
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { firefox } from 'playwright';

const ROUNDS = Number(process.argv[2] ?? 3);
const define = (inner: string, delay = 0) => `
setTimeout(() => {
customElements.define('x-icon', class extends HTMLElement { constructor() { super(); this.attachShadow({ mode: 'open' }).innerHTML = ${JSON.stringify(inner)}; } });
customElements.define('x-button', class extends HTMLElement { constructor() { super(); this.attachShadow({ mode: 'open' }).innerHTML = '<button><slot name="icon"></slot><slot></slot></button>'; } });
setTimeout(() => { window.__done = true; }, 1500); }, ${delay});`;
const span = '<span aria-hidden="true"><slot></slot></span>';
const HTML =
  '<x-button><x-icon slot="icon">edit</x-icon>Save</x-button><p><x-icon>edit</x-icon></p><button><x-icon>edit</x-icon></button>';
const el = (tag: string, body: string, extra = '') =>
  `customElements.define('${tag}', class extends HTMLElement { constructor() { super(); this.attachShadow({ mode: 'open' }).innerHTML = ${JSON.stringify(body)}; ${extra} } });`;
const btn = el(
  'x-button',
  '<button><slot name="icon"></slot><slot></slot></button>',
);
const plain = '<span><slot></slot></span>';
const H =
  "const hide = () => this.shadowRoot.firstChild.setAttribute('aria-hidden', 'true');";
const ic: Record<string, string> = {
  static: el('x-icon', span),
  sync: el('x-icon', plain, H + ' hide();'),
  'slot, static': el(
    'x-icon',
    '<slot aria-hidden="true" style="display: inline"></slot>',
  ),
  'slot, sync': el(
    'x-icon',
    '<slot style="display: inline"></slot>',
    H + ' hide();',
  ),
  'slot of contents, sync': el('x-icon', '<slot></slot>', H + ' hide();'),
  same: el('x-icon', span, H + ' hide();'),
  micro: el('x-icon', plain, H + ' queueMicrotask(hide);'),
  connected: el('x-icon', plain, H + ' this.hide = hide;').replace(
    '} });',
    '} connectedCallback() { this.hide(); } });',
  ),
};
const done = 'setTimeout(() => { window.__done = true; }, 1500);';
const VARIANTS: Array<readonly [string, string]> = [];
for (const [k, icon] of Object.entries(ic)) {
  VARIANTS.push(
    [`${k}: parsed, at once`, `${HTML}<script>${icon}${btn}${done}</script>`],
    [
      `${k}: parsed, 500 ms, icon then button`,
      `${HTML}<script>setTimeout(() => { ${icon}${btn}${done} }, 500)</script>`,
    ],
    [
      `${k}: parsed, 500 ms, button then icon`,
      `${HTML}<script>setTimeout(() => { ${btn}${icon}${done} }, 500)</script>`,
    ],
    [
      `${k}: parsed, icon at 500, button at 900`,
      `${HTML}<script>setTimeout(() => { ${icon} }, 500); setTimeout(() => { ${btn}${done} }, 900)</script>`,
    ],
    [
      `${k}: parsed, button at 500, icon at 900`,
      `${HTML}<script>setTimeout(() => { ${btn} }, 500); setTimeout(() => { ${icon}${done} }, 900)</script>`,
    ],
    [
      `${k}: defined, then inserted`,
      `<div id="d"></div><script>${icon}${btn} setTimeout(() => { document.getElementById('d').innerHTML = ${JSON.stringify(HTML)}; ${done} }, 300)</script>`,
    ],
    [
      `${k}: 500 ms, then the text is replaced`,
      `${HTML}<script>setTimeout(() => { ${icon}${btn} }, 500); setTimeout(() => { for (const i of document.querySelectorAll('x-icon')) i.textContent = 'late'; ${done} }, 1000)</script>`,
    ],
    [
      `${k}: 500 ms, empty, then text from elsewhere in the page moves in`,
      `${HTML.replaceAll('edit', '')}<p id="s"><b>moved</b></p><script>setTimeout(() => { ${icon}${btn} }, 500); setTimeout(() => { document.querySelector('x-icon').append(document.querySelector('b')); ${done} }, 1000)</script>`,
    ],
    [
      `${k}: 500 ms, then each icon moves`,
      `${HTML}<div id="d"></div><script>setTimeout(() => { ${icon}${btn} }, 500); setTimeout(() => { document.getElementById('d').append(...document.querySelectorAll('x-icon')); ${done} }, 1000)</script>`,
    ],
    [
      `${k}: 500 ms, then hidden and shown by display`,
      `${HTML}<script>setTimeout(() => { ${icon}${btn} }, 500); setTimeout(() => { document.body.style.display = 'none'; }, 900); setTimeout(() => { document.body.style.display = ''; ${done} }, 1300)</script>`,
    ],
    [
      `${k}: 500 ms, a named icon`,
      `${HTML.replaceAll('<x-icon', '<x-icon role="img" aria-label="Draft"')}<script>setTimeout(() => { ${icon}${btn}${done} }, 500)</script>`,
    ],
  );
}
const dir = await mkdtemp(join(tmpdir(), 'ffup-'));
const profile = await mkdtemp(join(tmpdir(), 'ffup-p-'));
await writeFile(
  join(profile, 'user.js'),
  'user_pref("marionette.port", 2851);\nuser_pref("browser.shell.checkDefaultBrowser", false);\n',
);
const proc = spawn(
  firefox.executablePath(),
  [
    '--marionette',
    '-headless',
    '-no-remote',
    '-remote-allow-system-access',
    '-profile',
    profile,
  ],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: '1' },
  },
);
await new Promise<void>((resolve) => {
  const on = (d: Buffer) => {
    if (d.toString().includes('Listening on port')) resolve();
  };
  proc.stdout.on('data', on);
  proc.stderr.on('data', on);
});
const sock = createConnection(2851, '127.0.0.1');
let buf = Buffer.alloc(0);
const pending = new Map<number, (v: [unknown, any]) => void>();
sock.on('data', (d: Buffer) => {
  buf = Buffer.concat([buf, d]);
  for (;;) {
    const colon = buf.indexOf(':');
    if (colon < 0) return;
    const len = Number(buf.subarray(0, colon).toString());
    if (buf.length < colon + 1 + len) return;
    const msg = JSON.parse(buf.subarray(colon + 1, colon + 1 + len).toString());
    buf = buf.subarray(colon + 1 + len);
    if (Array.isArray(msg)) pending.get(msg[1])?.([msg[2], msg[3]]);
  }
});
let seq = 0;
const send = (name: string, params: object = {}) =>
  new Promise<any>((resolve, reject) => {
    const id = ++seq;
    pending.set(id, ([err, res]) =>
      err
        ? reject(new Error(JSON.stringify(err)))
        : resolve(
            res && typeof res === 'object' && 'value' in res ? res.value : res,
          ),
    );
    const s = JSON.stringify([0, id, name, params]);
    sock.write(`${Buffer.byteLength(s)}:${s}`);
  });
await new Promise((r) => setTimeout(r, 300));
const session = await send('WebDriver:NewSession', { capabilities: {} });
console.log(`# firefox ${session.capabilities?.browserVersion}`);
await send('Marionette:SetContext', { value: 'chrome' });
await send('WebDriver:ExecuteScript', {
  script: `window.__acc = Cc['@mozilla.org/accessibilityService;1'].getService(Ci.nsIAccessibilityService);`,
  args: [],
});
for (const [n, [label, html]] of VARIANTS.entries()) {
  const file = join(dir, `${n}.html`);
  await writeFile(
    file,
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>x</title><body>${html}</body></html>`,
  );
  for (let round = 0; round < ROUNDS; round += 1) {
    await send('Marionette:SetContext', { value: 'content' });
    await send('WebDriver:Navigate', { url: 'about:blank' });
    await send('WebDriver:Navigate', { url: pathToFileURL(file).href });
    await send('WebDriver:ExecuteAsyncScript', {
      script:
        'const done = arguments[0]; const t = setInterval(() => { if ((window.wrappedJSObject ?? window).__done) { clearInterval(t); done(); } }, 50);',
      args: [],
    });
    await send('Marionette:SetContext', { value: 'chrome' });
    const tree = await send('WebDriver:ExecuteScript', {
      script: `const svc = window.__acc; const out = [];
      const walk = (acc, depth) => { const role = svc.getStringRole(acc.role); out.push(role + ' ' + JSON.stringify(acc.name)); const kids = []; for (let c = acc.firstChild; c; c = c.nextSibling) kids.push(walk(c)); return role + (acc.name ? JSON.stringify(acc.name) : '') + (kids.length ? '(' + kids.join(', ') + ')' : ''); };
      let doc = svc.getAccessibleFor(gBrowser.selectedBrowser); return walk(doc);`,
      args: [],
    });
    console.log(`${label} | ${tree}`);
  }
}
await send('Marionette:SetContext', { value: 'content' }).catch(() => {});
await send('WebDriver:DeleteSession').catch(() => {});
sock.end();
proc.kill();
await rm(profile, { recursive: true, force: true });
await rm(dir, { recursive: true });
