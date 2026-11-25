// The share of its indicator's area that a keyboard-focused control paints, by engine, mode, list, item, slot and control.
// The area is the middle of the ring around the element that draws the outline. Where a pseudo-element draws it (checkbox,
// radio), the box is another one, and only lead and trail compare. Lifted is a real drag of a handle with keyboard focus.
//
// Run from packages/material-x, with the packages built:
//   node ../../.plan/reviews/handle-focus-1/probes/ring.mjs
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
  'button/icon-button',
  'button/button',
  'button/switch-button',
  'checkbox/checkbox',
  'radio/radio',
  'slider/slider',
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

const ib = (s, a = '') =>
  `<mx-icon-button data-c slot="${s}" ${a}><mx-icon>m</mx-icon></mx-icon-button>`;
const HANDLES = {
  'handle mx-icon': (s) =>
    `<mx-icon data-c data-handle slot="${s}">H</mx-icon>`,
  'handle span': (s) => `<span data-c data-handle slot="${s}">Grip</span>`,
  'handle button': (s) =>
    `<button data-c data-handle slot="${s}">Grip</button>`,
  'handle svg box': (s) =>
    `<div data-c data-handle slot="${s}" style="inline-size:24px;block-size:24px"></div>`,
  'handle mx-icon-button': (s) => ib(s, 'data-handle'),
  'handle mx-button': (s) =>
    `<mx-button data-c data-handle slot="${s}">Move</mx-button>`,
};
const CONTROLS = {
  'mx-icon-button': (s) => ib(s),
  'mx-icon-button xsmall': (s) => ib(s, 'size="xsmall"'),
  'mx-icon-button large': (s) => ib(s, 'size="large"'),
  'mx-icon-button xlarge': (s) => ib(s, 'size="xlarge"'),
  'mx-button': (s) => `<mx-button data-c slot="${s}">Text</mx-button>`,
  'mx-button elevated': (s) =>
    `<mx-button data-c color="elevated" slot="${s}">Text</mx-button>`,
  'mx-switch-button': (s) =>
    `<mx-switch-button data-c slot="${s}">Text</mx-switch-button>`,
  'mx-checkbox': (s) => `<mx-checkbox data-c slot="${s}"></mx-checkbox>`,
  'mx-radio': (s) => `<mx-radio data-c slot="${s}"></mx-radio>`,
};
const MODES = {
  ltr: {},
  rtl: { dir: 'rtl' },
  'no spaces': {
    style:
      '--md-list-item-trailing-space:0px;--md-list-item-leading-space:0px;--md-list-item-container-height:20px;',
  },
  disabled: { item: 'disabled' },
  selected: { item: 'selected' },
  'forced colors': { forced: true, only: 'handles' },
  lifted: { lifted: true, many: true, only: 'handles' },
  'the first of three': { many: true },
};
for (const E of ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[E].launch();
  console.log(`# ${E} ${browser.version()}`);
  const context = await browser.newContext({
    deviceScaleFactor: 2,
    viewport: { width: 700, height: 600 },
  });
  const page = await context.newPage();
  for (const [mode, m] of Object.entries(MODES)) {
    await page.emulateMedia({ forcedColors: m.forced ? 'active' : 'none' });
    await page.setContent(
      `<!doctype html><html dir="${m.dir ?? 'ltr'}"><style>body{margin:40px;background:white}</style><div id="r"></div><script>${code}</script>`,
    );
    const groups = [
      ['mx-sortable-list', ['mx-list-item', 'mx-list-button-item'], HANDLES],
    ];
    if (m.only !== 'handles')
      groups.push([
        'mx-list',
        ['mx-list-item', 'mx-list-button-item', 'mx-list-link-item'],
        CONTROLS,
      ]);
    for (const [list, tags, set] of groups)
      for (const slot of ['lead', 'trail'])
        for (const [name, make] of Object.entries(set)) {
          const row = [];
          for (const tag of tags) {
            await page.mouse.move(690, 590);
            await page.evaluate(
              ([list, tag, html, m]) => {
                const href = tag === 'mx-list-link-item' ? 'href="#x"' : '';
                const n = m.many ? 2 : 0;
                document.querySelector('#r').innerHTML =
                  `<button id="b">b</button><${list} style="inline-size:340px;${m.style ?? ''}"><${tag} ${href} ${m.item ?? ''}>A${html}</${tag}>${`<${tag} ${href}>B</${tag}>`.repeat(n)}</${list}>`;
              },
              [list, tag, make(slot), m],
            );
            await page.waitForTimeout(80);
            await page.evaluate(() => document.querySelector('#b').focus());
            let on = false;
            for (let i = 0; i < 4 && !on; i += 1) {
              await page.keyboard.press(E === 'webkit' ? 'Alt+Tab' : 'Tab');
              on = await page.evaluate(() =>
                document.activeElement?.hasAttribute('data-c'),
              );
            }
            if (!on) {
              row.push(`${tag} no focus`);
              continue;
            }
            if (m.lifted) {
              const h = await page.evaluate(() => {
                // A package button's host has `display: contents`.
                let e = document.activeElement;
                while (e.shadowRoot?.activeElement)
                  e = e.shadowRoot.activeElement;
                const { x, y, width, height } = e.getBoundingClientRect();
                return { x, y, width, height };
              });
              await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
              await page.mouse.down();
              await page.mouse.move(
                h.x + h.width / 2 + 10,
                h.y + h.height / 2 + 40,
                { steps: 5 },
              );
            }
            await page.waitForTimeout(450);
            const g = await page.evaluate(() => {
              let e = document.activeElement;
              const chain = [];
              for (;;) {
                const s = getComputedStyle(e);
                chain.push(
                  `${e.localName}:${s.outlineStyle === 'none' ? 'none' : `${s.outlineStyle} ${s.outlineWidth} ${s.outlineOffset}`}`,
                );
                if (!e.shadowRoot?.activeElement) break;
                e = e.shadowRoot.activeElement;
              }
              // the drawn box: the focused one, or a sibling of it which has the outline
              let box = e;
              if (getComputedStyle(e).outlineStyle === 'none') {
                const root = e.getRootNode();
                box =
                  [...root.querySelectorAll('*')].find(
                    (x) =>
                      x.assignedSlot === null &&
                      getComputedStyle(x).outlineStyle !== 'none',
                  ) ?? e;
              }
              const s = getComputedStyle(box);
              const r = box.getBoundingClientRect();
              const c = document.createElement('canvas').getContext('2d');
              c.fillStyle = s.outlineColor;
              c.fillRect(0, 0, 1, 1);
              const item = document.querySelector('[data-c]').parentElement;
              return {
                chain: chain.join(' > '),
                rect: [r.x, r.y, r.width, r.height],
                rad: Math.min(
                  parseFloat(s.borderTopLeftRadius) *
                    (s.borderTopLeftRadius.endsWith('%')
                      ? Math.min(r.width, r.height) / 100
                      : 1) || 0,
                  Math.min(r.width, r.height) / 2,
                ),
                w: parseFloat(s.outlineWidth),
                o: parseFloat(s.outlineOffset),
                color: [...c.getImageData(0, 0, 1, 1).data].slice(0, 3),
                lifted: item.matches(':popover-open'),
                fv: e.matches(':focus-visible'),
                scroll: `${item.scrollWidth - item.clientWidth},${item.scrollHeight - item.clientHeight}`,
              };
            });
            const img = (await page.screenshot()).toString('base64');
            const painted = await page.evaluate(
              async ([p, g]) => {
                const i = new Image();
                i.src = `data:image/png;base64,${p}`;
                await i.decode();
                const c = document.createElement('canvas');
                c.width = i.width;
                c.height = i.height;
                const x = c.getContext('2d');
                x.drawImage(i, 0, 0);
                const d = x.getImageData(0, 0, i.width, i.height).data;
                const [X, Y, W, H] = g.rect;
                let n = 0,
                  all = 0;
                const at = (px, py) =>
                  [0, 1, 2].map(
                    (q) =>
                      d[
                        4 *
                          (Math.round(py * 2) * i.width + Math.round(px * 2)) +
                          q
                      ],
                  );
                const back = at(X - g.o - g.w - 3, Y + H / 2);
                // A forced or dimmed color isn't the computed one, so it is read from the ring itself.
                const color = g.sample
                  ? at(X - g.o - g.w / 2, Y + H / 2)
                  : g.color;
                for (let k = 0; k < d.length; k += 4) {
                  const px = (((k / 4) % i.width) + 0.5) / 2,
                    py = (Math.floor(k / 4 / i.width) + 0.5) / 2;
                  const qx = Math.abs(px - X - W / 2) - W / 2 + g.rad,
                    qy = Math.abs(py - Y - H / 2) - H / 2 + g.rad;
                  const dist =
                    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
                    Math.min(Math.max(qx, qy), 0) -
                    g.rad;
                  // The distance rounds a square box's corners, so it reads less than its whole ring there.
                  if (dist < g.o + 0.6 || dist > g.o + g.w - 0.6) continue;
                  all += 1;
                  if (
                    [0, 1, 2].every((q) => Math.abs(d[k + q] - color[q]) < 40)
                  )
                    n += 1;
                }
                return `${Math.round((100 * n) / all)}%${g.sample ? ` of rgb(${color}) on rgb(${back})` : ''}`;
              },
              [img, { ...g, sample: m.forced || m.item === 'disabled' }],
            );
            if (m.lifted) await page.mouse.up();
            row.push(
              `${tag} ${painted} (${g.rect
                .slice(2)
                .map((v) => Math.round(v))
                .join(
                  'x',
                )}) [${g.chain}]${m.lifted ? ` popover ${g.lifted}, focus-visible ${g.fv}, scroll ${g.scroll}` : ''}`,
            );
          }
          console.log(
            `${mode} | ${list} | ${slot} | ${name} | ${row.join(' ; ')}`,
          );
        }
  }
  await browser.close();
}
