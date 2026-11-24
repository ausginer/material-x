// What each engine's own accessibility tree holds for the built controls that
// have an icon whose text is a ligature, and for the split button's trailing
// button: role, name, disabled, expanded and has-popup.
//
//   built  - the elements as they are
//   hidden - the same, with `aria-hidden="true"` on the slot of each mx-icon's
//            shadow tree, set before the reading
//   wrap   - the same, with the slot moved into a `<span aria-hidden="true">`
//   host   - the same, with `internals.ariaHidden = 'true'` on each mx-icon
//
// node names.ts <packages> <chromium|firefox|webkit>
// Build the packages first. Firefox is read through Marionette's chrome context
// (nsIAccessible), in document order. Derived from slider-1/probes/mirroring.ts.
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { rolldown } from 'rolldown';

const [PACKAGES, ENGINE] = process.argv.slice(2) as [string, string];

const trailing =
  'S.querySelector("[part=trailing]").shadowRoot.querySelector(".host")';
const leading =
  'S.querySelector("[part=leading]").shadowRoot.querySelector(".host")';
const own = 'S.querySelector(".host, .input")';
const icon = (attrs = '') => `<mx-icon ${attrs}>edit</mx-icon>`;

// label, markup, the node to read. `E` is the element, `S` its shadow root.
const CASES: ReadonlyArray<readonly [string, string, string]> = [
  ['split, trailing', '<mx-split-button ID>Save</mx-split-button>', trailing],
  [
    'split, open, trailing',
    '<mx-split-button ID open>Save</mx-split-button>',
    trailing,
  ],
  [
    'split, host aria-label, trailing',
    '<mx-split-button ID aria-label="A">Save</mx-split-button>',
    trailing,
  ],
  [
    'split, host aria-label, leading',
    '<mx-split-button ID aria-label="A">Save</mx-split-button>',
    leading,
  ],
  [
    'split, host aria-label, host',
    '<mx-split-button ID aria-label="A">Save</mx-split-button>',
    'E',
  ],
  [
    'split, host aria-expanded, trailing',
    '<mx-split-button ID aria-expanded="true">Save</mx-split-button>',
    trailing,
  ],
  [
    'split, host aria-haspopup, trailing',
    '<mx-split-button ID aria-haspopup="menu">Save</mx-split-button>',
    trailing,
  ],
  [
    'split, icon, leading',
    `<mx-split-button ID>${icon('slot="icon"')}Save</mx-split-button>`,
    leading,
  ],
  [
    'split, disabled, trailing',
    '<mx-split-button ID disabled>Save</mx-split-button>',
    trailing,
  ],
  [
    'split, disabled, leading',
    '<mx-split-button ID disabled>Save</mx-split-button>',
    leading,
  ],
  [
    'button, disabled (control)',
    '<mx-button ID disabled>Save</mx-button>',
    own,
  ],
  [
    'native button, expanded, disabled (control)',
    '<button ID aria-expanded="true" aria-haspopup="menu" disabled>Save</button>',
    'E',
  ],
  [
    'button, icon and label',
    `<mx-button ID>${icon('slot="icon"')}Save</mx-button>`,
    own,
  ],
  [
    'button, icon aria-hidden and label',
    `<mx-button ID>${icon('slot="icon" aria-hidden="true"')}Save</mx-button>`,
    own,
  ],
  [
    'button, icon role=img aria-label, and label',
    `<mx-button ID>${icon('slot="icon" role="img" aria-label="Draft"')}Save</mx-button>`,
    own,
  ],
  [
    'button, aria-label, icon and label',
    `<mx-button ID aria-label="A">${icon('slot="icon"')}Save</mx-button>`,
    own,
  ],
  [
    'link-button, icon and label',
    `<mx-link-button ID href="#x">${icon('slot="icon"')}Save</mx-link-button>`,
    own,
  ],
  [
    'switch-button, icon and label',
    `<mx-switch-button ID>${icon('slot="icon"')}Save</mx-switch-button>`,
    own,
  ],
  [
    'icon-button, no name',
    `<mx-icon-button ID>${icon()}</mx-icon-button>`,
    own,
  ],
  [
    'icon-button, aria-label',
    `<mx-icon-button ID aria-label="A">${icon()}</mx-icon-button>`,
    own,
  ],
  [
    'switch-icon-button, no name',
    `<mx-switch-icon-button ID>${icon()}</mx-switch-icon-button>`,
    own,
  ],
  ['fab, icon slot only', `<mx-fab ID>${icon('slot="icon"')}</mx-fab>`, own],
  [
    'fab, extended, icon and label',
    `<mx-fab ID extended>${icon('slot="icon"')}Save</mx-fab>`,
    own,
  ],
  [
    'list button item, lead, label, trail',
    `<mx-list><mx-list-button-item ID>${icon('slot="lead"')}Save${icon('slot="trail"')}</mx-list-button-item></mx-list>`,
    own,
  ],
  [
    'list link item, lead, label, trail',
    `<mx-list><mx-list-link-item ID href="#x">${icon('slot="lead"')}Save${icon('slot="trail"')}</mx-list-link-item></mx-list>`,
    own,
  ],
  [
    'list item, lead, label, trail: host',
    `<mx-list><mx-list-item ID>${icon('slot="lead"')}Save${icon('slot="trail"')}</mx-list-item></mx-list>`,
    'E',
  ],
  [
    'text-field, label, lead and trail',
    `<mx-text-field ID><span slot="label">Save</span>${icon('slot="lead"')}${icon('slot="trail"')}</mx-text-field>`,
    own,
  ],
  ['mx-icon alone', `<mx-icon ID>edit</mx-icon>`, 'E'],
  [
    'mx-icon alone, role=img aria-label',
    `<mx-icon ID role="img" aria-label="Draft">edit</mx-icon>`,
    'E',
  ],
];

const MODES = ['built', 'hidden', 'wrap', 'host'] as const;
const body = CASES.map(
  ([, html], n) => `<div>${html.replace('ID', `id="c${n}"`)}</div>`,
).join('\n');

const dir = await mkdtemp(join(tmpdir(), 'names-'));
const entry = join(dir, 'entry.js');
await writeFile(
  entry,
  `const MODE = location.hash.slice(1);
const attach = Element.prototype.attachInternals ?? HTMLElement.prototype.attachInternals;
const all = new WeakMap();
HTMLElement.prototype.attachInternals = function () { const i = attach.call(this); all.set(this, i); return i; };
${[
  'button/button',
  'button/icon-button',
  'button/link-button',
  'button/split-button',
  'button/switch-button',
  'button/switch-icon-button',
  'fab/fab',
  'icon/icon',
  'list/list',
  'list/list-item',
  'list/list-button-item',
  'list/list-link-item',
  'text-field/text-field',
]
  .map(
    (f) =>
      `await import(${JSON.stringify(join(PACKAGES, 'material-x', `${f}.js`))});`,
  )
  .join('\n')}
const icons = (root) => [...root.querySelectorAll('*')].flatMap((e) => [...(e.localName === 'mx-icon' ? [e] : []), ...(e.shadowRoot ? icons(e.shadowRoot) : [])]);
for (const i of icons(document)) {
  if (MODE === 'hidden') i.shadowRoot.querySelector('slot').setAttribute('aria-hidden', 'true');
  if (MODE === 'wrap') { const w = document.createElement('span'); w.ariaHidden = 'true'; w.append(i.shadowRoot.querySelector('slot')); i.shadowRoot.append(w); }
  if (MODE === 'host') all.get(i) ? (all.get(i).ariaHidden = 'true') : (i.attachInternals().ariaHidden = 'true');
}
await new Promise((r) => setTimeout(r, 500));
window.__icons = icons(document).length;
window.__done = true;`,
);
const build = await rolldown({ input: entry, platform: 'browser' });
const { output } = await build.generate({
  format: 'esm',
  codeSplitting: false,
});
const code = output.map((c) => ('code' in c ? c.code : '')).join('\n');
const file = join(dir, 'index.html');
await writeFile(
  file,
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>names</title></head><body>${body}<script type="module">${code.replaceAll('</script', '<\\/script')}</script></body></html>`,
);
const url = pathToFileURL(file).href;
const print = (label: string, reading: unknown) =>
  console.log(`  ${label.padEnd(46)} ${JSON.stringify(reading)}`);
const expr = (n: number) =>
  `((E) => { const S = E.shadowRoot; return ${CASES[n]![2]}; })(document.getElementById('c${n}'))`;

if (ENGINE === 'chromium' || ENGINE === 'webkit') {
  const browser = await (ENGINE === 'chromium' ? chromium : webkit).launch();
  console.log(`# ${ENGINE} ${browser.version()}`);
  for (const mode of MODES) {
    const p = await browser.newPage();
    p.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
    await p.goto(`${url}#${mode}`);
    await p.waitForFunction('window.__done');
    console.log(`\n## ${mode}, ${await p.evaluate('window.__icons')} icons`);
    const s: any =
      ENGINE === 'chromium'
        ? await p.context().newCDPSession(p)
        : (p as any)._connection.toImpl(p).delegate._session;
    await (ENGINE === 'chromium'
      ? s.send('Accessibility.enable')
      : s.send('DOM.getDocument'));
    for (const [n, [label]] of CASES.entries()) {
      const { result } = await s.send('Runtime.evaluate', {
        expression: expr(n),
      });
      if (ENGINE === 'chromium') {
        const { nodes } = await s.send('Accessibility.getPartialAXTree', {
          objectId: result.objectId,
          fetchRelatives: false,
        });
        const a = nodes[0];
        const prop = (k: string) =>
          (a.properties ?? []).find((x: any) => x.name === k)?.value.value;
        print(
          label,
          a.ignored
            ? { ignored: true }
            : {
                role: a.role?.value,
                name: a.name?.value,
                disabled: prop('disabled'),
                expanded: prop('expanded'),
                hasPopup: prop('hasPopup'),
              },
        );
      } else {
        const { nodeId } = await s.send('DOM.requestNode', {
          objectId: result.objectId,
        });
        const { properties: a } = await s.send(
          'DOM.getAccessibilityPropertiesForNode',
          { nodeId },
        );
        print(
          label,
          a.ignored || !a.exists
            ? { ignored: true }
            : {
                role: a.role,
                name: a.label,
                disabled: a.disabled,
                expanded: a.expanded,
                isPopUpButton: a.isPopUpButton,
              },
        );
      }
    }
    await p.close();
  }
  await browser.close();
} else {
  const profile = await mkdtemp(join(tmpdir(), 'names-ff-'));
  await writeFile(
    join(profile, 'user.js'),
    'user_pref("marionette.port", 2843);\nuser_pref("browser.shell.checkDefaultBrowser", false);\n',
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
  const sock = createConnection(2843, '127.0.0.1');
  let buf = Buffer.alloc(0);
  const pending = new Map<number, (v: [unknown, any]) => void>();
  sock.on('data', (d: Buffer) => {
    buf = Buffer.concat([buf, d]);
    for (;;) {
      const colon = buf.indexOf(':');
      if (colon < 0) return;
      const len = Number(buf.subarray(0, colon).toString());
      if (buf.length < colon + 1 + len) return;
      const msg = JSON.parse(
        buf.subarray(colon + 1, colon + 1 + len).toString(),
      );
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
              res && typeof res === 'object' && 'value' in res
                ? res.value
                : res,
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
    script: `globalThis.__acc = Cc['@mozilla.org/accessibilityService;1'].getService(Ci.nsIAccessibilityService); window.__acc = globalThis.__acc;`,
    args: [],
  });
  for (const mode of MODES) {
    await send('Marionette:SetContext', { value: 'content' });
    await send('WebDriver:Navigate', { url: 'about:blank' });
    await send('WebDriver:Navigate', { url: `${url}#${mode}` });
    await send('WebDriver:ExecuteAsyncScript', {
      script:
        'const done = arguments[0]; const t = setInterval(() => { const w = window.wrappedJSObject ?? window; if (w.__done) { clearInterval(t); done(); } }, 50);',
      args: [],
    });
    console.log(`\n## ${mode}`);
    for (const [n, [label]] of CASES.entries()) {
      const ref = await send('WebDriver:ExecuteScript', {
        script: `return ${expr(n)};`,
        args: [],
      });
      const a = await send('Marionette:GetAccessibilityPropertiesForElement', {
        id: Object.values(ref)[0],
      });
      print(label, a ? { role: a.role, name: a.label } : { ignored: true });
    }
    await send('Marionette:SetContext', { value: 'chrome' });
    const tree = await send('WebDriver:ExecuteScript', {
      script: `const svc = Cc['@mozilla.org/accessibilityService;1'].getService(Ci.nsIAccessibilityService);
        const out = [];
        const walk = (acc) => {
          const role = svc.getStringRole(acc.role);
          const state = {}, ext = {};
          acc.getState(state, ext);
          const list = svc.getStringStates(state.value, ext.value); const names = Array.from({ length: list.length }, (_, k) => list.item(k)).filter((s) => /unavailable|expanded|collapsed|has ?popup|expandable/i.test(s));
          if (/button|link|graphic|entry|text leaf|listitem/.test(role)) out.push([role, JSON.stringify(acc.name), names.join(' ')].join(' | '));
          for (let c = acc.firstChild; c; c = c.nextSibling) walk(c);
        };
        walk(svc.getAccessibleFor(gBrowser.selectedBrowser));
        return out;`,
      args: [],
    });
    console.log('  the tree in document order: role | name | states');
    for (const t of tree) console.log(`    ${t}`);
  }
  await send('Marionette:SetContext', { value: 'content' }).catch(() => {});
  await send('WebDriver:DeleteSession').catch(() => {});
  sock.end();
  proc.kill();
  await rm(profile, { recursive: true, force: true });
}
await rm(dir, { recursive: true });
