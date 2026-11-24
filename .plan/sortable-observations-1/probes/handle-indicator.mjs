// A candidate for the handle's indicator, as a sheet adopted by each item after
// its own: what the focused handle draws, by kind of handle and of page rule.
//
// Run from packages/material-x, with the packages built:
//   node ../../.plan/sortable-observations-1/probes/handle-indicator.mjs
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const playwright = require('playwright');
let rolldownPath;
try {
  rolldownPath = require.resolve('rolldown');
} catch {
  rolldownPath = rootRequire.resolve('rolldown');
}
const { rolldown } = await import(rolldownPath);
const entries = [
  'list/list',
  'list/sortable-list',
  'list/list-item',
  'list/list-button-item',
  'icon/icon',
  'button/icon-button',
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
const CANDIDATE =
  '::slotted([data-handle]:focus-visible) { outline: 3px solid rgb(1, 2, 3); outline-offset: 2px }';
const HANDLES = {
  'mx-icon': '<mx-icon data-handle slot="lead">drag_handle</mx-icon>',
  span: '<span data-handle slot="trail">H</span>',
  button: '<button data-handle slot="lead">H</button>',
  'mx-icon-button':
    '<mx-icon-button data-handle slot="lead"><mx-icon>menu</mx-icon></mx-icon-button>',
};
for (const E of ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[E].launch();
  console.log(`# ${E} ${browser.version()}`);
  const page = await browser.newPage();
  for (const tag of ['mx-list-item', 'mx-list-button-item'])
    for (const [n, h] of Object.entries(HANDLES))
      for (const [rn, rule] of [
        ['no page rule', ''],
        ['* { outline: 0 }', '*{outline:0}'],
        [
          'a page rule on the handle',
          '[data-handle]:focus-visible{outline:5px dotted red}',
        ],
      ]) {
        const row = [];
        for (const sheet of ['', CANDIDATE]) {
          await page.setContent(
            `<!doctype html><style>${rule}</style><mx-sortable-list style="inline-size:300px"><${tag}>${h}A</${tag}><${tag}>${h}B</${tag}></mx-sortable-list><script>${code}</script>`,
          );
          await page.evaluate((s) => {
            for (const e of document.querySelectorAll('mx-sortable-list > *')) {
              const x = new CSSStyleSheet();
              x.replaceSync(s);
              e.shadowRoot.adoptedStyleSheets.push(x);
            }
          }, sheet);
          await page.waitForTimeout(50);
          let got = null;
          for (let i = 0; i < 4 && !got; i++) {
            await page.keyboard.press(E === 'webkit' ? 'Alt+Tab' : 'Tab');
            got = await page.evaluate(() => {
              const e = document.activeElement?.closest('[data-handle]');
              if (!e) return null;
              const s = getComputedStyle(e);
              const inner = e.shadowRoot?.activeElement;
              const t = inner && getComputedStyle(inner);
              return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineStyle === 'none' ? '' : s.outlineColor}${inner ? `, its own control ${t.outlineStyle} ${t.outlineWidth}` : ''}`;
            });
          }
          row.push(got);
        }
        console.log(
          `${tag}, ${n}, ${rn}: built [${row[0]}] candidate [${row[1]}]`,
        );
      }
  await browser.close();
}
