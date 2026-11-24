// Run from packages/material-x:
//   node ../../.plan/top-app-bar-1/probes/scroll-sideways.mjs
// Reads, per engine, whether the observer's state matches `scrollY > 0` on a
// page that is also scrolled sideways, with 0px and with large side margins.
import { createRequire } from 'node:module';
const { chromium, firefox, webkit } = createRequire(
  `${process.cwd()}/package.json`,
)('playwright');

const MARGINS = {
  '0px sides': '1000000px 0px -100% 0px',
  'large sides': '1000000px 1000000px -100% 1000000px',
};
const PAGES = {
  wide: '',
  'wide, html height 100%': 'html{height:100%}',
  'wide, rtl': 'html{direction:rtl}',
  'wide, html width max-content': 'html{width:max-content}',
};
const XS = [0, 1000, 1279, 1280, 1281, 2500, 4000, 4720];
const YS = [0, 1, 300, 3000, 0];

for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch();
  console.log(`## ${type.name()} ${browser.version()}`);
  for (const [margins, rootMargin] of Object.entries(MARGINS)) {
    for (const [name, css] of Object.entries(PAGES)) {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 720 },
      });
      await page.setContent(`<!doctype html><style>body{margin:0}${css}
        </style><div style="width:6000px;height:5000px"></div><script>{
        window.calls = 0;
        new IntersectionObserver((entries) => {
          window.calls += 1;
          window.scrolled = entries.at(-1).intersectionRatio > 0;
        }, { root: document, rootMargin: '${rootMargin}', threshold: 1e-9 })
          .observe(document.documentElement);}</script>`);
      const bad = await page.evaluate(
        async ([xs, ys, sign]) => {
          const settle = () =>
            new Promise((resolve) => {
              requestAnimationFrame(() =>
                requestAnimationFrame(() => setTimeout(resolve, 30)),
              );
            });
          const wrong = [];
          for (const x of xs) {
            for (const y of ys) {
              scrollTo({ left: x * sign, top: y, behavior: 'instant' });
              await settle();
              if (window.scrolled !== scrollY > 0) {
                wrong.push(`${scrollX},${scrollY}`);
              }
            }
          }
          // A sideways scroll away from the start crosses nothing.
          scrollTo({ left: 0, top: 300, behavior: 'instant' });
          await settle();
          const before = window.calls;
          for (let x = 0; x <= 4700; x += 100) {
            scrollTo({ left: x * sign, top: 300, behavior: 'instant' });
            await settle();
          }
          return { wrong, sideways: window.calls - before };
        },
        [XS, YS, css.includes('rtl') ? -1 : 1],
      );
      console.log(
        `${margins} | ${name}: ${bad.wrong.length} of ${XS.length * YS.length} positions wrong${bad.wrong.length > 0 ? ` (${bad.wrong.join(' ')})` : ''}; callbacks over 48 sideways steps at y 300: ${bad.sideways}`,
      );
      await page.close();
    }
  }
  await browser.close();
}
