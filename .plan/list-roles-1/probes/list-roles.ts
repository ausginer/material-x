// Probe for RF-68: how Chromium, Firefox and WebKit expose mx-list's items,
// as built and with a list item role on the item's host.
//
// node list-roles.ts <packages/material-x> <variant> <engine>
//   variant: main | host | inner
//     main  - the built package as it is
//     host  - useListItemCore sets `role: 'listitem'` through the host's internals
//     inner - as main, then the probe sets role="listitem" on each static
//             item's shadow `.host`, and wraps each interactive item's
//             button or link in a shadow <div role="listitem" class="wrap">
//     host-none - as inner, with `role: 'none'` on each item's host
//             through its internals
//     hostbox - as host, and a document style gives each item host
//             `display: block` in place of `display: contents`
//     hostbox-fold - as hostbox, and each static item's shadow `.host` div is
//             removed, its children moved to the shadow root, as folding
//             it into the host would have it (added by the architect for the
//             re-ruling of 2026-11-21)
//     inner-contents - as inner, with `display: contents` on each
//             interactive item's wrapper, so its control is again the
//             list's flex item (added by the architect for reviewer-1)
//   engine: chromium | firefox | webkit
//
// Each engine is read through its own accessibility tree, not Playwright's
// ariaSnapshot (which computes roles in page script):
//   chromium - CDP Accessibility.getFullAXTree
//   webkit   - the inspector's DOM.getAccessibilityPropertiesForNode, sent
//              through Playwright's in-process server
//   firefox  - Marionette's GetAccessibilityPropertiesFor*, on Playwright's
//              Firefox build started with --marionette
import { rolldown } from 'rolldown';
import { chromium, firefox, webkit, type Page } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [MX, VARIANT, ENGINE] = process.argv.slice(2) as [string, string, string];

const BODY = `<mx-list id="l">
  <mx-list-item id="s1">Static one<span slot="trail" data-handle>≡</span></mx-list-item>
  <mx-list-item id="s2">Static two</mx-list-item>
  <mx-list-item id="s3" tabindex="0">Focusable host</mx-list-item>
  <mx-list-button-item id="b">Button item</mx-list-button-item>
  <mx-list-link-item id="a" href="#x">Link item</mx-list-link-item>
</mx-list>
<button id="after">After</button>`;

async function bundle(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'list-roles-'));
  const entry = join(dir, 'entry.js');
  await writeFile(
    entry,
    [
      'list/list.js',
      'list/list-item.js',
      'list/list-button-item.js',
      'list/list-link-item.js',
    ]
      .map((f) => `import ${JSON.stringify(join(MX, f))};`)
      .join('\n'),
  );
  const patched = { count: 0 };
  const build = await rolldown({
    input: entry,
    platform: 'browser',
    plugins: [
      {
        name: 'variant',
        transform(code, id) {
          if (
            !VARIANT.startsWith('host') ||
            !id.endsWith('/list/ListItemCore.js')
          ) {
            return null;
          }
          const from = 'useCore(host, [template], {}, [';
          if (!code.includes(from)) {
            throw new Error('the host patch no longer applies');
          }
          patched.count++;
          return code.replace(
            from,
            `useCore(host, [template], { role: '${VARIANT === 'host-none' ? 'none' : 'listitem'}' }, [`,
          );
        },
      },
    ],
  });
  const { output } = await build.generate({ format: 'iife' });
  await rm(dir, { recursive: true });
  if (VARIANT.startsWith('host') && patched.count !== 1) {
    throw new Error('the host patch did not apply');
  }
  return output
    .filter((c) => c.type === 'chunk')
    .map((c) => (c as { code: string }).code)
    .join('\n');
}

const INNER = `for (const item of document.querySelectorAll('mx-list-item')) {
  item.shadowRoot.querySelector('.host').setAttribute('role', 'listitem');
}
for (const item of document.querySelectorAll('mx-list-button-item, mx-list-link-item')) {
  const target = item.shadowRoot.querySelector('.host');
  const wrap = document.createElement('div');
  wrap.setAttribute('role', 'listitem');
  wrap.className = 'wrap';
  if (CONTENTS) wrap.style.display = 'contents';
  target.before(wrap);
  wrap.append(target);
}`;

const FOLD = `for (const item of document.querySelectorAll('mx-list-item')) {
  const div = item.shadowRoot.querySelector('.host');
  item.shadowRoot.append(...div.childNodes);
  div.remove();
}`;

async function page(code: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'list-roles-page-'));
  const file = join(dir, 'index.html');
  await writeFile(
    file,
    `<!doctype html><html><head><meta charset="utf-8">${VARIANT.startsWith('hostbox') ? '<style>#l > * { display: block; }</style>' : ''}</head><body>${BODY}
<script>${code}</script>
<script>${VARIANT.startsWith('inner') || VARIANT === 'host-none' ? `const CONTENTS = ${VARIANT === 'inner-contents'};\n${INNER}` : ''}${VARIANT === 'hostbox-fold' ? FOLD : ''}</script></body></html>`,
  );
  return pathToFileURL(file).href;
}

type Line = { depth: number; text: string };
const print = (title: string, lines: readonly Line[]) => {
  console.log(title);
  for (const l of lines) console.log('  ' + '  '.repeat(l.depth) + l.text);
};

async function tabOrder(p: Page): Promise<string> {
  const order: string[] = [];
  await p.locator('body').focus();
  for (let i = 0; i < 6; i++) {
    await p.keyboard.press('Tab');
    order.push(
      await p.evaluate(() => {
        let e: Element | null = document.activeElement;
        let s = (e?.id ? `#${e.id}` : e?.tagName.toLowerCase()) ?? '';
        while (e?.shadowRoot?.activeElement) {
          e = e.shadowRoot.activeElement;
          s += ' > ' + e.tagName.toLowerCase();
        }
        return s;
      }),
    );
  }
  return order.join(' | ');
}

async function readChromium(url: string) {
  const browser = await chromium.launch();
  const p = await browser.newPage();
  await p.goto(url);
  await p.waitForFunction(() => customElements.get('mx-list-link-item'));
  await p.waitForTimeout(200);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  type AX = {
    nodeId: string;
    ignored: boolean;
    role?: { value: string };
    name?: { value: string };
    childIds?: string[];
    backendDOMNodeId?: number;
  };
  const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as {
    nodes: AX[];
  };
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  const describe = async (n: AX) => {
    if (!n.backendDOMNodeId) return '';
    const { node } = (await cdp.send('DOM.describeNode', {
      backendNodeId: n.backendDOMNodeId,
    })) as {
      node: { localName: string; nodeName: string; attributes?: string[] };
    };
    const attrs = node.attributes ?? [];
    const id = attrs[attrs.indexOf('id') + 1];
    const cls = attrs[attrs.indexOf('class') + 1];
    return (
      (node.localName || node.nodeName) +
      (attrs.includes('id') ? `#${id}` : '') +
      (attrs.includes('class') ? `.${cls}` : '')
    );
  };
  const lines: Line[] = [];
  const list = nodes.find((n) => n.role?.value === 'list')!;
  const walk = async (n: AX, depth: number) => {
    if (!n.ignored) {
      lines.push({
        depth,
        text: `${n.role?.value} ${JSON.stringify(n.name?.value ?? '')} <${await describe(n)}>`,
      });
    }
    for (const c of n.childIds ?? []) {
      const child = byId.get(c);
      if (
        child &&
        !['StaticText', 'InlineTextBox'].includes(child.role?.value ?? '')
      ) {
        await walk(child, n.ignored ? depth : depth + 1);
      }
    }
  };
  await walk(list, 0);
  print(
    'chromium AX tree from the list (not ignored, text nodes left out):',
    lines,
  );
  console.log('tab order: ' + (await tabOrder(p)));
  await browser.close();
}

async function readWebKit(url: string) {
  const browser = await webkit.launch();
  const p = await browser.newPage();
  await p.goto(url);
  await p.waitForFunction(() => customElements.get('mx-list-link-item'));
  await p.waitForTimeout(200);
  // The in-process server's page: Playwright's own session to WebKit's inspector.
  const conn = (
    p as unknown as { _connection: { toImpl(x: unknown): unknown } }
  )._connection;
  const impl = conn.toImpl(p) as {
    delegate: { _session: { send(m: string, a?: object): Promise<any> } };
  };
  const s = impl.delegate._session;
  const { root } = await s.send('DOM.getDocument');
  const { nodeIds } = await s.send('DOM.querySelectorAll', {
    nodeId: root.nodeId,
    selector: '#l',
  });
  const describe = async (nodeId: number) => {
    const { object } = await s.send('DOM.resolveNode', { nodeId });
    const { result } = await s.send('Runtime.callFunctionOn', {
      objectId: object.objectId,
      functionDeclaration:
        'function () { return this.nodeType === 1 ? this.localName + (this.id ? "#" + this.id : "") + (this.className ? "." + this.className : "") : this.nodeType === 3 ? "#text " + JSON.stringify(this.data.trim()) : this.nodeName; }',
      returnByValue: true,
    });
    return result.value as string;
  };
  const lines: Line[] = [];
  const walk = async (nodeId: number, depth: number) => {
    const { properties: a } = await s.send(
      'DOM.getAccessibilityPropertiesForNode',
      {
        nodeId,
      },
    );
    const name = await describe(nodeId);
    if (name === '#text ""') return;
    lines.push({
      depth,
      text: `${a.exists ? a.role || '(no role)' : '(no object)'}${a.ignored ? ' ignored' : ''} ${JSON.stringify(a.label ?? '')} <${name}> parent=<${a.parentNodeId ? await describe(a.parentNodeId) : '-'}>`,
    });
    for (const c of a.childNodeIds ?? []) await walk(c, depth + 1);
  };
  await walk(nodeIds[0], 0);
  print(
    'webkit AX tree from the list (childNodeIds, which leave text out):',
    lines,
  );
  // Each item host, read directly, with its AX parent.
  for (const sel of ['#s1', '#s2', '#s3', '#b', '#a']) {
    const {
      nodeIds: [id],
    } = await s.send('DOM.querySelectorAll', {
      nodeId: root.nodeId,
      selector: sel,
    });
    const { properties: a } = await s.send(
      'DOM.getAccessibilityPropertiesForNode',
      {
        nodeId: id,
      },
    );
    console.log(
      `  host ${sel}: exists=${a.exists} role=${a.role || '-'} ignored=${a.ignored} parent=<${a.parentNodeId ? await describe(a.parentNodeId) : '-'}>`,
    );
  }
  // Each item's light-DOM children (its label text and slotted elements), read
  // directly: WebKit's childNodeIds leave text out.
  const { result: kids } = await s.send('Runtime.evaluate', {
    expression:
      '[...document.querySelectorAll("#l > *")].flatMap((i) => [...i.childNodes].filter((n) => n.nodeType === 1 || n.data.trim()))',
  });
  const { properties: props } = await s.send('Runtime.getProperties', {
    objectId: kids.objectId,
    ownProperties: true,
  });
  for (const pr of props) {
    if (!/^\d+$/.test(pr.name)) continue;
    const { nodeId } = await s.send('DOM.requestNode', {
      objectId: pr.value.objectId,
    });
    const { properties: a } = await s.send(
      'DOM.getAccessibilityPropertiesForNode',
      { nodeId },
    );
    console.log(
      `  light child <${await describe(nodeId)}>: exists=${a.exists} role=${a.role || '-'} ignored=${a.ignored} parent=<${a.parentNodeId ? await describe(a.parentNodeId) : '-'}>`,
    );
  }
  console.log('tab order: ' + (await tabOrder(p)));
  await browser.close();
}

// Marionette: 'len:json' frames; [0, id, name, params] → [1, id, error, result].
async function readFirefox(url: string) {
  const exe = firefox.executablePath();
  const profile = await mkdtemp(join(tmpdir(), 'list-roles-ff-'));
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
  await new Promise((r) => setTimeout(r, 300)); // the server's hello frame
  await send('WebDriver:NewSession', { capabilities: {} });
  await send('WebDriver:Navigate', { url });
  await send('WebDriver:ExecuteAsyncScript', {
    script:
      'const done = arguments[0]; customElements.whenDefined("mx-list-link-item").then(() => setTimeout(done, 200));',
    args: [],
  });
  const el = async (css: string) => {
    const r = await send('WebDriver:FindElement', {
      using: 'css selector',
      value: css,
    });
    return Object.values(r)[0] as string;
  };
  const lines: Line[] = [];
  const walk = async (a: any, depth: number) => {
    if (a.role !== 'text leaf') {
      lines.push({ depth, text: `${a.role} ${JSON.stringify(a.label ?? '')}` });
    }
    for (const c of a.children ?? []) {
      await walk(
        await send(
          'Marionette:GetAccessibilityPropertiesForAccessibilityNode',
          { id: c },
        ),
        depth + 1,
      );
    }
  };
  const list = await send('Marionette:GetAccessibilityPropertiesForElement', {
    id: await el('#l'),
  });
  await walk(list, 0);
  print(
    'firefox AX tree from the list (Marionette, text leaves left out):',
    lines,
  );
  for (const sel of ['#s1', '#s2', '#s3', '#b', '#a']) {
    const a = await send('Marionette:GetAccessibilityPropertiesForElement', {
      id: await el(sel),
    });
    console.log(
      `  host ${sel}: ${a ? `role=${a.role} parent-is-list=${a.parent === list.accessibilityId}` : 'no accessible'}`,
    );
  }
  await send('WebDriver:DeleteSession');
  sock.end();
  proc.kill();
  await rm(profile, { recursive: true, force: true });
  // Focus through Playwright's own Firefox.
  const browser = await firefox.launch();
  const p = await browser.newPage();
  await p.goto(url);
  await p.waitForFunction(() => customElements.get('mx-list-link-item'));
  await p.waitForTimeout(200);
  console.log('tab order: ' + (await tabOrder(p)));
  await browser.close();
}

const url = await page(await bundle());
console.log(`# variant ${VARIANT}, engine ${ENGINE}`);
if (ENGINE === 'chromium') await readChromium(url);
else if (ENGINE === 'webkit') await readWebKit(url);
else if (ENGINE === 'firefox') await readFirefox(url);
else throw new Error('engine?');
