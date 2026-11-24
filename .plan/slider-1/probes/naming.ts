// Probe for the slider plan: how the name of a native range inside a shadow tree
// reaches each engine's own accessibility tree, and whether the form-associated
// host becomes a second node. Readers follow
// .plan/form-validation-1/probes/aria-states.ts.
//
// node naming.ts <chromium|firefox|webkit>
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';

const ENGINE = process.argv[2]!;

// Each case: id, host markup, and what the component does.
//   none    - nothing
//   mirror  - copies the host's aria-label to the input (useARIA's way)
//   labels  - input.ariaLabelledByElements = host.labels
//   refs    - input.ariaLabelledByElements = host.ariaLabelledByElements
//   slot    - a shadow <label for> around a slot
//   strip   - copies aria-label to the input and removes it from the host
//   host    - the host itself is the slider, through ElementInternals
// `-none` gives the host role none through its internals.
const CASES: ReadonlyArray<readonly [string, string]> = [
  ['none', '<x-s id="c0"></x-s>'],
  ['mirror', '<x-s id="c1" aria-label="N1"></x-s>'],
  ['mirror-none', '<x-s id="c2" aria-label="N2"></x-s>'],
  ['none', '<label for="c3">N3</label><x-s id="c3"></x-s>'],
  ['labels', '<label for="c4">N4</label><x-s id="c4"></x-s>'],
  ['labels-none', '<label for="c5">N5</label><x-s id="c5"></x-s>'],
  ['labels', '<label>N6 <x-s id="c6"></x-s></label>'],
  ['refs', '<span id="r7">N7</span><x-s id="c7" aria-labelledby="r7"></x-s>'],
  [
    'refs-none',
    '<span id="r8">N8</span><x-s id="c8" aria-labelledby="r8"></x-s>',
  ],
  ['slot', '<x-s id="c9"><span slot="label">N9</span></x-s>'],
  ['strip', '<x-s id="c10" aria-label="N10"></x-s>'],
  ['host', '<x-s id="c11" aria-label="N11"></x-s>'],
  ['host', '<label for="c12">N12</label><x-s id="c12"></x-s>'],
  ['host-disabled', '<x-s id="c13" aria-label="N13" disabled></x-s>'],
  ['labels-none', '<label id="l14">N14 <x-s id="c14"></x-s></label>'],
  ['slot-none', '<x-s id="c15"><span slot="label">N15</span></x-s>'],
  ['labels-none', '<x-s id="c16"></x-s><label for="c16">N16</label>'],
];

const HTML = `<!doctype html><meta charset="utf-8"><body><form>
${CASES.map(([mode, html]) => html.replace('<x-s', `<x-s mode="${mode}"`)).join('\n')}
<input id="native" type="range" aria-label="NN" min="-55" max="55" value="-18">
</form><script>
customElements.define('x-s', class extends HTMLElement {
  static formAssociated = true;
  constructor() { super(); this.i = this.attachInternals(); }
  connectedCallback() {
    const mode = this.getAttribute('mode');
    const root = this.attachShadow({ mode: 'open', delegatesFocus: !mode.startsWith('host') });
    if (mode.startsWith('host')) {
      root.innerHTML = '<div>t</div>';
      Object.assign(this.i, { role: 'slider', ariaValueNow: '-18', ariaValueMin: '-55', ariaValueMax: '55', ariaValueText: '-18 deg' });
      this.tabIndex = 0;
      return;
    }
    root.innerHTML = (mode.startsWith('slot') ? '<label for="i"><slot name="label"></slot></label>' : '') + '<input id="i" type="range" min="-55" max="55">';
    const input = this.input = root.querySelector('input');
    input.value = '-18';
    if (mode.endsWith('-none')) this.i.role = 'none';
    if (mode.startsWith('mirror') || mode === 'strip') input.ariaLabel = this.ariaLabel;
    if (mode === 'strip') this.removeAttribute('aria-label');
    if (mode.startsWith('labels')) input.ariaLabelledByElements = [...this.i.labels];
    if (mode.startsWith('refs')) input.ariaLabelledByElements = this.ariaLabelledByElements;
  }
});
const report = () => { const a = (id) => { const el = document.getElementById(id); document.activeElement.blur?.(); document.querySelector('label[for=' + id + ']').click(); return id + ':' + (document.activeElement === el && !!el.shadowRoot.activeElement); }; return ' label click focuses ' + a('c5') + ' ' + a('c16'); };
window.__focusable = CASE_IDS.map((id) => { const el = document.getElementById(id); el.focus(); const r = document.activeElement === el; el.blur(); return id + ':' + r; }).join(' ') + report();
</script>`.replace('CASE_IDS', JSON.stringify(['c0', 'c11', 'c13']));

const dir = await mkdtemp(join(tmpdir(), 'slider-naming-'));
const file = join(dir, 'index.html');
await writeFile(file, HTML);
const url = pathToFileURL(file).href;

const TARGETS = CASES.flatMap(([mode], n) => {
  const host = [
    `c${n} ${mode} host`,
    `document.querySelector('#c${n}')`,
  ] as const;
  return mode.startsWith('host')
    ? [host]
    : [
        host,
        [
          `c${n} ${mode} input`,
          `document.querySelector('#c${n}').input`,
        ] as const,
      ];
});
TARGETS.push(['native', `document.querySelector('#native')`]);

const line = (label: string, o: Readonly<Record<string, unknown>>) =>
  console.log(`  ${label.padEnd(22)} ${JSON.stringify(o)}`);

if (ENGINE === 'chromium') {
  const browser = await chromium.launch();
  console.log(`# chromium ${browser.version()}`);
  const p = await browser.newPage();
  await p.goto(url);
  console.log(
    '  focusable',
    await p.evaluate(() => (window as any).__focusable),
  );
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Accessibility.enable');
  for (const [label, expression] of TARGETS) {
    const { result } = (await cdp.send('Runtime.evaluate', {
      expression,
    })) as any;
    const { nodes } = (await cdp.send('Accessibility.getPartialAXTree', {
      objectId: result.objectId,
      fetchRelatives: false,
    })) as any;
    const n = nodes[0];
    const prop = (k: string) =>
      (n.properties ?? []).find((x: any) => x.name === k)?.value.value;
    line(label, {
      role: n.role?.value,
      name: n.name?.value ?? '',
      ignored: n.ignored,
      value: n.value?.value,
      min: prop('valuemin'),
      max: prop('valuemax'),
      text: prop('valuetext'),
      disabled: prop('disabled'),
    });
  }
  await browser.close();
} else if (ENGINE === 'webkit') {
  const browser = await webkit.launch();
  console.log(`# webkit ${browser.version()}`);
  const p = await browser.newPage();
  await p.goto(url);
  console.log(
    '  focusable',
    await p.evaluate(() => (window as any).__focusable),
  );
  const impl = (p as any)._connection.toImpl(p);
  const s = impl.delegate._session;
  await s.send('DOM.getDocument');
  for (const [label, expression] of TARGETS) {
    const { result } = await s.send('Runtime.evaluate', { expression });
    const { nodeId } = await s.send('DOM.requestNode', {
      objectId: result.objectId,
    });
    const { properties: a } = await s.send(
      'DOM.getAccessibilityPropertiesForNode',
      { nodeId },
    );
    line(label, {
      exists: a.exists,
      role: a.role,
      name: a.label ?? '',
      ignored: a.ignored,
      disabled: a.disabled,
    });
  }
  await browser.close();
} else {
  const exe = firefox.executablePath();
  const profile = await mkdtemp(join(tmpdir(), 'slider-ff-'));
  await writeFile(
    join(profile, 'user.js'),
    'user_pref("marionette.port", 2831);\nuser_pref("browser.shell.checkDefaultBrowser", false);\n',
  );
  const proc = spawn(
    exe,
    ['--marionette', '-headless', '-no-remote', '-profile', profile],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  await new Promise<void>((resolve) => {
    const on = (d: Buffer) => {
      if (d.toString().includes('Listening on port')) resolve();
    };
    proc.stdout.on('data', on);
    proc.stderr.on('data', on);
  });
  const sock = createConnection(2831, '127.0.0.1');
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
  await send('WebDriver:Navigate', { url });
  console.log(
    '  focusable',
    await send('WebDriver:ExecuteScript', {
      script: 'return window.__focusable',
      args: [],
    }),
  );
  for (const [label, expr] of TARGETS) {
    const ref = await send('WebDriver:ExecuteScript', {
      script: `return ${expr};`,
      args: [],
    });
    const a = await send('Marionette:GetAccessibilityPropertiesForElement', {
      id: Object.values(ref)[0],
    }).catch((e) => ({ role: `error ${String(e).slice(0, 80)}` }));
    line(
      label,
      a
        ? { role: a.role, name: a.label ?? '', disabled: a.disabled }
        : { accessible: null },
    );
  }
  await send('WebDriver:DeleteSession');
  sock.end();
  proc.kill();
  await rm(profile, { recursive: true, force: true });
}
await rm(dir, { recursive: true });
