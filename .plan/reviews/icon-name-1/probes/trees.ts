// RF-137's feature proof: each engine's own accessibility tree for the built
// mx-icon, by the order of definition and by what the page does after.
//
//   node trees.ts <packages> <chromium|firefox|webkit> [marionette port]
//
// Build the packages first. Each case is a page whose markup is parsed before
// any definition. The driver turns the engine's accessibility on and reads the
// tree once, so the nodes of the undefined elements exist, and only then lets
// the page run its steps. It prints, for each case:
//
//   - the name of each target: controls, and headings, a native link and a
//     native button, whose name comes from their contents as well;
//   - every target name, and every node of the tree, whose name or text has a
//     token that is only in an icon (`edit`, `late`, `Star`, and `moved` once
//     it is in one). Chromium: the full tree. Firefox: every accessible under
//     the content document. WebKit, whose Linux port folds text into its
//     parent: each text node and SVG under an icon that isn't ignored. Its
//     `hidden` is printed and isn't evidence: a slot without a box is `hidden`
//     for WebKit, and its text is still in every name.
//
// The case `defined before the markup` runs the definitions in the head, so
// the parser constructs each icon before its text is parsed.
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { rolldown } from 'rolldown';

const [PACKAGES, ENGINE, PORT = '2911'] = process.argv.slice(2) as [
  string,
  string,
  string?,
];
// `moved` is the page's own text until a case moves it into an icon.
const tokens = (label: string) =>
  label.includes('moves into')
    ? /\b(edit|late|moved|Star)\b/u
    : /\b(edit|late|Star)\b/u;

const bundle = async (files: readonly string[]): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), 'trees-entry-'));
  const entry = join(dir, 'entry.js');
  await writeFile(
    entry,
    files
      .map(
        (f) =>
          `import ${JSON.stringify(join(PACKAGES, 'material-x', `${f}.js`))};`,
      )
      .join('\n'),
  );
  const build = await rolldown({ input: entry, platform: 'browser' });
  const { output } = await build.generate({ format: 'iife' });
  await rm(dir, { recursive: true });
  return output[0].code;
};
// `early` doesn't import the icon: text-field and split-button do.
const DEFS = {
  icon: await bundle(['icon/icon']),
  early: await bundle([
    'button/button',
    'button/icon-button',
    'fab/fab',
    'list/list',
    'list/list-item',
  ]),
};

const i = (attrs = '', text = 'edit') => `<mx-icon ${attrs}>${text}</mx-icon>`;
const SVG =
  '<svg viewBox="0 0 24 24" width="24" height="24" role="img" aria-label="Star"><title>Star</title><path d="M0 0h24v24H0z"/></svg>';
const FIXTURE = `
<h2 id="h">${i()}Title</h2>
<mx-button id="b">${i('slot="icon"')}Save</mx-button>
<mx-icon-button id="ib">${i()}</mx-icon-button>
<mx-icon-button id="ibl" aria-label="Open">${i()}</mx-icon-button>
<mx-button id="nb">${i('slot="icon" role="img" aria-label="Draft"')}Save</mx-button>
<mx-list><mx-list-item id="li">${i('slot="lead"')}Item${i('slot="trail"')}</mx-list-item></mx-list>
<button id="n">${i()}Native</button>
<a id="a" href="#x">${i()}Link</a>
<h3 id="hf">${i('style="display: flex"')}Flex</h3>
<h3 id="hg">${i('style="display: grid"')}Grid</h3>
<h3 id="hc">${i('style="display: contents"')}Contents</h3>
<h3 id="hs">${i('', SVG)}Svg</h3>
<mx-fab id="fc" extended="closed">${i('slot="icon"')}Create</mx-fab>
<p id="p">${i()}</p>
<p id="s"><b>moved</b></p>
<div id="d"></div>`;

// The node whose name is read: the inner `.host` of a material-x control.
const TARGETS: ReadonlyArray<readonly [string, string]> = [
  ['h2, icon, Title', 'h'],
  ['mx-button, icon, Save', 'b .host'],
  ['mx-icon-button, no label', 'ib .host'],
  ['mx-icon-button, aria-label Open', 'ibl .host'],
  ['mx-button, named icon, Save', 'nb .host'],
  ['mx-list-item, lead, Item, trail', 'li'],
  ['native button, icon, Native', 'n'],
  ['native link, icon, Link', 'a'],
  ['h3, icon display flex', 'hf'],
  ['h3, icon display grid', 'hg'],
  ['h3, icon display contents', 'hc'],
  ['h3, icon with an SVG', 'hs'],
  ['closed extended mx-fab, Create', 'fc .host'],
];
const targetExpr = (t: string) => {
  const [id, inner] = t.split(' ');
  const e = `document.getElementById(${JSON.stringify(id)})`;
  return inner ? `${e}.shadowRoot.querySelector(${JSON.stringify(inner)})` : e;
};

const WAIT = 'wait';
const moveIn =
  "document.querySelector('#p mx-icon').replaceChildren(document.querySelector('#s b'));";
const replace =
  "for (const e of document.querySelectorAll('mx-icon')) if (e.textContent === 'edit') e.textContent = 'late';";
const moveIcons =
  "document.getElementById('d').append(...document.querySelectorAll('mx-icon'));";
const created =
  "const e = document.createElement('mx-icon'); document.getElementById('d').append(e); e.textContent = 'late';";
const CASES: ReadonlyArray<readonly [string, string, readonly string[]]> = [
  ['defined before the markup', FIXTURE, ['head']],
  ['markup, then defined', FIXTURE, ['icon', 'early']],
  [
    'the others defined, the icon 400 ms later',
    FIXTURE,
    ['early', WAIT, 'icon'],
  ],
  [
    'the icon defined, the others 400 ms later',
    FIXTURE,
    ['icon', WAIT, 'early'],
  ],
  [
    'defined, then inserted',
    '<main></main>',
    [
      'icon',
      'early',
      `document.querySelector('main').innerHTML = ${JSON.stringify(FIXTURE)};`,
    ],
  ],
  [
    'defined, then the text is replaced',
    FIXTURE,
    ['icon', 'early', WAIT, replace],
  ],
  [
    'defined, then page text moves into an icon',
    FIXTURE,
    ['icon', 'early', WAIT, moveIn],
  ],
  [
    'defined, then each icon moves',
    FIXTURE,
    ['icon', 'early', WAIT, moveIcons],
  ],
  [
    'defined, then an icon is created and given text',
    FIXTURE,
    ['icon', 'early', WAIT, created],
  ],
];

const inHead = (steps: readonly string[]) =>
  steps[0] === 'head'
    ? `<script>${(DEFS.icon + DEFS.early).replaceAll('</script', '<\\/script')}</script>`
    : '';
const page = (html: string, steps: readonly string[]) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>trees</title>${inHead(steps)}</head><body>${html}
<script>
const DEFS = ${JSON.stringify(DEFS).replaceAll('</script', '<\\/script')};
const STEPS = ${JSON.stringify(steps).replaceAll('</script', '<\\/script')};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (code) => { const s = document.createElement('script'); s.textContent = code; document.head.append(s); };
(async () => {
  while (!window.__go) await sleep(20);
  for (const step of STEPS) {
    if (step === 'head') continue;
    if (step === 'wait') await sleep(400);
    else run(DEFS[step] ?? step);
  }
  await sleep(500);
  window.__done = true;
})();
</script></body></html>`;

const dir = await mkdtemp(join(tmpdir(), 'trees-'));
const print = (s: string) => console.log(s);

if (ENGINE === 'chromium' || ENGINE === 'webkit') {
  const browser = await (ENGINE === 'chromium' ? chromium : webkit).launch();
  print(`# ${ENGINE} ${browser.version()}`);
  for (const [n, [label, html, steps]] of CASES.entries()) {
    const file = join(dir, `c${n}.html`);
    await writeFile(file, page(html, steps));
    const p = await browser.newPage();
    p.on('pageerror', (e) => print(`PAGE ERROR ${e.message}`));
    await p.goto(pathToFileURL(file).href);
    const s: any =
      ENGINE === 'chromium'
        ? await p.context().newCDPSession(p)
        : (p as any)._connection.toImpl(p).delegate._session;
    const nodeOf = async (expression: string) => {
      const { result } = await s.send('Runtime.evaluate', { expression });
      return result.objectId ? result : null;
    };
    let readAll: () => Promise<string[]>;
    let readName: (expression: string) => Promise<string>;
    if (ENGINE === 'chromium') {
      await s.send('Accessibility.enable');
      readAll = async () =>
        (await s.send('Accessibility.getFullAXTree')).nodes
          .filter((x: any) => !x.ignored)
          .map(
            (x: any) =>
              `${x.role?.value} ${JSON.stringify(x.name?.value ?? '')}`,
          );
      readName = async (expression) => {
        const r = await nodeOf(expression);
        if (!r) return 'no node';
        const { nodes } = await s.send('Accessibility.getPartialAXTree', {
          objectId: r.objectId,
          fetchRelatives: false,
        });
        const a = nodes[0];
        return a.ignored
          ? 'ignored'
          : `${a.role?.value} ${JSON.stringify(a.name?.value ?? '')}`;
      };
    } else {
      await s.send('DOM.getDocument');
      const props = async (objectId: string) => {
        const { nodeId } = await s.send('DOM.requestNode', { objectId });
        return (
          await s.send('DOM.getAccessibilityPropertiesForNode', { nodeId })
        ).properties;
      };
      readAll = async () => {
        const r = await nodeOf(
          `(() => { const out = []; const walk = (root) => { for (const e of root.querySelectorAll('*')) { if (e.localName === 'mx-icon') for (const c of e.childNodes) out.push(c); if (e.shadowRoot) walk(e.shadowRoot); } }; walk(document); return out; })()`,
        );
        const { properties: result } = await s.send('Runtime.getProperties', {
          objectId: r!.objectId,
          ownProperties: true,
        });
        const out: string[] = [];
        for (const { name, value } of result)
          if (/^\d+$/u.test(name)) {
            const a = await props(value.objectId);
            out.push(
              `${JSON.stringify(value.description)} ${a.exists ? (a.ignored ? 'ignored' : `${a.role || 'text'} ${JSON.stringify(a.label ?? '')}`) : 'no object'}${a.hidden ? ' hidden' : ''}`,
            );
          }
        return out;
      };
      readName = async (expression) => {
        const r = await nodeOf(expression);
        if (!r) return 'no node';
        const a = await props(r.objectId);
        return !a.exists || a.ignored
          ? 'ignored'
          : `${a.role} ${JSON.stringify(a.label ?? '')}`;
      };
    }
    await readAll();
    await p.evaluate('window.__go = true');
    await p.waitForFunction('window.__done');
    print(`\n## ${label}`);
    const names: string[] = [];
    for (const [name, t] of TARGETS) {
      const reading = await readName(targetExpr(t));
      names.push(reading);
      print(`  ${name.padEnd(36)} ${reading}`);
    }
    const all = await readAll();
    const leaks =
      ENGINE === 'chromium'
        ? all.filter((x) => tokens(label).test(x))
        : [
            ...names.filter((x) => tokens(label).test(x)),
            ...all.filter(
              (x) => tokens(label).test(x) && !/ ignored( hidden)?$/u.test(x),
            ),
          ];
    print(`  tokens in the tree: ${leaks.length ? leaks.join(', ') : 'none'}`);
    if (ENGINE === 'webkit') print(`  icon children: ${all.join(', ')}`);
    await p.close();
  }
  await browser.close();
} else {
  const profile = await mkdtemp(join(tmpdir(), 'trees-ff-'));
  await writeFile(
    join(profile, 'user.js'),
    `user_pref("marionette.port", ${PORT});\nuser_pref("browser.shell.checkDefaultBrowser", false);\n`,
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
  process.on('exit', () => proc.kill());
  await new Promise<void>((resolve) => {
    const on = (d: Buffer) => {
      if (d.toString().includes('Listening on port')) resolve();
    };
    proc.stdout.on('data', on);
    proc.stderr.on('data', on);
  });
  const sock = createConnection(Number(PORT), '127.0.0.1');
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
      const m = JSON.stringify([0, id, name, params]);
      sock.write(`${Buffer.byteLength(m)}:${m}`);
    });
  await new Promise((r) => setTimeout(r, 300));
  const session = await send('WebDriver:NewSession', { capabilities: {} });
  print(`# firefox ${session.capabilities?.browserVersion}`);
  await send('Marionette:SetContext', { value: 'chrome' });
  await send('WebDriver:ExecuteScript', {
    script: `globalThis.__acc = Cc['@mozilla.org/accessibilityService;1'].getService(Ci.nsIAccessibilityService);`,
    args: [],
  });
  const walk = async () => {
    await send('Marionette:SetContext', { value: 'chrome' });
    let tree: string[] | null = null;
    // The browser's accessible can be missing right after a navigation.
    for (let k = 0; !tree && k < 50; k++) {
      if (k) await new Promise((r) => setTimeout(r, 100));
      tree = await send('WebDriver:ExecuteScript', {
        script: `const svc = Cc['@mozilla.org/accessibilityService;1'].getService(Ci.nsIAccessibilityService);
        const out = [];
        const walk = (acc) => {
          out.push(svc.getStringRole(acc.role) + ' ' + JSON.stringify(acc.name));
          for (let c = acc.firstChild; c; c = c.nextSibling) walk(c);
        };
        const root = svc.getAccessibleFor(gBrowser.selectedBrowser);
        if (!root) return null;
        walk(root);
        return out;`,
        args: [],
      });
    }
    await send('Marionette:SetContext', { value: 'content' });
    if (!tree) throw new Error('no accessible for the browser');
    return tree;
  };
  for (const [n, [label, html, steps]] of CASES.entries()) {
    const file = join(dir, `c${n}.html`);
    await writeFile(file, page(html, steps));
    await send('Marionette:SetContext', { value: 'content' });
    await send('WebDriver:Navigate', { url: 'about:blank' });
    await send('WebDriver:Navigate', { url: pathToFileURL(file).href });
    await new Promise((r) => setTimeout(r, 300));
    await walk();
    await send('WebDriver:ExecuteScript', {
      script: '(window.wrappedJSObject ?? window).__go = true;',
      args: [],
    });
    await send('WebDriver:ExecuteAsyncScript', {
      script:
        'const done = arguments[0]; const t = setInterval(() => { const w = window.wrappedJSObject ?? window; if (w.__done) { clearInterval(t); done(); } }, 50);',
      args: [],
    });
    print(`\n## ${label}`);
    const names: string[] = [];
    for (const [name, t] of TARGETS) {
      const ref = await send('WebDriver:ExecuteScript', {
        script: `return ${targetExpr(t)};`,
        args: [],
      });
      const a = ref
        ? await send('Marionette:GetAccessibilityPropertiesForElement', {
            id: Object.values(ref)[0],
          })
        : null;
      const reading = a
        ? `${a.role} ${JSON.stringify(a.label ?? '')}`
        : 'ignored';
      names.push(reading);
      print(`  ${name.padEnd(36)} ${reading}`);
    }
    const leaks = [...names, ...(await walk())].filter((x) =>
      tokens(label).test(x),
    );
    print(`  tokens in the tree: ${leaks.length ? leaks.join(', ') : 'none'}`);
  }
  await send('WebDriver:DeleteSession').catch(() => {});
  sock.end();
  proc.kill();
  await rm(profile, { recursive: true, force: true });
}
await rm(dir, { recursive: true });
