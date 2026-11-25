// Which nodes a connected group's useRovingTabindex keeps in memory. Run from packages/material-x with core and material-x
// built: node <this file> [another source of the hook]
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { brotliCompressSync } from 'node:zlib';

const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const engines = require('playwright');
const { rolldown } = await import(rootRequire.resolve('rolldown'));
// Another source of the hook takes the place of the built one.
const hook =
  process.argv[2] &&
  readFileSync(process.argv[2], 'utf8').replaceAll(
    /(from '[^']+)\.ts'/gu,
    "$1.js'",
  );
const entry = (names) =>
  names
    .map((e) => `import ${JSON.stringify(`${process.cwd()}/${e}.js`)};`)
    .join('');
const bundle = async (names, minify) => {
  const build = await rolldown({
    input: 'entry',
    platform: 'browser',
    plugins: [
      {
        name: 'e',
        resolveId: (id) => (id === 'entry' ? id : null),
        load: (id) =>
          id === 'entry'
            ? entry(names)
            : hook && id.endsWith('controllers/useRovingTabindex.js')
              ? { code: hook, moduleType: 'ts' }
              : null,
      },
    ],
  });
  return build.generate({
    format: minify ? 'esm' : 'iife',
    name: 'mx',
    minify,
  });
};
const min = (await bundle(['button-group/connected-button-group'], true)).output
  .map((c) => c.code ?? '')
  .join('');
console.log(
  `button-group/connected-button-group, minified by rolldown: ${min.length}, Brotli ${brotliCompressSync(min).length}`,
);
const { output } = await bundle(
  ['button-group/connected-button-group', 'button/switch-button'],
  false,
);
const code = output.map((c) => c.code ?? '').join('\n');
const browser = await engines.chromium.launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><body>');
await page.addScriptTag({ content: code });
await page.evaluate(async () => {
  const task = () => new Promise((r) => setTimeout(r, 20));
  const item = (tag = 'mx-switch-button') => {
    const e = document.createElement(tag);
    e.setAttribute('value', String(Math.random()));
    e.pad = new Uint8Array(1e4);
    return e;
  };
  const ways = {
    'ten items, nine removed; the group stays': async (refs) => {
      const h = document.createElement('mx-connected-button-group');
      document.body.append(h);
      for (let i = 0; i < 10; i += 1) {
        const e = item();
        if (i) refs.push(new WeakRef(e));
        h.append(e);
      }
      await task();
      while (h.children.length > 1) h.lastChild.remove();
      await task();
    },
    'the same, with an element that is never defined in the group': async (
      refs,
    ) => {
      const h = document.createElement('mx-connected-button-group');
      document.body.append(h);
      h.append(document.createElement('x-never'));
      for (let i = 0; i < 10; i += 1) {
        const e = item();
        if (i) refs.push(new WeakRef(e));
        h.append(e);
      }
      await task();
      while (h.children.length > 2) h.lastChild.remove();
      await task();
    },
    'one by one: 100 items added and removed, beside an element that is never defined':
      async (refs) => {
        const h = document.createElement('mx-connected-button-group');
        document.body.append(h);
        h.append(document.createElement('x-never'), item());
        for (let i = 0; i < 100; i += 1) {
          const e = item();
          refs.push(new WeakRef(e));
          h.append(e);
          await task();
          e.remove();
          await task();
        }
      },
    'a removed group with ready items': async (refs) => {
      const h = document.createElement('mx-connected-button-group');
      document.body.append(h);
      h.append(item(), item());
      await task();
      refs.push(new WeakRef(h));
      h.remove();
      await task();
    },
    'a removed group with an element that is never defined': async (refs) => {
      const h = document.createElement('mx-connected-button-group');
      document.body.append(h);
      h.append(document.createElement('x-never'));
      await task();
      refs.push(new WeakRef(h));
      h.remove();
      await task();
    },
    'a removed group whose late item is defined afterward': async (refs) => {
      const h = document.createElement('mx-connected-button-group');
      document.body.append(h);
      h.append(document.createElement('x-late'));
      await task();
      refs.push(new WeakRef(h));
      h.remove();
      await task();
      customElements.define(
        'x-late',
        class extends customElements.get('mx-switch-button') {},
      );
      await task();
    },
  };
  window.refs = {};
  for (const [n, f] of Object.entries(ways)) {
    window.refs[n] = [];
    await f(window.refs[n]);
  }
});
const cdp = await page.context().newCDPSession(page);
for (let i = 0; i < 5; i += 1) {
  await page.waitForTimeout(200);
  await cdp.send('HeapProfiler.collectGarbage');
}
const read = await page.evaluate(() =>
  Object.entries(window.refs).map(
    ([n, r]) =>
      `${n}: ${r.filter((x) => x.deref()).length} of ${r.length} alive`,
  ),
);
console.log(read.join('\n'));
await browser.close();
