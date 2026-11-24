import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import fs from 'node:fs';
const S = process.argv[2];
const req = createRequire(process.cwd() + '/package.json');
const pw = req('playwright');
const { rolldown } = await import(
  createRequire(process.cwd() + '/../../package.json').resolve('rolldown')
);
const runtime = JSON.parse(fs.readFileSync('files.json')).runtime;
const codes = {};
for (const v of ['before', 'after']) {
  const root = process.cwd();
  const b = await rolldown({
    input: 'virtual:e',
    logLevel: 'silent',
    plugins: [
      {
        name: 'e',
        resolveId(id, imp) {
          if (id === 'virtual:e') return id;
          if (id.startsWith('@ydinjs/') || !/^[./]/.test(id))
            return this.resolve(id, root + '/button/button.js', {
              skipSelf: true,
            });
          return null;
        },
        load: (id) =>
          id === 'virtual:e'
            ? runtime.map((f) => `import '${S}/${v}/${f}.js';`).join('\n')
            : null,
      },
    ],
  });
  codes[v] = (await b.generate({ format: 'esm' })).output
    .map((c) => c.code ?? '')
    .join('\n');
}
console.log(
  'bundle sizes',
  codes.before.length,
  codes.after.length,
  'identical after rename',
  codes.after
    .replaceAll('--mx-', '--')
    .replaceAll(S + '/after', S + '/before')
    .replace(/\/\/#(region|endregion).*/g, '') ===
    codes.before.replace(/\/\/#(region|endregion).*/g, ''),
);
const tags = [
  ...new Set(
    [...codes.after.matchAll(/customElements\.define\(["'`](mx-[\w-]+)/g)].map(
      (m) => m[1],
    ),
  ),
];
console.log(tags.length, 'tags');
const html = `<!doctype html><script type=module src=lib.js></script><body>`;
const srv = createServer((q, r) => {
  const v = q.url.split('/')[1];
  const js = q.url.endsWith('lib.js');
  r.writeHead(200, { 'content-type': js ? 'text/javascript' : 'text/html' });
  r.end(js ? codes[v] : html);
});
await new Promise((r) => srv.listen(0, r));
const run = async (page, v) => {
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`http://localhost:${srv.address().port}/${v}/`);
  await page.waitForTimeout(500);
  const res = await page.evaluate(async (tags) => {
    const attrs = [
      {},
      { disabled: '' },
      { checked: '' },
      { error: '', label: 'L', value: 'v' },
      { color: 'tonal' },
      { color: 'outlined' },
      { color: 'text' },
      { color: 'elevated' },
      { size: 'large' },
      { outlined: '' },
      { selected: '' },
      { shape: 'square' },
      { extended: '', open: '' },
      { connected: '' },
    ];
    const w = () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    let out = {};
    for (const t of tags)
      for (const a of attrs) {
        const e = document.createElement(t);
        for (const k in a) e.setAttribute(k, a[k]);
        e.textContent = 'Text';
        const b = document.createElement('mx-button');
        b.textContent = 'b';
        if (/group|list$/.test(t)) e.replaceChildren(b);
        document.body.replaceChildren(e);
        await w();
        e.matches;
        for (const x of document.getAnimations()) {
          try {
            x.finish();
          } catch {}
        }
        for (const x of e.shadowRoot?.getAnimations?.() ?? []) {
          try {
            x.finish();
          } catch {}
        }
        await w();
        const els = [e, ...(e.shadowRoot?.querySelectorAll('*') ?? [])];
        els.forEach((el, i) => {
          for (const p of [undefined, '::before', '::after']) {
            const s = getComputedStyle(el, p);
            let o = '';
            for (const k of s)
              if (!k.startsWith('--'))
                o += k + ':' + s.getPropertyValue(k) + ';';
            out[t + JSON.stringify(a) + i + el.localName + (p ?? '')] = o;
          }
        });
      }
    return out;
  }, tags);
  return { res, errs };
};
for (const n of ['chromium', 'firefox', 'webkit']) {
  const b = await pw[n].launch();
  const p = await b.newPage();
  const x = await run(p, 'before');
  const p2 = await b.newPage();
  const y = await run(p2, 'after');
  const p3 = await b.newPage();
  const z = await run(p3, 'before');
  const d = (u, v) => Object.keys(u).filter((k) => u[k] !== v[k]);
  const all = d(x.res, y.res);
  const un = (o) => o.replaceAll('--mx-', '--');
  const bad = all.filter((k) => x.res[k] !== un(y.res[k]));
  const props = {};
  for (const k of all) {
    const A = x.res[k].split(';'),
      B = y.res[k].split(';');
    A.forEach((q, i) => {
      if (q !== B[i]) {
        const n = q.slice(0, 70) + ' => ' + B[i].slice(0, 70);
        props[n] = (props[n] ?? 0) + 1;
      }
    });
  }
  console.log(n, 'raw differences', all.length, props);
  console.log(
    n,
    Object.keys(x.res).length,
    'boxes; before vs after differ:',
    bad.length,
    bad.slice(0, 3),
    '; before vs before differ:',
    d(x.res, z.res).length,
    '; page errors',
    x.errs.length,
    y.errs.length,
  );
  await b.close();
}
srv.close();
