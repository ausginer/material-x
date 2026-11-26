// node layout.mjs <packages> <chromium|firefox|webkit>
// Where an mx-icon's content is, for hosts with the package's display, a page's
// own, and the list's avatar, by the icon's template: `slot` (main), `span`
// (the slot in a span) and `contents` (the span has `display: contents`).
// Prints the host's box, the content's box relative to it, and the pixels' hash.
// Build the packages first.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const [PACKAGES, engine] = process.argv.slice(2);
const require = createRequire(join(PACKAGES, 'material-x/package.json'));
const playwright = require('playwright');
const { rolldown } = await import(pathToFileURL(require.resolve('rolldown')));
const TEMPLATES = {
  slot: '<slot></slot>',
  span: '<span aria-hidden="true"><slot></slot></span>',
  contents:
    '<span aria-hidden="true" style="display: contents"><slot></slot></span>',
};
Object.assign(TEMPLATES, {
  slotinline: '<slot style="display: inline"></slot>',
  slotblock: '<slot style="display: block"></slot>',
  spanblock:
    '<span aria-hidden="true" style="display: block"><slot></slot></span>',
  spaninlineblock:
    '<span aria-hidden="true" style="display: inline-block"><slot></slot></span>',
  spangrid:
    '<span aria-hidden="true" style="display: grid"><slot></slot></span>',
  spanflex:
    '<span aria-hidden="true" style="display: flex"><slot></slot></span>',
  spaninlineflex:
    '<span aria-hidden="true" style="display: inline-flex"><slot></slot></span>',
});
const svg = (attrs) =>
  `<svg viewBox="0 0 24 24" ${attrs}><circle cx="12" cy="12" r="12"/></svg>`;
const CONTENT = {
  ligature: 'edit',
  svg18: svg('width="18" height="18"'),
  svg18block: svg('width="18" height="18" style="display:block"'),
  svg100: svg('width="100%" height="100%"'),
  svgfill: svg('style="inline-size:100%;block-size:100%;display:block"'),
};
const HOSTS = {
  own: '',
  block: 'display:block',
  flex: 'display:flex',
  inlineflex: 'display:inline-flex',
  flexcenter: 'display:inline-flex;align-items:center;justify-content:center',
  sized:
    'display:flex;align-items:center;justify-content:center;inline-size:40px;block-size:40px',
  grid: 'display:grid',
  gridcenter:
    'display:inline-grid;place-items:center;inline-size:40px;block-size:40px',
  inline: 'display:inline',
  contents: 'display:contents',
};
const CASES = [];
for (const [c, content] of Object.entries(CONTENT)) {
  for (const [h, style] of Object.entries(HOSTS))
    CASES.push([
      `${h} ${c}`,
      `<mx-icon class=i style="${style}">${content}</mx-icon>`,
    ]);
  CASES.push([
    `avatar ${c}`,
    `<mx-list-button-item><mx-icon class=i slot=lead data-avatar>${content}</mx-icon>Text</mx-list-button-item>`,
  ]);
  CASES.push([
    `icon-button ${c}`,
    `<mx-icon-button aria-label=x><mx-icon class=i>${content}</mx-icon></mx-icon-button>`,
  ]);
  CASES.push([
    `button ${c}`,
    `<mx-button><mx-icon class=i slot=icon>${content}</mx-icon>Save</mx-button>`,
  ]);
  CASES.push([
    `fab ${c}`,
    `<mx-fab aria-label=x><mx-icon class=i slot=icon>${content}</mx-icon></mx-fab>`,
  ]);
}
const font = (
  await readFile(
    join(
      PACKAGES,
      'material-x/tests/support/fonts/material-symbols-subset.ttf',
    ),
  )
).toString('base64');
const dir = await mkdtemp(join(tmpdir(), 'icon-layout-'));
const entry = join(dir, 'entry.js');
await writeFile(
  entry,
  [
    'icon/icon',
    'button/button',
    'button/icon-button',
    'fab/fab',
    'list/list-button-item',
  ]
    .map(
      (f) =>
        `import ${JSON.stringify(join(PACKAGES, 'material-x', `${f}.js`))};`,
    )
    .join('\n'),
);
const browser = await playwright[engine].launch();
console.log(`# ${engine} ${browser.version()}`);
const results = {};
for (const [name, tpl] of Object.entries(TEMPLATES)) {
  let patched = 0;
  const build = await rolldown({
    input: entry,
    platform: 'browser',
    plugins: [
      {
        name: 't',
        transform(code, id) {
          if (!id.endsWith('/icon/icon.tpl.html.js')) return null;
          const next = code.replace(
            /innerHTML = .*;/,
            () => `innerHTML = ${JSON.stringify(tpl)};`,
          );
          patched += 1;
          return next;
        },
      },
    ],
  });
  const { output } = await build.generate({ format: 'iife' });
  const file = join(dir, `${name}.html`);
  await writeFile(
    file,
    `<!doctype html><html lang=en><meta charset=utf-8><style>@font-face{font-family:'Material Symbols Outlined';src:url(data:font/ttf;base64,${font})}body{margin:8px;font:16px sans-serif}.c{block-size:72px;inline-size:320px;font-size:24px;overflow:hidden}</style><body>${CASES.map(([, html]) => `<div class=c>${html}</div>`).join('')}<script>${output[0].code}</script></body></html>`,
  );
  const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
  await page.goto(pathToFileURL(file).href);
  const t = await page.evaluate(async () => {
    await document.fonts.load('24px "Material Symbols Outlined"', 'edit');
    await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 300));
    return document.querySelector('mx-icon').shadowRoot.innerHTML;
  });
  const bare = (x) => x.replaceAll(/ aria-hidden="true"/g, '').trim();
  if (bare(t) !== bare(tpl)) throw new Error(`${name}: ${t}`);
  const boxes = await page.evaluate(() =>
    [...document.querySelectorAll('.i')].map((i) => {
      const r = document.createRange();
      r.selectNodeContents(i);
      const o = i.closest('.c').getBoundingClientRect();
      const el = i.firstElementChild;
      const b = (el ?? r).getBoundingClientRect();
      const h = i.getBoundingClientRect();
      const f = (q) =>
        [q.x - o.x, q.y - o.y, q.width, q.height]
          .map((v) => +v.toFixed(2))
          .join(',');
      return `host ${h.width ? f(h) : '-'} content ${f(b)}`;
    }),
  );
  const cells = page.locator('.c');
  results[name] = [];
  for (let n = 0; n < CASES.length; n += 1)
    results[name].push([
      boxes[n],
      createHash('sha1')
        .update(await cells.nth(n).screenshot())
        .digest('hex')
        .slice(0, 8),
    ]);
  await page.close();
}
const count = Object.fromEntries(
  Object.keys(TEMPLATES)
    .slice(1)
    .map((k) => [k, 0]),
);
for (const [n, [label]] of CASES.entries())
  for (const v of Object.keys(count)) {
    const [a, b] = [results.slot[n], results[v][n]];
    if (a[0] !== b[0] || a[1] !== b[1]) {
      count[v] += 1;
      console.log(
        `${v} differs | ${label} | ${a[0] === b[0] ? 'boxes the same' : `${a[0]} -> ${b[0]}`} | pixels ${a[1] === b[1] ? 'the same' : 'differ'}`,
      );
    }
  }
console.log(
  `${CASES.length} cases; differ from main: ${JSON.stringify(count)}`,
);
await browser.close();
await rm(dir, { recursive: true });
