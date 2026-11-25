// Touch and mouse on an item without a handle in mx-sortable-list, in Chromium: a swipe, and a press held before it.
// Run from packages/material-x, with the packages built: node ../../.plan/inline-handle-1/probes/no-handle.mjs
import { createRequire } from 'node:module';
const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const { rolldown } = await import(rootRequire.resolve('rolldown'));
const { chromium } = require('playwright');
const entries = [
  'list/list-item',
  'list/list-button-item',
  'list/list-link-item',
  'list/sortable-list',
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
import { readFileSync } from 'node:fs';
const FONT = readFileSync(
  'tests/support/fonts/material-symbols-subset.ttf',
).toString('base64');

const ITEMS = {
  'mx-list-item': (t) => `<mx-list-item>${t}</mx-list-item>`,
  'mx-list-button-item': (t) =>
    `<mx-list-button-item>${t}</mx-list-button-item>`,
  'mx-list-link-item, href': (t) =>
    `<mx-list-link-item href="#x">${t}</mx-list-link-item>`,
  'mx-list-link-item, draggable=false': (t) =>
    `<mx-list-link-item href="#x" draggable="false">${t}</mx-list-link-item>`,
};
const STYLES = {
  built: '',
  'touch-action: none on the item':
    'mx-sortable-list > * { touch-action: none }',
  'user-select: none on the item':
    'mx-sortable-list > * { user-select: none; -webkit-user-select: none }',
  both: 'mx-sortable-list > * { touch-action: none; user-select: none; -webkit-user-select: none }',
};
const browser = await chromium.launch();
console.log(`# chromium ${browser.version()}`);
for (const [style, css] of Object.entries(STYLES))
  for (const [item, html] of Object.entries(ITEMS))
    for (const [input, hold] of [
      ['touch swipe', 0],
      ['touch held 800 ms, then moved', 800],
      ['mouse', 0],
    ]) {
      const context = await browser.newContext({
        hasTouch: true,
        viewport: { width: 400, height: 500 },
      });
      const page = await context.newPage();
      page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
      await page.setContent(
        `<!doctype html><style>@font-face{font-family:'Material Symbols Outlined';src:url(data:font/ttf;base64,${FONT})}body{margin:0;height:2000px}${css}</style><mx-sortable-list style="display:block;inline-size:300px">${['First item text', 'Second item text', 'Third item text'].map(html).join('')}</mx-sortable-list><script>${code}</script>`,
      );
      await page.evaluate(() => {
        window.lifted = false;
        window.canceled = false;
        window.menu = false;
        addEventListener(
          'pointercancel',
          () => {
            window.canceled = true;
          },
          true,
        );
        addEventListener(
          'contextmenu',
          () => {
            window.menu = true;
          },
          true,
        );
        document
          .querySelector('mx-sortable-list')
          .addEventListener('reorder', () => {
            window.reorder = true;
          });
        window.reorder = false;
        new MutationObserver(() => {
          if (document.querySelector(':popover-open')) window.lifted = true;
        }).observe(document.body, { subtree: true, attributes: true });
      });
      await page.evaluate(
        () =>
          new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r)),
          ),
      );
      const box = await page.evaluate(() => {
        const r = document
          .querySelector('mx-sortable-list > *')
          .getBoundingClientRect();
        return { x: r.x + 60, y: r.y + r.height / 2 };
      });
      const cdp = await context.newCDPSession(page);
      const touch = (type, y) =>
        cdp.send('Input.dispatchTouchEvent', {
          type,
          touchPoints: type === 'touchEnd' ? [] : [{ x: box.x, y }],
        });
      const steps = Array.from({ length: 10 }, (_, i) => box.y + (i + 1) * 9);
      if (input === 'mouse') {
        await page.mouse.move(box.x, box.y);
        await page.mouse.down();
        for (const y of steps) {
          await page.mouse.move(box.x + 20, y);
          await page.waitForTimeout(16);
        }
      } else {
        await touch('touchStart', box.y);
        await page.waitForTimeout(hold);
        for (const y of steps) {
          await touch('touchMove', y);
          await page.waitForTimeout(16);
        }
      }
      const r = await page.evaluate(() => ({
        lifted: window.lifted,
        canceled: window.canceled,
        menu: window.menu,
        sel: String(getSelection()).replace(/\s+/g, ' ').slice(0, 40),
        scroll: Math.round(scrollY),
      }));
      if (input === 'mouse') await page.mouse.up();
      else await touch('touchEnd');
      await page.waitForTimeout(50);
      const proposed = await page.evaluate(() => window.reorder);
      console.log(
        `${style} | ${item} | ${input} | lifted ${r.lifted}, canceled ${r.canceled}, proposed ${proposed}, selection ${JSON.stringify(r.sel)}, contextmenu ${r.menu}, scrollY ${r.scroll}`,
      );
      await context.close();
    }
await browser.close();
