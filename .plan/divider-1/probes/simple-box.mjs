// The simple box for mx-divider, in three engines: a divider whose line is in
// normal flow, with no positioned host and no containing block, and mx-card's
// A1 rule with its padding split into an inline and a block property. The line is
// the host's own background, clipped to its content box, with the insets as
// the host's padding. Its painted box is read as the host's content box,
// against the card's border box or the container's. Then Chromium's accessibility tree.
import { createRequire } from 'node:module';
const require = createRequire(
  new URL('../../../packages/material-x/package.json', import.meta.url),
);
const pw = require('playwright');

const CARD = `
:host { display: flow-root; box-sizing: border-box !important;
  padding-inline: var(--md-card-padding-inline, 16px) !important;
  padding-block: var(--md-card-padding-block, 16px) !important;
  position: relative; background: #eee; border-radius: 12px; }
::slotted(x-divider:not(:state(vertical))) {
  margin-inline: calc(-1 * var(--md-card-padding-inline, 16px)) !important; }`;
const H = `
:host { display: block; box-sizing: content-box !important; block-size: 1px;
  background-color: gray; background-clip: content-box !important; }
:host(:state(start)) { padding-inline: 16px 0 !important; }
:host(:state(middle)) { padding-inline: 16px !important; }
:host(:state(vertical)) { inline-size: 1px; block-size: auto; }
:host(:state(vertical):state(start)) { padding-inline: 0 !important; padding-block: 16px 0 !important; }
:host(:state(vertical):state(middle)) { padding-inline: 0 !important; padding-block: 16px !important; }
@media (forced-colors: active) { :host { forced-color-adjust: none; background-color: CanvasText; } }`;
const RESET =
  '*, *::before, *::after { margin: 0; padding: 0; border: 0; box-sizing: border-box; }';

async function setup(page, form) {
  await page.setContent(
    '<style id="reset"></style><main id="m" style="inline-size:320px"></main>',
  );
  await page.evaluate(
    ([card, divider]) => {
      const sheet = (css) => {
        const s = new CSSStyleSheet();
        s.replaceSync(css);
        return s;
      };
      const cardSheet = sheet(card),
        dividerSheet = sheet(divider);
      customElements.define(
        'x-card',
        class extends HTMLElement {
          constructor() {
            super();
            const r = this.attachShadow({ mode: 'open' });
            r.adoptedStyleSheets = [cardSheet];
            r.innerHTML = '<slot></slot>';
          }
        },
      );
      customElements.define(
        'x-list',
        class extends HTMLElement {
          constructor() {
            super();
            this.attachInternals().role = 'list';
            const r = this.attachShadow({ mode: 'open' });
            r.adoptedStyleSheets = [
              sheet(':host{display:flex;flex-direction:column}'),
            ];
            r.innerHTML = '<slot></slot>';
          }
        },
      );
      customElements.define(
        'x-item',
        class extends HTMLElement {
          constructor() {
            super();
            this.attachInternals().role = 'listitem';
          }
        },
      );
      customElements.define(
        'x-divider',
        class extends HTMLElement {
          static observedAttributes = ['inset', 'orientation'];
          #i = this.attachInternals();
          constructor() {
            super();
            this.attachShadow({ mode: 'open' }).adoptedStyleSheets = [
              dividerSheet,
            ];
          }
          attributeChangedCallback(name, old, value) {
            if (old) this.#i.states.delete(old);
            if (value) this.#i.states.add(value);
          }
        },
      );
    },
    [CARD, form],
  );
}

// The line's painted box: the host's content box.
function lineRect(el) {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const px = (v) => parseFloat(v) || 0;
  return {
    l: r.left + px(cs.borderLeftWidth) + px(cs.paddingLeft),
    r: r.right - px(cs.borderRightWidth) - px(cs.paddingRight),
    t: r.top + px(cs.borderTopWidth) + px(cs.paddingTop),
    b: r.bottom - px(cs.borderBottomWidth) - px(cs.paddingBottom),
  };
}

const CASES = [
  [
    'card, full-width',
    '<x-card id="c"><p>A</p><x-divider id="d"></x-divider><p>B</p></x-card>',
    'card',
  ],
  [
    'card, start',
    '<x-card id="c"><p>A</p><x-divider id="d" inset="start"></x-divider><p>B</p></x-card>',
    'card',
  ],
  [
    'card, middle',
    '<x-card id="c"><p>A</p><x-divider id="d" inset="middle"></x-divider><p>B</p></x-card>',
    'card',
  ],
  [
    'card, inline 24px',
    '<x-card id="c" style="--md-card-padding-inline:24px"><p>A</p><x-divider id="d"></x-divider><p>B</p></x-card>',
    'card',
  ],
  [
    'card, inline 0',
    '<x-card id="c" style="--md-card-padding-inline:0"><p>A</p><x-divider id="d" inset="start"></x-divider><p>B</p></x-card>',
    'card',
  ],
  [
    'card, block 8px inline 24px, start',
    '<x-card id="c" style="--md-card-padding-block:8px;--md-card-padding-inline:24px"><p>A</p><x-divider id="d" inset="start"></x-divider><p>B</p></x-card>',
    'card',
  ],
  [
    'card rtl, start',
    '<x-card id="c" dir="rtl"><p>A</p><x-divider id="d" inset="start"></x-divider><p>B</p></x-card>',
    'card',
  ],
  [
    'card, page margin-inline-start 56px on divider',
    '<x-card id="c"><p>A</p><x-divider id="d" style="margin-inline-start:56px"></x-divider><p>B</p></x-card>',
    'card',
  ],
  [
    'card, page margin-block 8px on divider',
    '<x-card id="c"><p>A</p><x-divider id="d" style="margin-block:8px"></x-divider><p>B</p></x-card>',
    'card',
  ],
  [
    'card, divider in a child div',
    '<x-card id="c"><div><x-divider id="d"></x-divider></div></x-card>',
    'card',
  ],
  [
    'card, vertical direct child in a page flex row',
    '<x-card id="c" style="display:flex;block-size:48px"><span>A</span><x-divider id="d" orientation="vertical"></x-divider><span>B</span></x-card>',
    'card',
  ],
  [
    'div, full-width',
    '<div id="c"><x-divider id="d"></x-divider></div>',
    'box',
  ],
  [
    'div, start',
    '<div id="c"><x-divider id="d" inset="start"></x-divider></div>',
    'box',
  ],
  [
    'div, middle',
    '<div id="c"><x-divider id="d" inset="middle"></x-divider></div>',
    'box',
  ],
  [
    'div rtl, start',
    '<div id="c" dir="rtl"><x-divider id="d" inset="start"></x-divider></div>',
    'box',
  ],
  [
    'div, page margin-inline-start 56px',
    '<div id="c"><x-divider id="d" style="margin-inline-start:56px"></x-divider></div>',
    'box',
  ],
  [
    'flex row 48px, vertical',
    '<div id="c" style="display:flex;block-size:48px"><span>A</span><x-divider id="d" orientation="vertical"></x-divider><span>B</span></div>',
    'box',
  ],
  [
    'flex row 48px, vertical start',
    '<div id="c" style="display:flex;block-size:48px"><span>A</span><x-divider id="d" orientation="vertical" inset="start"></x-divider><span>B</span></div>',
    'box',
  ],
  [
    'flex row 48px, vertical middle',
    '<div id="c" style="display:flex;block-size:48px"><span>A</span><x-divider id="d" orientation="vertical" inset="middle"></x-divider><span>B</span></div>',
    'box',
  ],
  [
    'list, start',
    '<x-list id="c"><x-item>A</x-item><x-divider id="d" inset="start"></x-divider><x-item>B</x-item></x-list>',
    'box',
  ],
];

const lines = [];
for (const type of ['chromium', 'firefox', 'webkit']) {
  const browser = await pw[type].launch();
  {
    const page = await browser.newPage();
    await setup(page, H);
    lines.push(
      `== ${type} ${browser.version()}: line's start / end / top / bottom from the container's border box, px; then its thickness`,
    );
    for (const reset of [false, true]) {
      await page.evaluate(
        (css) => {
          document.getElementById('reset').textContent = css;
        },
        reset ? RESET : '',
      );
      for (const [name, html] of CASES) {
        const out = await page.evaluate(
          async ([html, lineRectSrc]) => {
            const lineRect = new Function(`return (${lineRectSrc})`)();
            const m = document.getElementById('m');
            m.innerHTML = html;
            await new Promise((r) =>
              requestAnimationFrame(() => requestAnimationFrame(r)),
            );
            const c = document.getElementById('c').getBoundingClientRect();
            const d = document.getElementById('d');
            const L = lineRect(d);
            const rtl = getComputedStyle(d).direction === 'rtl';
            const start = rtl ? c.right - L.r : L.l - c.left;
            const end = rtl ? L.l - c.left : c.right - L.r;
            const r2 = (v) => Math.round(v * 10) / 10;
            return `${r2(start)} / ${r2(end)} / ${r2(L.t - c.top)} / ${r2(c.bottom - L.b)}; ${r2(Math.min(L.r - L.l, L.b - L.t))}`;
          },
          [html, lineRect.toString()],
        );
        lines.push(`${reset ? 'reset ' : ''}${name} | ${out}`);
      }
    }
    if (type === 'chromium') {
      await page.emulateMedia({ forcedColors: 'active' });
      await page.evaluate(() => {
        document.getElementById('reset').textContent = '';
        document.getElementById('m').innerHTML =
          '<div id="c"><x-divider id="d"></x-divider></div>';
      });
      const fc = await page.evaluate(() => {
        const cs = getComputedStyle(document.getElementById('d'));
        const canvasText = (() => {
          const p = document.createElement('p');
          p.style.color = 'CanvasText';
          document.body.append(p);
          const v = getComputedStyle(p).color;
          p.remove();
          return v;
        })();
        return `forced colors: line ${cs.backgroundColor}, CanvasText ${canvasText}`;
      });
      lines.push(fc);
      await page.emulateMedia({ forcedColors: 'none' });
      const cdp = await page.context().newCDPSession(page);
      for (const [name, html] of [
        ['bare', '<x-divider></x-divider>'],
        ['div', '<div><p>A</p><x-divider></x-divider><p>B</p></div>'],
        [
          'list',
          '<x-list><x-item>A</x-item><x-divider inset="middle"></x-divider><x-item>B</x-item></x-list>',
        ],
        ['card', '<x-card><p>A</p><x-divider></x-divider><p>B</p></x-card>'],
        ['card without a divider', '<x-card><p>A</p><p>B</p></x-card>'],
        [
          'div, vertical in a flex row',
          '<div style="display:flex;block-size:48px"><span>A</span><x-divider orientation="vertical"></x-divider><span>B</span></div>',
        ],
        [
          'div, role=separator',
          '<div><p>A</p><x-divider role="separator"></x-divider><p>B</p></div>',
        ],
      ]) {
        await page.evaluate((html) => {
          document.getElementById('m').innerHTML = html;
        }, html);
        await page.evaluate(
          () =>
            new Promise((r) =>
              requestAnimationFrame(() => requestAnimationFrame(r)),
            ),
        );
        const { nodes } = await cdp.send('Accessibility.getFullAXTree');
        const byId = new Map(nodes.map((n) => [n.nodeId, n]));
        const main = nodes.find((n) => n.role?.value === 'main');
        const walk = (n, acc) => {
          for (const id of n.childIds ?? []) {
            const c = byId.get(id);
            if (!c) continue;
            if (
              !c.ignored &&
              !['StaticText', 'InlineTextBox'].includes(c.role?.value)
            )
              acc.push(c.role.value);
            walk(c, acc);
          }
          return acc;
        };
        lines.push(
          `accessibility tree, ${name} | ${walk(main, []).join(',') || '(nothing)'}`,
        );
      }
    }
    await page.close();
  }
  await browser.close();
}
console.log(lines.join('\n'));
