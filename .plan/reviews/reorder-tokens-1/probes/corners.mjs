// The pixel at a lifted item's top left corner, outside its 16 px rounding, and
// at its middle, with a page's background color on the item.
//
// Run from packages/material-x, with core, drag and material-x built:
//   node ../../.plan/reviews/reorder-tokens-1/probes/corners.mjs
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const playwright = require('playwright');
const any = (name) => {
  try {
    return require.resolve(name);
  } catch {
    return rootRequire.resolve(name);
  }
};
const { rolldown } = await import(any('rolldown'));
const source = ['sortable-list', 'list-item', 'list-button-item']
  .map((e) => `import ${JSON.stringify(`${process.cwd()}/list/${e}.js`)};`)
  .join('');
const build = await rolldown({
  input: 'entry',
  platform: 'browser',
  plugins: [
    {
      name: 'e',
      resolveId: (id) => (id === 'entry' ? id : null),
      load: (id) => (id === 'entry' ? source : null),
    },
  ],
});
const { output } = await build.generate({ format: 'iife', name: 'mx' });
const code = output
  .map((c) => c.code ?? '')
  .join('\n')
  .replaceAll('</script', '<\\/script');

for (const E of ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[E].launch();
  for (const tag of ['mx-list-item', 'mx-list-button-item']) {
    const page = await browser.newPage();
    await page.setContent(
      `<!doctype html><style>body{margin:40px}#i{background-color:rgb(0,0,255)}</style><mx-sortable-list id=l style="inline-size:300px"><${tag} id=i>Item</${tag}><mx-list-item>Last</mx-list-item></mx-sortable-list><script>${code}</script>`,
    );
    const pixels = async () => {
      const b = await page.locator('#i').boundingBox();
      const shot = await page.screenshot();
      return page.evaluate(
        async ([data, x, y, w, h]) => {
          const img = new Image();
          img.src = `data:image/png;base64,${data}`;
          await img.decode();
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const g = c.getContext('2d', { willReadFrequently: true });
          g.drawImage(img, 0, 0);
          const at = (px, py) =>
            [...g.getImageData(px, py, 1, 1).data].slice(0, 3).join(',');
          return `corner ${at(x + 1, y + 1)}, middle ${at(x + w * 0.7, y + h / 2)}`;
        },
        [
          shot.toString('base64'),
          Math.round(b.x),
          Math.round(b.y),
          b.width,
          b.height,
        ],
      );
    };
    await page.waitForTimeout(100);
    const rest = await pixels();
    const b = await page.locator('#i').boundingBox();
    await page.mouse.move(b.x + 20, b.y + 20);
    await page.mouse.down();
    await page.mouse.move(b.x + 20, b.y + 32, { steps: 4 });
    await page.waitForTimeout(1200);
    console.log(`${E} ${tag}: rest ${rest}; lifted ${await pixels()}`);
    await page.close();
  }
  await browser.close();
}
