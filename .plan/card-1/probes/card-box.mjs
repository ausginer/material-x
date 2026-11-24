// Run from packages/material-x: node ../../.plan/card-1/probes/card-box.mjs
// Reads, per engine: (1) whether one box-shadow list paints as the elevation
// stylesheet's three boxes do, at level 1 and 3; (2) which of the host's and the
// slot's padding and outline survive a page's universal reset, and whether a
// slot outline follows a stretched host.
import { createRequire } from 'node:module';
const { chromium, firefox, webkit } = createRequire(
  `${process.cwd()}/package.json`,
)('playwright');

const layers = (n, color) => ({
  umbra: `0 ${n * 0.5}px ${n * 0.7}px 0 color-mix(in srgb, ${color} 20%, transparent)`,
  penumbra: `0 ${n * 0.75}px ${n * 0.75}px 0 color-mix(in srgb, ${color} 14%, transparent)`,
  ambient: `0 ${n * 1.5}px ${n * 2}px 0 color-mix(in srgb, ${color} 12%, transparent)`,
});

const frame = (css) =>
  `<!doctype html><style>body{margin:0;background:#fff}#f{padding:40px;width:200px}
  #b{position:relative;height:80px;border-radius:12px;background:#eee}${css}</style><div id=f><div id=b></div></div>`;

for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch();
  const page = await browser.newPage();
  console.log(`## ${type.name()} ${browser.version()}`);

  for (const level of [1, 3]) {
    const { umbra, penumbra, ambient } = layers(level, '#000');
    await page.setContent(
      frame(`#b{box-shadow:${penumbra}}#b::before,#b::after{content:'';position:absolute;inset:0;border-radius:inherit}
      #b::before{box-shadow:${umbra}}#b::after{box-shadow:${ambient}}`),
    );
    const three = await page.locator('#f').screenshot();
    await page.setContent(
      frame(`#b{box-shadow:${umbra},${penumbra},${ambient}}`),
    );
    const one = await page.locator('#f').screenshot();
    const differing = await page.evaluate(
      async ([a, b]) => {
        const read = async (data) => {
          const image = new Image();
          image.src = `data:image/png;base64,${data}`;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext('2d');
          context.drawImage(image, 0, 0);
          return context.getImageData(0, 0, image.width, image.height).data;
        };
        const [x, y] = [await read(a), await read(b)];
        let max = 0;
        let pixels = 0;
        for (let i = 0; i < x.length; i += 4) {
          const d = Math.max(
            ...[0, 1, 2, 3].map((c) => Math.abs(x[i + c] - y[i + c])),
          );
          pixels += d > 0 ? 1 : 0;
          max = Math.max(max, d);
        }
        return { pixels, max, total: x.length / 4 };
      },
      [three.toString('base64'), one.toString('base64')],
    );
    console.log(`level ${level}: three boxes against one list`, differing);
  }

  await page.setContent(`<!doctype html><style>*,*::before,*::after{margin:0;padding:0;border:0 solid;outline:0}
  #g{display:grid;grid-template-columns:100px 100px;align-items:stretch}</style>
  <div id=g><x-card><img style="width:100%;height:20px;display:block"></x-card><div style="height:150px"></div></div>`);
  console.log(
    await page.evaluate(() => {
      const host = document.querySelector('x-card');
      const root = host.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>
      :host{display:flex;flex-direction:column;border-radius:12px;padding:16px;border:1px solid red}
      :host::before{content:'';border:1px solid red}
      slot{display:block;flex:1;padding:16px;border-radius:inherit;outline:1px solid red;outline-offset:-1px}</style><slot></slot>`;
      const slot = root.querySelector('slot');
      const h = getComputedStyle(host);
      const s = getComputedStyle(slot);
      const b = getComputedStyle(host, '::before');
      const size = (e) => {
        const r = e.getBoundingClientRect();
        return `${r.width}x${r.height}`;
      };
      return {
        host: { padding: h.padding, border: h.borderTopWidth },
        hostBefore: { border: b.borderTopWidth },
        slot: {
          padding: s.padding,
          outline: s.outlineWidth,
          radius: s.borderTopLeftRadius,
        },
        hostSize: size(host),
        slotSize: size(slot),
      };
    }),
  );
  await browser.close();
}
