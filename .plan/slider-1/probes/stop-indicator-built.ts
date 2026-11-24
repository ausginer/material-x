// Whether two builds of mx-slider draw the same: sizes, disabled and RTL, at
// four values, at device scale 4, and in forced colors (not in WebKit). Counts
// the pixels where a channel differs by more than 48 of 255, as
// stop-indicator.ts does.
//
// node stop-indicator-built.ts <before> <after>
// Each is a self-contained ES module of slider.js. Build and bundle it first.
import { readFile } from 'node:fs/promises';
import { chromium, firefox, webkit } from 'playwright';

const sources = await Promise.all(
  process.argv.slice(2, 4).map((file) => readFile(file, 'utf8')),
);
let html = '';
for (const attr of [
  '',
  'size=small',
  'size=medium',
  'size=large',
  'size=xlarge',
  'disabled',
  'dir=rtl',
]) {
  for (const value of [0, 40, 97, 100]) {
    html += `<mx-slider ${attr} value=${value}></mx-slider>`;
  }
}
for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch();
  console.log(`# ${type.name()} ${browser.version()}`);
  for (const forcedColors of ['none', 'active'] as const) {
    if (forcedColors === 'active' && type === webkit) continue;
    const context = await browser.newContext({
      deviceScaleFactor: 4,
      viewport: { width: 300, height: 1900 },
      forcedColors,
    });
    const page = await context.newPage();
    const shots: string[] = [];
    let height = 0;
    for (const source of sources) {
      await page.goto('about:blank');
      await page.setContent(
        `<!doctype html><style>body{margin:10px}mx-slider{inline-size:200px}</style>${html}`,
      );
      await page.addScriptTag({ type: 'module', content: source });
      await page.waitForFunction(() => customElements.get('mx-slider'));
      height = await page.evaluate(() => document.body.scrollHeight);
      shots.push((await page.screenshot()).toString('base64'));
    }
    const differ = await page.evaluate(async (pngs) => {
      const [x, y] = await Promise.all(
        pngs.map(async (png) => {
          const image = new Image();
          image.src = `data:image/png;base64,${png}`;
          await image.decode();
          const c = new OffscreenCanvas(image.width, image.height).getContext(
            '2d',
          )!;
          c.drawImage(image, 0, 0);
          return c.getImageData(0, 0, image.width, image.height).data;
        }),
      );
      let count = 0;
      for (let i = 0; i < x!.length; i += 4) {
        if ([0, 1, 2].some((k) => Math.abs(x![i + k]! - y![i + k]!) > 48)) {
          count += 1;
        }
      }
      return count;
    }, shots);
    console.log(
      `  forced colors ${forcedColors}: ${differ} pixels differ, page ${height}px of 1900px`,
    );
  }
  await browser.close();
}
