// Run from packages/material-x, built (`just build`, core's build first):
//   AXE=<path of axe-core 4.14.1's axe.min.js> node selected.mjs <chromium|firefox|webkit>
// For each item: the button's or link's `aria-*`, then the same node in the
// engine's own accessibility tree, then axe-core's violations.
//   chromium - CDP's tree, and Chromium's internal tree from chrome://accessibility
//   firefox  - the accessibility service, in Marionette's chrome context
//   webkit   - the inspector's DOM.getAccessibilityPropertiesForNode
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(`${process.cwd()}/package.json`);
const playwright = require('playwright');
const { rolldown } = await import(pathToFileURL(require.resolve('rolldown')));
const engine = process.argv[2];

const ITEMS = [
  ['plain', '<mx-list-button-item>plain</mx-list-button-item>'],
  ['was', '<mx-list-button-item selected>was selected</mx-list-button-item>'],
  ['sel', '<mx-list-button-item selected>selected</mx-list-button-item>'],
  [
    'dis',
    '<mx-list-button-item selected disabled>selected disabled</mx-list-button-item>',
  ],
  [
    'off',
    '<mx-list-button-item selected aria-current="false">current false</mx-list-button-item>',
  ],
  [
    'page',
    '<mx-list-button-item selected aria-current="page">current page</mx-list-button-item>',
  ],
  [
    'press',
    '<mx-list-button-item selected aria-pressed="true">pressed</mx-list-button-item>',
  ],
  [
    'press0',
    '<mx-list-button-item aria-pressed="false">not pressed</mx-list-button-item>',
  ],
  [
    'pressoff',
    '<mx-list-button-item selected aria-pressed="true" aria-current="false">pressed current false</mx-list-button-item>',
  ],
  [
    'link',
    '<mx-list-link-item href="#x" selected>link selected</mx-list-link-item>',
  ],
];

const dir = await mkdtemp(join(tmpdir(), 'list-selected-'));
const entry = join(dir, 'entry.js');
await writeFile(
  entry,
  ['list', 'list-button-item', 'list-link-item']
    .map(
      (f) =>
        `import ${JSON.stringify(join(process.cwd(), 'list', `${f}.js`))};`,
    )
    .join('\n'),
);
const { output } = await (
  await rolldown({ input: entry, platform: 'browser' })
).generate({ format: 'iife' });
const file = join(dir, 'index.html');
await writeFile(
  file,
  `<!doctype html><html lang=en><meta charset=utf-8><title>Probe</title><body><main><h1>Probe</h1><mx-list id=l>${ITEMS.map(([id, html]) => html.replace(/^(<[a-z-]+)/, `$1 id=${id}`)).join('')}</mx-list></main><script>${output[0].code}</script><script>document.querySelector('#was').selected = false</script></body></html>`,
);
const url = pathToFileURL(file).href;

const open = async (options) => {
  const browser = await playwright[engine].launch(options);
  const page = await (await browser.newContext()).newPage();
  await page.goto(url);
  await page.waitForTimeout(300);
  return [browser, page];
};
const ids = ITEMS.map(([id]) => id);

const [browser, page] = await open(
  engine === 'chromium'
    ? { channel: 'chromium', args: ['--force-renderer-accessibility'] }
    : {},
);
console.log(`## ${engine} ${browser.version()}\n# the control's attributes`);
for (const id of ids) {
  console.log(
    id,
    await page.evaluate(
      (i) =>
        [
          ...document.getElementById(i).shadowRoot.querySelector('.host')
            .attributes,
        ]
          .filter((a) => a.name.startsWith('aria-') || a.name === 'disabled')
          .map((a) => `${a.name}="${a.value}"`)
          .join(' ') || '-',
      id,
    ),
  );
}

console.log("# the engine's tree");
if (engine === 'chromium') {
  const cdp = await page.context().newCDPSession(page);
  for (const n of (await cdp.send('Accessibility.getFullAXTree')).nodes) {
    if (
      ['button', 'link', 'toggleButton', 'ToggleButton'].includes(n.role?.value)
    )
      console.log(
        'cdp',
        n.role.value,
        JSON.stringify(n.name?.value),
        (n.properties ?? [])
          .filter((q) => !['focusable', 'settable', 'url'].includes(q.name))
          .map((q) => `${q.name}=${q.value.value}`)
          .join(' '),
      );
  }
  const ax = await page.context().newPage();
  await ax.goto('chrome://accessibility');
  await ax.waitForTimeout(500);
  const row = ax.locator('#pages .row', { hasText: 'index.html' });
  if (await row.count()) {
    await row.locator('button', { hasText: 'Show accessibility tree' }).click();
    await ax.waitForTimeout(1500);
    for (const line of (await row.innerText()).split('\n'))
      if (
        /(button|toggleButton|link) (focusable |linked )*location/.test(line) &&
        /plain|selected|current|pressed/.test(line)
      )
        console.log(
          'internal',
          line.match(/\b(button|toggleButton|link|listItem)\b/)[0],
          (
            line.match(
              / (name='[^']*'|ariaCurrentState=\w+|checkedState=\w+|selected=\w+|selected\b(?!')|restriction=\w+)/g,
            ) ?? []
          ).join(''),
        );
  } else
    console.log(
      'no internal tree:',
      await ax.evaluate(() =>
        document.querySelector('#pages')?.innerText.slice(0, 300),
      ),
    );
} else if (engine === 'webkit') {
  const s = page._connection.toImpl(page).delegate._session;
  for (const id of ids) {
    const { result } = await s.send('Runtime.evaluate', {
      expression: `document.getElementById('${id}').shadowRoot.querySelector('.host')`,
    });
    await s.send('DOM.getDocument');
    const { nodeId } = await s.send('DOM.requestNode', {
      objectId: result.objectId,
    });
    const { properties: p } = await s.send(
      'DOM.getAccessibilityPropertiesForNode',
      { nodeId },
    );
    console.log(
      id,
      JSON.stringify(
        Object.fromEntries(
          Object.entries(p).filter(([k]) =>
            [
              'role',
              'label',
              'current',
              'pressed',
              'selected',
              'disabled',
              'checked',
            ].includes(k),
          ),
        ),
      ),
    );
  }
} else {
  const profile = await mkdtemp(join(tmpdir(), 'list-selected-ff-'));
  await writeFile(
    join(profile, 'user.js'),
    'user_pref("marionette.port", 2829);\nuser_pref("browser.shell.checkDefaultBrowser", false);\nuser_pref("accessibility.force_disabled", -1);\n',
  );
  const proc = spawn(
    playwright.firefox.executablePath(),
    [
      '--marionette',
      '--remote-allow-system-access',
      '-headless',
      '-no-remote',
      '-profile',
      profile,
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: '1' },
    },
  );
  await new Promise((resolve) => {
    const on = (d) => d.toString().includes('Listening on port') && resolve();
    proc.stdout.on('data', on);
    proc.stderr.on('data', on);
  });
  const sock = createConnection(2829, '127.0.0.1');
  let buf = Buffer.alloc(0);
  const pending = new Map();
  sock.on('data', (d) => {
    buf = Buffer.concat([buf, d]);
    for (;;) {
      const colon = buf.indexOf(':');
      if (colon < 0) return;
      const len = Number(buf.subarray(0, colon));
      if (buf.length < colon + 1 + len) return;
      const msg = JSON.parse(buf.subarray(colon + 1, colon + 1 + len));
      buf = buf.subarray(colon + 1 + len);
      if (Array.isArray(msg)) pending.get(msg[1])?.([msg[2], msg[3]]);
    }
  });
  let seq = 0;
  const send = (name, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, ([err, res]) =>
        err
          ? reject(new Error(JSON.stringify(err).slice(0, 400)))
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
  try {
    await send('WebDriver:NewSession', { capabilities: {} });
    await send('Marionette:SetContext', { value: 'chrome' });
    await send('WebDriver:ExecuteScript', {
      script:
        'window.axs = Cc["@mozilla.org/accessibilityService;1"].getService(Ci.nsIAccessibilityService);',
      args: [],
    });
    await send('Marionette:SetContext', { value: 'content' });
    await send('WebDriver:Navigate', { url });
    await new Promise((r) => setTimeout(r, 1500));
    await send('Marionette:SetContext', { value: 'chrome' });
    const readTree = () =>
      send('WebDriver:ExecuteScript', {
        script: `const s = Cc["@mozilla.org/accessibilityService;1"].getService(Ci.nsIAccessibilityService);
        const out = [];
        const walk = (a) => {
          const role = s.getStringRole(a.role);
          if (/button|link/.test(role) && /selected|pressed|plain|current/.test(a.name ?? '')) {
            const st = {}, ex = {}; a.getState(st, ex);
            const states = [...s.getStringStates(st.value, ex.value)].filter((x) => /select|press|check|current|unavail|enabled/.test(x));
            const attrs = []; for (const p of a.attributes.enumerate()) if (/current|pressed|selected/.test(p.key)) attrs.push(p.key + '=' + p.value);
            out.push(role + ' "' + a.name + '" [' + attrs + '] states: ' + states.join(' '));
          }
          for (let i = 0; i < a.childCount; i++) walk(a.getChildAt(i));
        };
        const doc = s.getAccessibleFor(gBrowser.selectedBrowser); walk(doc); return out;`,
        args: [],
      });
    await readTree();
    await new Promise((r) => setTimeout(r, 2000));
    console.log((await readTree()).join('\n') || '(no node)');
  } finally {
    sock.end();
    proc.kill();
    await rm(profile, { recursive: true, force: true, maxRetries: 5 });
  }
}

console.log('# axe-core');
await page.addScriptTag({ path: process.env.AXE });
const { violations, incomplete, testEngine } = await page.evaluate(() =>
  axe.run(),
);
console.log(testEngine.version);
for (const [kind, list] of [
  ['violation', violations],
  ['needs review', incomplete],
])
  for (const v of list)
    if (v.id !== 'color-contrast')
      for (const n of v.nodes)
        console.log(
          kind,
          v.id,
          v.impact,
          JSON.stringify(n.target),
          n.any
            .concat(n.all, n.none)
            .map((c) => c.message)
            .join(' | ')
            .slice(0, 160),
        );
await browser.close();
await rm(dir, { recursive: true });
