// Probe for the slider plan's amendment: what each engine's own accessibility
// tree holds when a host's aria-* is mirrored with core's built `useARIA`.
//
//   package - every built material-x element that has a control, with a host
//             aria-label, and the text field with each source of its name
//   slider  - a native range behind a prototype host, in two forms:
//             tf   - the text field's own rule: useARIA with the id of the
//                    shadow label as aria-labelledby while the slot is filled
//             plan - the amended plan's rule (SL-D4)
//
// node mirroring.ts <packages> <chromium|firefox|webkit>
// Build the packages first. Firefox is read through Marionette's chrome context
// (nsIAccessible), which also gives the value and the description.
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { rolldown } from 'rolldown';

const [PACKAGES, ENGINE] = process.argv.slice(2) as [string, string];

// id, element markup, and the selector of its control.
const PACKAGE: ReadonlyArray<readonly [string, string, string]> = [
  ['button', '<mx-button id="ID" aria-label="A">Text</mx-button>', '.host'],
  [
    'icon-button',
    '<mx-icon-button id="ID" aria-label="A">x</mx-icon-button>',
    '.host',
  ],
  [
    'link-button',
    '<mx-link-button id="ID" href="#" aria-label="A">Text</mx-link-button>',
    '.host',
  ],
  [
    'switch-button',
    '<mx-switch-button id="ID" aria-label="A">Text</mx-switch-button>',
    '.host',
  ],
  [
    'switch-icon-button',
    '<mx-switch-icon-button id="ID" aria-label="A">x</mx-switch-icon-button>',
    '.host',
  ],
  ['fab', '<mx-fab id="ID" aria-label="A">x</mx-fab>', '.host'],
  [
    'list-button-item',
    '<mx-list><mx-list-button-item id="ID" aria-label="A">Text</mx-list-button-item></mx-list>',
    '.host',
  ],
  [
    'list-link-item',
    '<mx-list><mx-list-link-item href="#" id="ID" aria-label="A">Text</mx-list-link-item></mx-list>',
    '.host',
  ],
  ['checkbox', '<mx-checkbox id="ID" aria-label="A"></mx-checkbox>', '#input'],
  ['radio', '<mx-radio id="ID" aria-label="A"></mx-radio>', '#input'],
  [
    'multiline',
    '<mx-multiline-text-field id="ID" aria-label="A"></mx-multiline-text-field>',
    '.input',
  ],
  [
    'tf-label',
    '<mx-text-field id="ID" aria-label="A"></mx-text-field>',
    '.input',
  ],
  [
    'tf-slot',
    '<mx-text-field id="ID"><span slot="label">S</span></mx-text-field>',
    '.input',
  ],
  [
    'tf-slot+label',
    '<mx-text-field id="ID" aria-label="A"><span slot="label">S</span></mx-text-field>',
    '.input',
  ],
  [
    'tf-labelledby',
    '<span id="tfr1">R</span><mx-text-field id="ID" aria-labelledby="tfr1"></mx-text-field>',
    '.input',
  ],
  [
    'tf-slot+labelledby',
    '<span id="tfr2">R</span><mx-text-field id="ID" aria-labelledby="tfr2"><span slot="label">S</span></mx-text-field>',
    '.input',
  ],
  [
    'tf-describedby',
    '<span id="tfr3">D</span><mx-text-field id="ID" aria-label="A" aria-describedby="tfr3"></mx-text-field>',
    '.input',
  ],
  [
    'tf-for',
    '<label for="ID">L</label><mx-text-field id="ID"></mx-text-field>',
    '.input',
  ],
  [
    'tf-slot+for',
    '<label for="ID">L</label><mx-text-field id="ID"><span slot="label">S</span></mx-text-field>',
    '.input',
  ],
];

const SLOT = '<span slot="label">S</span>';
const SLIDER: ReadonlyArray<readonly [string, string, string]> = [
  ['aria-label', '', '<x-s MODE aria-label="A" id="ID"></x-s>'],
  ['slot', '', `<x-s MODE id="ID">${SLOT}</x-s>`],
  ['slot+aria-label', '', `<x-s MODE aria-label="A" id="ID">${SLOT}</x-s>`],
  [
    'labelledby',
    '<span id="ID-r">R</span>',
    '<x-s MODE aria-labelledby="ID-r" id="ID"></x-s>',
  ],
  [
    'slot+labelledby',
    '<span id="ID-r">R</span>',
    `<x-s MODE aria-labelledby="ID-r" id="ID">${SLOT}</x-s>`,
  ],
  [
    'labelledby+aria-label',
    '<span id="ID-r">R</span>',
    '<x-s MODE aria-label="A" aria-labelledby="ID-r" id="ID"></x-s>',
  ],
  ['for', '<label for="ID">L</label>', '<x-s MODE id="ID"></x-s>'],
  ['for+slot', '<label for="ID">L</label>', `<x-s MODE id="ID">${SLOT}</x-s>`],
  [
    'for+aria-label',
    '<label for="ID">L</label>',
    '<x-s MODE aria-label="A" id="ID"></x-s>',
  ],
  [
    'for+labelledby',
    '<label for="ID">L</label><span id="ID-r">R</span>',
    '<x-s MODE aria-labelledby="ID-r" id="ID"></x-s>',
  ],
  [
    'for+slot+aria-label',
    '<label for="ID">L</label>',
    `<x-s MODE aria-label="A" id="ID">${SLOT}</x-s>`,
  ],
  ['wrap', '<label>L ', '<x-s MODE id="ID"></x-s></label>'],
  ['wrap+slot', '<label>L ', `<x-s MODE id="ID">${SLOT}</x-s></label>`],
  [
    'wrap+aria-label',
    '<label>L ',
    '<x-s MODE aria-label="A" id="ID"></x-s></label>',
  ],
  [
    'describedby',
    '<span id="ID-r">D</span>',
    `<x-s MODE aria-describedby="ID-r" id="ID">${SLOT}</x-s>`,
  ],
  ['valuetext', '', `<x-s MODE valuetext="V" id="ID">${SLOT}</x-s>`],
  ['aria-valuetext', '', `<x-s MODE aria-valuetext="H" id="ID">${SLOT}</x-s>`],
  [
    'both valuetexts',
    '',
    `<x-s MODE valuetext="V" aria-valuetext="H" id="ID">${SLOT}</x-s>`,
  ],
  ['aria-valuenow 5', '', `<x-s MODE aria-valuenow="5" id="ID">${SLOT}</x-s>`],
  [
    'aria-valuemin, max',
    '',
    `<x-s MODE aria-valuemin="0" aria-valuemax="9" id="ID">${SLOT}</x-s>`,
  ],
  ['label attribute', '', '<x-s MODE label="B" id="ID"></x-s>'],
  ['aria-invalid', '', `<x-s MODE aria-invalid="true" id="ID">${SLOT}</x-s>`],
  [
    'runtime add label',
    '',
    '<x-s MODE id="ID" data-run="el.setAttribute(`aria-label`, `A`)"></x-s>',
  ],
  [
    'runtime remove label',
    '<label for="ID">L</label>',
    '<x-s MODE id="ID" aria-label="A" data-run="el.removeAttribute(`aria-label`)"></x-s>',
  ],
  [
    'runtime remove lby',
    '<span id="ID-r">R</span>',
    `<x-s MODE id="ID" aria-labelledby="ID-r" data-run="el.removeAttribute('aria-labelledby')">${SLOT}</x-s>`,
  ],
  [
    'runtime fill slot',
    '',
    '<x-s MODE id="ID" aria-label="A" data-run="el.append(Object.assign(document.createElement(`span`), { slot: `label`, textContent: `S` }))"></x-s>',
  ],
  [
    'runtime remove vt',
    '',
    `<x-s MODE id="ID" valuetext="V" aria-valuetext="H" data-run="el.removeAttribute('aria-valuetext')">${SLOT}</x-s>`,
  ],
];

const targets: Array<readonly [string, string, string]> = [];
// What each reader says of a value text in the light DOM, to show whether it
// reads aria-valuetext at all. The control is the element itself.
let body = `<input id="n0" type="range" min="-55" max="55" aria-label="N" aria-valuetext="T">
<div id="n1" role="slider" tabindex="0" aria-label="N" aria-valuenow="3" aria-valuetext="T">x</div>\n`;
targets.push(
  ['native range aria-valuetext', 'n0', ''],
  ['ARIA slider aria-valuetext', 'n1', ''],
);
PACKAGE.forEach(([label, html], n) => {
  const id = `p${n}`;
  body += `${html.replaceAll('ID', id)}\n`;
  targets.push([label, id, PACKAGE[n]![2]]);
});
for (const mode of ['tf', 'plan']) {
  SLIDER.forEach(([label, before, html], n) => {
    const id = `${mode}${n}`;
    body += `<div>${before}${html}</div>\n`
      .replaceAll('ID', id)
      .replace('MODE', `mode="${mode}"`);
    targets.push([`${mode}: ${label}`, id, 'input']);
  });
}

const dir = await mkdtemp(join(tmpdir(), 'slider-mirroring-'));
const entry = join(dir, 'entry.js');
const mx = join(PACKAGES, 'material-x');
await writeFile(
  entry,
  `${[
    'button/button',
    'button/icon-button',
    'button/link-button',
    'button/switch-button',
    'button/switch-icon-button',
    'fab/fab',
    'list/list',
    'list/list-button-item',
    'list/list-link-item',
    'checkbox/checkbox',
    'radio/radio',
    'text-field/text-field',
    'text-field/multiline-text-field',
  ]
    .map((f) => `import ${JSON.stringify(join(mx, `${f}.js`))};`)
    .join('\n')}
import { useARIA } from ${JSON.stringify(join(PACKAGES, 'core/controllers/useARIA.js'))};
import { useMutationObserver } from ${JSON.stringify(join(PACKAGES, 'core/controllers/useMutationObserver.js'))};
import { useConnected } from ${JSON.stringify(join(PACKAGES, 'core/controllers/useConnected.js'))};
import { ControlledElement, internals } from ${JSON.stringify(join(PACKAGES, 'core/element.js'))};
customElements.define('x-s', class extends ControlledElement {
  static formAssociated = true;
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open', delegatesFocus: true });
    root.innerHTML = '<label id="label" for="i"><slot name="label"></slot></label><input id="i" type="range" min="-55" max="55">';
    const input = this.input = root.querySelector('input');
    const slot = root.querySelector('slot');
    const label = root.querySelector('label');
    input.value = '-18';
    const filled = () => slot.assignedElements().length > 0;
    const tf = this.getAttribute('mode') === 'tf';
    const set = (name, value) => value == null ? input.removeAttribute(name) : input.setAttribute(name, value);
    if (tf) {
      useARIA(this, input, (name, value) => name === 'aria-labelledby' && value == null ? (filled() ? 'label' : null) : value);
      slot.addEventListener('slotchange', () => { if (!this.hasAttribute('aria-labelledby')) set('aria-labelledby', filled() ? 'label' : null); });
      return;
    }
    internals(this).role = 'none';
    // The plan's rule, resolved after the mirror has run.
    const resolve = () => {
      const refs = this.ariaLabelledByElements;
      const labels = [...internals(this).labels];
      if (refs?.length) input.ariaLabelledByElements = refs;
      else if (filled()) input.ariaLabelledByElements = [label];
      else if (!this.hasAttribute('aria-label') && labels.length) input.ariaLabelledByElements = labels;
      else input.removeAttribute('aria-labelledby');
      const described = this.ariaDescribedByElements;
      if (described?.length) input.ariaDescribedByElements = described;
      else input.removeAttribute('aria-describedby');
      set('aria-valuetext', this.getAttribute('aria-valuetext') ?? this.getAttribute('valuetext'));
    };
    useARIA(this, input, (name, value) => /^aria-value(now|min|max)$|^aria-(labelledby|describedby)$/.test(name) ? null : value);
    if (this.hasAttribute('label')) input.ariaLabel = this.getAttribute('label');
    useConnected(this, resolve);
    useMutationObserver(this, resolve, { attributes: true });
    slot.addEventListener('slotchange', resolve);
    input.addEventListener('focus', resolve);
  }
});
window.__ready = (async () => {
  await new Promise((r) => setTimeout(r, 400));
  for (const el of document.querySelectorAll('[data-run]')) new Function('el', el.dataset.run)(el);
  await new Promise((r) => setTimeout(r, 300));
})();`,
);
const build = await rolldown({ input: entry, platform: 'browser' });
const { output } = await build.generate({ format: 'iife' });
const code = output.map((c) => ('code' in c ? c.code : '')).join('\n');
const file = join(dir, 'index.html');
await writeFile(
  file,
  `<!doctype html><html><head><meta charset="utf-8"></head><body><form>${body}</form><script>${code.replaceAll('</script', '<\\/script')}</script></body></html>`,
);
const url = pathToFileURL(file).href;

type Reading = Readonly<Record<string, unknown>>;
const print = (label: string, control: Reading, host: Reading) =>
  console.log(
    `  ${label.padEnd(30)} control ${JSON.stringify(control)} host ${JSON.stringify(host)}`,
  );
const hostExpr = (id: string) =>
  `document.getElementById(${JSON.stringify(id)})`;
const controlExpr = (id: string, sel: string) =>
  sel
    ? `${hostExpr(id)}.shadowRoot.querySelector(${JSON.stringify(sel)})`
    : hostExpr(id);

if (ENGINE === 'chromium') {
  const browser = await chromium.launch();
  console.log(`# chromium ${browser.version()}`);
  const p = await browser.newPage();
  await p.goto(url);
  await p.evaluate(() => (window as any).__ready);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Accessibility.enable');
  const read = async (expression: string) => {
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
    return n.ignored
      ? { ignored: true }
      : {
          role: n.role?.value,
          name: n.name?.value || undefined,
          description: n.description?.value || undefined,
          value: n.value?.value,
          min: prop('valuemin'),
          max: prop('valuemax'),
          valuetext: prop('valuetext'),
          invalid: prop('invalid') === 'true' || undefined,
        };
  };
  for (const [label, id, sel] of targets)
    print(label, await read(controlExpr(id, sel)), await read(hostExpr(id)));
  await browser.close();
} else if (ENGINE === 'webkit') {
  const browser = await webkit.launch();
  console.log(`# webkit ${browser.version()}`);
  const p = await browser.newPage();
  await p.goto(url);
  await p.evaluate(() => (window as any).__ready);
  const s = (p as any)._connection.toImpl(p).delegate._session;
  await s.send('DOM.getDocument');
  const read = async (expression: string) => {
    const { result } = await s.send('Runtime.evaluate', { expression });
    const { nodeId } = await s.send('DOM.requestNode', {
      objectId: result.objectId,
    });
    const { properties: a } = await s.send(
      'DOM.getAccessibilityPropertiesForNode',
      { nodeId },
    );
    return a.ignored || !a.exists
      ? { ignored: true }
      : { role: a.role, name: a.label || undefined, invalid: a.invalid };
  };
  for (const [label, id, sel] of targets)
    print(label, await read(controlExpr(id, sel)), await read(hostExpr(id)));
  await browser.close();
} else {
  const profile = await mkdtemp(join(tmpdir(), 'slider-ff-'));
  await writeFile(
    join(profile, 'user.js'),
    'user_pref("marionette.port", 2833);\nuser_pref("browser.shell.checkDefaultBrowser", false);\n',
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
  const sock = createConnection(2833, '127.0.0.1');
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
  // The service is started before the page loads, so that the page's process
  // gives its tree to this one.
  await send('Marionette:SetContext', { value: 'chrome' });
  await send('WebDriver:ExecuteScript', {
    script: `globalThis.__acc = Cc['@mozilla.org/accessibilityService;1'].getService(Ci.nsIAccessibilityService); window.__acc = globalThis.__acc;`,
    args: [],
  });
  await send('Marionette:SetContext', { value: 'content' });
  await send('WebDriver:Navigate', { url });
  await send('WebDriver:ExecuteAsyncScript', {
    script: 'const done = arguments[0]; window.__ready.then(() => done());',
    args: [],
  });
  for (const [label, id, sel] of targets) {
    const read = async (expr: string) => {
      const ref = await send('WebDriver:ExecuteScript', {
        script: `return ${expr};`,
        args: [],
      });
      const a = await send('Marionette:GetAccessibilityPropertiesForElement', {
        id: Object.values(ref)[0],
      });
      return a
        ? { role: a.role, name: a.label || undefined }
        : { ignored: true };
    };
    print(label, await read(controlExpr(id, sel)), await read(hostExpr(id)));
  }
  // The value and the description of every slider, from nsIAccessible.
  try {
    await send('Marionette:SetContext', { value: 'chrome' });
    const tree = await send('WebDriver:ExecuteScript', {
      script: `const svc = Cc['@mozilla.org/accessibilityService;1'].getService(Ci.nsIAccessibilityService);
        const out = [];
        const walk = (acc) => { if (svc.getStringRole(acc.role) === 'slider') { out.push([acc.name, acc.value, acc.description].map(String).join(' | ')); } for (let c = acc.firstChild; c; c = c.nextSibling) walk(c); };
        walk(svc.getAccessibleFor(gBrowser.selectedBrowser));
        return out;`,
      args: [],
    });
    console.log('  sliders in document order, name | value | description');
    const sliders = targets.filter(
      ([, id]) => !id.startsWith('p') || id.startsWith('plan'),
    );
    tree.forEach((t: string, i: number) =>
      console.log(`    ${sliders[i]?.[0].padEnd(30)} ${t}`),
    );
  } catch (error) {
    console.log('  chrome context:', String(error).slice(0, 200));
  }
  await send('Marionette:SetContext', { value: 'content' }).catch(() => {});
  await send('WebDriver:DeleteSession');
  sock.end();
  proc.kill();
  await rm(profile, { recursive: true, force: true });
}
await rm(dir, { recursive: true });
