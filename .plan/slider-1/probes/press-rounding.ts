// Where a press lands on the built mx-slider: the pointer that the page sent,
// the pointer that `pointerdown` reports, and the value after it. The slider is
// 200px wide with 100 steps, or 1000, and starts at 40 %. `inset` moves it by
// a fraction of a pixel, as row 4 does. Then the drawn handle's centre against
// the one that the value gives, after a press at 70 %.
//
// node press-rounding.ts <packages> <chromium|firefox|webkit>
// Build the packages first.
import { join } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { rolldown } from 'rolldown';

const [PACKAGES, ENGINE] = process.argv.slice(2) as [
  string,
  'chromium' | 'firefox' | 'webkit',
];
const build = await rolldown({
  input: 'entry',
  platform: 'browser',
  plugins: [
    {
      name: 'entry',
      resolveId: (id) => (id === 'entry' ? id : null),
      load: (id) =>
        id === 'entry'
          ? `import ${JSON.stringify(join(PACKAGES, 'material-x/slider/slider.js'))};`
          : null,
    },
  ],
});
const { output } = await build.generate({ format: 'iife' });
const code = output.map((c) => ('code' in c ? c.code : '')).join('\n');
const browser = await { chromium, firefox, webkit }[ENGINE].launch();
console.log(`# ${ENGINE} ${browser.version()}`);

for (const deviceScaleFactor of [1, 2]) {
  const page = await browser.newPage({
    viewport: { width: 800, height: 600 },
    deviceScaleFactor,
  });
  await page.setContent(`<!doctype html><style>
body{margin:20px} mx-slider{inline-size:200px}</style><mx-slider></mx-slider>
<script>${code.replaceAll('</script', '<\\/script')}</script>`);
  await page.evaluate(() => {
    document.addEventListener('pointerdown', (e) => {
      (window as any).at = e.clientX;
    });
  });
  const press = async (
    max: number,
    inset: string,
    from: number,
    offset: number,
  ) => {
    const box = await page.evaluate(
      ([max, inset, from]) => {
        const el = document.querySelector('mx-slider') as any;
        el.style.marginInlineStart = inset;
        el.max = max;
        el.value = max * (from as number);
        const r = el.shadowRoot
          .querySelector('.handle')
          .getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      },
      [max, inset, from] as const,
    );
    const x = box.x + offset;
    await page.mouse.move(x, box.y);
    await page.mouse.down();
    await page.mouse.up();
    return {
      x,
      ...(await page.evaluate(() => {
        const el = document.querySelector('mx-slider') as any;
        const r = el.shadowRoot
          .querySelector('.handle')
          .getBoundingClientRect();
        return {
          at: (window as any).at as number,
          value: el.value as number,
          left: el.getBoundingClientRect().left as number,
          center: r.left + r.width / 2,
        };
      })),
    };
  };
  console.log(` device scale ${deviceScaleFactor}`);
  for (const [max, inset] of [
    [100, '0px'],
    [100, '0.15px'],
    [1000, '0px'],
    [1000, '0.5px'],
  ] as const) {
    const out: string[] = [];
    for (const offset of [-1.95, -1.5, 0, 1.5, 1.95]) {
      const r = await press(max, inset, 0.4, offset);
      out.push(
        `${offset}: sent ${r.x.toFixed(2)}, event ${r.at.toFixed(2)}, value ${r.value}`,
      );
    }
    console.log(`  max=${max} inset=${inset}\n   ${out.join('\n   ')}`);
  }
  const r = await press(100, '0px', 0, 137.2);
  console.log(
    `  press at 70 %: value ${r.value}, handle centre ${r.center.toFixed(2)}, expected ${(r.left + 2 + (r.value / 100) * 196).toFixed(2)}`,
  );
  await page.close();
}
await browser.close();
