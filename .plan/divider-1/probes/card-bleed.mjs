// Q2: how a divider can reach mx-card's edges. Five card stylesheets, each on a
// card-like element whose host rule copies mx-card's
// (card/styles/default/main.styles.css at 7c8932bbe), with a divider-like
// element whose line is an absolutely positioned box, as the plan's divider
// draws it. Every figure is in px, relative to the card's border box.
// Run: node .plan/divider-1/probes/card-bleed.mjs [chromium|firefox|webkit]
import { createRequire } from 'node:module';
const require = createRequire(
  new URL('../../../packages/material-x/package.json', import.meta.url),
);
const engine = require('playwright')[process.argv[2] ?? 'chromium'];

const HOST = `
  :host { display: flow-root; position: relative; box-sizing: border-box !important;
    inline-size: 320px; background: #eee; border-radius: 12px; }
  slot { border-radius: inherit; }`;
const PAD = 'var(--md-card-padding, 16px)';
const CARDS = {
  // mx-card today.
  current: `:host { padding: ${PAD} !important; }`,
  // The owner's first idea: no padding on the card, the padding on each slotted
  // element.
  'slotted-padding': `
    ::slotted(*) { padding-inline: ${PAD} !important; }
    ::slotted(:first-child) { padding-block-start: ${PAD} !important; }
    ::slotted(:last-child) { padding-block-end: ${PAD} !important; }`,
  // The owner's second idea, a mechanism of (a): the card keeps its padding and
  // pulls a horizontal divider out by it.
  'divider-margin': `:host { padding: ${PAD} !important; }
    ::slotted(mx-divider:not([orientation='vertical' i])) {
      margin-inline: calc(-1 * ${PAD}) !important; }`,
  // Another mechanism of (a): the divider isn't positioned in a card, so its
  // line's containing block is the card's padding box.
  'divider-static': `:host { padding: ${PAD} !important; }
    ::slotted(mx-divider:not([orientation='vertical' i])) { position: static !important; }`,
  // The same without `!important`: the divider's own `:host` rule is
  // `position: relative`, and a page rule on the divider can still opt out.
  'divider-static-normal': `:host { padding: ${PAD} !important; }
    ::slotted(mx-divider:not([orientation='vertical' i])) { position: static; }`,
  // Another design: every slotted element's box reaches the card's edges, and
  // its content is padded back in.
  'all-bleed': `:host { padding: ${PAD} !important; }
    ::slotted(*) { margin-inline: calc(-1 * ${PAD}) !important;
      padding-inline: ${PAD} !important; }`,
};
const DIVIDER = `
  :host { display: block; position: relative; block-size: 1px; }
  :host([orientation='vertical' i]) { inline-size: 1px; block-size: auto; align-self: stretch; }
  .line { position: absolute; inset-inline: 0; block-size: 1px; background: #000; }
  :host([orientation='vertical' i]) .line { inset-block: 0; block-size: auto; }
  :host([inset='start' i]) .line { inset-inline-start: 16px; }
  :host([inset='middle' i]) .line { inset-inline: 16px; }
  :host([orientation='vertical' i][inset='start' i]) .line { inset-inline: 0; inset-block-start: 16px; }`;
const BUTTON = `:host { display: contents; } button { all: unset; display: inline-block; }`;

const CASES = {
  'full-width divider': `<p>Text</p><mx-divider id="t"></mx-divider><p>Text</p>`,
  'inset divider': `<p>Text</p><mx-divider id="t" inset="start"></mx-divider><p>Text</p>`,
  'middle divider': `<p>Text</p><mx-divider id="t" inset="middle"></mx-divider><p>Text</p>`,
  'divider, page position: relative on it': `<p>Text</p><mx-divider id="t" style="position: relative"></mx-divider><p>Text</p>`,
  'divider in a child div': `<div><p>Text</p><mx-divider id="t"></mx-divider></div>`,
  'divider with a page margin-inline-start: 56px': `<p>Text</p><mx-divider id="t" style="margin-inline-start: 56px"></mx-divider><p>Text</p>`,
  'text in a p': `<p id="t">Text</p>`,
  'a text node': `Text`,
  'a heading, first': `<h2 id="t" style="margin-block: 0">Title</h2><p>Text</p>`,
  'media, first, width 100%': `<img id="t" style="display:block; inline-size:100%; block-size:40px" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"><p>Text</p>`,
  'media in a div, first': `<div id="t" style="block-size:40px; background:#888"></div><p>Text</p>`,
  'a button, direct': `<p>Text</p><x-button id="t"></x-button>`,
  'a p with a page padding: 8px': `<p id="t" style="padding: 8px; background: #ccc">Text</p>`,
  'a p with a page margin-inline: 8px': `<p id="t" style="margin-inline: 8px">Text</p>`,
  'a div, border-box, width 100%': `<div id="t" style="box-sizing:border-box; inline-size:100%; background:#ccc">Text</div>`,
  'nested element': `<div><p id="t">Text</p></div>`,
};
const PAGES = {
  plain: '',
  'universal reset':
    '*, *::before, *::after { margin: 0; padding: 0; border: 0 solid; }',
};

const browser = await engine.launch();
const page = await browser.newPage();
await page.setContent(
  '<!doctype html><body style="margin:0"><style id="page"></style><main id="m" style="padding:40px"></main></body>',
);
await page.evaluate(
  ({ HOST, CARDS, DIVIDER, BUTTON }) => {
    const sheet = (css) => {
      const s = new CSSStyleSheet();
      s.replaceSync(css);
      return s;
    };
    customElements.define(
      'mx-divider',
      class extends HTMLElement {
        constructor() {
          super();
          const r = this.attachShadow({ mode: 'open' });
          r.adoptedStyleSheets = [sheet(DIVIDER)];
          r.innerHTML = '<i class="line"></i>';
        }
      },
    );
    customElements.define(
      'x-button',
      class extends HTMLElement {
        constructor() {
          super();
          const r = this.attachShadow({ mode: 'open' });
          r.adoptedStyleSheets = [sheet(BUTTON)];
          r.innerHTML = '<button>Go</button>';
        }
      },
    );
    for (const [name, css] of Object.entries(CARDS)) {
      customElements.define(
        `card-${name}`,
        class extends HTMLElement {
          constructor() {
            super();
            const r = this.attachShadow({ mode: 'open' });
            r.adoptedStyleSheets = [sheet(HOST + css)];
            r.innerHTML = '<slot></slot>';
          }
        },
      );
    }
  },
  { HOST, CARDS, DIVIDER, BUTTON },
);

/** Inline start, inline end, block start: the target's distance from the card's edges. */
async function measure(card, html, pageCss, cardStyle = '') {
  return page.evaluate(
    ({ card, html, pageCss, cardStyle }) => {
      document.getElementById('page').textContent = pageCss;
      const m = document.getElementById('m');
      m.innerHTML = `<card-${card} style="${cardStyle}">${html}</card-${card}>`;
      const c = m.firstElementChild.getBoundingClientRect();
      const t = m.querySelector('#t');
      let r;
      if (!t) {
        const range = document.createRange();
        range.selectNodeContents(m.firstElementChild);
        r = range.getBoundingClientRect();
      } else if (t.localName === 'mx-divider')
        r = t.shadowRoot.querySelector('.line').getBoundingClientRect();
      else if (t.localName === 'x-button')
        r = t.shadowRoot.querySelector('button').getBoundingClientRect();
      else if (t.localName === 'p' || t.localName === 'h2') {
        const range = document.createRange();
        range.selectNodeContents(t);
        r = range.getBoundingClientRect();
      } else r = t.getBoundingClientRect();
      const f = (n) => Math.round(n * 10) / 10;
      return `start ${f(r.left - c.left)}, end ${f(c.right - r.right)}, top ${f(r.top - c.top)}, w ${f(r.width)}, h ${f(r.height)}`;
    },
    { card, html, pageCss, cardStyle },
  );
}

for (const [pageName, pageCss] of Object.entries(PAGES)) {
  for (const [caseName, html] of Object.entries(CASES)) {
    console.log(`== ${caseName} — ${pageName} page`);
    for (const card of Object.keys(CARDS))
      console.log(`  ${card.padEnd(16)} ${await measure(card, html, pageCss)}`);
  }
}

console.log('\n== --md-card-padding: 8px 24px (block, inline), plain page');
for (const caseName of ['full-width divider', 'inset divider', 'text in a p']) {
  console.log(`  ${caseName}`);
  for (const card of Object.keys(CARDS))
    console.log(
      `    ${card.padEnd(16)} ${await measure(card, CASES[caseName], '', '--md-card-padding: 8px 24px')}`,
    );
}

console.log(
  '\n== a page display: flex on the card, with a vertical divider between two p, plain page',
);
for (const card of Object.keys(CARDS))
  console.log(
    `  ${card.padEnd(16)} ${await measure(card, '<p style="margin:0">A</p><mx-divider id="t" orientation="vertical"></mx-divider><p style="margin:0">B</p>', '', 'display: flex; gap: 8px')}`,
  );

console.log(
  "\n== a page display: grid, two columns, on the card: the second column's text, plain page",
);
for (const card of Object.keys(CARDS))
  console.log(
    `  ${card.padEnd(16)} ${await measure(card, '<p style="margin:0">A</p><p id="t" style="margin:0">B</p>', '', 'display: grid; grid-template-columns: 1fr 1fr')}`,
  );

console.log(`\n${process.argv[2] ?? 'chromium'}`, browser.version());
await browser.close();
