// What a focused handle paints: the pixels of the first item that differ between the same handle unfocused and focused
// by the keyboard, by slot, kind of handle, item, direction and candidate sheet, and the pixels in the indicator's color.
//
// Run from packages/material-x, with the packages built:
//   node ../../.plan/handle-focus-1/probes/handle-paint.mjs
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const playwright = require('playwright');
let rolldownPath;
try {
  rolldownPath = require.resolve('rolldown');
} catch {
  rolldownPath = rootRequire.resolve('rolldown');
}
const { rolldown } = await import(rolldownPath);
const entries = [
  'list/list',
  'list/sortable-list',
  'list/list-item',
  'list/list-button-item',
  'icon/icon',
  'button/icon-button',
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
const RING =
  '::slotted([data-handle]:focus-visible) { outline: 3px solid rgb(75, 102, 42); outline-offset: 2px }';
const SHEETS = {
  'main, no rule': '',
  "the entry's rule": RING,
  'rule, .trail overflow: visible': `${RING} .trail { overflow: visible }`,
  'rule, .trail overflow: clip with a 5px margin': `${RING} .trail { overflow: clip; overflow-clip-margin: 5px }`,
  'rule, .trail with 5px padding and -5px margin': `${RING} .trail:has-slotted { padding: 5px; margin: -5px }`,
  'rule, offset -3px in .trail': `${RING} .trail::slotted([data-handle]:focus-visible) { outline-offset: -3px }`,
};
const HANDLES = {
  'mx-icon': (s) => `<mx-icon data-handle slot="${s}">H</mx-icon>`,
  span: (s) => `<span data-handle slot="${s}">Grip</span>`,
  button: (s) => `<button data-handle slot="${s}">Grip</button>`,
  'mx-icon-button': (s) =>
    `<mx-icon-button data-handle slot="${s}"><mx-icon>m</mx-icon></mx-icon-button>`,
};
const shot = async (page, clip) =>
  (await page.screenshot({ clip })).toString('base64');
const compare = (page, a, b) =>
  page.evaluate(
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
      let differ = 0;
      let ring = 0;
      for (let k = 0; k < x.length; k += 4) {
        if ([0, 1, 2].some((c) => Math.abs(x[k + c] - y[k + c]) > 12)) {
          differ += 1;
          if ([75, 102, 42].every((v, c) => Math.abs(y[k + c] - v) < 12))
            ring += 1;
        }
      }
      return { differ, ring };
    },
    [a, b],
  );
for (const E of ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[E].launch();
  console.log(`# ${E} ${browser.version()}`);
  const page = await browser.newPage();
  for (const dir of ['ltr', 'rtl']) {
    await page.setContent(
      `<!doctype html><html dir="${dir}"><div id="r"></div><script>${code}</script>`,
    );
    for (const [name, sheet] of Object.entries(SHEETS))
      for (const slot of ['lead', 'trail']) {
        const row = [];
        for (const [n, h] of Object.entries(HANDLES))
          for (const tag of ['mx-list-item', 'mx-list-button-item']) {
            await page.evaluate(
              ([t, html, s]) => {
                const r = document.querySelector('#r');
                r.innerHTML = `<button id="b">b</button><mx-sortable-list style="inline-size:300px"><${t}>${html}A</${t}><${t}>${html}B</${t}></mx-sortable-list>`;
                for (const e of r.querySelectorAll('mx-sortable-list > *')) {
                  const x = new CSSStyleSheet();
                  x.replaceSync(s);
                  e.shadowRoot.adoptedStyleSheets.push(x);
                }
                document.querySelector('#b').focus();
              },
              [tag, h(slot), sheet],
            );
            await page.waitForTimeout(60);
            const b = await page
              .locator('mx-sortable-list > *')
              .first()
              .boundingBox();
            const clip = { x: b.x, y: b.y, width: b.width, height: b.height };
            const rest = await shot(page, clip);
            let on = false;
            for (let i = 0; i < 4 && !on; i += 1) {
              await page.keyboard.press(E === 'webkit' ? 'Alt+Tab' : 'Tab');
              on = await page.evaluate(
                () => !!document.activeElement?.closest('[data-handle]'),
              );
            }
            await page.waitForTimeout(250);
            const { differ, ring } = await compare(
              page,
              rest,
              await shot(page, clip),
            );
            row.push(
              `${n} in ${tag} ${on ? `${differ} (${ring})` : 'no focus'}`,
            );
          }
        console.log(`${dir}, ${slot}, ${name}: ${row.join('; ')}`);
      }
  }
  await browser.close();
}
