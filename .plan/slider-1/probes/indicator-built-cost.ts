// What one value change costs on two builds of mx-slider, with the value
// indicator hidden and shown by keyboard focus. Style and layout are flushed
// after each change by reading a rect. 1000 other elements, 24 rounds of 400
// changes, with the four rows interleaved, in microseconds per change.
//
// node indicator-built-cost.ts <before.js> <after.js> <chromium|firefox|webkit>
// The files are slider.js bundled by `rolldown --format iife`, before and after.
import { readFile } from 'node:fs/promises';
import { loadavg } from 'node:os';
import { chromium, firefox, webkit } from 'playwright';

const [BEFORE, AFTER, ENGINE] = process.argv.slice(2) as [
  string,
  string,
  'chromium' | 'firefox' | 'webkit',
];
const filler = '<p>text <b>bold</b></p>'.repeat(250);
const browser = await { chromium, firefox, webkit }[ENGINE].launch();
console.log(
  `# ${ENGINE} ${browser.version()}, load average ${loadavg()[0]!.toFixed(1)}`,
);
const rows: Array<{ name: string; page: any; all: number[] }> = [];
for (const [build, file] of [
  ['before', BEFORE],
  ['after', AFTER],
] as const) {
  const code = (await readFile(file, 'utf8')).replaceAll(
    '</script',
    '<\\/script',
  );
  for (const shown of [false, true]) {
    const page = await browser.newPage();
    await page.setContent(
      `<!doctype html><div style="height:120px"></div><mx-slider id=s max=1000 indicator></mx-slider><div>${filler}</div><script>${code}</script>`,
    );
    if (shown) {
      await page.bringToFront();
      await page.keyboard.press('Tab');
      await page.waitForTimeout(400);
    }
    rows.push({
      name: `${build}, ${shown ? 'shown' : 'hidden'}`,
      page,
      all: [],
    });
  }
}
for (let n = 0; n < 26; n += 1) {
  for (const { page, all } of rows) {
    await page.bringToFront();
    const us = await page.evaluate(() => {
      const el = document.getElementById('s')!;
      const input = el.shadowRoot!.querySelector('input')!;
      const box = el.shadowRoot!.querySelector('.handle')!;
      let sink = 0;
      const start = performance.now();
      for (let i = 0; i < 400; i += 1) {
        input.value = String((i * 37) % 1000);
        input.dispatchEvent(
          new Event('input', { bubbles: true, composed: true }),
        );
        sink += box.getBoundingClientRect().x;
      }
      return ((performance.now() - start) * 1000) / 400 + sink * 0;
    });
    if (n > 1) all.push(us);
  }
}
for (const { name, page, all } of rows) {
  const isShown = await page.evaluate(() => {
    const root = document.getElementById('s')!.shadowRoot!;
    const part = root.querySelector('.indicator');
    const style = part
      ? getComputedStyle(part)
      : getComputedStyle(root.querySelector('.handle')!, '::after');
    return style.display !== 'none';
  });
  all.sort((a, b) => a - b);
  console.log(
    `  ${name.padEnd(15)} (display ${isShown ? 'on' : 'none'}) median ${all[12]!.toFixed(1)}, min ${all[0]!.toFixed(1)}`,
  );
}
console.log(`  load average ${loadavg()[0]!.toFixed(1)}`);
await browser.close();
