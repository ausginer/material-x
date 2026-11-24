// node contrast.mjs <engine> <bundle>: the indicator's color, the item's
// container beside it and the page outside it, in each state, with WCAG ratios.
import { open, focus, pixels } from './lib.mjs';
const [engine, bundle] = process.argv.slice(2);
for (const opt of [{}, { colorScheme: 'dark' }]) {
  const { browser, page, load, key } = await open(engine, bundle, opt);
  console.log(`# ${engine} ${browser.version()} ${JSON.stringify(opt)}`);
  const lum = (c) => {
    const [r, g, b] = c.map((v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return ((x + 0.05) / (y + 0.05)).toFixed(2);
  };
  for (const t of ['mx-list-item', 'mx-list-button-item', 'mx-list-link-item'])
    for (const sel of t === 'mx-list-item' ? [''] : ['', 'selected'])
      for (const st of ['rest', 'hovered', 'pressed']) {
        if (t === 'mx-list-item' && st === 'pressed') continue;
        await load(
          `<mx-list style="width:300px"><${t} id=f ${sel} href=#x tabindex=${t === 'mx-list-item' ? 0 : -1}>Item</${t}><${t}>Item</${t}></mx-list>`,
        );
        if (st === 'pressed') {
          await key();
          await page.keyboard.press('Tab');
        }
        await key();
        let g = await focus(page, ['#f']);
        if (st !== 'rest') {
          await page.mouse.move(g.x + 150, g.y + g.h / 2);
          await page.waitForTimeout(300);
        }
        if (st === 'pressed') {
          await page.keyboard.down(t.includes('link') ? 'Enter' : ' ');
          await page.mouse.down();
          await page.waitForTimeout(700);
        }
        const vis = await page.evaluate(() => {
          const e = document.querySelector('#f');
          const b = e.shadowRoot.querySelector('.host') ?? e;
          return getComputedStyle(b).outlineStyle;
        });
        await pixels(page);
        const c = await page.evaluate(
          ([x, y, d]) => {
            const m = window.__img;
            const at = (yy) => [
              ...m.data
                .slice((Math.floor(yy * d) * m.width + Math.floor(x * d)) * 4)
                .slice(0, 3),
            ];
            return [at(y + 1.5), at(y + 4.5), at(y - 3)];
          },
          [g.x + 60, g.y, 2],
        );
        console.log(
          `${t} ${sel || 'unselected'} ${st} (outline ${vis}): indicator ${c[0]} | container ${c[1]} ${ratio(c[0], c[1])} | page ${c[2]} ${ratio(c[0], c[2])}`,
        );
        if (st === 'pressed') {
          await page.mouse.up();
          await page.keyboard.up(t.includes('link') ? 'Enter' : ' ');
        }
      }
  await browser.close();
}
