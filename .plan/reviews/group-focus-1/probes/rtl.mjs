// Run from packages/material-x:
//   node ../../.plan/reviews/group-focus-1/probes/rtl.mjs <engine> <bundle>
// Each member's indicator in LTR and RTL, by pixels of its color within 7px of
// its box, with the other members hidden and shown. The first probe samples the
// straight edges only, and an inner edge that is a full arc has no sample.
import { open, focus, pixels } from '../../focus-cover-1/probes/lib.mjs';
const [engine, bundle] = process.argv.slice(2);
const { browser, page, load, key } = await open(engine, bundle);
console.log(`# ${engine} ${browser.version()}`);
const take = async (g) => {
  await pixels(page);
  return page.evaluate(
    ([g]) => {
      const i = window.__img;
      const c = document.createElement('canvas').getContext('2d');
      c.fillStyle = g.color;
      c.fillRect(0, 0, 1, 1);
      const k = c.getImageData(0, 0, 1, 1).data;
      const s = new Set();
      for (let y = Math.floor((g.y - 7) * 2); y < (g.y + g.h + 7) * 2; y++)
        for (let x = Math.floor((g.x - 7) * 2); x < (g.x + g.w + 7) * 2; x++) {
          const inside =
            x >= g.x * 2 &&
            x < (g.x + g.w) * 2 &&
            y >= g.y * 2 &&
            y < (g.y + g.h) * 2;
          const p = (y * i.width + x) * 4;
          if (
            !inside &&
            [0, 1, 2].every((j) => Math.abs(i.data[p + j] - k[j]) < 12)
          )
            s.add(p);
        }
      return [...s];
    },
    [g],
  );
};
for (const dir of ['ltr', 'rtl'])
  for (const [n, html, paths] of [
    [
      'group',
      '<mx-connected-button-group color=tonal><mx-button id=b1>One</mx-button><mx-button id=b2>Two</mx-button><mx-button id=b3>Three</mx-button></mx-connected-button-group>',
      [['#b1'], ['#b2'], ['#b3']],
    ],
    [
      'switches',
      '<mx-connected-button-group color=tonal><mx-switch-button id=b1 value=1>One</mx-switch-button><mx-switch-button id=b2 value=2>Two</mx-switch-button><mx-switch-button id=b3 value=3>Three</mx-switch-button></mx-connected-button-group>',
      [['#b1'], ['#b2'], ['#b3']],
    ],
    [
      'split',
      '<mx-split-button id=s color=tonal>Save</mx-split-button>',
      [
        ['#s', 'mx-button'],
        ['#s', 'mx-icon-button'],
      ],
    ],
  ])
    for (const path of paths) {
      await load(`<div dir=${dir}>${html}</div>`);
      await key();
      const g = await focus(page, path);
      const shown = new Set(await take(g));
      await page.evaluate((p) => {
        let r = document;
        let e;
        for (const s of p) {
          e = r.querySelector(s);
          r = e.shadowRoot;
        }
        for (const o of e.parentNode.children)
          if (o !== e) o.style.visibility = 'hidden';
      }, path);
      const alone = await take(g);
      console.log(
        `${dir} ${n} ${path.at(-1)}: painted ${alone.length}, covered ${alone.filter((p) => !shown.has(p)).length}, radii ${g.radius.map((v) => Math.round(v))}`,
      );
    }
await browser.close();
