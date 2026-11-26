// Run from packages/material-x, with the packages built:
//   node ../../.plan/item-overflow-1/probes/words.mjs <engine>
// RF-139, the feature proof's reviewer-1: a control's label beside a wide lead, in Roboto, on the built elements.
// `main` is the merge base's declarations, adopted; `now` is the built sheet; `keep` is the built sheet with
// `.host { overflow-wrap: normal }` adopted by each `mx-button`, so that its label keeps its words.
// The review's `contents.mjs`, with its own part.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
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
  'slider/slider',
  'text-field/text-field',
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
const MAIN = `.content { flex: 1 1 auto; min-inline-size: auto } .trail { flex: 0 0 min-content; min-inline-size: 0; max-inline-size: none } .trail::slotted(:not(mx-icon):not([data-icon])) { white-space: nowrap; overflow-wrap: normal }`;
const [, , engine, part] = process.argv;
const browser = await playwright[engine].launch();
console.log(`# ${engine} ${browser.version()}`);
const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.setContent(`<!doctype html><style>
@font-face { font-family: Roboto; font-weight: 400; src: url(data:font/woff2;base64,${font(400)}) }
@font-face { font-family: Roboto; font-weight: 500; src: url(data:font/woff2;base64,${font(500)}) }
body { margin: 0; font: 14px Roboto }</style><p style="font-weight:500">a</p><p>a</p><div id="r" style="padding: 20px"></div><script>${code}</script>`);
await page.evaluate(() =>
  Promise.all([
    document.fonts.load('500 14px Roboto'),
    document.fonts.load('400 14px Roboto'),
  ]),
);

const T = (t) => `<span slot="trail">${t}</span>`;
const VIDEO = '<video slot="lead"></video>';
const LARGE = `${VIDEO}<span slot="overline">Over</span><span slot="support">Support</span>`;
const AVATAR = '<span slot="lead" data-avatar>A</span>';
const IMAGE = '<span slot="lead" data-image></span>';
const B = (t) => `<mx-button slot="trail">${t}</mx-button>`;
const IB = '<mx-icon-button slot="trail"><mx-icon>M</mx-icon></mx-icon-button>';
const LONG = 'A trailing text that is much longer than the item it is in';

// Reads one item in the page.
const read = (o) =>
  page.evaluate(async (o) => {
    const root = document.querySelector('#r');
    root.innerHTML = `<div id="f" dir="${o.dir ?? 'ltr'}" style="${o.frame ?? `inline-size: ${o.width ?? 300}px`}; zoom: ${o.zoom ?? 1}"><${o.list ?? 'mx-list'} style="${o.listStyle ?? ''}"><${o.tag}>${o.html}</${o.tag}></${o.list ?? 'mx-list'}></div>`;
    const frame = root.firstChild;
    const item = frame.firstChild.firstChild;
    if (o.css) {
      const s = new CSSStyleSheet();
      s.replaceSync(o.css);
      item.shadowRoot.adoptedStyleSheets.push(s);
    }
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    const box = item.shadowRoot.querySelector('.host') ?? item;
    const i = box.getBoundingClientRect();
    const w = (q) =>
      item.shadowRoot.querySelector(q).getBoundingClientRect().width;
    const kids = [...item.querySelectorAll(':scope > [slot="trail"]')].map(
      (e) => e.shadowRoot?.querySelector('.host') ?? e,
    );
    const lines = (e) => {
      const r = document.createRange();
      r.selectNodeContents(e);
      const tops = new Set(
        [...r.getClientRects()]
          .filter((x) => x.width)
          .map((x) => Math.round(x.top)),
      );
      return tops.size;
    };
    let past = 0;
    for (const k of [...kids, item.shadowRoot.querySelector('.label')]) {
      const r = k.getBoundingClientRect();
      if (r.width) past = Math.max(past, r.right - i.right, i.left - r.left);
    }
    for (const e of item.querySelectorAll(':scope > [slot="trail"]')) {
      if (e.localName.startsWith('mx-')) continue;
      const r = document.createRange();
      r.selectNodeContents(e);
      const b = r.getBoundingClientRect();
      if (b.width) past = Math.max(past, b.right - i.right, i.left - b.left);
    }
    const n = (x) => Math.round(x * 10) / 10;
    const label = document.createRange();
    const texts = [...item.childNodes].filter(
      (x) => x.nodeType === 3 && x.data.trim(),
    );
    if (texts.length) label.selectNodeContents(texts[0]);
    return {
      item: `${n(i.width)}x${n(i.height)}`,
      content: n(w('.content')),
      trail: n(w('.trail')),
      kids: kids.map(
        (k) =>
          `${n(k.getBoundingClientRect().width)}x${n(k.getBoundingClientRect().height)}`,
      ),
      top: kids.map((k) => Math.round(k.getBoundingClientRect().top - i.top)),
      lines: [...item.querySelectorAll(':scope > [slot="trail"]')].map((e) =>
        lines(e),
      ),
      past: n(past),
      scroll:
        frame.scrollWidth > frame.clientWidth
          ? frame.scrollWidth - frame.clientWidth
          : 0,
    };
  }, o);
const say = async (name, o) => {
  const r = await read(o);
  console.log(
    `${name}: item ${r.item} content ${r.content} trail ${r.trail} kids [${r.kids}] tops [${r.top}] lines [${r.lines}] past ${r.past}`,
  );
  return r;
};
const KINDS = [
  ['mx-list', 'mx-list-item'],
  ['mx-list', 'mx-list-button-item'],
  ['mx-list', 'mx-list-link-item'],
  ['mx-sortable-list', 'mx-list-item'],
  ['mx-sortable-list', 'mx-list-button-item'],
];
const CASES = {
  'video, two words': `${VIDEO}Label${B('Two words')}`,
  'large video, two words': `${LARGE}Label${B('Two words')}`,
  'avatar, two words': `${AVATAR}Label${B('Two words')}`,
  'image, two words': `${IMAGE}Label${B('Two words')}`,
  'video, long text': `${VIDEO}Label${T(LONG)}`,
  'avatar, long text': `${AVATAR}Label${T(LONG)}`,
  'video, email': `${VIDEO}Label${T('someone.longname@example.com')}`,
  'video, 12:30': `${VIDEO}Label${T('12:30')}`,
  'long label, 12:30': `${'Several words '.repeat(8)}${T('12:30')}`,
  'handle and text': `Label${T('12:30')}<mx-icon slot="trail" data-handle>M</mx-icon>`,
  'two icon buttons': `Label${IB}${IB}`,
  checkbox: 'Label<mx-checkbox slot="trail"></mx-checkbox>',
  'a long word': `${'x'.repeat(60)}${T('y'.repeat(60))}`,
};
// keep: mx-button's own label keeps its words (`overflow-wrap: normal` in its shadow tree).
const keepWords = () =>
  page.evaluate(() => {
    for (const b of document.querySelectorAll('mx-button')) {
      const s = new CSSStyleSheet();
      s.replaceSync('.host { overflow-wrap: normal }');
      b.shadowRoot.adoptedStyleSheets.push(s);
    }
  });
const sayK = async (name, o, keep) => {
  const r = await read(o);
  if (keep) {
    await keepWords();
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );
  }
  const r2 = keep
    ? await page.evaluate(() => {
        const item = document.querySelector('#f').firstChild.firstChild;
        const box = (
          item.shadowRoot.querySelector('.host') ?? item
        ).getBoundingClientRect();
        const n = (x) => Math.round(x * 10) / 10;
        const kids = [...item.querySelectorAll(':scope > [slot="trail"]')].map(
          (e) => e.shadowRoot?.querySelector('.host') ?? e,
        );
        let past = 0;
        for (const k of [...kids, item.shadowRoot.querySelector('.label')]) {
          const q = k.getBoundingClientRect();
          if (q.width)
            past = Math.max(past, q.right - box.right, box.left - q.left);
        }
        const lines = (e) => {
          const g = document.createRange();
          g.selectNodeContents(e);
          return new Set(
            [...g.getClientRects()]
              .filter((x) => x.width)
              .map((x) => Math.round(x.top)),
          ).size;
        };
        return {
          item: `${n(box.width)}x${n(box.height)}`,
          content: n(
            item.shadowRoot.querySelector('.content').getBoundingClientRect()
              .width,
          ),
          trail: n(
            item.shadowRoot.querySelector('.trail').getBoundingClientRect()
              .width,
          ),
          kids: kids.map(
            (k) =>
              `${n(k.getBoundingClientRect().width)}x${n(k.getBoundingClientRect().height)}`,
          ),
          lines: [...item.querySelectorAll(':scope > [slot="trail"]')].map(
            lines,
          ),
          past: n(past),
        };
      })
    : r;
  console.log(
    `${name}: item ${r2.item} content ${r2.content} trail ${r2.trail} kids [${r2.kids}] lines [${r2.lines}] past ${r2.past}`,
  );
};
const C = {
  Download: (l) => `${l}Label${B('Download')}`,
  'Two words': (l) => `${l}Label${B('Two words')}`,
  Unsubscribe: (l) => `${l}Label${B('Unsubscribe')}`,
  'A button of several words': (l) =>
    `${l}Label${B('A button of several words')}`,
  'long text': (l) => `${l}Label${T(LONG)}`,
  email: (l) => `${l}Label${T('someone.longname@example.com')}`,
  'fixed 120': (l) =>
    `${l}Label<span slot="trail" style="display:inline-block;inline-size:120px">x</span>`,
};
for (const width of [240, 260, 280, 300, 360])
  for (const tag of ['mx-list-item', 'mx-list-button-item'])
    for (const [lead, l] of [
      ['none', ''],
      ['video', VIDEO],
      ['large video', LARGE],
    ])
      for (const [name, f] of Object.entries(C))
        for (const mode of ['main', 'now', 'keep'])
          await sayK(
            `${width}px ${tag} ${lead} ${name} | ${mode}`,
            { tag, width, html: f(l), css: mode === 'main' ? MAIN : '' },
            mode === 'keep',
          );
await browser.close();
