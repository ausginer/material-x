// Probe for the select plan: a select-only combobox whose listbox is a popover
// in the host's shadow root and whose options are the host's light-DOM
// children. Reads each engine's own accessibility tree, closed and open.
// The harness follows .plan/slider-1/probes/naming.ts.
//
//   host    the host is the combobox, through its ElementInternals; the active
//           option is internals.ariaActiveDescendantElement
//   shadow  a <div role="combobox" tabindex="0"> in the shadow root is the
//           combobox; the active option is its ariaActiveDescendantElement
//
// Names: aria = host aria-label; for = <label for>; wrap = a wrapping <label>;
// slot = the slotted label element, by ariaLabelledByElements.
// hide = the shadow wrappers that are aria-hidden: the label's, or the label's
// and the value's.
//
// node tree.ts <chromium|firefox|webkit>
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, webkit, firefox } from 'playwright';

const ENGINE = process.argv[2]!;

const OPTIONS =
  '<x-opt>Apple</x-opt><x-opt selected>Banana</x-opt><x-opt disabled>Cherry</x-opt>';
const CASES: ReadonlyArray<readonly [string, string]> = [
  ['host aria', `<x-cb id="c0" mode="host" aria-label="N0">${OPTIONS}</x-cb>`],
  [
    'host for',
    `<label for="c1">N1</label><x-cb id="c1" mode="host">${OPTIONS}</x-cb>`,
  ],
  [
    'host wrap',
    `<label>N2 <x-cb id="c2" mode="host">${OPTIONS}</x-cb></label>`,
  ],
  [
    'host slot',
    `<x-cb id="c3" mode="host"><span slot="label">N3</span>${OPTIONS}</x-cb>`,
  ],
  [
    'shadow aria',
    `<x-cb id="c4" mode="shadow" aria-label="N4">${OPTIONS}</x-cb>`,
  ],
  [
    'shadow slot',
    `<x-cb id="c5" mode="shadow"><span slot="label">N5</span>${OPTIONS}</x-cb>`,
  ],
  [
    'host slot hide=label',
    `<x-cb id="c6" mode="host" hide="label"><span slot="label">N6</span>${OPTIONS}</x-cb>`,
  ],
  [
    'host slot hide=both',
    `<x-cb id="c7" mode="host" hide="both"><span slot="label">N7</span>${OPTIONS}</x-cb>`,
  ],
];

const HTML = `<!doctype html><meta charset="utf-8"><body><form>
${CASES.map(([, html]) => html).join('\n')}
<select id="native" aria-label="NN"><option>Apple</option><option selected>Banana</option><option disabled>Cherry</option></select>
</form><script>
customElements.define('x-opt', class extends HTMLElement {
  constructor() { super(); this.i = this.attachInternals(); this.i.role = 'option'; }
  connectedCallback() {
    this.i.ariaSelected = this.hasAttribute('selected') ? 'true' : 'false';
    if (this.hasAttribute('disabled')) this.i.ariaDisabled = 'true';
  }
});
customElements.define('x-cb', class extends HTMLElement {
  static formAssociated = true;
  constructor() { super(); this.i = this.attachInternals(); }
  connectedCallback() {
    const mode = this.getAttribute('mode');
    const root = this.attachShadow({ mode: 'open', delegatesFocus: mode === 'shadow' });
    root.innerHTML = '<span class="label"><slot name="label"></slot></span>'
      + (mode === 'shadow' ? '<div class="cb" role="combobox" tabindex="0" aria-haspopup="listbox" aria-expanded="false"><span class="value">Banana</span></div>' : '<span class="value">Banana</span>')
      + '<div class="menu" role="listbox" popover="manual"><slot></slot></div>';
    const hide = this.getAttribute('hide');
    if (hide) root.querySelector('.label').ariaHidden = 'true';
    if (hide === 'both') root.querySelector('.value').ariaHidden = 'true';
    this.menu = root.querySelector('.menu');
    this.label = root.querySelector('slot[name=label]');
    const cb = this.cb = mode === 'shadow' ? root.querySelector('.cb') : this.i;
    if (mode === 'host') {
      Object.assign(this.i, { role: 'combobox', ariaHasPopup: 'listbox', ariaExpanded: 'false' });
      this.tabIndex = 0;
    }
    const labelled = this.label.assignedElements();
    if (labelled.length) cb.ariaLabelledByElements = labelled;
    if (mode === 'shadow' && this.ariaLabel) cb.ariaLabel = this.ariaLabel;
  }
  open() {
    this.menu.showPopover();
    this.cb.ariaExpanded = 'true';
    this.cb.ariaActiveDescendantElement = this.querySelector('x-opt[selected]');
  }
});
window.__open = () => document.querySelectorAll('x-cb').forEach((c) => c.open());
window.__labelClick = () => {
  const out = [];
  for (const id of ['c1', 'c2']) {
    document.activeElement?.blur?.();
    let clicked = false;
    const el = document.getElementById(id);
    el.addEventListener('click', () => { clicked = true; }, { once: true });
    (document.querySelector('label[for=' + id + ']') ?? el.closest('label')).click();
    out.push(id + ' focused=' + (document.activeElement === el) + ' host click=' + clicked);
  }
  return out.join('; ');
};
window.__reflect = () => [...document.querySelectorAll('x-cb')].map((c) => c.id + ' activedescendant reads ' + (c.cb.ariaActiveDescendantElement?.localName ?? null)).join('; ');
</script>`;

const dir = await mkdtemp(join(tmpdir(), 'select-tree-'));
const file = join(dir, 'index.html');
await writeFile(file, HTML);
const url = pathToFileURL(file).href;

// Each target: label and an expression giving the element.
const TARGETS: Array<readonly [string, string]> = CASES.flatMap(
  ([label], n) => {
    const host = `document.querySelector('#c${n}')`;
    const cb = label.startsWith('shadow')
      ? `${host}.shadowRoot.querySelector('.cb')`
      : host;
    return [
      [`c${n} ${label} combobox`, cb],
      [`c${n} ${label} listbox`, `${host}.menu`],
      [`c${n} ${label} option 2`, `${host}.querySelector('x-opt[selected]')`],
    ] as const;
  },
);
TARGETS.push(['native select', `document.querySelector('#native')`]);
TARGETS.push([
  'native option 2',
  `document.querySelector('#native').options[1]`,
]);

const line = (label: string, o: unknown) =>
  console.log(`  ${label.padEnd(26)} ${JSON.stringify(o)}`);

type Reader = (phase: string) => Promise<void>;

async function run(read: Reader, evaluate: (expr: string) => Promise<unknown>) {
  console.log('  label activation:', await evaluate('window.__labelClick()'));
  await read('closed');
  await evaluate('window.__open()');
  console.log('  reflection:', await evaluate('window.__reflect()'));
  await read('open');
}

if (ENGINE === 'chromium') {
  const browser = await chromium.launch();
  console.log(`# chromium ${browser.version()}`);
  const p = await browser.newPage();
  await p.goto(url);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Accessibility.enable');
  await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const read: Reader = async (phase) => {
    console.log(`  -- ${phase}`);
    for (const [label, expression] of TARGETS) {
      const { result } = (await cdp.send('Runtime.evaluate', {
        expression,
      })) as any;
      const { node: dom } = (await cdp.send('DOM.describeNode', {
        objectId: result.objectId,
      })) as any;
      const { nodes } = (await cdp.send('Accessibility.getPartialAXTree', {
        backendNodeId: dom.backendNodeId,
        fetchRelatives: true,
      })) as any;
      const n = nodes.find(
        (x: any) => x.backendDOMNodeId === dom.backendNodeId,
      );
      if (!n) {
        line(label, { accessible: null });
        continue;
      }
      const parent = nodes.find((x: any) => x.nodeId === n.parentId);
      const prop = (k: string) =>
        (n.properties ?? []).find((x: any) => x.name === k)?.value;
      line(label, {
        role: n.role?.value,
        name: n.name?.value ?? '',
        ignored: n.ignored,
        value: n.value?.value,
        expanded: prop('expanded')?.value,
        haspopup: prop('hasPopup')?.value,
        activedescendant: prop('activedescendant')?.relatedNodes?.map(
          (r: any) => r.backendDOMNodeId,
        ),
        dom: dom.backendNodeId,
        selected: prop('selected')?.value,
        disabled: prop('disabled')?.value,
        parent: parent?.role?.value,
      });
    }
  };
  await run(read, (expression) => p.evaluate(expression));
  await browser.close();
} else if (ENGINE === 'webkit') {
  const browser = await webkit.launch();
  console.log(`# webkit ${browser.version()}`);
  const p = await browser.newPage();
  await p.goto(url);
  const impl = (p as any)._connection.toImpl(p);
  const s = impl.delegate._session;
  await s.send('DOM.getDocument');
  const props = async (nodeId: number) =>
    (await s.send('DOM.getAccessibilityPropertiesForNode', { nodeId }))
      .properties;
  const read: Reader = async (phase) => {
    console.log(`  -- ${phase}`);
    for (const [label, expression] of TARGETS) {
      const { result } = await s.send('Runtime.evaluate', { expression });
      const { nodeId } = await s.send('DOM.requestNode', {
        objectId: result.objectId,
      });
      const a = await props(nodeId);
      const parent = a.parentNodeId ? await props(a.parentNodeId) : undefined;
      const active = a.activeDescendantNodeId
        ? await props(a.activeDescendantNodeId)
        : undefined;
      line(label, {
        exists: a.exists,
        role: a.role,
        name: a.label ?? '',
        ignored: a.ignored,
        expanded: a.expanded,
        popup: a.isPopUpButton,
        activedescendant: active ? `${active.role} ${active.label}` : undefined,
        selected: a.selected,
        disabled: a.disabled,
        parent: parent?.role,
      });
    }
  };
  await run(read, (expression) => p.evaluate(expression));
  await browser.close();
} else {
  const exe = firefox.executablePath();
  const profile = await mkdtemp(join(tmpdir(), 'select-ff-'));
  await writeFile(
    join(profile, 'user.js'),
    'user_pref("marionette.port", 2832);\nuser_pref("browser.shell.checkDefaultBrowser", false);\n',
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
  const sock = createConnection(2832, '127.0.0.1');
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
  console.log(`# firefox ${session.capabilities?.browserVersion}`);
  await send('WebDriver:Navigate', { url });
  const evaluate = (expr: string) =>
    send('WebDriver:ExecuteScript', { script: `return ${expr};`, args: [] });
  const read: Reader = async (phase) => {
    console.log(`  -- ${phase}`);
    for (const [label, expr] of TARGETS) {
      const ref = await evaluate(expr);
      const a = await send('Marionette:GetAccessibilityPropertiesForElement', {
        id: Object.values(ref)[0],
      }).catch((e) => ({ error: String(e).slice(0, 80) }));
      line(label, a ?? { accessible: null });
    }
  };
  await run(read, evaluate);
  await send('WebDriver:DeleteSession');
  sock.end();
  proc.kill();
  await rm(profile, { recursive: true, force: true });
}
await rm(dir, { recursive: true });
