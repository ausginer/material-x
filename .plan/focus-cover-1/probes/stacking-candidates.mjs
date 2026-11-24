// Run from packages/material-x, with the package built:
//   node ../../.plan/reviews/focus-cover-1/probes/bundle.mjs <bundle>
//   node ../../.plan/focus-cover-1/probes/stacking-candidates.mjs <engine> <bundle>
// For each way to uncover the indicator in a connected group, as styles adopted
// after the built elements' own: which pixels of the indicator's inner edges are
// its own color, what a page's stacking does at rest and with keyboard focus in
// the group, and the indicator's contrast against what it lies on.
import {
  open,
  focus,
  pixels,
  ring,
} from '../../reviews/focus-cover-1/probes/lib.mjs';
const [engine, bundle] = process.argv.slice(2);
const { browser, page, load, key } = await open(engine, bundle);
console.log(`# ${engine} ${browser.version()}`);
const AUTO = ':host{isolation:auto!important}';
const FLAT = '.host:focus-visible{z-index:auto!important}';
const CANDIDATES = {
  'as on main': [AUTO, FLAT],
  'isolate at rest, raise (built)': ['', ''],
  'raise, no isolation': [AUTO, ''],
  'isolate while a button is focused, raise': [
    `${AUTO}:host(:has(:focus-visible)){isolation:isolate!important}`,
    '',
  ],
  'isolate while focus is inside, raise': [
    `${AUTO}:host(:focus-within){isolation:isolate!important}`,
    '',
  ],
  'raised ring, no isolation': [
    AUTO,
    `${FLAT}.host:focus-visible{outline-color:transparent!important}.probe-ring{position:absolute;inset:-5px;border:3px solid var(--ring);border-radius:8px;z-index:1;pointer-events:none;display:none}.host:focus-visible .probe-ring{display:block}`,
  ],
  'offset -1px, in the gap': [
    AUTO,
    `${FLAT}.host:focus-visible{outline-offset:-1px!important}`,
  ],
  'offset -3px, inside': [
    AUTO,
    `${FLAT}.host:focus-visible{outline-offset:-3px!important}`,
  ],
};
const apply = ([group, button]) =>
  page.evaluate(
    ([g, b]) => {
      const sheet = (text) => {
        const s = new CSSStyleSheet();
        s.replaceSync(text);
        return s;
      };
      const all = (root) => {
        for (const e of root.querySelectorAll('*'))
          if (e.shadowRoot) {
            const isGroup = e.localName === 'mx-connected-button-group';
            e.shadowRoot.adoptedStyleSheets.push(sheet(isGroup ? g : b));
            const box = e.shadowRoot.querySelector('.host');
            if (
              !isGroup &&
              b.includes('probe-ring') &&
              box?.matches('button,a')
            ) {
              const ring = document.createElement('div');
              ring.className = 'probe-ring';
              box.style.setProperty('--ring', 'rgb(75 102 42)');
              box.append(ring);
            }
            all(e.shadowRoot);
          }
      };
      all(document);
    },
    [group, button],
  );
const top = (sel) =>
  page.evaluate((s) => {
    const e = document.querySelector(s);
    const b = e.getBoundingClientRect();
    const t = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    return t === e || e.contains(t) ? 'top' : 'COVERED';
  }, sel);
const over = (sel) =>
  page.evaluate((s) => {
    const t = document.querySelector(s).getBoundingClientRect();
    const b = document
      .querySelector('#b1')
      .shadowRoot.querySelector('.host')
      .getBoundingClientRect();
    const x = (Math.max(t.left, b.left) + Math.min(t.right, b.right)) / 2;
    const y = (Math.max(t.top, b.top) + Math.min(t.bottom, b.bottom)) / 2;
    const hit = document.elementFromPoint(x, y);
    return hit?.id === 'ov' ? 'top' : 'COVERED';
  }, sel);
const tip = (css) =>
  `<span id=tip style="position:absolute;top:100%;left:0;margin-top:8px;width:60px;height:20px;background:pink;${css}">tip</span>`;
const G = (t = '') =>
  `<mx-connected-button-group><mx-button id=b1>One${t}</mx-button><mx-button id=b2>Two</mx-button><mx-button id=b3>Three</mx-button></mx-connected-button-group>`;
const AFTER =
  '<div id=after style="position:relative;height:60px;width:300px;background:#eee">after</div>';
const PAGES = {
  'tooltip z 10 in the focused button, then position:relative': [
    G(tip('z-index:10')) + AFTER,
    '#tip',
    top,
  ],
  'the same, then mx-list': [
    G(tip('z-index:10')) +
      '<mx-list><mx-list-button-item>x</mx-list-button-item></mx-list>',
    '#tip',
    top,
  ],
  'the same, then z-index 1': [
    G(tip('z-index:10')) + AFTER.replace('height', 'z-index:1;height'),
    '#tip',
    top,
  ],
  'a button before, over the empty end': [
    `<div style="position:relative;width:600px"><button id=ov style="position:absolute;right:10px;top:8px;width:60px;height:24px">C</button>${G()}</div>`,
    '#ov',
    top,
  ],
  'a menu after, z auto, over the focused button': [
    `<div style="position:relative">${G()}<div id=ov style="position:absolute;inset:0;background:#fffa"></div></div>`,
    '#ov',
    over,
  ],
  'a bar before, z-index 1, over the focused button (mx-top-app-bar)': [
    `<div style="position:relative"><div id=ov style="position:absolute;z-index:1;inset:0;background:#fffa"></div>${G()}</div>`,
    '#ov',
    over,
  ],
};
// What of the indicator shows through a page's menu or bar over the group.
const RING_PAGES = {
  'a menu after, z auto': PAGES[
    'a menu after, z auto, over the focused button'
  ][0]
    .replace('#fffa', '#fff')
    .replace('inset:0', 'inset:-10px'),
  'a bar before, z-index 1': PAGES[
    'a bar before, z-index 1, over the focused button (mx-top-app-bar)'
  ][0]
    .replace('#fffa', '#fff')
    .replace('inset:0', 'inset:-10px'),
};
for (const [name, styles] of Object.entries(CANDIDATES)) {
  console.log(`## ${name}`);
  for (const n of [1, 2, 3]) {
    await load(G());
    await apply(styles);
    await key();
    const g = await focus(page, [`#b${n}`]);
    await pixels(page);
    if (name === 'raised ring, no isolation') {
      g.color = 'rgb(75, 102, 42)';
    }
    const r = await ring(page, g);
    console.log(
      `button ${n}: left ${r.out.left.join('/')} right ${r.out.right.join('/')} top ${r.out.top.join('/')}`,
    );
  }
  for (const [p, [html, sel, read]] of Object.entries(PAGES)) {
    await load(html);
    await apply(styles);
    const rest = await read(sel);
    await key();
    await focus(page, ['#b1']);
    console.log(`${p}: at rest ${rest}, focused ${await read(sel)}`);
  }
  for (const [p, html] of Object.entries(RING_PAGES)) {
    await load(html);
    await apply(styles);
    const before = await page.screenshot();
    await key();
    await focus(page, ['#b1']);
    const after = await page.screenshot();
    const n = await page.evaluate(
      async ([a, b]) => {
        const read = async (d) => {
          const i = new Image();
          i.src = `data:image/png;base64,${d}`;
          await i.decode();
          const c = document.createElement('canvas');
          c.width = i.width;
          c.height = i.height;
          const x = c.getContext('2d');
          x.drawImage(i, 0, 0);
          return x.getImageData(0, 0, i.width, i.height).data;
        };
        const [x, y] = [await read(a), await read(b)];
        let n = 0;
        // The page's own `before` button changes above the group.
        for (let i = 4 * 1400 * 150; i < x.length; i += 4)
          if ([0, 1, 2].some((j) => Math.abs(x[i + j] - y[i + j]) > 12)) n += 1;
        return n;
      },
      [before.toString('base64'), after.toString('base64')],
    );
    console.log(`${p}, opaque: ${n} pixels change when the button is focused`);
  }
}
// Contrast of the indicator against what its inner edges lie on.
console.log('## contrast of the indicator');
for (const tag of ['mx-button', 'mx-switch-button'])
  for (const color of ['', 'elevated', 'tonal', 'outlined', 'text'])
    for (const value of tag === 'mx-button' ? [''] : ['', '1', '2']) {
      await load(
        `<mx-connected-button-group color="${color}" ${value && `value=${value}`}><${tag} id=b1 value=1>One</${tag}><${tag} id=b2 value=2>Two</${tag}></mx-connected-button-group>`,
      );
      await key();
      const g = await focus(page, ['#b1']);
      console.log(
        `${tag} ${color || 'filled'}${value && ` value=${value}`}: ${await page.evaluate(
          (c) => {
            const x = document
              .createElement('canvas')
              .getContext('2d', { willReadFrequently: true });
            const rgb = (v) => {
              x.fillStyle = '#fff';
              x.fillRect(0, 0, 1, 1);
              x.fillStyle = v;
              x.fillRect(0, 0, 1, 1);
              return [...x.getImageData(0, 0, 1, 1).data].slice(0, 3);
            };
            const lum = (v) =>
              v
                .map((n) => n / 255)
                .map((n) =>
                  n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4,
                )
                .reduce((s, n, i) => s + n * [0.2126, 0.7152, 0.0722][i], 0);
            const ratio = (a, b) => {
              const [l, d] = [lum(a), lum(b)].sort((m, n) => n - m);
              return ((l + 0.05) / (d + 0.05)).toFixed(2);
            };
            const box = (id) =>
              getComputedStyle(
                document.getElementById(id).shadowRoot.querySelector('.host'),
              ).backgroundColor;
            return ['b1', 'b2']
              .map(
                (id) =>
                  `${id === 'b1' ? 'own' : 'next'} ${box(id)} ${ratio(rgb(c), rgb(box(id)))}`,
              )
              .join(', ');
          },
          g.color,
        )}`,
      );
    }
await browser.close();
