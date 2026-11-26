// For RF-139's 15%: `q4.mjs` in Roboto, with 10, 13 and 14% beside the ruled 15%.
// The reading is `chromium yield10,yield13,yield14,yield15` at 300px.
// RF-139: the boxes of a list item with long texts, in each slot, kind of item, direction and text size.
// `past` is how far a visible text or child passes either side of the item; `scroll` is the page's own scroll.
// Run from packages/material-x, with the packages built:
//   node ../../.plan/item-overflow-1/probes/q4-roboto.mjs <engine> [modes, comma separated] [list width, px]
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const playwright = require('playwright');
const { rolldown } = await import(rootRequire.resolve('rolldown'));
const entries = [
  'list/list',
  'list/sortable-list',
  'list/list-item',
  'list/list-button-item',
  'list/list-link-item',
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

const WORD = 'x'.repeat(60);
const LONG = 'A trailing text that is much longer than the item it is in';
const T = (text) => `<span slot="trail">${text}</span>`;
const L = (text) => `<span slot="lead">${text}</span>`;
const VIDEO = '<video slot="lead"></video>';
const IMAGE = '<span slot="lead" data-image></span>';
const BUTTON = '<mx-button slot="trail">Two words</mx-button>';
const LARGE =
  '<span slot="overline">Over</span><span slot="support">Support</span>';
const PHOTO = '<img slot="lead" style="inline-size: 180px; block-size: 56px">';
const FIXED =
  '<span slot="trail" style="display: block; inline-size: 120px; block-size: 24px; background: red"></span>';
const CASES = {
  'photo 180, label': `${PHOTO}Label`,
  'photo 180, short trail': `${PHOTO}Label${T('12:30')}`,
  'video, long trail': `${VIDEO}Label${T(LONG)}`,
  'video, button': `${VIDEO}Label${BUTTON}`,
  'video, half-wide button': `${VIDEO}Label<mx-button slot="trail">A button, 130</mx-button>`,
  'video, fixed 120': `${VIDEO}Label${FIXED}`,
  'large video, long trail': `${VIDEO}${LARGE}Label${T(LONG)}`,
  'large video, button': `${VIDEO}${LARGE}Label${BUTTON}`,
  'large video, fixed 120': `${VIDEO}${LARGE}Label${FIXED}`,
  'video, word': `${VIDEO}Label${T(WORD)}`,
  'video, email': `${VIDEO}Label${T('someone.longname@example.com')}`,
  'video, short trail': `${VIDEO}Label${T('12:30')}`,
  'video, word in label': `${VIDEO}${WORD}${T(LONG)}`,
  'video, several words': `${VIDEO}A label of several words${T(LONG)}`,
  'image, long trail': `${IMAGE}Label${T(LONG)}`,
  'short, long': `Label${T(LONG)}`,
  'a button': `Label${BUTTON}`,
  'a checkbox': 'Label<mx-checkbox slot="trail"></mx-checkbox>',
  'handle and avatar in lead':
    '<span slot="lead">=</span><span slot="lead" data-avatar>A</span>Label',
};
const TEXT = '.trail::slotted(:not(mx-icon):not([data-icon]))';
const MODES = {
  built: '',
  bound: `.content { flex: 1 1 0; min-inline-size: 0 } .trail { flex: 0 1 auto; min-inline-size: min-content; max-inline-size: 50% } ${TEXT} { white-space: normal; overflow-wrap: anywhere }`,
};
const LEAD = `.lead { max-inline-size: max(50%, 114px) } .lead::slotted(*) { overflow-wrap: break-word }`;
MODES.lead = `${MODES.bound} ${LEAD}`;
MODES.min15 = `${MODES.lead} .content { min-inline-size: 15% }`;
MODES.nolead15 = `${MODES.bound} .content { min-inline-size: 15% }`;
MODES.yield15 = `${MODES.bound} .content { flex: 1 1 15% } .trail { flex: 0 1000 auto }`;
MODES.words15 = `${MODES.yield15.replace('min-inline-size: min-content', 'min-inline-size: auto').replace('anywhere', 'break-word')}`;
import { readFileSync as rf } from 'node:fs';
const FACES = [400, 500]
  .map(
    (w) =>
      `@font-face { font-family: Roboto; font-weight: ${w}; src: url(data:font/woff2;base64,${rf(require.resolve('@fontsource/roboto/files/roboto-latin-' + w + '-normal.woff2')).toString('base64')}) }`,
  )
  .join(' ');
for (const n of [10, 13, 14])
  MODES['yield' + n] = MODES.yield15.replace('1 1 15%', '1 1 ' + n + '%');
const modes = (process.argv[3] ?? 'built,bound').split(',');
const browser = await playwright[process.argv[2]].launch();
console.log(`# ${process.argv[2]} ${browser.version()}`);
const page = await browser.newPage({ viewport: { width: 700, height: 500 } });
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.setContent(
  `<!doctype html><style>${FACES} body { margin: 0; font: 14px Roboto }</style><div id="r" style="padding: 20px"></div><script>${code}</script>`,
);
await page.evaluate(() =>
  Promise.all(
    ['400 16px Roboto', '500 14px Roboto'].map((f) => document.fonts.load(f)),
  ),
);
const WIDTH = Number(process.argv[4] ?? 300);
const SETTINGS = [
  ['mx-list', 'mx-list-item', 'ltr', 100],
  ['mx-list', 'mx-list-button-item', 'ltr', 100],
];
for (const mode of modes)
  for (const [list, tag, dir, size] of SETTINGS) {
    console.log(`\n## ${mode}: ${list} > ${tag}, ${dir}, ${size}% text`);
    for (const [name, html] of Object.entries(CASES))
      console.log(
        `${name}: ${await page.evaluate(
          async ([l, t, d, s, h, css, w]) => {
            const root = document.querySelector('#r');
            root.innerHTML = `<${l} dir="${d}" style="inline-size: ${w}px"><${t}>${h}</${t}></${l}>`;
            const item = root.firstChild.firstChild;
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(
              `${css} ${s === 200 ? '.label { font-size: 32px; line-height: 48px } .support { font-size: 28px; line-height: 40px } .overline { font-size: 22px; line-height: 32px } .trail::slotted(*) { font-size: 22px; line-height: 32px }' : ''}`,
            );
            item.shadowRoot.adoptedStyleSheets.push(sheet);
            await new Promise((r) =>
              requestAnimationFrame(() => requestAnimationFrame(r)),
            );
            const box = (q) => {
              const r = item.shadowRoot
                .querySelector(q)
                .getBoundingClientRect();
              return `${Math.round(r.width)}x${Math.round(r.height)}`;
            };
            const i =
              item.shadowRoot.querySelector('.host')?.getBoundingClientRect() ??
              item.getBoundingClientRect();
            let past = 0;
            const add = (r) => {
              if (r.width)
                past = Math.max(past, r.right - i.right, i.left - r.left);
            };
            for (const e of item.children) {
              if (e.slot === 'lead' || e.slot === 'trail')
                add(
                  (
                    e.shadowRoot?.querySelector('.host') ?? e
                  ).getBoundingClientRect(),
                );
              if (e.slot === 'lead' || e.slot === 'trail') {
                if (e.shadowRoot) continue;
                const r = document.createRange();
                r.selectNodeContents(e);
                add(r.getBoundingClientRect());
              }
            }
            add(
              item.shadowRoot.querySelector('.label').getBoundingClientRect(),
            );
            const label = document.createRange();
            for (const n of item.childNodes)
              if (n.nodeType === 3) label.selectNode(n);
            const leadEnd = Math.max(
              0,
              ...[...item.children]
                .filter((e) => e.slot === 'lead')
                .map((e) => e.getBoundingClientRect().right),
            );
            const over = Math.round(
              Math.max(
                0,
                leadEnd -
                  item.shadowRoot
                    .querySelector('.content')
                    .getBoundingClientRect().left,
              ),
            );
            const chip = [...item.children]
              .filter((e) => e.slot === 'trail')
              .map((e) => {
                const r = (
                  e.shadowRoot?.querySelector('.host') ?? e
                ).getBoundingClientRect();
                return `${Math.round(r.width)}x${Math.round(r.height)}`;
              })
              .join(' ');
            return `overlap ${over}, child ${chip || '-'}, lead ${box('.lead')}, content ${box('.content')}, label text ${Math.round(label.getBoundingClientRect().width)}, trail ${box('.trail')}, item ${Math.round(i.height)}, past ${Math.round(past)}, scroll ${document.documentElement.scrollWidth - innerWidth}`;
          },
          [list, tag, dir, size, html, MODES[mode], WIDTH],
        )}`,
      );
  }
await browser.close();
