// Architect probe for repo:RF-78: does an engine paint a 0 0 0 0 shadow under a
// rounded box, and does a layer whose colour is transparent at level 0 paint?
// Three rounded boxes at level 0, each with a box-shadow and a ::before layer,
// as the elevation stylesheet draws them, screenshotted and compared byte for byte.
import {
  chromium,
  firefox,
  webkit,
} from '../../../node_modules/playwright/index.mjs';

const layer = (p, pct) =>
  `0 calc(var(--l) * ${p}px) calc(var(--l) * ${p}px) 0 color-mix(in srgb, #3f6900 ${pct}, transparent)`;
const variants = {
  none: ['none', 'none'],
  zero: [layer(0.75, '14%'), layer(0.5, '20%')],
  transparentAtZero: [
    layer(0.75, 'calc(min(var(--l), 1) * 14%)'),
    layer(0.5, 'calc(min(var(--l), 1) * 20%)'),
  ],
};
const html = (v) => `<!doctype html><style>
body{margin:0;background:#f9faef}
.b{position:relative;margin:24px;width:240px;height:56px;border-radius:12px;background:#f9faef}
.b::before{content:'';position:absolute;inset:0;border-radius:inherit;box-shadow:var(--pb)}
</style>${[0, 1, 2].map(() => `<div class="b" style="--l:0;box-shadow:${v[0]};--pb:${v[1]}"></div>`).join('')}`;

for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  const page = await browser.newPage({ viewport: { width: 300, height: 260 } });
  const shots = {};
  for (const [k, v] of Object.entries(variants)) {
    await page.setContent(html(v));
    shots[k] = await page.screenshot();
  }
  const eq = (a, b) => Buffer.compare(shots[a], shots[b]) === 0;
  console.log(
    name,
    browser.version(),
    'zero == none:',
    eq('zero', 'none'),
    'transparentAtZero == none:',
    eq('transparentAtZero', 'none'),
  );
  await browser.close();
}
