// The focused boxes of a sortable item's handle, for the remedy of RF-145's two boxes, in Chromium.
// Run from packages/material-x, with the packages built: node ../../.plan/touch-handle-1/probes/remedy-boxes.mjs <out-dir> '<extra CSS>' [main]
// The extra CSS and the branch's two rules are adopted into the item's and each mx-icon's shadow root, so a build of main serves.
// Without 'main', the branch's handle and mx-icon slot rules are added. Compare two runs with compare.mjs.
// The boxes of each sortable-list handle and of mx-icon in other components, in Chromium:
// rects, and a screenshot of each case at rest and with the handle focused.
// Run from packages/material-x, with the packages built:
//   node ../../.plan/touch-handle-1/probes/boxes.mjs <out-dir>
// Compare two runs with compare.mjs.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const { rolldown } = await import(rootRequire.resolve('rolldown'));
const { chromium } = require('playwright');
const out = process.argv[2];
const extra = process.argv[3] ?? '';
const base =
  process.argv[4] === 'main'
    ? ''
    : ':is(.lead, .trail)::slotted([data-handle]:not([hidden]:not([hidden="until-found" i]))) { display: inline-block; }';
const iconCss = process.argv[4] === 'main' ? '' : 'slot { display: inline; }';
await mkdir(out, { recursive: true });
const entries = [
  'list/list-item',
  'list/list-button-item',
  'list/sortable-list',
  'icon/icon',
  'button/icon-button',
  'button/button',
  'fab/fab',
];
const build = await rolldown({
  input: 'entry',
  platform: 'browser',
  plugins: [
    {
      name: 'e',
      resolveId: (id) => (id === 'entry' ? id : null),
      load: (id) =>
        id === 'entry'
          ? entries
              .map(
                (e) => `import ${JSON.stringify(`${process.cwd()}/${e}.js`)};`,
              )
              .join('')
          : null,
    },
  ],
});
const { output } = await build.generate({ format: 'iife', name: 'mx' });
const code = output
  .map((c) => c.code ?? '')
  .join('\n')
  .replaceAll('</script', '<\\/script');
const FONT = (
  await readFile('tests/support/fonts/material-symbols-subset.ttf')
).toString('base64');
const HANDLES = {
  'span-text': (slot) => `<span data-handle slot="${slot}">≡</span>`,
  'mx-icon': (slot) => `<mx-icon data-handle slot="${slot}">check</mx-icon>`,
  'span-mx-icon': (slot) =>
    `<span data-handle slot="${slot}"><mx-icon>check</mx-icon></span>`,
  'mx-icon-button': (slot) =>
    `<mx-icon-button data-handle slot="${slot}"><mx-icon>check</mx-icon></mx-icon-button>`,
  'button-text': (slot) => `<button data-handle slot="${slot}">≡</button>`,
  'button-mx-icon': (slot) =>
    `<button data-handle slot="${slot}"><mx-icon>check</mx-icon></button>`,
};
const CASES = {};
for (const item of ['mx-list-item', 'mx-list-button-item'])
  for (const slot of ['lead', 'trail'])
    for (const [name, html] of Object.entries(HANDLES))
      CASES[`${item}-${slot}-${name}`] =
        `<mx-sortable-list style="display:block;inline-size:300px"><${item} id=target>${html(slot)}A</${item}></mx-sortable-list>`;
CASES['icon-alone'] =
  '<span id=target style="display:inline-block;font-size:24px">a<mx-icon>check</mx-icon>b</span>';
CASES['button-icon'] =
  '<mx-button id=target><mx-icon slot="icon">check</mx-icon>Label</mx-button>';
CASES['icon-button'] =
  '<mx-icon-button id=target><mx-icon>check</mx-icon></mx-icon-button>';
CASES['fab'] = '<mx-fab id=target><mx-icon>check</mx-icon></mx-fab>';
const browser = await chromium.launch();
const rects = { chromium: browser.version() };
const page = await browser.newPage({
  viewport: { width: 400, height: 200 },
  deviceScaleFactor: 4,
});
const WANT = [
  'lead-span-text',
  'lead-span-mx-icon',
  'trail-span-text',
  'trail-span-mx-icon',
  'lead-mx-icon',
  'trail-mx-icon',
  'lead-button-mx-icon',
  'trail-mx-icon-button',
  'lead-mx-icon-button',
  'trail-button-text',
];
const results = {};
for (const [name, html] of Object.entries(CASES)) {
  if (!name.startsWith('mx-list-item-') || !WANT.some((w) => name.endsWith(w)))
    continue;
  await page.setContent(
    `<!doctype html><style>@font-face{font-family:'Material Symbols Outlined';src:url(data:font/ttf;base64,${FONT})}body{margin:20px;font-family:sans-serif}*{animation:none!important;transition:none!important}</style>${html}<script>${code}</script>`,
  );
  await page.evaluate(() =>
    document.fonts.load('24px "Material Symbols Outlined"'),
  );
  await page.evaluate(
    ({ extra, iconCss }) => {
      const t = document.querySelector('#target');
      const s = new CSSStyleSheet();
      s.replaceSync(extra);
      t.shadowRoot.adoptedStyleSheets = [...t.shadowRoot.adoptedStyleSheets, s];
      for (const i of document.querySelectorAll('mx-icon')) {
        const s2 = new CSSStyleSheet();
        s2.replaceSync(iconCss);
        i.shadowRoot.adoptedStyleSheets = [
          ...i.shadowRoot.adoptedStyleSheets,
          s2,
        ];
      }
    },
    { extra: base + '\n' + extra, iconCss },
  );
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  const box = (e) => {
    const b = e.getBoundingClientRect();
    return [b.x, b.y, b.width, b.height].map((v) => Math.round(v * 100) / 100);
  };
  const read = await page.evaluate(() => {
    const b = (e) => {
      const r = e.getBoundingClientRect();
      return [r.x, r.y, r.width, r.height].map(
        (v) => Math.round(v * 100) / 100,
      );
    };
    const t = document.querySelector('#target');
    const h = document.querySelector('[data-handle]');
    const inner = h.matches('mx-icon') ? null : h.querySelector('mx-icon');
    const row = b(t);
    const hb = b(h);
    const res = {
      display: getComputedStyle(h).display,
      lh: getComputedStyle(h).lineHeight,
      handle: hb,
      rowMid: row[1] + row[3] / 2,
      handleMid: hb[1] + hb[3] / 2,
    };
    if (inner) {
      const ib = b(inner);
      res.icon = ib;
      res.gapTop = Math.round((ib[1] - hb[1]) * 100) / 100;
      res.gapBottom = Math.round((hb[1] + hb[3] - ib[1] - ib[3]) * 100) / 100;
    }
    return res;
  });
  results[name] = read;
  const [x, y, w, hgt] = read.handle;
  h: {
    await page.evaluate(() =>
      document.querySelector('[data-handle]').focus({ focusVisible: true }),
    );
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );
    const tb = await page.evaluate(() => {
      const r = document.querySelector('#target').getBoundingClientRect();
      return [r.x, r.y, r.width, r.height];
    });
    await page.screenshot({
      path: `${out}/${name}-focus.png`,
      clip: { x: x - 24, y: tb[1] - 4, width: w + 48, height: tb[3] + 8 },
      scale: 'device',
    });
  }
}
await writeFile(`${out}/rects.json`, JSON.stringify(results, null, 1));
await browser.close();
