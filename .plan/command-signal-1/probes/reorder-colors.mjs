// Where the reorder tokens' values can be set so that they reach the lifted
// item: on `::slotted(:state(drag))` in the sortable list's own sheet. Reads
// the lifted item's painted values with real pointer input, for a static item,
// a button item and a selected button item, and the item's background in each
// frame of a key move. The candidate sheets use fixed colors, so a value that
// didn't reach the item shows.
//
// Run from packages/material-x, with the packages built:
//   node ../../.plan/command-signal-1/probes/reorder-colors.mjs
import { readFileSync } from 'node:fs';
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
  'list/sortable-list',
  'list/list-item',
  'list/list-button-item',
];
const source = entries
  .map((e) => `import ${JSON.stringify(`${process.cwd()}/${e}.js`)};`)
  .join('');
const build = await rolldown({
  input: 'entry',
  platform: 'browser',
  plugins: [
    {
      name: 'e',
      resolveId: (id) => (id === 'entry' ? id : null),
      load: (id) => (id === 'entry' ? source : null),
    },
  ],
});
const { output } = await build.generate({ format: 'iife', name: 'mx' });
const code = output
  .map((c) => c.code ?? '')
  .join('\n')
  .replaceAll('</script', '<\\/script');

// The published names of the item's private properties, read from its sheets.
const main = readFileSync('list/styles/item/main.css.js', 'utf8');
const box = readFileSync('list/styles/item/static-box.css.js', 'utf8');
const label = /\.label\{color:var\((--[\w-]+)\)/u.exec(main)[1];
const container =
  /background:var\(--md-list-item-container-color,var\((--[\w-]+)\)/u.exec(
    box,
  )[1];
const trailing = /--md-list-item-trailing-icon-size/u.test(main)
  ? /color:var\(--[\w-]+,var\((--[\w-]+)\)\);font-size:var\(--md-list-item-trailing-icon-size/u.exec(
      main,
    )[1]
  : '';
const shape =
  /border-radius:var\(--md-list-item-container-shape,var\((--[\w-]+)\)/u.exec(
    box,
  )[1];
console.log(
  `container ${container}, label ${label}, trailing icon ${trailing}, shape ${shape}`,
);

const TOKENS = `${container}: rgb(1, 1, 1); ${label}: rgb(2, 2, 2); ${trailing}: rgb(3, 3, 3); ${shape}: 33px;`;
const LIST_SHEET = `:host(:not([data-command])) ::slotted(:state(drag)) { ${TOKENS} }`;
const ITEM_SHEET = `:host(:state(drag)) { ${TOKENS} }`;
const BOX_RESET = `:host(:popover-open) { background-color: var(--md-list-item-container-color, var(${container})) !important; color: var(${label}) !important; }`;

const HTML = (rule = '') =>
  `<!doctype html><style>body{margin:40px;font:16px sans-serif}${rule}</style><mx-sortable-list id=l style="inline-size:300px">
<mx-list-item id=s><b slot=lead data-handle>=</b>Static<i slot=trail data-icon>t</i></mx-list-item>
<mx-list-button-item id=b>Button<i slot=trail data-icon>t</i></mx-list-button-item>
<mx-list-button-item id=c selected>Selected<i slot=trail data-icon>t</i></mx-list-button-item>
<mx-list-item id=z>Last</mx-list-item></mx-sortable-list><script>${code}</script>`;

const push = (page, list, item, reset) =>
  page.evaluate(
    ([l, i, r]) => {
      const add = (root, css) => {
        const x = new CSSStyleSheet();
        x.replaceSync(css);
        root.adoptedStyleSheets.push(x);
      };
      const el = document.getElementById('l');
      if (l) add(el.shadowRoot, l);
      // The items' own sheets: before their box sheet's, as the main sheet is.
      for (const child of el.children) {
        if (i) {
          const x = new CSSStyleSheet();
          x.replaceSync(i);
          child.shadowRoot.adoptedStyleSheets.splice(2, 0, x);
        }
        if (r && child.localName === 'mx-list-item') add(child.shadowRoot, r);
      }
    },
    [list, item, reset],
  );

const read = (page, id) =>
  page.evaluate((i) => {
    const item = document.getElementById(i);
    const host = item.shadowRoot.querySelector('.host') ?? item;
    const cs = getComputedStyle(host);
    const handle = item.querySelector('[data-handle]');
    return [
      `lifted ${item.matches(':popover-open')}`,
      `active ${item.matches(':active')}`,
      `background ${cs.backgroundColor}`,
      `label ${getComputedStyle(item.shadowRoot.querySelector('.label')).color}`,
      `trailing ${getComputedStyle(item.querySelector('[slot=trail]') ?? item).color}`,
      ...(handle ? [`handle ${getComputedStyle(handle).color}`] : []),
      `radius ${cs.borderTopLeftRadius}`,
    ].join(', ');
  }, id);

for (const E of ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[E].launch();
  console.log(`# ${E} ${browser.version()}`);
  for (const [name, list, item, reset, rule] of [
    [
      'on ::slotted in the list, no reset in the static box',
      LIST_SHEET,
      '',
      '',
      '',
    ],
    ['on ::slotted in the list, with the reset', LIST_SHEET, '', BOX_RESET, ''],
    [
      'the same, with a page rule on the static item and a popover rule',
      LIST_SHEET,
      '',
      BOX_RESET,
      '#s{background-color:rgb(0,0,255)} [popover]{background:red;color:blue}',
    ],
    [
      'the same, with --md-list-item-container-color on the items',
      LIST_SHEET,
      '',
      BOX_RESET,
      'mx-sortable-list>*{--md-list-item-container-color:rgb(9,9,9)}',
    ],
    [
      "on :host(:state(drag)) in the items' main sheet",
      '',
      ITEM_SHEET,
      BOX_RESET,
      '',
    ],
  ]) {
    console.log(`## ${name}`);
    for (const id of ['s', 'b', 'c']) {
      const page = await browser.newPage({
        viewport: { width: 500, height: 420 },
      });
      page.on('pageerror', (e) => console.log('  ERROR', e.message));
      await page.setContent(HTML(rule));
      await page.waitForTimeout(150);
      await push(page, list, item, reset);
      const at = await page.evaluate((i) => {
        const el = document.getElementById(i);
        const r = (
          el.querySelector('[data-handle]') ?? el
        ).getBoundingClientRect();
        return [r.left + r.width / 2, r.top + r.height / 2];
      }, id);
      await page.mouse.move(...at);
      await page.mouse.down();
      await page.mouse.move(at[0], at[1] + 12, { steps: 4 });
      await page.waitForTimeout(500);
      console.log(`${id}: ${await read(page, id)}`);
      await page.mouse.up();
      await page.waitForTimeout(700);
      if (reset && !rule && list)
        console.log(`   after: ${await read(page, id)}`);
      await page.close();
    }
  }
  // A key move: the item's background in each frame, by whether the list keeps
  // the reorder look from a command. A commit after 100 ms, and React's delay.
  for (const [name, command] of [
    ['the reorder look in a key move', false],
    ['no reorder look in a key move', true],
  ]) {
    for (const delay of [0, 100]) {
      const page = await browser.newPage({
        viewport: { width: 500, height: 420 },
      });
      await page.setContent(HTML());
      await page.waitForTimeout(150);
      await push(page, LIST_SHEET, '', BOX_RESET);
      await page.evaluate(
        ([c, d]) => {
          const l = document.getElementById('l');
          if (c) l.toggleAttribute('data-command', true);
          l.addEventListener('reorder', (e) =>
            setTimeout(() => l.insertBefore(e.item, e.next), d),
          );
          const b = document.getElementById('b');
          b.focus();
          window.frames_ = [];
          const tick = () => {
            window.frames_.push(
              getComputedStyle(b.shadowRoot.querySelector('.host'))
                .backgroundColor,
            );
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        },
        [command, delay],
      );
      await page.waitForTimeout(80);
      await page.evaluate(() => {
        window.frames_.length = 0;
      });
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(400);
      const n = await page.evaluate(
        () =>
          window.frames_.filter((c) =>
            /^(?:rgb\(1, 1, 1\)|color\(srgb 0\.0039)/u.test(c),
          ).length,
      );
      console.log(
        `key, ${name}, commit after ${delay} ms: ${n} frames in the reorder color; order ${await page.evaluate(() => [...document.getElementById('l').children].map((x) => x.id).join(''))}`,
      );
      await page.close();
    }
  }
  await browser.close();
}
