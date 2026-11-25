// RF-142: the focus indicator of a control in an item, enabled and disabled. For each control: whether Tab reaches it, whether
// it works, and the indicator's painted color with its contrast to the list's container. `rule` adds RF-128's outline to the
// item by its values, because it isn't on `main`. Without it, the browser's outline is read.
// Run from packages/material-x, with the packages built: node ../../.plan/disabled-handle-1/probes/ring.mjs
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const playwright = require('playwright');
const { rolldown } = await import(rootRequire.resolve('rolldown'));
const entries = [
  'list/sortable-list',
  'list/list-button-item',
  'list/list-link-item',
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
const CONTROLS = {
  'handle, mx-icon': (slot) =>
    `<mx-icon data-c data-handle slot="${slot}">H</mx-icon>`,
  'native button': (slot) =>
    `<button data-c slot="${slot}" style="inline-size:24px;block-size:24px;padding:0"></button>`,
  'mx-icon-button': (slot) =>
    `<mx-icon-button data-c slot="${slot}" aria-label="x"></mx-icon-button>`,
};
const RULE =
  '::slotted([data-handle]:focus-visible) { outline: 3px solid rgb(75, 102, 42); outline-offset: 2px }';
const lum = (c) => {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].toSorted((p, q) => q - p);
  return ((x + 0.05) / (y + 0.05)).toFixed(2);
};
for (const E of ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[E].launch();
  console.log(`# ${E} ${browser.version()}`);
  const page = await browser.newPage({ viewport: { width: 500, height: 200 } });
  for (const tag of ['mx-list-button-item', 'mx-list-link-item'])
    for (const slot of ['lead', 'trail'])
      for (const [name, control] of Object.entries(CONTROLS))
        for (const rule of name.startsWith('handle') ? [false, true] : [false])
          for (const disabled of [false, true]) {
            await page.setContent(
              `<!doctype html><button id="b">b</button><script>${code}</script><mx-sortable-list style="inline-size:300px;margin-block-start:20px"><${tag} ${tag.includes('link') ? 'href="#x"' : ''} ${disabled ? 'disabled' : ''}>${control(slot)} A</${tag}><${tag}>B</${tag}></mx-sortable-list>`,
            );
            await page.evaluate(
              ([tag, rule, RULE]) => {
                window.log = [];
                const item = document.querySelector(tag);
                if (rule) {
                  const sheet = new CSSStyleSheet();
                  sheet.replaceSync(RULE);
                  item.shadowRoot.adoptedStyleSheets = [
                    ...item.shadowRoot.adoptedStyleSheets,
                    sheet,
                  ];
                }
                document
                  .querySelector('mx-sortable-list')
                  .addEventListener('reorder', () => log.push('reorder'));
                document
                  .querySelector('[data-c]')
                  .addEventListener('click', () => log.push('click'));
                document.querySelector('#b').focus();
              },
              [tag, rule, RULE],
            );
            await page.waitForTimeout(150);
            const box = await page.evaluate(() => {
              const e = document.querySelector('[data-c]');
              const { x, y, width, height } = (
                e.shadowRoot?.querySelector('.host:is(button)') ?? e
              ).getBoundingClientRect();
              return { x, y, width, height };
            });
            const clip = {
              x: Math.floor(box.x) - 8,
              y: Math.floor(box.y) - 8,
              width: Math.ceil(box.width) + 16,
              height: Math.ceil(box.height) + 16,
            };
            const shot = async () =>
              (await page.screenshot({ clip })).toString('base64');
            const reached = async () =>
              await page.evaluate(() =>
                document.activeElement?.hasAttribute('data-c'),
              );
            const before = await shot();
            let tabs = 0;
            while (tabs < 4 && !(await reached())) {
              await page.keyboard.press(E === 'webkit' ? 'Alt+Tab' : 'Tab');
              tabs += 1;
            }
            const focused = await reached();
            await page.waitForTimeout(700);
            const after = await shot();
            // The changed pixel that differs most from what it was, and what it was.
            const [ink, paper, n] = await page.evaluate(
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
                let best = -1;
                let ink = [0, 0, 0];
                let paper = [0, 0, 0];
                let n = 0;
                for (let q = 0; q < x.length; q += 4) {
                  const a = [...x.slice(q, q + 3)];
                  const b = [...y.slice(q, q + 3)];
                  const d = a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0);
                  if (d > 24) n += 1;
                  if (d > best) [best, ink, paper] = [d, b, a];
                }
                return [ink, paper, n];
              },
              [before, after],
            );
            const outline = await page.evaluate(() => {
              const e = document.querySelector('[data-c]');
              const c = getComputedStyle(e.shadowRoot?.activeElement ?? e);
              return `${c.outlineStyle} ${c.outlineWidth} ${c.outlineColor}`;
            });
            const opacity = await page.evaluate(
              ([tag, slot]) =>
                getComputedStyle(
                  document
                    .querySelector(tag)
                    .shadowRoot.querySelector(`.${slot}`),
                ).opacity,
              [tag, slot],
            );
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
            await page.mouse.click(
              box.x + box.width / 2,
              box.y + box.height / 2,
            );
            await page.waitForTimeout(150);
            const log = await page.evaluate(() => window.log.join(' '));
            console.log(
              `${tag} | ${slot} | ${name}${rule ? ", RF-128's outline" : ''} | ${disabled ? 'disabled' : 'enabled'} | Tab ${focused ? 'reaches it' : 'does not reach it'} | slot opacity ${opacity} | ${outline} | ${n} px, rgb(${ink}) on rgb(${paper}), ${contrast(ink, paper)}:1 | ${log || 'no event'}`,
            );
          }
  await browser.close();
}
