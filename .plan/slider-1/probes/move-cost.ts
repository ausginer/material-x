// Probe for the slider plan: what one value change costs, by the way the track
// and the handle are drawn. Each variant holds the native range with its
// transparent thumb.
//
//   native    - the range alone, drawn by nothing else (the floor)
//   inset     - logical insets in terms of one custom property (layout)
//   paint     - transform on the handle, clip-path on the two track parts (no layout of ours)
//   attribute - `inset`, and the host's `value` attribute written on each change
//   text      - `inset`, and the value indicator's text written
//   form      - `inset`, and setFormValue
//   all       - `inset`, text and form: what the plan's element does
//   host      - `inset`, the custom property on the host with 200 light children
//
// Style and layout are flushed after each change by reading a rect, so the
// figure has no paint. A page of 1000 elements surrounds the sliders. The
// variants are interleaved, 20 rounds of 500 changes, and the median round is
// printed, in microseconds per change. `frames` (Chromium) is the main-thread
// task time of one frame that changes the value, from Performance.getMetrics.
//
// node move-cost.ts <chromium|firefox|webkit>
import { chromium, firefox, webkit } from 'playwright';

const ENGINE = process.argv[2] as 'chromium' | 'firefox' | 'webkit';
const VARIANTS = [
  'native',
  'inset',
  'paint',
  'attribute',
  'text',
  'form',
  'all',
  'host',
];

const HTML = `<!doctype html><meta charset="utf-8"><style>x-s{display:block;inline-size:300px}</style>
<div>${'<p>text <b>bold</b></p>'.repeat(250)}</div>
${VARIANTS.map((v) => `<x-s id="${v}" variant="${v}">${v === 'host' ? '<span>x</span>'.repeat(200) : ''}</x-s>`).join('')}
<div>${'<p>text <b>bold</b></p>'.repeat(250)}</div>
<script>
customElements.define('x-s', class extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = ['value'];
  attributeChangedCallback() {}
  constructor() { super(); this.i = this.attachInternals(); }
  connectedCallback() {
    const v = this.getAttribute('variant');
    const root = this.attachShadow({ mode: 'open' });
    const base = \`
      .track{position:relative;block-size:44px}
      input{all:unset;appearance:none;position:absolute;inset:0;inline-size:100%;block-size:100%}
      input::-webkit-slider-runnable-track{block-size:100%}
      input::-webkit-slider-thumb{appearance:none;inline-size:4px;block-size:100%}
      input::-moz-range-thumb{appearance:none;border:0;inline-size:4px;block-size:44px;background:transparent}
      .handle{position:absolute;inset-block:0;inline-size:4px;background:purple;border-radius:2px;pointer-events:none}
      .handle::after{content:attr(data-v);position:absolute;inset-block-end:calc(100% + 12px);color:#fff;background:#333;visibility:hidden}
      .track::before,.track::after{content:'';position:absolute;inset-block:14px}\`;
    const inset = \`
      .handle{inset-inline-start:calc(var(--_f) * (100% - 4px))}
      .track::before{inset-inline:0 calc(100% - var(--_f) * (100% - 4px) + 6px);background:purple;border-radius:8px 2px 2px 8px}
      .track::after{inset-inline:calc(var(--_f) * (100% - 4px) + 10px) 0;background:#ddd;border-radius:2px 8px 8px 2px}\`;
    const paint = \`
      .track{container-type:inline-size}
      .handle{inset-inline-start:0;transform:translateX(calc(var(--_f) * (100cqi - 4px)))}
      .track::before,.track::after{inset-inline:0}
      .track::before{background:purple;clip-path:inset(0 calc(100% - var(--_f) * (100% - 4px) + 6px) 0 0 round 8px 2px 2px 8px)}
      .track::after{background:#ddd;clip-path:inset(0 0 0 calc(var(--_f) * (100% - 4px) + 10px) round 2px 8px 8px 2px)}\`;
    root.innerHTML = '<style>' + base + (v === 'native' ? '' : v === 'paint' ? paint : inset) + '</style><div class="track"><input type="range" max="1000">' + (v === 'native' ? '' : '<span class="handle"></span>') + '</div>' + (v === 'host' ? '<slot></slot>' : '');
    const input = root.querySelector('input');
    const track = root.querySelector('.track');
    const handle = root.querySelector('.handle');
    const target = v === 'host' ? this : track;
    this.set = (n) => {
      input.value = n;
      if (v !== 'native') target.style.setProperty('--_f', n / 1000);
      if (v === 'attribute') this.setAttribute('value', n);
      if (v === 'text' || v === 'all') handle.dataset.v = n;
      if (v === 'form' || v === 'all') this.i.setFormValue(input.value);
    };
    this.read = () => (handle ?? input).getBoundingClientRect().x;
  }
});
window.round = (id, count) => {
  const el = document.getElementById(id);
  let sink = 0;
  const start = performance.now();
  for (let n = 0; n < count; n += 1) { el.set((n * 37) % 1000); sink += el.read(); }
  return ((performance.now() - start) * 1000) / count + sink * 0;
};
window.frames = (id, count) => new Promise((resolve) => {
  const el = document.getElementById(id);
  el.scrollIntoView();
  let n = 0;
  const step = () => { el.set((n * 37) % 1000); n += 1; if (n < count) requestAnimationFrame(step); else resolve(); };
  requestAnimationFrame(step);
});
window.frames0 = (count) => new Promise((resolve) => {
  let n = 0;
  const step = () => { n += 1; if (n < count) requestAnimationFrame(step); else resolve(); };
  requestAnimationFrame(step);
});
</script>`;

const browser = await { chromium, firefox, webkit }[ENGINE].launch();
console.log(`# ${ENGINE} ${browser.version()}`);
const page = await browser.newPage();
await page.setContent(HTML);
await page.waitForTimeout(200);
const results = new Map<string, number[]>(VARIANTS.map((v) => [v, []]));
for (let round = 0; round < 22; round += 1) {
  for (const v of VARIANTS) {
    const us = await page.evaluate(([v]) => (window as any).round(v, 500), [v]);
    if (round > 1) results.get(v)!.push(us);
  }
}
for (const [v, all] of results) {
  all.sort((a, b) => a - b);
  console.log(
    `  ${v.padEnd(10)} median ${all[10]!.toFixed(1)} us, min ${all[0]!.toFixed(1)}, max ${all.at(-1)!.toFixed(1)}`,
  );
}
if (ENGINE === 'chromium') {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const metrics = async () =>
    Object.fromEntries(
      ((await cdp.send('Performance.getMetrics')) as any).metrics.map(
        (m: any) => [m.name, m.value],
      ),
    );
  const run = async (label: string, expression: string) => {
    const runs = [];
    for (let i = 0; i < 5; i += 1) {
      const a = await metrics();
      await page.evaluate(expression);
      const b = await metrics();
      const per = (k: string) => ((b[k] - a[k]) * 1e6) / 200;
      runs.push([
        per('TaskDuration'),
        per('RecalcStyleDuration'),
        per('LayoutDuration'),
      ]);
    }
    runs.sort((x, y) => x[0]! - y[0]!);
    const [task, style, layout] = runs[2]!;
    console.log(
      `  frames ${label.padEnd(10)} task ${task!.toFixed(0)} us, style ${style!.toFixed(0)}, layout ${layout!.toFixed(0)}`,
    );
  };
  await run('idle', 'frames0(200)');
  for (const v of VARIANTS) {
    await run(v, `frames('${v}', 200)`);
  }
}
await browser.close();
