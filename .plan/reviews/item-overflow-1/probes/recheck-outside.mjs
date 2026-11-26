// RF-139 recheck, from packages/material-x: node ../../.plan/reviews/item-overflow-1/probes/recheck-outside.mjs <engine>
// mx-button outside a list, in a container narrower than its
// label, with a page's own overflow-wrap. `base` adopts `overflow-wrap: inherit`
// on the button's .host, which is the merge base's behavior.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const playwright = require('playwright');
const { rolldown } = await import(rootRequire.resolve('rolldown'));
const build = await rolldown({
  input: 'entry',
  platform: 'browser',
  plugins: [
    {
      name: 'e',
      resolveId: (id) => (id === 'entry' ? id : null),
      load: (id) =>
        id === 'entry'
          ? `import ${JSON.stringify(`${process.cwd()}/button/button.js`)};`
          : null,
    },
  ],
});
const { output } = await build.generate({ format: 'iife', name: 'mx' });
const code = output.map((c) => c.code ?? '').join('\n');
const font = (w) =>
  readFileSync(
    `../../node_modules/@fontsource/roboto/files/roboto-latin-${w}-normal.woff2`,
  ).toString('base64');
const [, , engine] = process.argv;
const browser = await playwright[engine].launch();
console.log(`# ${engine} ${browser.version()}`);
const page = await browser.newPage();
await page.setContent(`<!doctype html><style>
@font-face { font-family: Roboto; font-weight: 400; src: url(data:font/woff2;base64,${font(400)}) }
@font-face { font-family: Roboto; font-weight: 500; src: url(data:font/woff2;base64,${font(500)}) }
body { margin: 0; font: 14px Roboto }</style><div id="r"></div><script>${code}</script>`);
await page.evaluate(() =>
  Promise.all([
    document.fonts.load('500 14px Roboto'),
    document.fonts.load('400 14px Roboto'),
  ]),
);
for (const [name, frame, extra] of [
  [
    '60px, anywhere on the container',
    'inline-size:60px; overflow-wrap:anywhere',
    '',
  ],
  [
    '60px, break-word on the container',
    'inline-size:60px; overflow-wrap:break-word',
    '',
  ],
  [
    '60px, anywhere on mx-button',
    'inline-size:60px',
    'mx-button{overflow-wrap:anywhere}',
  ],
  [
    '60px, anywhere through ::part(impl)',
    'inline-size:60px',
    'mx-button::part(impl){overflow-wrap:anywhere}',
  ],
  [
    '60px, word-break: break-all on the container',
    'inline-size:60px; word-break:break-all',
    '',
  ],
  ['60px, no page rule', 'inline-size:60px', ''],
])
  for (const mode of ['base', 'head']) {
    const r = await page.evaluate(
      async ({ frame, extra, mode }) => {
        const root = document.querySelector('#r');
        root.innerHTML = `<style>${extra}</style><div id="f" style="${frame}"><mx-button>Download</mx-button></div>`;
        const b = root.querySelector('mx-button');
        if (mode === 'base') {
          const s = new CSSStyleSheet();
          s.replaceSync('.host { overflow-wrap: inherit }');
          b.shadowRoot.adoptedStyleSheets.push(s);
        }
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        );
        const f = root.querySelector('#f').getBoundingClientRect();
        const h = b.shadowRoot.querySelector('.host').getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(b);
        const lines = new Set(
          [...range.getClientRects()]
            .filter((x) => x.width)
            .map((x) => Math.round(x.top)),
        ).size;
        const t = range.getBoundingClientRect();
        return `button ${h.width.toFixed(1)}x${h.height.toFixed(1)}, label ${lines} lines ${t.height.toFixed(0)}px high, past the container ${Math.max(0, h.right - f.right).toFixed(1)}px`;
      },
      { frame, extra, mode },
    );
    console.log(`${name} | ${mode}: ${r}`);
  }
await browser.close();
