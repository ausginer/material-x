// How a list item lays out long text in its `trail` slot, and more than one child there, as built and with candidate rules.
// For each: the inline sizes of the item, `.content` and `.trail`, the item's height, how far the trail's content runs past
// the item's inline end, and whether the label is cut to nothing.
//
//   built    - as it is, with the slot's clip
//   noclip   - without the slot's clip and ellipsis, as RF-135's repair leaves it
//   shrink   - noclip, and `.trail` is `flex: 0 1 auto`, the text stays `nowrap`
//   wrap     - noclip, and `.trail` is `flex: 0 1 auto`, the text wraps, and a long word breaks
//   ellipsis - noclip, and `.trail` is `flex: 0 1 auto`, the slotted element is a block with its own clip and ellipsis
//   bound    - noclip; `.content` is `flex: 1 1 0` with no minimum; `.trail` is `flex: 0 1 auto` between `min-content` and
//              half of the item; the text wraps, and a long word breaks
//
// Run from packages/material-x, with the packages built:
//   node ../../.plan/records-batch-1/probes/trail-long.mjs
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const playwright = require('playwright');
const { rolldown } = await import(rootRequire.resolve('rolldown'));
const entries = [
  'list/list',
  'list/list-item',
  'list/list-button-item',
  'icon/icon',
  'button/button',
  'button/icon-button',
  'checkbox/checkbox',
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
const LONG = 'A trailing text that is much longer than the item it is in';
const T = (text) => `<span slot="trail">${text}</span>`;
const CASES = {
  'short label, short text': `Label${T('12:30')}`,
  'short label, long text': `Label${T(LONG)}`,
  'short label, medium text': `Label${T('Yesterday, 12:30, from the office')}`,
  'long label, short text': `${'A label of several words '.repeat(3)}${T('12:30')}`,
  'long label, long text': `${'A label of several words '.repeat(3)}${T(LONG)}`,
  'short label, one long word': `Label${T('x'.repeat(60))}`,
  'one long word as the label, short text': `${'x'.repeat(60)}${T('12:30')}`,
  'two texts': `Label${T('12:30')}${T('new')}`,
  'two icons':
    'Label<mx-icon slot="trail">H</mx-icon><mx-icon slot="trail">M</mx-icon>',
  'two icon buttons':
    'Label<mx-icon-button slot="trail"><mx-icon>H</mx-icon></mx-icon-button><mx-icon-button slot="trail"><mx-icon>M</mx-icon></mx-icon-button>',
  'a text and an icon': `Label${T('12:30')}<mx-icon slot="trail">M</mx-icon>`,
  'a checkbox': 'Label<mx-checkbox slot="trail"></mx-checkbox>',
  'a button with a label of two words':
    'Label<mx-button slot="trail">Two words</mx-button>',
};
const NOCLIP = '.trail { overflow: visible; text-overflow: clip }';
const TEXT = '.trail::slotted(:not(mx-icon):not([data-icon]))';
const MODES = {
  built: '',
  noclip: NOCLIP,
  shrink: `${NOCLIP} .trail { flex: 0 1 auto }`,
  wrap: `${NOCLIP} .trail { flex: 0 1 auto } ${TEXT} { white-space: normal; overflow-wrap: anywhere }`,
  ellipsis: `${NOCLIP} .trail { flex: 0 1 auto } ${TEXT} { display: block; overflow: hidden; text-overflow: ellipsis }`,
  bound: `${NOCLIP} .content { flex: 1 1 0; min-inline-size: 0 } .trail { flex: 0 1 auto; min-inline-size: min-content; max-inline-size: 50% } ${TEXT} { white-space: normal; overflow-wrap: anywhere }`,
};
for (const engine of ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[engine].launch();
  console.log(`\n# ${engine} ${browser.version()}`);
  const page = await browser.newPage({ viewport: { width: 400, height: 500 } });
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.setContent(
    `<!doctype html><style>body { margin: 0; font: 14px sans-serif }</style><div id="r" style="padding: 20px"></div><script>${code}</script>`,
  );
  for (const tag of ['mx-list-item', 'mx-list-button-item'])
    for (const [name, html] of Object.entries(CASES)) {
      const read = await page.evaluate(
        async ([t, h, modes]) => {
          const out = [];
          for (const [mode, css] of Object.entries(modes)) {
            const root = document.querySelector('#r');
            root.innerHTML = `<mx-list style="inline-size: 300px"><${t}>${h}</${t}></mx-list>`;
            const item = root.querySelector('mx-list > *');
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(css);
            item.shadowRoot.adoptedStyleSheets.push(sheet);
            await new Promise((r) =>
              requestAnimationFrame(() => requestAnimationFrame(r)),
            );
            const q = (s) =>
              item.shadowRoot.querySelector(s).getBoundingClientRect();
            const i = item.getBoundingClientRect();
            const ends = [...item.querySelectorAll('[slot=trail]')].map((e) => {
              const r = document.createRange();
              r.selectNodeContents(e);
              return Math.max(
                e.getBoundingClientRect().right,
                e.localName === 'span' &&
                  getComputedStyle(e).overflowX === 'visible'
                  ? r.getBoundingClientRect().right
                  : 0,
              );
            });
            out.push(
              `${mode}: content ${Math.round(q('.content').width)}, trail ${Math.round(q('.trail').width)}x${Math.round(q('.trail').height)}, item height ${Math.round(i.height)}, past the end ${Math.max(0, Math.round(Math.max(...ends) - i.right))}, page scroll ${document.documentElement.scrollWidth - innerWidth}`,
            );
          }
          return out;
        },
        [tag, html, MODES],
      );
      console.log(`${tag}, ${name}\n  ${read.join('\n  ')}`);
    }
  await browser.close();
}
