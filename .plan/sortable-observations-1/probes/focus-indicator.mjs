// How much of a focus indicator the neighbours cover, on the built elements.
// The covered pixels are those of the outline's color in a screenshot with the
// neighbours hidden, and not in one with them shown.
//
// Run from packages/material-x, with the packages built:
//   node ../../.plan/sortable-observations-1/probes/focus-indicator.mjs <chromium|firefox|webkit>
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
const ENGINE = process.argv[2];
const entries = [
  'list/list',
  'list/sortable-list',
  'list/list-item',
  'list/list-button-item',
  'list/list-link-item',
  'icon/icon',
  'button/button',
  'button/split-button',
  'button/icon-button',
  'button/switch-button',
  'button-group/button-group',
  'button-group/connected-button-group',
  'checkbox/checkbox',
  'radio/radio',
  'fab/fab',
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
const browser = await playwright[ENGINE].launch();
console.log(`# ${ENGINE} ${browser.version()}`);
const page = await browser.newPage({ viewport: { width: 600, height: 420 } });
const TAB = ENGINE === 'webkit' ? 'Alt+Tab' : 'Tab';

async function read(html, focusIndex, selector, sheet = '') {
  await page.setContent(
    `<!doctype html><style>body{margin:40px;background:#fff;font:16px sans-serif}*{transition:none!important;animation:none!important}</style>${html}<script>${code}</script>`,
  );
  await page.evaluate((s) => {
    for (const e of document.querySelectorAll('*')) {
      if (e.shadowRoot && s) {
        const x = new CSSStyleSheet();
        x.replaceSync(s);
        e.shadowRoot.adoptedStyleSheets.push(x);
      }
    }
  }, sheet);
  await page.waitForTimeout(50);
  const info = await page.evaluate(
    ([sel, i]) => {
      const e = [...document.querySelectorAll(sel)][i];
      e.setAttribute('data-probe', '');
      return e.localName;
    },
    [selector, focusIndex],
  );
  // Real keyboard focus, so that the indicator is a keyboard focus's.
  let focused = false;
  for (let i = 0; i < 12 && !focused; i++) {
    await page.keyboard.press(TAB);
    focused = await page.evaluate(() => {
      const e = document.activeElement;
      return (
        !!e && (e.hasAttribute('data-probe') || !!e.closest?.('[data-probe]'))
      );
    });
  }
  await page.waitForTimeout(350);
  const style = await page.evaluate(() => {
    let e = document.activeElement;
    while (e?.shadowRoot?.activeElement) e = e.shadowRoot.activeElement;
    const cand = [
      e,
      ...(document
        .querySelector('[data-probe]')
        .shadowRoot?.querySelectorAll('*') ?? []),
      document.querySelector('[data-probe]'),
      ...document.querySelectorAll('[data-probe] *'),
    ];
    const o = cand
      .map((c) => [c, getComputedStyle(c)])
      .find(([, s]) => s.outlineStyle !== 'none' && s.outlineWidth !== '0px');
    if (!o) return null;
    const r = o[0].getBoundingClientRect();
    return {
      on: `${o[0].localName}${o[0].className ? '.' + o[0].className : ''}`,
      color: o[1].outlineColor,
      width: o[1].outlineWidth,
      style: o[1].outlineStyle,
      offset: o[1].outlineOffset,
      rect: [r.x, r.y, r.right, r.bottom],
    };
  });
  if (!focused || !style)
    return `NOT READ (focused ${focused}, ${JSON.stringify(style)}, ${info})`;
  const shown = (await page.screenshot()).toString('base64');
  await page.evaluate(() => {
    const p = document.querySelector('[data-probe]');
    for (const e of document.querySelectorAll('[data-item]'))
      if (e !== p) e.style.visibility = 'hidden';
  });
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  const alone = (await page.screenshot()).toString('base64');
  const counts = await page.evaluate(
    async ([a, b, st]) => {
      const load = async (d) => {
        const i = new Image();
        i.src = `data:image/png;base64,${d}`;
        await i.decode();
        const c = document.createElement('canvas');
        c.width = i.width;
        c.height = i.height;
        const x = c.getContext('2d', { colorSpace: 'srgb' });
        x.drawImage(i, 0, 0);
        return x.getImageData(0, 0, i.width, i.height);
      };
      const [A, B] = [await load(a), await load(b)];
      const cv = document.createElement('canvas');
      cv.width = cv.height = 1;
      const cx = cv.getContext('2d');
      cx.fillStyle = st.color;
      cx.fillRect(0, 0, 1, 1);
      const [r, g, bl] = cx.getImageData(0, 0, 1, 1).data;
      const near = (d, i) =>
        Math.abs(d[i] - r) < 12 &&
        Math.abs(d[i + 1] - g) < 12 &&
        Math.abs(d[i + 2] - bl) < 12;
      const [x0, y0, x1, y1] = st.rect;
      const m = 12,
        total = { start: 0, end: 0, left: 0, right: 0 },
        lost = { start: 0, end: 0, left: 0, right: 0 };
      for (
        let y = Math.max(0, Math.floor(y0 - m));
        y < Math.min(B.height, y1 + m);
        y++
      )
        for (
          let x = Math.max(0, Math.floor(x0 - m));
          x < Math.min(B.width, x1 + m);
          x++
        ) {
          const i = (y * B.width + x) * 4;
          if (!near(B.data, i)) continue;
          const dt = y - y0,
            db = y1 - y,
            dl = x - x0,
            dr = x1 - x,
            k = Math.min(dt, db, dl, dr);
          const side =
            k === dt ? 'start' : k === db ? 'end' : k === dl ? 'left' : 'right';
          total[side]++;
          if (!near(A.data, i)) lost[side]++;
        }
      return { total, lost };
    },
    [shown, alone, style],
  );
  const f = (s) => `${counts.lost[s]}/${counts.total[s]}`;
  return `${style.style} ${style.width} offset ${style.offset} on ${style.on} | covered start ${f('start')} end ${f('end')} left ${f('left')} right ${f('right')}`;
}

const items = (tag, attrs = '', n = 3, mid = '') =>
  Array.from(
    { length: n },
    (_, i) =>
      `<${tag} data-item ${attrs} ${i === 1 ? mid : ''}${tag === 'mx-list-link-item' ? ' href="#x"' : ''}>Item ${i + 1}</${tag}>`,
  ).join('');
const list = (l, inner) => `<${l} style="inline-size:300px">${inner}</${l}>`;
const mixed = `<mx-list-item data-item>Static</mx-list-item><mx-list-button-item data-item>Button</mx-list-button-item><mx-list-link-item data-item href="#x">Link</mx-list-link-item><mx-list-item data-item>Static 2</mx-list-item>`;
for (const [n, sheet] of [
  ['built', ''],
  [
    "with md.comp.list's own outline-offset, -3px",
    '.host:focus-visible, :host(:focus-visible) { outline-offset: -3px !important }',
  ],
]) {
  console.log(`## ${n}`);
  for (const [tag, attrs] of [
    ['mx-list-item', 'tabindex=0'],
    ['mx-list-button-item', ''],
    ['mx-list-link-item', ''],
  ]) {
    for (const [i, pos] of [
      [0, 'first'],
      [1, 'middle'],
      [2, 'last'],
    ])
      console.log(
        `mx-list, ${tag}, ${pos}: ${await read(list('mx-list', items(tag, attrs)), i, tag, sheet)}`,
      );
  }
  for (const tag of [
    'mx-list-item',
    'mx-list-button-item',
    'mx-list-link-item',
  ]) {
    for (const [i, pos] of [
      [0, 'first'],
      [1, 'middle'],
      [2, 'last'],
    ])
      console.log(
        `mx-sortable-list, ${tag}, ${pos}: ${await read(list('mx-sortable-list', items(tag)), i, tag, sheet)}`,
      );
  }
  for (const i of [0, 1, 2, 3])
    console.log(
      `mx-sortable-list, mixed, ${['static', 'button', 'link', 'last static'][i]}: ${await read(list('mx-sortable-list', mixed), i, '[data-item]', sheet)}`,
    );
  console.log(
    `mx-list, button, next disabled: ${await read(list('mx-list', `<mx-list-button-item data-item>A</mx-list-button-item><mx-list-button-item data-item disabled>B</mx-list-button-item>`), 0, 'mx-list-button-item', sheet)}`,
  );
  console.log(
    `mx-list, button, next selected: ${await read(list('mx-list', `<mx-list-button-item data-item>A</mx-list-button-item><mx-list-button-item data-item selected>B</mx-list-button-item>`), 0, 'mx-list-button-item', sheet)}`,
  );
  console.log(
    `mx-list, static with trail and lead: ${await read(list('mx-list', `<mx-list-item data-item tabindex=0><span slot=lead>L</span>A<span slot=trail>T</span></mx-list-item><mx-list-item data-item>B</mx-list-item>`), 0, 'mx-list-item', sheet)}`,
  );
}
console.log('## other elements');
const b = (tag, a = '') => `<${tag} data-item ${a}>One</${tag}>`;
for (const [n, html, sel] of [
  [
    'connected group, buttons',
    `<mx-connected-button-group>${b('mx-button')}${b('mx-button')}${b('mx-button')}</mx-connected-button-group>`,
    'mx-button',
  ],
  [
    'connected group, switch buttons',
    `<mx-connected-button-group>${b('mx-switch-button')}${b('mx-switch-button')}${b('mx-switch-button')}</mx-connected-button-group>`,
    'mx-switch-button',
  ],
  [
    'standard group, buttons',
    `<mx-button-group>${b('mx-button')}${b('mx-button')}${b('mx-button')}</mx-button-group>`,
    'mx-button',
  ],
  [
    "buttons side by side, gap 2px (the page's)",
    `<div style="display:flex;gap:2px">${b('mx-button')}${b('mx-button')}${b('mx-button')}</div>`,
    'mx-button',
  ],
  [
    "buttons stacked, gap 0 (the page's)",
    `<div style="display:grid">${b('mx-button')}${b('mx-button')}${b('mx-button')}</div>`,
    'mx-button',
  ],
  [
    "checkboxes side by side (the page's)",
    `<div style="display:flex">${'<mx-checkbox data-item></mx-checkbox>'.repeat(3)}</div>`,
    'mx-checkbox',
  ],
  [
    "radios side by side (the page's)",
    `<div style="display:flex">${'<mx-radio data-item name=a></mx-radio>'.repeat(3)}</div>`,
    'mx-radio',
  ],
  [
    "fabs side by side (the page's)",
    `<div style="display:flex">${'<mx-fab data-item></mx-fab>'.repeat(3)}</div>`,
    'mx-fab',
  ],
]) {
  console.log(`${n}, first: ${await read(html, 0, sel)}`);
  if (/group/.test(n))
    console.log(
      `   with .host:focus-visible { z-index: 1 }: ${await read(html, 0, sel, '.host:focus-visible { z-index: 1 }')}`,
    );
}
// The split button's two buttons are in its shadow tree.
{
  await page.setContent(
    `<!doctype html><style>body{margin:40px;background:#fff}*{transition:none!important}</style><mx-split-button>Save</mx-split-button><script>${code}</script>`,
  );
  await page.waitForTimeout(100);
  await page.keyboard.press(TAB);
  await page.waitForTimeout(350);
  const parts = await page.evaluate(() => {
    const r = document.querySelector('mx-split-button').shadowRoot;
    const bs = [
      ...r.querySelectorAll('mx-button, mx-icon-button, mx-switch-icon-button'),
    ];
    window.bs = bs;
    const a = bs[0].shadowRoot.querySelector('.host'),
      z = bs[1].shadowRoot.querySelector('.host');
    const s = getComputedStyle(a),
      q = a.getBoundingClientRect(),
      w = z.getBoundingClientRect();
    return {
      which: r.activeElement?.localName,
      outline: `${s.outlineStyle} ${s.outlineWidth} offset ${s.outlineOffset}`,
      gap: w.left - q.right,
      clip: [q.right - 1, q.top - 8, 8, q.height + 16],
    };
  });
  const clip = {
    x: parts.clip[0],
    y: parts.clip[1],
    width: parts.clip[2],
    height: parts.clip[3],
  };
  const shown = (await page.screenshot({ clip })).toString('base64');
  await page.evaluate(() => {
    window.bs[1].style.visibility = 'hidden';
    window.bs[1].shadowRoot.querySelector('.host').style.visibility = 'hidden';
  });
  const alone = (await page.screenshot({ clip })).toString('base64');
  const px = await page.evaluate(
    async ([a, b]) => {
      const load = async (d) => {
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
      const [A, B] = [await load(a), await load(b)];
      const dark = (d, i) => d[i] + d[i + 1] + d[i + 2] < 600;
      let t = 0,
        l = 0;
      for (let i = 0; i < B.length; i += 4)
        if (dark(B, i)) {
          t++;
          if (
            Math.abs(A[i] - B[i]) +
              Math.abs(A[i + 1] - B[i + 1]) +
              Math.abs(A[i + 2] - B[i + 2]) >
            36
          )
            l++;
        }
      return `${l}/${t}`;
    },
    [shown, alone],
  );
  console.log(
    `split button, the leading button (${parts.which}): ${parts.outline}, gap ${parts.gap}px | the outline's trailing side covered ${px} (the second button hidden or not)`,
  );
}
// A lifted item with a focused button. The consumer never commits, so it stays lifted for 500 ms.
{
  await page.setContent(
    `<!doctype html><style>body{margin:40px;background:#fff;font:16px sans-serif}*{transition:none!important}</style><mx-sortable-list style="inline-size:300px">${items('mx-list-button-item')}</mx-sortable-list><script>${code}</script>`,
  );
  await page.waitForTimeout(50);
  for (let i = 0; i < 2; i++) await page.keyboard.press(TAB);
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(150);
  const r = await page.evaluate(() => {
    const e = document.activeElement,
      q = e.getBoundingClientRect();
    return {
      lifted: e.matches(':popover-open'),
      tag: e.localName,
      clip: {
        x: q.x - 6,
        y: q.y - 6,
        width: q.width + 12,
        height: q.height + 12,
      },
      outline: getComputedStyle(e.shadowRoot.querySelector('.host')).outline,
    };
  });
  console.log(`a lifted, focused item: lifted ${r.lifted}, ${r.outline}`);
  if (process.argv[3]) await page.screenshot({ path: process.argv[3] });
}
console.log('## the handle, in a sortable list');
for (const h of [
  '<mx-icon data-handle slot="lead">drag_handle</mx-icon>',
  '<span data-handle slot="trail">H</span>',
  '<button data-handle slot="lead">H</button>',
  '<mx-icon-button data-handle slot="lead"><mx-icon>menu</mx-icon></mx-icon-button>',
]) {
  await page.setContent(
    `<!doctype html><style>body{margin:40px}</style><mx-sortable-list style="inline-size:300px"><mx-list-item>${h}A</mx-list-item><mx-list-item>${h}B</mx-list-item></mx-sortable-list><script>${code}</script>`,
  );
  await page.waitForTimeout(50);
  await page.keyboard.press(TAB);
  console.log(
    `${h}: ${await page.evaluate(() => {
      const e = document.activeElement,
        s = getComputedStyle(e),
        i = e.closest('mx-list-item');
      return `focused ${e.localName} tabindex ${e.getAttribute('tabindex')} role ${e.getAttribute('role')} outline ${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} offset ${s.outlineOffset} item outline ${i && getComputedStyle(i).outlineStyle}`;
    })}`,
  );
  console.log(
    `   the handle's own control: ${await page.evaluate(() => {
      const e = document.activeElement;
      let i = e?.shadowRoot?.activeElement;
      return i
        ? `${i.localName} ${getComputedStyle(i).outlineStyle} ${getComputedStyle(i).outlineWidth}`
        : 'none';
    })}`,
  );
  console.log(
    `   with a page rule mx-sortable-list [data-handle]:focus-visible: ${await page.evaluate(
      () => {
        const st = document.createElement('style');
        st.textContent =
          'mx-sortable-list [data-handle]:focus-visible{outline:3px solid rgb(1,2,3)}';
        document.head.append(st);
        const s = getComputedStyle(document.activeElement);
        return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`;
      },
    )}`,
  );
}
await browser.close();
