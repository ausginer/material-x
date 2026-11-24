// Run from packages/material-x, with the packages built:
//   node ../../.plan/observations-9/probes/form-and-hidden.mjs [chromium|firefox|webkit]
// Reads three things on the built elements, with a native element beside each:
//   fieldset - whether a control in a disabled fieldset is disabled, takes Tab
//              focus and still acts on the keyboard and the pointer
//   restore  - whether a typed or checked value comes back after a history
//              navigation, with the page not kept in the back/forward cache
//   hidden   - whether an element with the `hidden` attribute still has a box
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(`${process.cwd()}/package.json`);
const playwright = require('playwright');
const { rolldown } = await import(
  createRequire(`${process.cwd()}/../../package.json`).resolve('rolldown')
);
const files = require(`${process.cwd()}/files.json`);

const bundle = await rolldown({
  input: 'virtual:entry',
  logLevel: 'silent',
  plugins: [
    {
      name: 'entry',
      resolveId: (id) => (id === 'virtual:entry' ? id : null),
      load: (id) =>
        id === 'virtual:entry'
          ? files.runtime
              .map((f) => `import '${process.cwd()}/${f}.js';`)
              .join('\n')
          : null,
    },
  ],
});
const { output } = await bundle.generate({ format: 'esm' });
const code = output.map((c) => c.code ?? '').join('\n');

const TAGS = files.runtime
  .map((f) => `mx-${f.split('/')[1]}`)
  .filter((t) => t !== 'mx-sortable-list')
  .concat('mx-sortable-list');
const CONTROLS = [
  ['mx-button', 'Text'],
  ['mx-icon-button', 'x'],
  ['mx-switch-button', 'Text'],
  ['mx-switch-icon-button', 'x'],
  ['mx-fab', 'x'],
  ['mx-checkbox', ''],
  ['mx-radio', ''],
  ['mx-text-field', ''],
  ['mx-multiline-text-field', ''],
];

const page = {
  '/fieldset': `<form onsubmit="event.preventDefault()"><fieldset disabled>${CONTROLS.map(([t, c]) => `<${t} name="${t}" data-t>${c}</${t}>`).join('')}<input id=native data-t></fieldset></form>`,
  '/form': `<form><input name=native><input type=checkbox name=nativebox><mx-text-field name=tf></mx-text-field><mx-multiline-text-field name=mtf></mx-multiline-text-field><mx-checkbox name=cb></mx-checkbox><mx-switch-button name=sb>x</mx-switch-button></form><a href="/other">x</a><script type=module>
    for (const n of ['mx-checkbox','mx-switch-button']) document.querySelector(n).addEventListener('change', (e) => { e.currentTarget.checked = !e.currentTarget.checked; });</script>`,
  '/other': 'other',
  '/hidden': TAGS.map((t) => `<div><${t} data-t hidden>Text</${t}></div>`).join(
    '',
  ),
};
const server = createServer((request, response) => {
  if (request.url === '/lib.js') {
    response.writeHead(200, { 'content-type': 'text/javascript' });
    response.end(code);
    return;
  }
  // The `unload` listener of /form keeps it out of the back/forward cache.
  response.writeHead(200, {
    'content-type': 'text/html',
    'cache-control': 'no-cache',
  });
  response.end(
    `<!doctype html><script type=module>${request.url === '/form' ? `const c = customElements.define.bind(customElements); window.restored = []; addEventListener('unload', () => {}); customElements.define = (n, k) => { const p = k.prototype; const f = p.formStateRestoreCallback; p.formStateRestoreCallback = function (...a) { window.restored.push([n, ...a].join(':')); return f.apply(this, a); }; c(n, k); }; await import('/lib.js');` : "import '/lib.js'"}</script>${page[request.url] ?? ''}`,
  );
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

for (const name of process.argv[2]
  ? [process.argv[2]]
  : ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[name].launch();
  console.log(`## ${name} ${browser.version()}`);
  const p = await browser.newPage();

  await p.goto(`${base}/fieldset`);
  await p.waitForTimeout(300);
  console.log(
    'fieldset: host :disabled | control :disabled | Tab focus | key events | pointer events',
  );
  const count = CONTROLS.length + 1;
  for (let i = 0; i < count; i += 1) {
    const r = await p.evaluate((n) => {
      const e = document.querySelectorAll('[data-t]')[n];
      const c =
        e.shadowRoot?.querySelector('.host:is(button,a),input,textarea') ?? e;
      window.log = [];
      for (const t of ['click', 'input', 'change']) {
        e.addEventListener(t, (v) => window.log.push(t));
      }
      document.body.tabIndex = -1;
      document.activeElement?.blur();
      return {
        tag: e.localName,
        host: e.matches(':disabled'),
        ctl: c.matches(':disabled'),
      };
    }, i);
    await p.evaluate((n) => {
      const e = document.querySelectorAll('[data-t]')[n];
      const c =
        e.shadowRoot?.querySelector('.host:is(button,a),input,textarea') ?? e;
      window.before = document.createElement('button');
      e.before(window.before);
      const legend = window.before;
      legend.style.all = 'revert';
      c.focus();
      window.focused = (e.shadowRoot ?? document).activeElement === c;
      legend.remove();
    }, i);
    await p.evaluate(() => window.log.splice(0));
    const focused = await p.evaluate(() => window.focused);
    await p.keyboard.press('Space');
    await p.keyboard.type('a');
    await p.waitForTimeout(30);
    const keys = await p.evaluate(() => window.log.splice(0).join(','));
    const box = await p.evaluate((n) => {
      const e = document.querySelectorAll('[data-t]')[n];
      const c =
        e.shadowRoot?.querySelector('.host:is(button,a),input,textarea') ?? e;
      const b = c.getBoundingClientRect();
      return [b.x + b.width / 2, b.y + b.height / 2];
    }, i);
    await p.mouse.click(...box);
    await p.waitForTimeout(30);
    const pointer = await p.evaluate(() => window.log.splice(0).join(','));
    const value = await p.evaluate(
      (n) => document.querySelectorAll('[data-t]')[n].value,
      i,
    );
    console.log(
      `  ${r.tag}: ${r.host} | ${r.ctl} | focus() ${focused} | [${keys}] | [${pointer}] value ${JSON.stringify(value)}`,
    );
  }
  // Sequential focus, from the start of the page.
  await p.goto(`${base}/fieldset`);
  await p.waitForTimeout(300);
  const order = [];
  for (let i = 0; i < 14; i += 1) {
    await p.keyboard.press('Tab');
    order.push(
      await p.evaluate(() => document.activeElement?.localName ?? 'none'),
    );
  }
  console.log(`  Tab order: ${order.join(' ')}`);

  await p.goto(`${base}/form`);
  await p.waitForTimeout(300);
  await p.locator('input[name=native]').fill('typed');
  await p.locator('input[name=nativebox]').check();
  await p.locator('mx-text-field input').fill('typed');
  await p.locator('mx-multiline-text-field textarea').fill('typed');
  await p.locator('mx-checkbox input').click({ force: true });
  await p.locator('mx-switch-button button').click({ force: true });
  const state = () =>
    p.evaluate(() =>
      JSON.stringify({
        native: document.querySelector('input[name=native]').value,
        nativebox: document.querySelector('input[name=nativebox]').checked,
        tf: document.querySelector('mx-text-field').value,
        mtf: document.querySelector('mx-multiline-text-field').value,
        cb: document.querySelector('mx-checkbox').checked,
        sb: document.querySelector('mx-switch-button').checked,
        restored: window.restored,
      }),
    );
  console.log(`restore before: ${await state()}`);
  await p.evaluate(() => {
    window.marker = 1;
    document.querySelector('a').click();
  });
  await p.waitForURL('**/other');
  await p.goBack();
  await p.waitForTimeout(500);
  console.log(
    `restore after:  ${await state()} same document: ${await p.evaluate(() => Boolean(window.marker))}`,
  );

  await p.goto(`${base}/hidden`);
  await p.waitForTimeout(300);
  console.log(
    `hidden: ${await p.evaluate(() =>
      [...document.querySelectorAll('[data-t]')]
        .map((e) => {
          const painted = (x) =>
            x.getClientRects().length > 0 &&
            x.getBoundingClientRect().width > 0;
          const inside = [...(e.shadowRoot?.querySelectorAll('*') ?? [])].some(
            painted,
          );
          const none = getComputedStyle(e).display;
          return `${e.localName}=${none}${painted(e) || inside ? ' SHOWN' : ''}`;
        })
        .join(', '),
    )}`,
  );
  await browser.close();
}
server.close();
