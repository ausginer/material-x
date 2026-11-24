// node split.mjs <engine> <bundle>: the pixels that the entry's probe counts as
// covered in a split button, one by one, at scale 1 as there.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const playwright = createRequire(`${process.cwd()}/package.json`)('playwright');
const [engine, bundle] = process.argv.slice(2);
const browser = await playwright[engine].launch();
console.log(`# ${engine} ${browser.version()}`);
const page = await browser.newPage({ viewport: { width: 600, height: 420 } });
await page.setContent(
  `<!doctype html><style>body{margin:40px;background:#fff}*{transition:none!important}</style><mx-split-button>Save</mx-split-button><script>${fs.readFileSync(bundle, 'utf8')}</script>`,
);
await page.waitForTimeout(100);
await page.keyboard.press(engine === 'webkit' ? 'Alt+Tab' : 'Tab');
await page.waitForTimeout(350);
const p = await page.evaluate(() => {
  const r = document.querySelector('mx-split-button').shadowRoot;
  window.bs = [...r.querySelectorAll('mx-button, mx-icon-button')];
  const h = bs.map((b) => b.shadowRoot.querySelector('.host'));
  const [q, w] = h.map((x) => x.getBoundingClientRect());
  return {
    clip: { x: q.right - 1, y: q.top - 8, width: 8, height: q.height + 16 },
    q: [q.x, q.y, q.right, q.bottom],
    second: w.left,
    radius: getComputedStyle(h[0]).borderRadius,
  };
});
const shot = async () =>
  (await page.screenshot({ clip: p.clip })).toString('base64');
const shown = await shot();
await page.evaluate(() => {
  bs[1].style.visibility = 'hidden';
  bs[1].shadowRoot.querySelector('.host').style.visibility = 'hidden';
});
const alone = await shot();
const r = await page.evaluate(
  async ([a, b]) => {
    const load = async (d) => {
      const i = new Image();
      i.src = `data:image/png;base64,${d}`;
      await i.decode();
      const c = document.createElement('canvas');
      c.width = i.width;
      c.height = i.height;
      const x = c.getContext('2d');
      x.drawImage(i, 0, 0);
      return x.getImageData(0, 0, i.width, i.height);
    };
    const [A, B] = [await load(a), await load(b)];
    const o = [];
    let exact = 0,
      lost = 0;
    for (let i = 0; i < B.data.length; i += 4) {
      const x = (i / 4) % B.width,
        y = Math.floor(i / 4 / B.width);
      const s = [...A.data.slice(i, i + 3)],
        t = [...B.data.slice(i, i + 3)];
      const isI = (c) =>
        Math.abs(c[0] - 75) < 12 &&
        Math.abs(c[1] - 102) < 12 &&
        Math.abs(c[2] - 42) < 12;
      if (isI(t)) {
        exact++;
        if (!isI(s)) lost++;
      }
      if (
        t[0] + t[1] + t[2] < 600 &&
        Math.abs(s[0] - t[0]) + Math.abs(s[1] - t[1]) + Math.abs(s[2] - t[2]) >
          36
      )
        o.push(`x ${x} y ${y}: second hidden ${t}, shown ${s}`);
    }
    return { o, exact, lost, w: B.width, h: B.height };
  },
  [shown, alone],
);
console.log(JSON.stringify(p));
console.log(
  `counted ${r.o.length}; of the indicator's own color ${r.lost}/${r.exact} lost`,
);
r.o.slice(0, 12).forEach((x) => console.log('  ' + x));
await browser.close();
