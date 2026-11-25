// Whether hosts with useSlot are collected. Run from the repository's root,
// after building core: node <this file>
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';

const engines = createRequire(path.resolve('package.json'))('playwright');
const server = http.createServer((q, s) => {
  if (q.url === '/')
    return s
      .setHeader('content-type', 'text/html')
      .end('<!doctype html><body>');
  const f = path.resolve(`packages/core${q.url}`);
  if (!fs.existsSync(f)) return s.writeHead(404).end();
  return s.setHeader('content-type', 'text/javascript').end(fs.readFileSync(f));
});
await new Promise((r) => {
  server.listen(0, r);
});
for (const name of ['chromium', 'firefox', 'webkit']) {
  const browser = await engines[name].launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${server.address().port}/`);
  await page.evaluate(async () => {
    const { useSlot } = await import('/controllers/useSlot.js');
    const { ControlledElement } = await import('/element.js');
    window.calls = 0;
    const make = (tag, hook) =>
      customElements.define(
        tag,
        class extends ControlledElement {
          constructor() {
            super();
            const slot = document.createElement('slot');
            this.attachShadow({ mode: 'open' }).append(slot);
            this.pad = new Uint8Array(1e4);
            if (hook)
              useSlot(this, slot, () => {
                window.calls += this.pad.length / 1e4;
              });
          }
        },
      );
    make('x-hook', true);
    make('x-plain', false);
    const frame = () => new Promise((r) => setTimeout(r, 30));
    const ways = {
      'never connected': () => {},
      'never connected, with content': (e) => e.append('a'),
      'connected, removed': (e) => {
        document.body.append(e);
        e.remove();
      },
      'ten reconnects, changed out': async (e) => {
        for (let i = 0; i < 10; i += 1) {
          document.body.append(e);
          e.remove();
        }
        await frame();
        e.append('a');
      },
    };
    window.refs = {};
    for (const tag of ['x-hook', 'x-plain'])
      for (const [way, f] of Object.entries(ways)) {
        await (async () => {
          const els = Array.from({ length: 300 }, () =>
            document.createElement(tag),
          );
          window.refs[`${tag} ${way}`] = els.map((e) => new WeakRef(e));
          await Promise.all(els.map(f));
        })();
        await frame();
      }
    // Kept by its content only.
    const e = document.createElement('x-hook');
    window.child = document.createElement('i');
    e.append(window.child);
  });
  for (let i = 0; i < 12; i += 1) {
    await page.requestGC();
    await page.waitForTimeout(150);
  }
  console.log(
    `${name}: alive of 300`,
    JSON.stringify(
      await page.evaluate(() =>
        Object.fromEntries(
          Object.entries(window.refs).map(([k, l]) => [
            k,
            l.filter((r) => r.deref()).length,
          ]),
        ),
      ),
    ),
  );
  console.log(
    `${name}: calls for a change of a host kept by its child only, after GC:`,
    await page.evaluate(async () => {
      const before = window.calls;
      window.child.parentNode.append('z');
      await new Promise((r) => setTimeout(r, 30));
      return window.calls - before;
    }),
  );
  await browser.close();
}
server.close();
