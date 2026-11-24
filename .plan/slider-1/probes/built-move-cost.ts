// What one value change costs on the built mx-slider, beside move-cost.ts's
// floor, the native range alone. Style and layout are flushed after each change
// by reading a rect. 1000 other elements, 20 rounds of 500 changes, the median
// round, in microseconds per change. A change is the native value written to
// the shadow input and an `input` event dispatched on it, as a move's is.
//
// node built-move-cost.ts <packages> <chromium|firefox|webkit>
// Build the packages first.
import { join } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { rolldown } from 'rolldown';

const [PACKAGES, ENGINE] = process.argv.slice(2) as [
  string,
  'chromium' | 'firefox' | 'webkit',
];
const build = await rolldown({
  input: join(PACKAGES, 'material-x/slider/slider.js'),
  platform: 'browser',
});
const { output } = await build.generate({
  format: 'iife',
  name: 'slider',
  exports: 'named',
});
const code = output.map((c) => ('code' in c ? c.code : '')).join('\n');
const filler = '<p>text <b>bold</b></p>'.repeat(250);
const browser = await { chromium, firefox, webkit }[ENGINE].launch();
console.log(`# ${ENGINE} ${browser.version()}`);
const page = await browser.newPage();
await page.setContent(
  `<!doctype html><div>${filler}</div><input id="native" type="range" max="1000"><mx-slider id="plain" max="1000"></mx-slider><mx-slider id="indicator" max="1000" indicator></mx-slider><div>${filler}</div><script>${code.replaceAll('</script', '<\\/script')}</script>`,
);
const round = (id: string) =>
  page.evaluate((id) => {
    const el = document.getElementById(id)!;
    const input = (el.shadowRoot?.querySelector('input') ??
      el) as HTMLInputElement;
    const box = el.shadowRoot?.querySelector('.handle') ?? el;
    let sink = 0;
    const start = performance.now();
    for (let n = 0; n < 500; n += 1) {
      input.value = String((n * 37) % 1000);
      input.dispatchEvent(
        new Event('input', { bubbles: true, composed: true }),
      );
      sink += box.getBoundingClientRect().x;
    }
    return ((performance.now() - start) * 1000) / 500 + sink * 0;
  }, id);
const IDS = ['native', 'plain', 'indicator'];
const results = new Map<string, number[]>(IDS.map((id) => [id, []]));
for (let n = 0; n < 22; n += 1) {
  for (const id of IDS) {
    const us = await round(id);
    if (n > 1) results.get(id)!.push(us);
  }
}
for (const [id, all] of results) {
  all.sort((a, b) => a - b);
  console.log(
    `  ${id.padEnd(10)} median ${all[10]!.toFixed(1)} us, min ${all[0]!.toFixed(1)}, max ${all.at(-1)!.toFixed(1)}`,
  );
}
await browser.close();
