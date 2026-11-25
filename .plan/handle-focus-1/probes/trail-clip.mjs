// What `.trail`'s `overflow: hidden` does: for each content of the slot, the item's pixels (with 60px around it) that differ
// between `hidden` and `visible`, whether a box moved, and the slot's client and scroll width.
//
// Run from packages/material-x, with the packages built:
//   node ../../.plan/handle-focus-1/probes/trail-clip.mjs
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
const LONG = 'A trailing text that is much longer than the item it is in ';
const CONTENT = {
  'short text': '<span slot="trail">12:30</span>',
  descenders: '<span slot="trail">gjpqy ÅÇ</span>',
  'long text': `<span slot="trail">${LONG.repeat(2)}</span>`,
  'long text, the page lets it wrap': `<span slot="trail" style="white-space: normal">${LONG}</span>`,
  'long text, the page bounds the span': `<span slot="trail" style="display: block; max-inline-size: 80px">${LONG}</span>`,
  'the same, with its own clip and ellipsis': `<span slot="trail" style="display: block; max-inline-size: 80px; overflow: hidden; text-overflow: ellipsis">${LONG}</span>`,
  'a long unbreakable word, a bounded span': `<span slot="trail" style="display: block; max-inline-size: 80px; white-space: normal">${'x'.repeat(40)}</span>`,
  'two texts': '<span slot="trail">12:30</span><span slot="trail">new</span>',
  'mx-icon': '<mx-icon slot="trail">H</mx-icon>',
  'mx-icon with a long name and no font':
    '<mx-icon slot="trail">chevron_right</mx-icon>',
  'mx-icon-button':
    '<mx-icon-button slot="trail"><mx-icon>m</mx-icon></mx-icon-button>',
  'mx-button, elevated':
    '<mx-button color="elevated" slot="trail">Elevated</mx-button>',
  'mx-switch-button': '<mx-switch-button slot="trail">S</mx-switch-button>',
  'mx-checkbox': '<mx-checkbox slot="trail"></mx-checkbox>',
  'an image of 56px':
    '<div slot="trail" style="inline-size: 56px; block-size: 56px; background: red"></div>',
  'a box of 150px in height':
    '<div slot="trail" style="inline-size: 40px; block-size: 150px; background: red"></div>',
  'a badge on an icon, 6px out':
    '<mx-icon slot="trail" style="position: relative">H<i style="position: absolute; inset: -6px -6px auto auto; inline-size: 12px; block-size: 12px; background: red"></i></mx-icon>',
  'a shadow':
    '<div slot="trail" style="inline-size: 30px; block-size: 30px; background: white; box-shadow: 0 0 12px red"></div>',
  'a negative margin':
    '<div slot="trail" style="inline-size: 30px; block-size: 30px; margin-inline-end: -10px; background: red"></div>',
};
const shot = async (page, clip) =>
  (await page.screenshot({ clip })).toString('base64');
const differ = (page, pair) =>
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
    let n = 0;
    for (let k = 0; k < x.length; k += 4)
      if ([0, 1, 2].some((c) => Math.abs(x[k + c] - y[k + c]) > 12)) n += 1;
    return n;
  }, pair);
const boxes = (page) =>
  page.evaluate(() => {
    const item = document.querySelector('#r mx-list > *');
    const trail = item.shadowRoot.querySelector('.trail');
    const child = document.querySelector('[slot=trail]');
    return {
      rects: JSON.stringify(
        [item, trail, item.shadowRoot.querySelector('.content'), child].map(
          (e) => {
            const r = e.getBoundingClientRect();
            return [r.x, r.y, r.width, r.height].map((v) => v.toFixed(2));
          },
        ),
      ),
      text: `item ${item.offsetWidth}, trail ${trail.clientWidth}x${trail.clientHeight}, scroll ${trail.scrollWidth}x${trail.scrollHeight}, page ${document.documentElement.scrollWidth}`,
    };
  });
for (const engine of ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[engine].launch();
  console.log(`\n# ${engine} ${browser.version()}`);
  const page = await browser.newPage({
    viewport: { width: 1000, height: 500 },
  });
  await page.setContent(
    `<!doctype html><div id="r" style="padding: 80px"></div><script>${code}</script>`,
  );
  for (const dir of ['ltr', 'rtl'])
    for (const tag of ['mx-list-item', 'mx-list-button-item'])
      for (const [name, html] of Object.entries(CONTENT)) {
        const images = [];
        const read = [];
        for (const overflow of ['hidden', 'visible']) {
          await page.evaluate(
            ([t, h, o, d]) => {
              document.documentElement.dir = d;
              document.querySelector('#r').innerHTML =
                `<mx-list style="inline-size: 300px"><${t}>Label${h}</${t}></mx-list>`;
              const sheet = new CSSStyleSheet();
              sheet.replaceSync(`.trail { overflow: ${o} }`);
              document
                .querySelector('#r mx-list > *')
                .shadowRoot.adoptedStyleSheets.push(sheet);
            },
            [tag, html, overflow, dir],
          );
          await page.waitForTimeout(40);
          images.push(
            await shot(page, { x: 0, y: 0, width: 1000, height: 400 }),
          );
          read.push(await boxes(page));
        }
        const moved =
          read[0].rects === read[1].rects
            ? 'no box moved'
            : `MOVED ${read[0].rects} ${read[1].rects}`;
        console.log(
          `${dir}, ${tag}, ${name}: ${await differ(page, images)} px differ, ${moved}; hidden: ${read[0].text}; visible: ${read[1].text}`,
        );
      }
  await browser.close();
}
