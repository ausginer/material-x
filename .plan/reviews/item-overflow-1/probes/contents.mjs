// Run from packages/material-x, with the packages built:
//   node ../../.plan/reviews/item-overflow-1/probes/contents.mjs <engine> <part>
// RF-139 review: the review's own contents, with Roboto loaded, on the built
// elements. Parts: labels, survivors, kinds, buttons, fit, sides, breaks, zoom.
// `now` is the built sheet; `main` is the merge base's declarations, adopted.
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
console.log(`# ${engine} ${browser.version()}, part ${part}`);
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
if (part === 'labels') {
  // A narrowed control's label: its lines, and how far it runs out of the control and out of the item, up or down.
  for (const width of [240, 260, 280, 300, 320])
    for (const tag of ['mx-list-item', 'mx-list-button-item'])
      for (const [lead, l] of [
        ['none', ''],
        ['video', VIDEO],
        ['large video', LARGE],
      ])
        for (const label of ['Two words', 'Download'])
          for (const mode of ['main', 'now']) {
            const r = await read({
              tag,
              width,
              html: `${l}Label${B(label)}`,
              css: mode === 'main' ? MAIN : '',
            });
            const v = await page.evaluate(() => {
              const item = document.querySelector('#f').firstChild.firstChild;
              const box = (
                item.shadowRoot.querySelector('.host') ?? item
              ).getBoundingClientRect();
              const b = item.querySelector('mx-button');
              const c = b.shadowRoot
                .querySelector('.host')
                .getBoundingClientRect();
              const range = document.createRange();
              range.selectNodeContents(b);
              const t = range.getBoundingClientRect();
              const pieces = [];
              const node = b.firstChild;
              let top = null;
              for (let i = 0; i < node.length; i++) {
                range.setStart(node, i);
                range.setEnd(node, i + 1);
                const y = Math.round(range.getBoundingClientRect().top);
                if (y !== top && node.data[i] !== ' ') {
                  pieces.push('');
                  top = y;
                }
                pieces[pieces.length - 1] += node.data[i];
              }
              const out = (o) =>
                Math.round(Math.max(0, o.top - t.top, t.bottom - o.bottom));
              return `label ${pieces.join('/')} ${Math.round(t.height)}px high, out of the button ${out(c)}, out of the item ${out(box)}`;
            });
            console.log(
              `${width}px ${tag} ${lead} ${label} | ${mode}: item ${r.item} content ${r.content} button ${r.kids} past ${r.past}, ${v}`,
            );
          }
} else if (part === 'survivors') {
  const IMG = `<img slot="lead" style="inline-size:56px;block-size:56px" alt="">`;
  const S = {
    'a label, 12:30': `A label of several words here${T('12:30')}`,
    'a button of 130': `Label${B('A button, 130')}`,
    'a text of 140': `Label${T('A text of some more px')}`,
    'a fixed 200': `Label<span slot="trail" style="display:block;inline-size:200px;block-size:24px"></span>`,
    'large video, fixed 120': `${LARGE}Label<span slot="trail" style="display:block;inline-size:120px;block-size:24px"></span>`,
  };
  const M = {
    now: '',
    'content does not grow': '.content{flex-grow:0}',
    'trail grows': '.trail{flex-grow:1}',
    'half is 40%': '.trail{max-inline-size:40%}',
    'half is 45%': '.trail{max-inline-size:45%}',
    'trail min auto': '.trail{min-inline-size:auto}',
    'lead shrinks': '.lead{flex-shrink:1}',
  };
  for (const [name, html] of Object.entries(S))
    for (const [m, css] of Object.entries(M))
      for (const tag of ['mx-list-item', 'mx-list-button-item'])
        await say(`${name} | ${tag} | ${m}`, { tag, html, css });
  for (const [w] of [[240], [300], [360]])
    for (const tag of ['mx-list-item', 'mx-list-button-item'])
      await say(`img 56, two words | ${tag} | ${w}px`, {
        tag,
        width: w,
        html: `${IMG}Label${B('Two words')}`,
      });
  for (const t of ['Unsubscribe', 'Download'])
    for (const m of ['main', 'now'])
      for (const tag of ['mx-list-item', 'mx-list-button-item'])
        await say(`video, label Hi, ${t} | ${tag} | ${m}`, {
          tag,
          html: `${VIDEO}Hi${B(t)}`,
          css: m === 'main' ? MAIN : '',
        });
} else if (part === 'kinds') {
  for (const width of [240, 300, 360])
    for (const [list, tag] of KINDS)
      for (const dir of ['ltr', 'rtl']) {
        console.log(`\n## ${width}px ${list} > ${tag} ${dir}`);
        for (const [name, html] of Object.entries(CASES))
          await say(name, { list, tag, dir, html, width });
      }
} else if (part === 'buttons') {
  // Every lead, at list widths around 300; what a button gets with each basis.
  for (const tag of ['mx-list-item', 'mx-list-button-item'])
    for (const [lead, l] of [
      ['avatar', AVATAR],
      ['image', IMAGE],
      ['video', VIDEO],
      ['large video', LARGE],
    ])
      for (const label of [
        'Two bits',
        'Two words',
        'Download',
        'Save draft',
        'Unsubscribe',
      ])
        for (const basis of [10, 12, 13, 14, 15, 16])
          await say(`${tag} ${lead} ${label} ${basis}%`, {
            tag,
            html: `${l}Label${B(label)}`,
            css: `.content { flex-basis: ${basis}% }`,
          });
  console.log(
    '\n# narrowest list at which "Two words" keeps its box and one line',
  );
  for (const tag of ['mx-list-item', 'mx-list-button-item'])
    for (const [lead, l] of [
      ['none', ''],
      ['avatar', AVATAR],
      ['image', IMAGE],
      ['video', VIDEO],
      ['large video', LARGE],
    ])
      for (const label of ['Two words']) {
        const wide = await read({
          tag,
          html: `${l}Label${B(label)}`,
          width: 1000,
        });
        let at = null;
        for (let width = 200; width <= 500; width += 1) {
          const r = await read({ tag, html: `${l}Label${B(label)}`, width });
          if (
            Math.abs(parseFloat(r.kids[0]) - parseFloat(wide.kids[0])) < 0.6
          ) {
            at = width;
            break;
          }
        }
        console.log(`${tag} ${lead}: own ${wide.kids[0]}, from ${at}px`);
      }
} else if (part === 'fit') {
  for (const [list, tag] of KINDS.slice(0, 4))
    for (const [frame, f] of [
      ['fit-content', 'inline-size: fit-content'],
      ['max-content', 'inline-size: max-content'],
      ['inline-block', 'display: inline-block'],
      ['absolute', 'position: absolute'],
      ['flex row item', 'display: flex'],
      ['min-content', 'inline-size: min-content'],
    ])
      for (const [name, html] of Object.entries({
        'OK, 12:30': `OK${T('12:30')}`,
        'Copy, shortcut': `Copy${T('Ctrl+Shift+C')}`,
        'Label, 12:30': `Label${T('12:30')}`,
        'Label, two words text': `Label${T('Yesterday, 12:30')}`,
        'Label, button': `Label${B('Two words')}`,
        'icon, Label, icon': `<mx-icon slot="lead">H</mx-icon>Label<mx-icon slot="trail">M</mx-icon>`,
        'On, checkbox': 'On<mx-checkbox slot="trail"></mx-checkbox>',
        'On, two icon buttons': `On${IB}${IB}`,
        'Label, no trail': 'A label of some words',
      }))
        for (const mode of ['main', 'now'])
          await say(`${frame} ${list} > ${tag} | ${name} | ${mode}`, {
            list,
            tag,
            html,
            frame: f,
            css: mode === 'main' ? MAIN : '',
          });
} else if (part === 'sides') {
  const C = {
    'text and button': `Label${T('12:30')}${B('Two words')}`,
    'two buttons': `Label${B('Two bits')}${B('Two bits')}`,
    'three icon buttons': `Label${IB}${IB}${IB}`,
    'four icon buttons': `Label${IB}${IB}${IB}${IB}`,
    'text, two icon buttons': `Label${T('12:30')}${IB}${IB}`,
    'two icons beside video': `${VIDEO}Label<mx-icon slot="trail">H</mx-icon><mx-icon slot="trail">M</mx-icon>`,
    'two icon buttons beside video': `${VIDEO}Label${IB}${IB}`,
    'two icon buttons beside large video': `${LARGE}Label${IB}${IB}`,
    'three icon buttons beside video': `${VIDEO}Label${IB}${IB}${IB}`,
  };
  for (const width of [240, 300, 360])
    for (const [, tag] of KINDS.slice(0, 2))
      for (const [name, html] of Object.entries(C))
        for (const mode of ['main', 'now'])
          await say(`${width}px ${tag} ${name} | ${mode}`, {
            tag,
            html,
            width,
            css: mode === 'main' ? MAIN : '',
          });
} else if (part === 'breaks') {
  const C = {
    input: 'Label<input slot="trail">',
    select:
      'Label<select slot="trail"><option>An option of some words</option></select>',
    slider: 'Label<mx-slider slot="trail"></mx-slider>',
    'text field': 'Label<mx-text-field slot="trail">F</mx-text-field>',
    'img 200':
      'Label<img slot="trail" style="inline-size:200px;block-size:20px" alt="">',
    'img 100%':
      'Label<img slot="trail" style="inline-size:100%;block-size:20px" alt="">',
    'block, 100%':
      'Label<div slot="trail" style="inline-size:100%;block-size:20px"></div>',
    'native button':
      'Label<button slot="trail">A native button of words</button>',
    link: 'Label<a slot="trail" href="#">https://example.com/a/very/long/path/to/something</a>',
    'nested nowrap':
      'Label<span slot="trail"><span style="white-space:nowrap">A nested text that is on one line for sure</span></span>',
    'page nowrap':
      'Label<span slot="trail" style="white-space:nowrap">A text that its page keeps on one line always</span>',
    'block text': `Label<p slot="trail" style="margin:0">${LONG}</p>`,
    'flex text': `Label<div slot="trail" style="display:flex">${LONG}</div>`,
    'one-word button by video': `${VIDEO}Label${B('Download')}`,
    'one long word button by large video': `${LARGE}Label${B('Unsubscribe')}`,
  };
  for (const [, tag] of KINDS.slice(0, 2))
    for (const [name, html] of Object.entries(C))
      for (const mode of ['main', 'now'])
        await say(`${tag} ${name} | ${mode}`, {
          tag,
          html,
          css: mode === 'main' ? MAIN : '',
        });
} else if (part === 'zoom') {
  const big =
    '.label { font-size: 32px; line-height: 48px } .support { font-size: 28px; line-height: 40px } .overline { font-size: 22px; line-height: 32px } .trail::slotted(*) { font-size: 22px; line-height: 32px }';
  for (const [how, o] of [
    ['zoom 2 in 300px', { zoom: 2, width: 150 }],
    ['zoom 2 in 600px', { zoom: 2, width: 300 }],
    ['text 200% in 300px', { css: big }],
  ])
    for (const [list, tag] of KINDS)
      for (const dir of ['ltr', 'rtl']) {
        console.log(`\n## ${how}: ${list} > ${tag} ${dir}`);
        for (const [name, html] of Object.entries(CASES))
          await say(name, { list, tag, dir, html, ...o });
      }
}
await browser.close();
