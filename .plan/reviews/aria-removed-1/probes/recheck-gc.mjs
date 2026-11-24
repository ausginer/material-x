// Whether hosts with useARIA are collected, and whether its observer outlives
// the page's own references to the host. Run from the repository's root, after
// building core: node <this file>
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
const { chromium, firefox, webkit } = createRequire(
  path.resolve('package.json'),
)('playwright');
const server = http.createServer((q, s) => {
  if (q.url === '/')
    return s
      .setHeader('content-type', 'text/html')
      .end('<!doctype html><body>');
  const f = path.resolve(`packages/core${q.url}`);
  if (!fs.existsSync(f)) return s.writeHead(404).end();
  s.setHeader('content-type', 'text/javascript').end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const url = `http://localhost:${server.address().port}/`;
for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch();
  const page = await browser.newPage();
  await page.goto(url);
  await page.evaluate(async () => {
    const { useARIA } = await import('/controllers/useARIA.js');
    const { ControlledElement } = await import('/element.js');
    const make = (name, hook) =>
      customElements.define(
        name,
        class extends ControlledElement {
          constructor() {
            super();
            const t = document.createElement('span');
            this.attachShadow({ mode: 'open' }).append(t);
            if (hook) useARIA(this, t);
            this.pad = new Uint8Array(1e4);
          }
        },
      );
    make('x-a', true);
    make('x-plain', false);
    const N = 500;
    const frame = () => new Promise((r) => setTimeout(r, 30));
    window.refs = {};
    const ways = {
      'never connected': (e) => {},
      'never connected, set': (e) => e.setAttribute('aria-label', 'A'),
      'connected, then removed': (e) => {
        document.body.append(e);
        e.remove();
      },
      'connected, removed, then lost': async (e) => {
        e.setAttribute('aria-label', 'A');
        document.body.append(e);
        await frame();
        e.remove();
        await frame();
        e.removeAttribute('aria-label');
      },
    };
    for (const tag of ['x-a', 'x-plain'])
      for (const [w, f] of Object.entries(ways)) {
        const list = (window.refs[`${tag} ${w}`] = []);
        await (async () => {
          const els = Array.from({ length: N }, () =>
            document.createElement(tag),
          );
          list.push(...els.map((e) => new WeakRef(e)));
          await Promise.all(els.map(f));
        })();
        await frame();
      }
    // No reference from the page's JavaScript to these hosts afterward.
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="in"><x-a aria-label="A"></x-a></div>',
    );
    window.frag = document.createDocumentFragment();
    {
      const d = document.createElement('div');
      const e = document.createElement('x-a');
      d.append(e);
      window.frag.append(d);
    }
    {
      const d = document.createElement('div');
      d.innerHTML = '<x-a></x-a>';
      document.body.append(d);
      d.remove();
      window.out = d;
    }
  });
  for (let i = 0; i < 12; i++) {
    await page.requestGC();
    await page.waitForTimeout(150);
    await page.evaluate(() => {
      let a = [];
      for (let k = 0; k < 2e5; k++) a.push({ k });
      return a.length;
    });
  }
  const alive = await page.evaluate(() =>
    Object.fromEntries(
      Object.entries(window.refs).map(([k, l]) => [
        k,
        l.filter((r) => r.deref()).length,
      ]),
    ),
  );
  console.log(`## ${type.name()} alive of 500 after GC`, JSON.stringify(alive));
  const works = await page.evaluate(async () => {
    const t = (e) => e.shadowRoot.firstElementChild.getAttribute('aria-label');
    const r = {};
    for (const [w, e] of [
      ['in the document', document.querySelector('#in x-a')],
      ['in a fragment, never connected', window.frag.querySelector('x-a')],
      ['in a subtree that was removed', window.out.querySelector('x-a')],
    ]) {
      e.setAttribute('aria-label', 'Z');
      await new Promise((f) => setTimeout(f, 30));
      const s = t(e);
      e.removeAttribute('aria-label');
      await new Promise((f) => setTimeout(f, 30));
      r[w] = [s, t(e)];
    }
    return r;
  });
  console.log(
    `## ${type.name()} the mirror after GC: set, lost`,
    JSON.stringify(works),
  );
  await browser.close();
}
server.close();
