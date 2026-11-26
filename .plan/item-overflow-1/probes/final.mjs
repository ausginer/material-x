// The contents of `overflow.mjs` and of `q4.mjs`, in every kind of item, direction and text size, on the built item.
// RF-139: the boxes of a list item with long texts, in each slot, kind of item, direction and text size.
// `past` is how far a visible text or child passes either side of the item; `scroll` is the page's own scroll.
// Run from packages/material-x, with the packages built:
//   node ../../.plan/item-overflow-1/probes/final.mjs <engine> [modes, comma separated]
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
  'short, short': `Label${T('12:30')}`,
  'short, long': `Label${T(LONG)}`,
  'long, short': `${'A label of several words '.repeat(3)}${T('12:30')}`,
  'long, long': `${'A label of several words '.repeat(3)}${T(LONG)}`,
  'word in label': `${WORD}${T('12:30')}`,
  'word in trail': `Label${T(WORD)}`,
  'word in overline': `Label<span slot="overline">${WORD}</span>${T('12:30')}`,
  'word in support': `Label<span slot="support">${WORD}</span>${T('12:30')}`,
  'word in lead': `${L(WORD)}Label${T('12:30')}`,
  'word in lead, long trail': `${L(WORD)}Label${T(LONG)}`,
  'word in every slot': `${L(WORD)}${WORD}<span slot="overline">${WORD}</span><span slot="support">${WORD}</span>${T(WORD)}`,
  'short lead text': `${L('Two words')}Label${T('12:30')}`,
  'two lead icons': `<mx-icon slot="lead">H</mx-icon><mx-icon slot="lead">M</mx-icon>Label${T('12:30')}`,
  'image, short trail': `${IMAGE}Label${T('12:30')}`,
  'image, long trail': `${IMAGE}Label${T(LONG)}`,
  'video, short trail': `${VIDEO}Label${T('12:30')}`,
  'video, long trail': `${VIDEO}Label${T(LONG)}`,
  'video, button': `${VIDEO}Label${BUTTON}`,
  'video, half-wide button': `${VIDEO}Label<mx-button slot="trail">A button, 130</mx-button>`,
  'two lead icons, long trail': `<mx-icon slot="lead">H</mx-icon><mx-icon slot="lead">M</mx-icon>Label${T(LONG)}`,
  'two texts': `Label${T('12:30')}${T('new')}`,
  'two icons':
    'Label<mx-icon slot="trail">H</mx-icon><mx-icon slot="trail">M</mx-icon>',
  'two icon buttons':
    'Label<mx-icon-button slot="trail"><mx-icon>H</mx-icon></mx-icon-button><mx-icon-button slot="trail"><mx-icon>M</mx-icon></mx-icon-button>',
  'a text and an icon': `Label${T('12:30')}<mx-icon slot="trail">M</mx-icon>`,
  'a checkbox': 'Label<mx-checkbox slot="trail"></mx-checkbox>',
  'a button': `Label${BUTTON}`,
  'a wide button':
    'Label<mx-button slot="trail">A button with a label that is very wide</mx-button>',

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
for (const n of [15, 25])
  MODES[`min${n}`] = `${MODES.lead} .content { min-inline-size: ${n}% }`;
const modes = (process.argv[3] ?? 'built,bound').split(',');
const browser = await playwright[process.argv[2]].launch();
console.log(`# ${process.argv[2]} ${browser.version()}`);
const page = await browser.newPage({ viewport: { width: 400, height: 500 } });
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.setContent(
  `<!doctype html><style>body { margin: 0; font: 14px sans-serif }</style><div id="r" style="padding: 20px"></div><script>${code}</script>`,
);
const SETTINGS = ['ltr', 'rtl'].flatMap((dir) =>
  [100, 200].flatMap((size) => [
    ['mx-list', 'mx-list-item', dir, size],
    ['mx-list', 'mx-list-button-item', dir, size],
    ['mx-list', 'mx-list-link-item', dir, size],
    ['mx-sortable-list', 'mx-list-item', dir, size],
    ['mx-sortable-list', 'mx-list-button-item', dir, size],
  ]),
);
for (const mode of modes)
  for (const [list, tag, dir, size] of SETTINGS) {
    console.log(`\n## ${mode}: ${list} > ${tag}, ${dir}, ${size}% text`);
    for (const [name, html] of Object.entries(CASES))
      console.log(
        `${name}: ${await page.evaluate(
          async ([l, t, d, s, h, css]) => {
            const root = document.querySelector('#r');
            root.innerHTML = `<${l} dir="${d}" style="inline-size: 300px"><${t}>${h}</${t}></${l}>`;
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
            return `lead ${box('.lead')}, content ${box('.content')}, label text ${Math.round(label.getBoundingClientRect().width)}, trail ${box('.trail')}, item ${Math.round(i.height)}, past ${Math.round(past)}, scroll ${document.documentElement.scrollWidth - innerWidth}`;
          },
          [list, tag, dir, size, html, MODES[mode]],
        )}`,
      );
  }
await browser.close();
