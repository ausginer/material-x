// Time of 3,000 hosts with one useARIA or ten, with the hook at 80c5db113 and
// at 114270083, alternating. node <this> <dir of head's build> <dir of main's build> <engines>
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
const pw = createRequire(path.resolve('package.json'))('playwright');
const dirs = { head: process.argv[2], main: process.argv[3] };
const server = http.createServer((q, s) => {
  const [, w, ...r] = q.url.split('/');
  if (!r.length)
    return s
      .setHeader('content-type', 'text/html')
      .end('<!doctype html><body>');
  const f = path.join(dirs[w], r.join('/'));
  if (!fs.existsSync(f)) return s.writeHead(404).end();
  s.setHeader('content-type', 'text/javascript').end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
for (const e of process.argv[4].split(',')) {
  const browser = await pw[e].launch();
  const got = {};
  for (let round = 0; round < 8; round++)
    for (const w of round % 2 ? ['head', 'main'] : ['main', 'head'])
      for (const hooks of [1, 10]) {
        const page = await browser.newPage();
        await page.goto(`http://localhost:${server.address().port}/`);
        const r = await page.evaluate(
          async ([w, hooks]) => {
            const { useARIA } = await import(`/${w}/controllers/useARIA.js`);
            const { ControlledElement } = await import(`/${w}/element.js`);
            customElements.define(
              'x-a',
              class extends ControlledElement {
                constructor() {
                  super();
                  for (let i = 0; i < hooks; i++) {
                    const t = document.createElement('span');
                    (
                      this.shadowRoot ?? this.attachShadow({ mode: 'open' })
                    ).append(t);
                    useARIA(this, t);
                  }
                }
              },
            );
            const N = 3000,
              t = {};
            const time = async (k, f) => {
              const s = performance.now();
              f();
              await null;
              await null;
              (t[k] ??= []).push(performance.now() - s);
            };
            for (let i = 0; i < 4; i++) {
              const els = [];
              const box = document.createElement('div');
              document.body.append(box);
              await time('make+3 attributes', () => {
                for (let j = 0; j < N; j++) {
                  const x = document.createElement('x-a');
                  x.setAttribute('aria-label', 'A');
                  x.setAttribute('class', 'c');
                  x.setAttribute('data-x', '1');
                  els.push(x);
                }
              });
              await time('make+append in one task', () => {
                const f = [];
                for (let j = 0; j < N; j++) {
                  const x = document.createElement('x-a');
                  x.setAttribute('aria-label', 'A');
                  x.setAttribute('class', 'c');
                  f.push(x);
                }
                box.append(...f);
              });
              await time('append', () => box.append(...els));
              await time('change connected', () => {
                for (const x of els) {
                  x.setAttribute('aria-label', 'B');
                  x.className = 'd';
                }
              });
              await time('remove', () => box.remove());
              await time('change out', () => {
                for (const x of els) {
                  x.setAttribute('aria-label', 'C');
                  x.className = 'f';
                }
              });
              await time('class only, out', () => {
                for (const x of els) x.className = 'g';
              });
            }
            return t;
          },
          [w, hooks],
        );
        await page.close();
        for (const [k, v] of Object.entries(r))
          ((got[`${hooks} hooks, ${k}`] ??= {})[w] ??= []).push(...v.slice(1));
      }
  const med = (a) => a.sort((x, y) => x - y)[a.length >> 1].toFixed(0);
  for (const [k, v] of Object.entries(got))
    console.log(`${e} | ${k} | main ${med(v.main)} ms, head ${med(v.head)} ms`);
  await browser.close();
}
server.close();
