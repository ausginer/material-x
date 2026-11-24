// Run from packages/material-x:
//   node ../../.plan/top-app-bar-1/probes/top-layer-box.mjs
// The top-layer box in RTL, vertical writing and after moveBefore, and what each
// of its requirements does when it is taken away. Chromium, Firefox and WebKit.
import { createRequire } from 'node:module';
const playwright = createRequire(`${process.cwd()}/package.json`)('playwright');

const documentOf = ({
  css = '',
  popover = true,
  margin = '0px 1000000px',
  on = '!entry.isIntersecting',
  root = 'document',
} = {}) => `<!doctype html><style>body{margin:0}
  x-bar{display:block;position:sticky;top:0;height:64px} #tall{height:5000px;width:6000px}${css}</style>
  <x-bar id=bar></x-bar><div id=tall></div><script>
  customElements.define('x-bar', class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).innerHTML = '<slot style="display:block"></slot><div style="position:absolute;inset:0;width:0;height:0;margin:0;border:0;padding:0;visibility:hidden"></div>';
      this.box = this.shadowRoot.lastChild;
      ${popover ? "this.box.popover = 'manual';" : ''}
      this.o = new IntersectionObserver((entries) => {
        const entry = entries.at(-1); this.on = ${on};
      }, { ${root === 'document' ? 'root: document, ' : ''}rootMargin: '${margin}' });
    }
    connectedCallback() { ${popover ? 'this.box.showPopover();' : ''} this.o.observe(this.box); }
    disconnectedCallback() { this.o.disconnect(); }
  });</script>`;
const settle = (target) =>
  target.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => setTimeout(resolve, 60)),
        );
      }),
  );
const POSITIONS = [
  [0, 0],
  [0, 1],
  [0, 300],
  [0, 0],
  [3000, 0],
  [3000, 1],
  [3000, 300],
  [0, 0],
];

for (const name of ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[name].launch();
  console.log(`## ${name} ${browser.version()}`);
  let page;
  // A new page for each case: a reused window keeps its element registry.
  const open = async (html) => {
    await page?.close();
    page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.setContent(html);
    await settle(page);
  };
  const walk = async (target, sign = 1) => {
    const out = [];
    await settle(target);
    for (const [x, y] of POSITIONS) {
      await target.evaluate(
        ([left, top]) => scrollTo({ left, top, behavior: 'instant' }),
        [x * sign, y],
      );
      await settle(target);
      out.push(
        await target.evaluate(() => {
          const { on } = document.querySelector('#bar');
          return `${on === scrollY > 0 ? '' : 'WRONG '}${Math.round(scrollX)},${Math.round(scrollY)}:${on ? 'on' : 'off'}`;
        }),
      );
    }
    return out.join('  ');
  };
  for (const [label, options, sign] of [
    ['as ruled', {}],
    ['as ruled, RTL', { css: 'html{direction:rtl}' }, -1],
    ['as ruled, vertical-rl', { css: 'html{writing-mode:vertical-rl}' }, -1],
    ['COUNTERFACTUAL 0px sides', { margin: '0px' }],
    ['COUNTERFACTUAL 2px at the top', { margin: '2px 1000000px 0px' }],
    ['COUNTERFACTUAL not in the top layer', { popover: false }],
  ]) {
    await open(documentOf(options));
    console.log(`${label}: ${await walk(page, sign)}`);
  }
  for (const [label, options] of [
    ['in a frame, as ruled', {}],
    ['COUNTERFACTUAL in a frame, default root', { root: '' }],
  ]) {
    await open(
      '<style>body{margin:0;height:3000px}</style><iframe style="width:400px;height:400px;margin-top:100px"></iframe>',
    );
    await page.frames()[1].setContent(documentOf(options));
    await page.evaluate(() => scrollTo(0, 200));
    console.log(`${label}: ${await walk(page.frames()[1])}`);
  }
  for (const [label, on] of [
    ['as ruled', '!entry.isIntersecting'],
    [
      'COUNTERFACTUAL state from the box top',
      'entry.boundingClientRect.top < 0',
    ],
  ]) {
    await open(documentOf({ on }));
    const out = [];
    for (const [display, top] of [
      ['block', 0],
      ['none', 0],
      ['none', 300],
      ['block', 300],
      ['none', 300],
      ['none', 0],
      ['block', 0],
    ]) {
      await page.evaluate(
        ([d, y]) => {
          document.querySelector('#bar').style.display = d;
          scrollTo({ top: y, behavior: 'instant' });
        },
        [display, top],
      );
      await settle(page);
      out.push(
        `${display}@${top}:${await page.evaluate(() => (document.querySelector('#bar').on ? 'on' : 'off'))}`,
      );
    }
    console.log(`hidden and shown, ${label}: ${out.join('  ')}`);
  }
  await open(documentOf());
  console.log(
    'moveBefore, then scrolled:',
    await page.evaluate(() => {
      const bar = document.querySelector('#bar');
      if (!document.body.moveBefore) {
        return 'not in this engine';
      }
      const errors = [];
      addEventListener('error', (event) => errors.push(event.message));
      document.body.moveBefore(bar, null);
      document.body.moveBefore(bar, document.body.firstChild);
      return `${errors.join() || 'no error'}, box shown ${bar.box.matches(':popover-open')}`;
    }),
    await walk(page),
  );
  await browser.close();
}
