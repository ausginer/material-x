// The focus indicator of a page's control in an item's `trail` slot, in a plain `mx-list`, with the slot's clip and without it:
// the pixels that keyboard focus changes, and those in the indicator's color (md.sys.color.secondary). The last column of a row
// is what is hit 4px outside the control's box, on each side (the control, the item, or other).
//
// Run from packages/material-x, with the packages built:
//   node ../../.plan/handle-focus-1/probes/trail-focus.mjs
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const playwright = require('playwright');
const { rolldown } = await import(rootRequire.resolve('rolldown'));
const entries = [
  'list/list',
  'list/list-item',
  'list/list-button-item',
  'icon/icon',
  'button/button',
  'button/icon-button',
  'button/switch-button',
  'checkbox/checkbox',
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
const CONTROLS = {
  'mx-icon-button': (s) =>
    `<mx-icon-button class="c" slot="${s}"><mx-icon>m</mx-icon></mx-icon-button>`,
  'mx-icon-button, standard': (s) =>
    `<mx-icon-button class="c" color="standard" slot="${s}"><mx-icon>m</mx-icon></mx-icon-button>`,
  'mx-icon-button, xsmall': (s) =>
    `<mx-icon-button class="c" size="xsmall" slot="${s}"><mx-icon>m</mx-icon></mx-icon-button>`,
  'mx-button': (s) => `<mx-button class="c" slot="${s}">B</mx-button>`,
  'mx-checkbox': (s) => `<mx-checkbox class="c" slot="${s}"></mx-checkbox>`,
  'a native button': (s) => `<button class="c" slot="${s}">Grip</button>`,
  'a link': (s) => `<a class="c" href="#x" slot="${s}">More</a>`,
  'a tabindex on mx-icon': (s) =>
    `<mx-icon class="c" tabindex="0" slot="${s}">H</mx-icon>`,
};
const shot = async (page) =>
  (
    await page.screenshot({ clip: { x: 0, y: 0, width: 500, height: 300 } })
  ).toString('base64');
const compare = (page, pair) =>
  page.evaluate(async (images) => {
    const [x, y] = await Promise.all(
      images.map(async (p) => {
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
    for (let k = 0; k < x.length; k += 4)
      if ([0, 1, 2].some((c) => Math.abs(x[k + c] - y[k + c]) > 12)) {
        differ += 1;
        if ([75, 102, 42].every((v, c) => Math.abs(y[k + c] - v) < 12))
          ring += 1;
      }
    return `${differ} (${ring})`;
  }, pair);
for (const engine of ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[engine].launch();
  console.log(`\n# ${engine} ${browser.version()}`);
  const page = await browser.newPage({ viewport: { width: 500, height: 300 } });
  await page.setContent(
    `<!doctype html><div id="r" style="padding: 40px"></div><script>${code}</script>`,
  );
  for (const [slot, overflow] of [
    ['lead', 'hidden'],
    ['trail', 'hidden'],
    ['trail', 'visible'],
  ])
    for (const [name, control] of Object.entries(CONTROLS)) {
      await page.evaluate(
        ([html, o]) => {
          document.querySelector('#r').innerHTML =
            `<button id="b">b</button><mx-list style="inline-size: 300px; margin-block-start: 20px"><mx-list-item>Label${html}</mx-list-item></mx-list>`;
          const sheet = new CSSStyleSheet();
          sheet.replaceSync(`.trail { overflow: ${o} }`);
          document
            .querySelector('mx-list-item')
            .shadowRoot.adoptedStyleSheets.push(sheet);
          document.querySelector('#b').focus();
        },
        [control(slot), overflow],
      );
      await page.waitForTimeout(80);
      const hit = await page.evaluate(() => {
        const c = document.querySelector('.c');
        const box = c.shadowRoot?.querySelector('.host') ?? c;
        const r = box.getBoundingClientRect();
        return [
          [r.left - 4, r.top + r.height / 2],
          [r.right + 4, r.top + r.height / 2],
          [r.left + r.width / 2, r.top - 4],
          [r.left + r.width / 2, r.bottom + 4],
        ]
          .map(([x, y]) => {
            const e = document.elementFromPoint(x, y);
            return c.contains(e) ? 'control' : e?.localName;
          })
          .join(' ');
      });
      // Moves focus off the button without a focus indicator of its own in the picture.
      await page.evaluate(() => document.querySelector('#b').blur());
      const rest = await shot(page);
      await page.evaluate(() => document.querySelector('#b').focus());
      let on = false;
      for (let i = 0; i < 3 && !on; i += 1) {
        await page.keyboard.press(engine === 'webkit' ? 'Alt+Tab' : 'Tab');
        on = await page.evaluate(() => !!document.activeElement?.closest('.c'));
      }
      await page.waitForTimeout(300);
      console.log(
        `${slot}, ${overflow}, ${name}: ${on ? await compare(page, [rest, await shot(page)]) : 'no focus'}; hit: ${hit}`,
      );
    }
  await browser.close();
}
