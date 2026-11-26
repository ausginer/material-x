// The boxes of each sortable-list handle and of mx-icon in other components, in Chromium:
// RF-145's probe from material-x/touch-handle-1, with the list's, the text field's and the
// extended FAB's icons added for RF-147.
// rects, and a screenshot of each case at rest and with the handle focused.
// Run from packages/material-x, with the packages built:
//   node ../../.plan/icon-middle-1/probes/boxes.mjs <out-dir>
// Compare two runs with compare.mjs.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const { rolldown } = await import(rootRequire.resolve('rolldown'));
const { chromium } = require('playwright');
const out = process.argv[2];
await mkdir(out, { recursive: true });
const entries = [
  'list/list-item',
  'list/list-button-item',
  'list/sortable-list',
  'list/list',
  'text-field/text-field',
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
CASES['fab-extended'] =
  '<mx-fab id=target extended="open"><mx-icon slot="icon">check</mx-icon>Label</mx-fab>';
for (const item of ['mx-list-item', 'mx-list-button-item'])
  CASES[`${item}-icons`] =
    `<mx-list style="display:block;inline-size:300px"><${item} id=target><mx-icon slot="lead">check</mx-icon>A<mx-icon slot="trail">check</mx-icon></${item}></mx-list>`;
for (const item of ['mx-list-item', 'mx-list-button-item'])
  for (const slot of ['lead', 'trail'])
    CASES[`${item}-${slot}-page-span-mx-icon`] =
      `<mx-list style="display:block;inline-size:300px"><${item} id=target><span data-line slot="${slot}"><mx-icon>check</mx-icon></span>A</${item}></mx-list>`;
CASES['text-field-icons'] =
  '<mx-text-field id=target><span slot="label">A</span><mx-icon slot="lead">check</mx-icon><mx-icon slot="trail">check</mx-icon></mx-text-field>';
const browser = await chromium.launch();
const rects = { chromium: browser.version() };
const page = await browser.newPage({ viewport: { width: 400, height: 200 } });
for (const [name, html] of Object.entries(CASES)) {
  await page.setContent(
    `<!doctype html><style>@font-face{font-family:'Material Symbols Outlined';src:url(data:font/ttf;base64,${FONT})}body{margin:20px;font-family:sans-serif}*{animation:none!important;transition:none!important}</style>${html}<script>${code}</script>`,
  );
  await page.evaluate(() =>
    document.fonts.load('24px "Material Symbols Outlined"'),
  );
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  const read = () =>
    page.evaluate(() => {
      const r = (e) => {
        const b = (
          e.shadowRoot?.querySelector('.host') ?? e
        ).getBoundingClientRect();
        return [b.x, b.y, b.width, b.height].map(
          (v) => Math.round(v * 100) / 100,
        );
      };
      const t = document.querySelector('#target');
      const h = document.querySelector('[data-handle]');
      const icons = [...document.querySelectorAll('mx-icon')].map(r);
      return {
        target: r(t),
        handle: h && r(h),
        handleDisplay: h && getComputedStyle(h).display,
        icons,
      };
    });
  const clip = async () => {
    const [x, y, w, h] = (await read()).target;
    return {
      x: Math.max(0, x - 8),
      y: Math.max(0, y - 8),
      width: w + 16,
      height: h + 16,
    };
  };
  rects[name] = await read();
  await page.screenshot({ path: `${out}/${name}.png`, clip: await clip() });
  if (await page.$('[data-handle]')) {
    await page.evaluate(() =>
      document.querySelector('[data-handle]').focus({ focusVisible: true }),
    );
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );
    await page.screenshot({
      path: `${out}/${name}-focus.png`,
      clip: await clip(),
    });
  }
}
await writeFile(`${out}/rects.json`, JSON.stringify(rects, null, 1));
await browser.close();
