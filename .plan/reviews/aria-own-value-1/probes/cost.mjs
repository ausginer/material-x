// Heap for each host (Chromium), collection, and time, for two builds of core,
// alternating. Run from the repository's root:
//   node <this file> <dir of head's build> <dir of main's build>
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
const url = `http://localhost:${server.address().port}/`;
const setup = async (w) => {
  const { useARIA, setOwnARIA } = await import(`/${w}/controllers/useARIA.js`);
  const { ControlledElement } = await import(`/${w}/element.js`);
  const { useValidatable } = await import(`/${w}/traits/validatable.js`);
  const make = (tag, hook) =>
    customElements.define(
      tag,
      class extends ControlledElement {
        static observedAttributes = ['error', 'required'];
        constructor() {
          super();
          this.t = document.createElement('span');
          this.attachShadow({ mode: 'open' }).append(this.t);
          if (hook) {
            useARIA(this, this.t);
            useValidatable(this, this.t);
          }
        }
      },
    );
  make('x-a', true);
  make('x-plain', false);
  Object.assign(window, { setOwnARIA });
};
const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
{
  const browser = await pw.chromium.launch();
  const got = {};
  for (let round = 0; round < 5; round++)
    for (const w of ['main', 'head'])
      for (const kind of ['plain', 'idle', 'one own value', 'two own values']) {
        const page = await browser.newPage();
        await page.goto(url);
        await page.evaluate(setup, w);
        const cdp = await page.context().newCDPSession(page);
        const used = async () => {
          for (let i = 0; i < 3; i++)
            await cdp.send('HeapProfiler.collectGarbage');
          return (await cdp.send('Runtime.getHeapUsage')).usedSize;
        };
        await page.evaluate(() => {
          window.list = [
            document.createElement('x-a'),
            document.createElement('x-plain'),
          ];
        });
        const a = await used();
        await page.evaluate((kind) => {
          for (let i = 0; i < 10000; i++) {
            const e = document.createElement(
              kind === 'plain' ? 'x-plain' : 'x-a',
            );
            if (kind.includes('own')) e.setAttribute('error', '');
            if (kind.includes('two')) e.setAttribute('required', '');
            document.body.append(e);
            list.push(e);
          }
        }, kind);
        await page.waitForTimeout(50);
        (got[`${kind}`] ??= {})[w] ??= [];
        got[kind][w].push(((await used()) - a) / 10000);
        await page.close();
      }
  for (const [k, v] of Object.entries(got))
    console.log(
      `heap bytes a host, Chromium | ${k} | main ${med(v.main).toFixed(0)}, head ${med(v.head).toFixed(0)}`,
    );
  await browser.close();
}
for (const e of ['chromium', 'firefox', 'webkit']) {
  const browser = await pw[e].launch();
  {
    const page = await browser.newPage();
    await page.goto(url);
    await page.evaluate(setup, 'head');
    await page.evaluate(async () => {
      window.refs = {};
      const ways = {
        'own value, never connected': (x) => x.setAttribute('error', ''),
        'own value, connected, removed': (x) => {
          x.setAttribute('error', '');
          document.body.append(x);
          x.remove();
        },
        'the page keeps only the target': (x) => {
          x.setAttribute('error', '');
          (window.kept ??= []).push(x.t);
          x.t.remove();
        },
      };
      for (const [k, f] of Object.entries(ways)) {
        const els = Array.from({ length: 500 }, () =>
          document.createElement('x-a'),
        );
        refs[k] = els.map((x) => new WeakRef(x));
        els.forEach(f);
        await new Promise((r) => setTimeout(r, 30));
      }
    });
    for (let i = 0; i < 12; i++) {
      await page.requestGC();
      await page.waitForTimeout(150);
      await page.evaluate(() => {
        const a = [];
        for (let k = 0; k < 2e5; k++) a.push({ k });
        return a.length;
      });
    }
    console.log(
      `alive of 500 after collection, head | ${e} |`,
      JSON.stringify(
        await page.evaluate(() =>
          Object.fromEntries(
            Object.entries(refs).map(([k, l]) => [
              k,
              l.filter((r) => r.deref()).length,
            ]),
          ),
        ),
      ),
    );
    await page.close();
  }
  const got = {};
  for (let round = 0; round < 8; round++)
    for (const w of round % 2 ? ['head', 'main'] : ['main', 'head']) {
      const page = await browser.newPage();
      await page.goto(url);
      await page.evaluate(setup, w);
      const r = await page.evaluate(async () => {
        const t = {};
        const time = async (k, f) => {
          const s = performance.now();
          f();
          await null;
          await null;
          (t[k] ??= []).push(performance.now() - s);
        };
        for (let i = 0; i < 4; i++) {
          let els;
          const box = document.createElement('div');
          document.body.append(box);
          await time('make 5000', () => {
            els = Array.from({ length: 5000 }, () =>
              document.createElement('x-a'),
            );
          });
          await time('set error and required out', () => {
            for (const x of els) {
              x.setAttribute('error', '');
              x.setAttribute('required', '');
            }
          });
          await time('connect', () => box.append(...els));
          await time('move with 3 aria names', () => {
            for (const x of els) {
              x.setAttribute('aria-label', 'a');
              x.setAttribute('aria-invalid', 'b');
              x.setAttribute('aria-required', 'c');
            }
            const b = document.createElement('div');
            box.append(b);
            b.append(...els);
          });
          await time('toggle error 10 times', () => {
            for (const x of els)
              for (let k = 0; k < 10; k++) x.toggleAttribute('error');
          });
          box.remove();
        }
        return t;
      });
      await page.close();
      for (const [k, v] of Object.entries(r))
        ((got[k] ??= {})[w] ??= []).push(...v.slice(1));
    }
  for (const [k, v] of Object.entries(got))
    console.log(
      `time, 5000 hosts | ${e} | ${k} | main ${med(v.main).toFixed(0)} ms, head ${med(v.head).toFixed(0)} ms`,
    );
  await browser.close();
}
server.close();
