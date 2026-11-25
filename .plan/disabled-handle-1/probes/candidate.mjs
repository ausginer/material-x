// RF-142, the candidate of (a): the disabled opacity on the elements of `lead` and `trail` instead of their slots, and none on
// one that has focus. Reads the pixels of the unfocused disabled item, as it is and with the candidate, and the focused
// indicator's, in `lead`. RF-128's outline and the opacity are added by their values, because the build renames the private
// properties.
// Run from packages/material-x, with the packages built: node ../../.plan/disabled-handle-1/probes/candidate.mjs <engine>
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const playwright = require('playwright');
const { rolldown } = await import(rootRequire.resolve('rolldown'));
const entries = [
  'list/sortable-list',
  'list/list-button-item',
  'button/icon-button',
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
const OUTLINE =
  '::slotted([data-handle]:focus-visible) { outline: 3px solid rgb(75, 102, 42); outline-offset: 2px }';
const CANDIDATE =
  ':host(:state(disabled)) :is(.lead, .trail) { opacity: 1 } :host(:state(disabled)) :is(.lead, .trail)::slotted(:not(:focus-within)) { opacity: 0.38 }';
const CONTROLS = {
  'handle, mx-icon': '<mx-icon data-c data-handle slot="lead">H</mx-icon>',
  'native button':
    '<button data-c slot="lead" style="inline-size:24px;block-size:24px;padding:0"></button>',
  'mx-icon-button':
    '<mx-icon-button data-c slot="lead" aria-label="x"></mx-icon-button>',
};
const E = process.argv[2];
const browser = await playwright[E].launch();
console.log(`# ${E} ${browser.version()}`);
const page = await browser.newPage({ viewport: { width: 500, height: 200 } });
for (const [name, control] of Object.entries(CONTROLS)) {
  const still = [];
  for (const candidate of [false, true]) {
    await page.setContent(
      `<!doctype html><button id="b">b</button><script>${code}</script><mx-sortable-list style="inline-size:300px;margin-block-start:20px"><mx-list-button-item disabled>${control} A<span slot="support">support</span><mx-icon slot="trail">T</mx-icon></mx-list-button-item></mx-sortable-list>`,
    );
    await page.evaluate(
      (css) => {
        const root = document.querySelector('mx-list-button-item').shadowRoot;
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
        document.querySelector('#b').focus();
      },
      OUTLINE + (candidate ? CANDIDATE : ''),
    );
    await page.waitForTimeout(300);
    const clip = { x: 0, y: 30, width: 330, height: 120 };
    const read = async () =>
      (await page.screenshot({ clip })).toString('base64');
    const dim = await page.evaluate(() =>
      ['[data-c]', '[slot=trail]'].map(
        (q) => getComputedStyle(document.querySelector(q)).opacity,
      ),
    );
    const before = await read();
    still.push(before);
    await page.keyboard.press(E === 'webkit' ? 'Alt+Tab' : 'Tab');
    const focused = await page.evaluate(() =>
      document.activeElement?.hasAttribute('data-c'),
    );
    await page.waitForTimeout(700);
    const after = await read();
    const result = await page.evaluate(
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
        let ring = 0;
        for (let q = 0; q < y.length; q += 4)
          if (
            [75, 102, 42].every((v, c) => Math.abs(y[q + c] - v) < 12) &&
            Math.abs(x[q] - y[q]) > 24
          )
            ring += 1;
        return ring;
      },
      [before, after],
    );
    console.log(
      `${name} | ${candidate ? 'candidate' : 'as it is'} | Tab ${focused ? 'reaches it' : 'does not reach it'} | ${result} px in the indicator's undimmed color | opacity of the control and the trail icon before focus ${dim}, of the control with focus ${await page.evaluate(() => getComputedStyle(document.querySelector('[data-c]')).opacity)}`,
    );
  }
  const difference = await page.evaluate(async (pair) => {
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
        return Object.assign(g.getImageData(0, 0, i.width, i.height));
      }),
    );
    let n = 0;
    let max = 0;
    let box = [1e9, 1e9, 0, 0];
    for (let q = 0; q < x.data.length; q += 4) {
      const d = Math.max(
        ...[0, 1, 2].map((c) => Math.abs(x.data[q + c] - y.data[q + c])),
      );
      if (d) {
        n += 1;
        max = Math.max(max, d);
        const px = (q / 4) % x.width;
        const py = Math.floor(q / 4 / x.width);
        box = [
          Math.min(box[0], px),
          Math.min(box[1], py),
          Math.max(box[2], px),
          Math.max(box[3], py),
        ];
      }
    }
    const of = (s) => {
      const r = document.querySelector(s).getBoundingClientRect();
      return [r.x, r.y - 30, r.right, r.bottom - 30].map(Math.round).join();
    };
    return `${n} px differ, by ${max} at most, in the box ${box}; the trail icon's box is ${of('[slot=trail]')}, the control's ${of('[data-c]')}`;
  }, still);
  console.log(
    `${name} | unfocused, the candidate against the item as it is: ${difference}`,
  );
}
await browser.close();
