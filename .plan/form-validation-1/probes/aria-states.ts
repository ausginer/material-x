// Probe for the form-validation plan: what each engine's own accessibility tree
// exposes for the controls of mx-text-field, mx-checkbox, mx-radio and
// mx-switch-button, as built, with `aria-invalid` and `aria-required`, and for
// a host `aria-label` (the aria-* mirroring gap). Readers follow
// .plan/list-roles-1/probes/list-roles.ts: Chromium through CDP, WebKit through
// its inspector, Firefox through Marionette. Playwright's ariaSnapshot isn't
// used, because it computes roles in page script and reports neither state.
//
// node aria-states.ts <packages/material-x> <variant> <engine>
//   variant: main | target | host
//     main   - the built package as it is
//     target - the probe writes aria-invalid="true" and aria-required="true"
//              on each component's control, as FV-D1's hook and FV-Q2's
//              translation would
//     host   - the probe writes the same two attributes on each host, which
//              only a host that mirrors aria-* passes on
//   engine: chromium | firefox | webkit
//
// Native controls in the light DOM are read beside them for comparison. The
// page also reports whether a `required` attribute on a form-associated host
// matches `:required`.
import { rolldown } from 'rolldown';
import { chromium, firefox, webkit } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [MX, VARIANT, ENGINE] = process.argv.slice(2) as [string, string, string];

const BODY = `<form id="f">
  <mx-text-field id="tf"><span slot="label">Name</span></mx-text-field>
  <mx-checkbox id="cb" aria-label="Accept terms"></mx-checkbox>
  <mx-radio id="ra" aria-label="Option A" name="g" value="a"></mx-radio>
  <mx-switch-button id="sw">Wi-Fi</mx-switch-button>
  <mx-text-field id="tf-req" required><span slot="label">Required attr</span></mx-text-field>
  <label for="cb-l">Labelled by label for</label><mx-checkbox id="cb-l"></mx-checkbox>
  <mx-text-field id="tf-l" aria-label="Host-labelled field"></mx-text-field>
  <mx-switch-button id="sw-l" aria-label="Host-labelled switch">Content</mx-switch-button>
  <input id="n-text" aria-label="Native text" aria-invalid="true" required>
  <input id="n-check" type="checkbox" aria-label="Native checkbox" aria-invalid="true" required>
  <input id="n-radio" type="radio" aria-label="Native radio" aria-invalid="true" required>
  <button id="n-switch" type="button" role="switch" aria-checked="false" aria-invalid="true" aria-required="true">Native switch</button>
</form>`;

// Each target: a label and the expression that finds the element to read.
const TARGETS: ReadonlyArray<readonly [string, string]> = [
  [
    'mx-text-field control',
    `document.querySelector('#tf').shadowRoot.querySelector('.input')`,
  ],
  [
    'mx-checkbox control',
    `document.querySelector('#cb').shadowRoot.querySelector('#input')`,
  ],
  ['mx-checkbox host', `document.querySelector('#cb')`],
  [
    'mx-radio control',
    `document.querySelector('#ra').shadowRoot.querySelector('#input')`,
  ],
  [
    'mx-switch-button control',
    `document.querySelector('#sw').shadowRoot.querySelector('.host')`,
  ],
  [
    'mx-checkbox <label for>',
    `document.querySelector('#cb-l').shadowRoot.querySelector('#input')`,
  ],
  [
    'mx-text-field aria-label',
    `document.querySelector('#tf-l').shadowRoot.querySelector('.input')`,
  ],
  ['  its host', `document.querySelector('#tf-l')`],
  [
    'mx-switch aria-label',
    `document.querySelector('#sw-l').shadowRoot.querySelector('.host')`,
  ],
  ['  its host', `document.querySelector('#sw-l')`],
  ['native text', `document.querySelector('#n-text')`],
  ['native checkbox', `document.querySelector('#n-check')`],
  ['native radio', `document.querySelector('#n-radio')`],
  ['native switch', `document.querySelector('#n-switch')`],
];

const SETUP = {
  main: '',
  target: `for (const [host, sel] of [['#tf', '.input'], ['#cb', '#input'], ['#ra', '#input'], ['#sw', '.host']]) {
  const c = document.querySelector(host).shadowRoot.querySelector(sel);
  c.setAttribute('aria-invalid', 'true');
  c.setAttribute('aria-required', 'true');
}`,
  host: `for (const host of ['#tf', '#cb', '#ra', '#sw']) {
  const h = document.querySelector(host);
  h.setAttribute('aria-invalid', 'true');
  h.setAttribute('aria-required', 'true');
}`,
}[VARIANT];
if (SETUP == null) throw new Error('variant?');

async function bundle(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'aria-states-'));
  const entry = join(dir, 'entry.js');
  await writeFile(
    entry,
    [
      'text-field/text-field.js',
      'checkbox/checkbox.js',
      'radio/radio.js',
      'button/switch-button.js',
    ]
      .map((f) => `import ${JSON.stringify(join(MX, f))};`)
      .join('\n'),
  );
  const build = await rolldown({ input: entry, platform: 'browser' });
  const { output } = await build.generate({ format: 'iife' });
  await rm(dir, { recursive: true });
  return output
    .filter((c) => c.type === 'chunk')
    .map((c) => (c as { code: string }).code)
    .join('\n');
}

const PAGE_CHECK = `window.__ready = (async () => {
  await customElements.whenDefined('mx-switch-button');
  await new Promise((r) => setTimeout(r, 300));
  class Face extends HTMLElement { static formAssociated = true; constructor() { super(); this.attachInternals(); } }
  customElements.define('x-face', Face);
  const face = document.createElement('x-face');
  face.setAttribute('required', '');
  document.querySelector('#f').append(face);
  window.__required = {
    faceMatchesRequired: face.matches(':required'),
    faceMatchesOptional: face.matches(':optional'),
    mxTextFieldMatchesRequired: document.querySelector('#tf-req').matches(':required'),
    nativeMatchesRequired: document.querySelector('#n-text').matches(':required'),
  };
})();`;

async function page(code: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'aria-states-page-'));
  const file = join(dir, 'index.html');
  await writeFile(
    file,
    `<!doctype html><html><head><meta charset="utf-8"></head><body>${BODY}
<script>${code}</script>
<script>${PAGE_CHECK}
window.__ready = window.__ready.then(() => { ${SETUP} return new Promise((r) => setTimeout(r, 200)); });</script></body></html>`,
  );
  return pathToFileURL(file).href;
}

const line = (label: string, o: Readonly<Record<string, unknown>>) =>
  console.log(`  ${label.padEnd(26)} ${JSON.stringify(o)}`);

async function readChromium(url: string) {
  const browser = await chromium.launch();
  const p = await browser.newPage();
  await p.goto(url);
  await p.evaluate(() => (window as any).__ready);
  console.log(
    '  :required ' +
      JSON.stringify(await p.evaluate(() => (window as any).__required)),
  );
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Accessibility.enable');
  for (const [label, expr] of TARGETS) {
    const { result } = (await cdp.send('Runtime.evaluate', {
      expression: expr,
    })) as {
      result: { objectId: string };
    };
    const { nodes } = (await cdp.send('Accessibility.getPartialAXTree', {
      objectId: result.objectId,
      fetchRelatives: false,
    })) as {
      nodes: Array<{
        ignored: boolean;
        role?: { value: string };
        name?: { value: string };
        properties?: Array<{ name: string; value: { value: unknown } }>;
      }>;
    };
    const n = nodes[0]!;
    const props = Object.fromEntries(
      (n.properties ?? [])
        .filter((x) => ['invalid', 'required', 'checked'].includes(x.name))
        .map((x) => [x.name, x.value.value]),
    );
    line(label, {
      role: n.role?.value,
      name: n.name?.value ?? '',
      ignored: n.ignored,
      ...props,
    });
  }
  await browser.close();
}

async function readWebKit(url: string) {
  const browser = await webkit.launch();
  const p = await browser.newPage();
  await p.goto(url);
  await p.evaluate(() => (window as any).__ready);
  console.log(
    '  :required ' +
      JSON.stringify(await p.evaluate(() => (window as any).__required)),
  );
  const conn = (
    p as unknown as { _connection: { toImpl(x: unknown): unknown } }
  )._connection;
  const impl = conn.toImpl(p) as {
    delegate: { _session: { send(m: string, a?: object): Promise<any> } };
  };
  const s = impl.delegate._session;
  await s.send('DOM.getDocument');
  for (const [label, expr] of TARGETS) {
    const { result } = await s.send('Runtime.evaluate', { expression: expr });
    const { nodeId } = await s.send('DOM.requestNode', {
      objectId: result.objectId,
    });
    const { properties: a } = await s.send(
      'DOM.getAccessibilityPropertiesForNode',
      {
        nodeId,
      },
    );
    line(label, {
      exists: a.exists,
      role: a.role,
      name: a.label ?? '',
      ignored: a.ignored,
      invalid: a.invalid,
      required: a.required,
      checked: a.checked,
    });
  }
  await browser.close();
}

// Marionette: 'len:json' frames; [0, id, name, params] → [1, id, error, result].
async function readFirefox(url: string) {
  const exe = firefox.executablePath();
  const profile = await mkdtemp(join(tmpdir(), 'aria-states-ff-'));
  await writeFile(
    join(profile, 'user.js'),
    'user_pref("marionette.port", 2829);\nuser_pref("browser.shell.checkDefaultBrowser", false);\n',
  );
  const proc = spawn(
    exe,
    ['--marionette', '-headless', '-no-remote', '-profile', profile],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  await new Promise<void>((resolve) => {
    const on = (d: Buffer) => {
      if (d.toString().includes('Listening on port')) resolve();
    };
    proc.stdout.on('data', on);
    proc.stderr.on('data', on);
  });
  const sock = createConnection(2829, '127.0.0.1');
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
  await send('WebDriver:NewSession', { capabilities: {} });
  await send('WebDriver:Navigate', { url });
  await send('WebDriver:ExecuteAsyncScript', {
    script: 'const done = arguments[0]; window.__ready.then(() => done());',
    args: [],
  });
  console.log(
    '  :required ' +
      JSON.stringify(
        await send('WebDriver:ExecuteScript', {
          script: 'return window.__required;',
          args: [],
        }),
      ),
  );
  for (const [label, expr] of TARGETS) {
    const ref = await send('WebDriver:ExecuteScript', {
      script: `return ${expr};`,
      args: [],
    });
    const a = await send('Marionette:GetAccessibilityPropertiesForElement', {
      id: Object.values(ref)[0],
    });
    // Marionette's properties carry `required` and `checked`, and no
    // invalid state, so Firefox's `invalid` isn't read here.
    line(
      label,
      a
        ? {
            role: a.role,
            name: a.label ?? '',
            required: a.required,
            checked: a.checked,
          }
        : { accessible: null },
    );
  }
  await send('WebDriver:DeleteSession');
  sock.end();
  proc.kill();
  await rm(profile, { recursive: true, force: true });
}

const url = await page(await bundle());
console.log(`# variant ${VARIANT}, engine ${ENGINE}`);
if (ENGINE === 'chromium') await readChromium(url);
else if (ENGINE === 'webkit') await readWebKit(url);
else if (ENGINE === 'firefox') await readFirefox(url);
else throw new Error('engine?');
