// The pixels that a Tab onto a focusable [data-handle] changes within 10px of it, with the rule and without it, for a handle of
// the label slot and for a consumer's element with a focus indicator of its own. Saves a PNG of each.
// Run from packages/material-x, with the packages built: node ../../.plan/reviews/handle-focus-1/probes/other-places.mjs [folder]
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const playwright = require('playwright');
const { rolldown } = await import(rootRequire.resolve('rolldown'));
const entries = [
  'list/list',
  'list/sortable-list',
  'list/list-item',
  'icon/icon',
];
const build = await rolldown({
  input: 'entry',
  platform: 'browser',
  plugins: [
    {
      name: 'e',
      resolveId: (id) => (id === 'entry' ? id : null),
      load: (id) =>
        id === 'entry'
          ? entries
              .map(
                (e) => `import ${JSON.stringify(`${process.cwd()}/${e}.js`)};`,
              )
              .join('')
          : null,
    },
  ],
});
const { output } = await build.generate({ format: 'iife', name: 'mx' });
const code = output
  .map((c) => c.code ?? '')
  .join('\n')
  .replaceAll('</script', '<\\/script');
const define = (name, css) =>
  `customElements.define("${name}", class extends HTMLElement { constructor() { super(); this.attachShadow({ mode: "open" }).innerHTML = "<style>:host { display: inline-block; inline-size: 24px; block-size: 24px; border-radius: 12px } ${css}</style><b>G</b>"; } });`;
const grips = [
  define(
    'x-own',
    ':host(:focus-visible) { outline: 4px dotted red; outline-offset: 1px }',
  ),
  define(
    'x-inner',
    ':host(:focus-visible) { outline: none } :host(:focus-visible) b { outline: 2px solid red }',
  ),
].join('');
const CASES = {
  "a consumer's element, :host(:focus-visible) { outline: 4px dotted red }":
    '<x-own data-c data-handle slot="lead"></x-own>',
  "a consumer's element, outline: none on :host, and its own on an inner box":
    '<x-inner data-c data-handle slot="lead"></x-inner>',
  'a b of the label slot, tabindex':
    '<b data-c data-handle tabindex="0">Grip</b>',
  'the same, display: block':
    '<b data-c data-handle tabindex="0" style="display:block">Grip</b>',
  'mx-icon in support, tabindex':
    '<mx-icon data-c data-handle tabindex="0" slot="support">H</mx-icon>',
};
for (const E of ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[E].launch();
  console.log(`# ${E} ${browser.version()}`);
  const page = await browser.newPage({ viewport: { width: 500, height: 200 } });
  for (const [name, html] of Object.entries(CASES)) {
    const row = [];
    for (const rule of [true, false]) {
      await page.setContent(
        `<!doctype html><button id="b">b</button><script>${code}</script><script>${grips}</script><mx-sortable-list style="inline-size:300px"><mx-list-item>${html} A</mx-list-item></mx-sortable-list>`,
      );
      await page.evaluate((rule) => {
        const item = document.querySelector('mx-list-item');
        // Takes the unit's rule out of the adopted sheets.
        if (!rule)
          item.shadowRoot.adoptedStyleSheets =
            item.shadowRoot.adoptedStyleSheets.map((s) => {
              const c = new CSSStyleSheet();
              c.replaceSync(
                [...s.cssRules]
                  .filter(
                    (r) => !r.cssText.includes('[data-handle]:focus-visible'),
                  )
                  .map((r) => r.cssText)
                  .join('\n'),
              );
              return c;
            });
        document.querySelector('#b').focus();
      }, rule);
      await page.waitForTimeout(100);
      // Another tab stop keeps the item's own focused state, so only the handle's pixels change.
      const box = await page.locator('[data-c]').boundingBox();
      const clip = {
        x: box.x - 10,
        y: box.y - 10,
        width: box.width + 20,
        height: box.height + 20,
      };
      const before = (await page.screenshot({ clip })).toString('base64');
      for (
        let i = 0;
        i < 3 &&
        !(await page.evaluate(() =>
          document.activeElement?.hasAttribute('data-c'),
        ));
        i += 1
      )
        await page.keyboard.press(E === 'webkit' ? 'Alt+Tab' : 'Tab');
      await page.waitForTimeout(400);
      const after = await page.screenshot({ clip });
      const n = await page.evaluate(
        async (pair) => {
          const [x, y] = await Promise.all(
            pair.map(async (p) => {
              const i = new Image();
              i.src = `data:image/png;base64,${p}`;
              await i.decode();
              const c = document.createElement('canvas');
              c.width = i.width;
              c.height = i.height;
              const g = c.getContext('2d');
              g.drawImage(i, 0, 0);
              return g.getImageData(0, 0, i.width, i.height).data;
            }),
          );
          let k = 0;
          let ring = 0;
          for (let q = 0; q < x.length; q += 4)
            if ([0, 1, 2].some((c) => Math.abs(x[q + c] - y[q + c]) > 12)) {
              k += 1;
              if ([75, 102, 42].every((v, c) => Math.abs(y[q + c] - v) < 40))
                ring += 1;
            }
          return `${k} px, ${ring} in the indicator's color`;
        },
        [before, after.toString('base64')],
      );
      const s = await page.evaluate(() => {
        const c = getComputedStyle(document.querySelector('[data-c]'));
        return `${c.outlineStyle} ${c.outlineWidth} ${c.outlineColor} ${c.outlineOffset}`;
      });
      row.push(`${rule ? 'with' : 'without'} the rule: ${s}, ${n}`);
      if (process.argv[2])
        (await import('node:fs')).writeFileSync(
          `${process.argv[2]}/${E}-${Object.keys(CASES).indexOf(name)}-${rule}.png`,
          after,
        );
    }
    console.log(`${name} | ${row.join(' | ')}`);
  }
  await browser.close();
}
