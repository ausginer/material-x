// Run from packages/material-x:
//   node ../../.plan/top-app-bar-1/probes/scroll-state.mjs
// Reads, per engine: which CSS mechanisms exist; whether one IntersectionObserver
// on the document's root element reports "scrolled away from the start", and
// with how many callbacks; and where a sticky host pins.
import { createRequire } from 'node:module';
const { chromium, firefox, webkit } = createRequire(
  `${process.cwd()}/package.json`,
)('playwright');

const observe = `{
  window.calls = 0;
  window.scrolled = undefined;
  const observer = new IntersectionObserver(
    (entries) => {
      window.calls += 1;
      window.scrolled = entries.at(-1).intersectionRatio > 0;
    },
    { root: document, rootMargin: '1000000px 0px -100% 0px', threshold: 1e-9 },
  );
  observer.observe(document.documentElement);}
`;

const documentOf = (css, body = '') => `<!doctype html><style>
  body{margin:0} #tall{height:5000px;width:300px} ${css}
  </style><div id=bar style="position:sticky;top:0;height:64px;background:#ccc">bar</div>${body}<div id=tall></div>
  <script>${observe}</script>`;

const cases = {
  plain: '',
  'html height 100%': 'html{height:100%}',
  'html and body height 100%': 'html,body{height:100%}',
  'rtl, wide': 'html{direction:rtl} #tall{width:5000px}',
  'body margin 20px': 'body{margin:20px}',
  '100000px tall': '#tall{height:100000px}',
};

const settle = (target) =>
  target.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => setTimeout(resolve, 50)),
        );
      }),
  );

async function run(target) {
  const out = [];
  await settle(target);
  const step = async (label, y) => {
    await target.evaluate((top) => scrollTo({ top, behavior: 'instant' }), y);
    await settle(target);
    out.push(
      `${label}:${await target.evaluate(() => `${window.scrolled}@${Math.round(scrollY * 100) / 100}`)}`,
    );
  };
  out.push(`initial:${await target.evaluate(() => window.scrolled)}`);
  await step('1', 1);
  await step('0', 0);
  await step('0.5', 0.5);
  await step('0', 0);
  const before = await target.evaluate(() => window.calls);
  for (let y = 10; y <= 1000; y += 10) {
    await target.evaluate((top) => scrollTo({ top, behavior: 'instant' }), y);
  }
  await settle(target);
  for (let y = 1010; y <= 2000; y += 10) {
    await target.evaluate(
      (top) =>
        new Promise((resolve) => {
          scrollTo({ top, behavior: 'instant' });
          requestAnimationFrame(resolve);
        }),
      y,
    );
  }
  await settle(target);
  out.push(
    `200 steps: ${(await target.evaluate(() => window.calls)) - before} callbacks, ${await target.evaluate(() => window.scrolled)}`,
  );
  await step('end', 1e6);
  await step('0', 0);
  await step('jump', 3000);
  await step('0', 0);
  return out.join('  ');
}

for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch();
  const page = await browser.newPage();
  console.log(`## ${type.name()} ${browser.version()}`);
  console.log(
    await page.evaluate(() => ({
      'container-type: scroll-state': CSS.supports(
        'container-type',
        'scroll-state',
      ),
      'animation-timeline: scroll()': CSS.supports(
        'animation-timeline',
        'scroll()',
      ),
    })),
  );
  for (const [name, css] of Object.entries(cases)) {
    await page.setContent(documentOf(css));
    console.log(`${name}:\n  ${await run(page)}`);
  }
  // In a frame that its own page has scrolled halfway out of view.
  await page.setContent(
    '<style>body{height:3000px}</style><iframe style="width:400px;height:400px"></iframe>',
  );
  const frame = page.frames()[1];
  await frame.setContent(documentOf(''));
  await page.evaluate(() => scrollTo(0, 200));
  console.log(`frame, its page scrolled:\n  ${await run(frame)}`);

  // Counterfactuals: each requirement of the observer, taken away.
  await page.setContent(
    documentOf('html{height:100%}').replace('1000000px', '1px'),
  );
  console.log(
    `COUNTERFACTUAL top margin 1px, html height 100%:\n  ${await run(page)}`,
  );
  await page.setContent(
    '<style>body{margin:0;height:3000px}</style><iframe style="width:400px;height:400px;margin-top:100px"></iframe>',
  );
  const inner = page.frames()[1];
  await inner.setContent(documentOf('').replace('root: document, ', ''));
  console.log(
    `COUNTERFACTUAL default root, in a frame:\n  ${await run(inner)}`,
  );

  for (const [name, css, wrap] of [
    ['direct child of body', '', false],
    ['in a header', '', true],
    ['in a header with display: contents', 'header{display:contents}', true],
    ['body height 100%', 'html,body{height:100%}', false],
  ]) {
    await page.setContent(
      `<!doctype html><style>body{margin:0}${css}</style>${wrap ? '<header>' : ''}<div id=bar style="position:sticky;top:0;height:64px"></div>${wrap ? '</header>' : ''}<div style="height:5000px"></div>`,
    );
    await page.evaluate(() => scrollTo(0, 2000));
    console.log(
      `sticky, ${name}: top ${await page.evaluate(() => document.querySelector('#bar').getBoundingClientRect().top)}`,
    );
  }
  for (const z of ['auto', '1']) {
    await page.setContent(
      `<!doctype html><style>body{margin:0}</style><div id=bar style="position:sticky;top:0;height:64px;z-index:${z};background:#ccc"></div><div id=content style="position:relative;height:5000px;background:#eee"></div>`,
    );
    await page.evaluate(() => scrollTo(0, 500));
    console.log(
      `z-index ${z} over positioned content: ${await page.evaluate(() => document.elementFromPoint(10, 10).id)}`,
    );
  }
  await browser.close();
}
