// The readings of mirroring.ts's plan rows, on the built mx-slider: each
// engine's own accessibility tree for every combination of a name's sources,
// for a description, the value text and the host's value attributes, and after
// changes at run time.
//
// node built.ts <packages> <chromium|firefox|webkit>
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

const SLOT = '<span slot="label">S</span>';
const SLIDER: ReadonlyArray<readonly [string, string, string]> = [
  [
    'aria-label',
    '',
    '<mx-slider min="-55" max="55" value="-18" aria-label="A" id="ID"></mx-slider>',
  ],
  [
    'slot',
    '',
    `<mx-slider min="-55" max="55" value="-18" id="ID">${SLOT}</mx-slider>`,
  ],
  [
    'slot+aria-label',
    '',
    `<mx-slider min="-55" max="55" value="-18" aria-label="A" id="ID">${SLOT}</mx-slider>`,
  ],
  [
    'labelledby',
    '<span id="ID-r">R</span>',
    '<mx-slider min="-55" max="55" value="-18" aria-labelledby="ID-r" id="ID"></mx-slider>',
  ],
  [
    'slot+labelledby',
    '<span id="ID-r">R</span>',
    `<mx-slider min="-55" max="55" value="-18" aria-labelledby="ID-r" id="ID">${SLOT}</mx-slider>`,
  ],
  [
    'labelledby+aria-label',
    '<span id="ID-r">R</span>',
    '<mx-slider min="-55" max="55" value="-18" aria-label="A" aria-labelledby="ID-r" id="ID"></mx-slider>',
  ],
  [
    'for',
    '<label for="ID">L</label>',
    '<mx-slider min="-55" max="55" value="-18" id="ID"></mx-slider>',
  ],
  [
    'for+slot',
    '<label for="ID">L</label>',
    `<mx-slider min="-55" max="55" value="-18" id="ID">${SLOT}</mx-slider>`,
  ],
  [
    'for+aria-label',
    '<label for="ID">L</label>',
    '<mx-slider min="-55" max="55" value="-18" aria-label="A" id="ID"></mx-slider>',
  ],
  [
    'for+labelledby',
    '<label for="ID">L</label><span id="ID-r">R</span>',
    '<mx-slider min="-55" max="55" value="-18" aria-labelledby="ID-r" id="ID"></mx-slider>',
  ],
  [
    'for+slot+aria-label',
    '<label for="ID">L</label>',
    `<mx-slider min="-55" max="55" value="-18" aria-label="A" id="ID">${SLOT}</mx-slider>`,
  ],
  [
    'wrap',
    '<label>L ',
    '<mx-slider min="-55" max="55" value="-18" id="ID"></mx-slider></label>',
  ],
  [
    'wrap+slot',
    '<label>L ',
    `<mx-slider min="-55" max="55" value="-18" id="ID">${SLOT}</mx-slider></label>`,
  ],
  [
    'wrap+aria-label',
    '<label>L ',
    '<mx-slider min="-55" max="55" value="-18" aria-label="A" id="ID"></mx-slider></label>',
  ],
  [
    'describedby',
    '<span id="ID-r">D</span>',
    `<mx-slider min="-55" max="55" value="-18" aria-describedby="ID-r" id="ID">${SLOT}</mx-slider>`,
  ],
  [
    'valuetext',
    '',
    `<mx-slider min="-55" max="55" value="-18" valuetext="V" id="ID">${SLOT}</mx-slider>`,
  ],
  [
    'aria-valuetext',
    '',
    `<mx-slider min="-55" max="55" value="-18" aria-valuetext="H" id="ID">${SLOT}</mx-slider>`,
  ],
  [
    'both valuetexts',
    '',
    `<mx-slider min="-55" max="55" value="-18" valuetext="V" aria-valuetext="H" id="ID">${SLOT}</mx-slider>`,
  ],
  [
    'aria-valuenow 5',
    '',
    `<mx-slider min="-55" max="55" value="-18" aria-valuenow="5" id="ID">${SLOT}</mx-slider>`,
  ],
  [
    'aria-valuemin, max',
    '',
    `<mx-slider min="-55" max="55" value="-18" aria-valuemin="0" aria-valuemax="9" id="ID">${SLOT}</mx-slider>`,
  ],
  [
    'aria-invalid',
    '',
    `<mx-slider min="-55" max="55" value="-18" aria-invalid="true" id="ID">${SLOT}</mx-slider>`,
  ],
  [
    'runtime add label',
    '',
    '<mx-slider min="-55" max="55" value="-18" id="ID" data-run="el.setAttribute(`aria-label`, `A`)"></mx-slider>',
  ],
  [
    'runtime remove label',
    '<label for="ID">L</label>',
    '<mx-slider min="-55" max="55" value="-18" id="ID" aria-label="A" data-run="el.removeAttribute(`aria-label`)"></mx-slider>',
  ],
  [
    'runtime remove lby',
    '<span id="ID-r">R</span>',
    `<mx-slider min="-55" max="55" value="-18" id="ID" aria-labelledby="ID-r" data-run="el.removeAttribute('aria-labelledby')">${SLOT}</mx-slider>`,
  ],
  [
    'runtime fill slot',
    '',
    '<mx-slider min="-55" max="55" value="-18" id="ID" aria-label="A" data-run="el.append(Object.assign(document.createElement(`span`), { slot: `label`, textContent: `S` }))"></mx-slider>',
  ],
  [
    'runtime remove vt',
    '',
    `<mx-slider min="-55" max="55" value="-18" id="ID" valuetext="V" aria-valuetext="H" data-run="el.removeAttribute('aria-valuetext')">${SLOT}</mx-slider>`,
  ],
];

const targets: Array<readonly [string, string, string]> = [];
let body = '';
SLIDER.forEach(([label, before, html], n) => {
  const id = `s${n}`;
  body += `<div>${before}${html}</div>\n`.replaceAll('ID', id);
  targets.push([label, id, 'input']);
});

const dir = await mkdtemp(join(tmpdir(), 'slider-mirroring-'));
const entry = join(dir, 'entry.js');
await writeFile(
  entry,
  `import ${JSON.stringify(join(PACKAGES, 'material-x/slider/slider.js'))};
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
    tree.forEach((t: string, i: number) =>
      console.log(`    ${targets[i]?.[0].padEnd(30)} ${t}`),
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
