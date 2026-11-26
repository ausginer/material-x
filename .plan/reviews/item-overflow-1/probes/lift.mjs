// Run from packages/material-x: node ../../.plan/reviews/item-overflow-1/probes/lift.mjs <engine>
// The boxes of a sortable list's item before and during a real pointer drag.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const playwright = require('playwright');
const { rolldown } = await import(rootRequire.resolve('rolldown'));
const entries = [
  'list/sortable-list',
  'list/list-item',
  'list/list-button-item',
  'icon/icon',
  'button/button',
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
const font = (w) =>
  readFileSync(
    `../../node_modules/@fontsource/roboto/files/roboto-latin-${w}-normal.woff2`,
  ).toString('base64');
const browser = await playwright[process.argv[2]].launch();
console.log(`# ${process.argv[2]} ${browser.version()}`);
const page = await browser.newPage({ viewport: { width: 500, height: 900 } });
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.setContent(
  `<!doctype html><style>@font-face{font-family:Roboto;font-weight:400;src:url(data:font/woff2;base64,${font(400)})}@font-face{font-family:Roboto;font-weight:500;src:url(data:font/woff2;base64,${font(500)})}body{margin:0;font:14px Roboto}</style><p style="font-weight:500">a</p><div id="r" style="padding:20px"></div><script>${code}</script>`,
);
const LONG = 'A trailing text that is much longer than the item it is in';
const C = {
  'long text': `Label<span slot="trail">${LONG}</span>`,
  'video, long text': `<video slot="lead"></video>Label<span slot="trail">${LONG}</span>`,
  'video, two words': `<video slot="lead"></video>Label<mx-button slot="trail">Two words</mx-button>`,
  'long label, text': `${'Several words '.repeat(6)}<span slot="trail">Yesterday, 12:30, from the office</span>`,
};
const boxes = () =>
  page.evaluate(() => {
    const item = document.querySelector('#r').firstChild.children[1];
    const b = (e) => {
      const r = e.getBoundingClientRect();
      return `${Math.round(r.width * 10) / 10}x${Math.round(r.height * 10) / 10}`;
    };
    return `${item.matches(':popover-open') ? 'lifted' : 'at rest'}: item ${b(item.shadowRoot.querySelector('.host') ?? item)} content ${b(item.shadowRoot.querySelector('.content'))} trail ${b(item.shadowRoot.querySelector('.trail'))}`;
  });
for (const tag of ['mx-list-item', 'mx-list-button-item'])
  for (const dir of ['ltr', 'rtl'])
    for (const [name, html] of Object.entries(C)) {
      await page.evaluate(
        ([t, d, h]) => {
          document.querySelector('#r').innerHTML =
            `<mx-sortable-list dir="${d}" style="inline-size:300px"><${t}>One</${t}><${t}><mx-icon slot="lead" data-handle>H</mx-icon>${h}</${t}><${t}>Three</${t}></mx-sortable-list>`;
        },
        [tag, dir, html],
      );
      await page.waitForTimeout(150);
      const rest = await boxes();
      const h = await page.locator('[data-handle]').boundingBox();
      await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
      await page.mouse.down();
      await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2 + 12, {
        steps: 4,
      });
      await page.waitForTimeout(250);
      const lift = await boxes();
      await page.mouse.up();
      await page.waitForTimeout(400);
      console.log(`${tag} ${dir} ${name}\n   ${rest}\n   ${lift}`);
    }
await browser.close();
