// Touch on the handle of an enabled item of mx-sortable-list, by CDP, in Chromium, with the handle rule and each
// display of mx-icon's slot, with and without aria-hidden on it. Run from packages/material-x, on a build of main:
// node ../../.plan/touch-handle-1/probes/slot-display.mjs
import { createRequire } from 'node:module';
const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const { rolldown } = await import(rootRequire.resolve('rolldown'));
const { chromium } = require('playwright');
const entries = [
  'list/list-item',
  'list/list-button-item',
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
const CANDIDATES = {
  'block slot': [
    ':is(.lead, .trail)::slotted([data-handle]) { display: inline-block }',
    'slot { display: block }',
    false,
  ],
  'inline slot': [
    ':is(.lead, .trail)::slotted([data-handle]) { display: inline-block }',
    'slot { display: inline }',
    false,
  ],
  'inline slot, aria-hidden (RF-137)': [
    ':is(.lead, .trail)::slotted([data-handle]) { display: inline-block }',
    'slot { display: inline }',
    true,
  ],
  'block slot, aria-hidden': [
    ':is(.lead, .trail)::slotted([data-handle]) { display: inline-block }',
    'slot { display: block }',
    true,
  ],
};
const HANDLES = {
  'span with text': (slot) => `<span data-handle slot="${slot}">=</span>`,
  'mx-icon': (slot) => `<mx-icon data-handle slot="${slot}">check</mx-icon>`,
  'span with an mx-icon': (slot) =>
    `<span data-handle slot="${slot}"><mx-icon>check</mx-icon></span>`,
  'mx-icon-button': (slot) =>
    `<mx-icon-button data-handle slot="${slot}"><mx-icon>check</mx-icon></mx-icon-button>`,
  'native button': (slot) => `<button data-handle slot="${slot}">=</button>`,
  'native button with an mx-icon': (slot) =>
    `<button data-handle slot="${slot}"><mx-icon>check</mx-icon></button>`,
};
const browser = await chromium.launch();
console.log(`# chromium ${browser.version()}`);
for (const [mode, [css, iconCSS, hidden]] of Object.entries(CANDIDATES))
  for (const item of ['mx-list-item', 'mx-list-button-item'])
    for (const slot of ['lead', 'trail'])
      for (const [name, html] of Object.entries(HANDLES)) {
        const context = await browser.newContext({
          hasTouch: true,
          viewport: { width: 400, height: 500 },
        });
        const page = await context.newPage();
        page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
        await page.setContent(
          `<!doctype html><style>@font-face{font-family:'Material Symbols Outlined';src:url(data:font/ttf;base64,${FONT})}body{margin:0;height:2000px}</style><mx-sortable-list style="display:block;inline-size:300px">${['A', 'B', 'C'].map((t) => `<${item}>${html(slot)}${t}</${item}>`).join('')}</mx-sortable-list><script>${code}</script>`,
        );
        await page.evaluate(
          ([c, ic, h]) => {
            document.querySelectorAll('mx-icon').forEach((i) => {
              const s = new CSSStyleSheet();
              s.replaceSync(ic);
              i.shadowRoot.adoptedStyleSheets.push(s);
              if (h)
                i.shadowRoot
                  .querySelector('slot')
                  .setAttribute('aria-hidden', 'true');
            });
            window.lifted = false;
            window.canceled = false;
            addEventListener(
              'pointercancel',
              () => {
                window.canceled = true;
              },
              true,
            );
            document
              .querySelectorAll('mx-list-item, mx-list-button-item')
              .forEach((i) => {
                const s = new CSSStyleSheet();
                s.replaceSync(c);
                i.shadowRoot.adoptedStyleSheets.push(s);
              });
            new MutationObserver(() => {
              if (document.querySelector(':popover-open')) window.lifted = true;
            }).observe(document.body, { subtree: true, attributes: true });
          },
          [css, iconCSS, hidden],
        );
        await page.evaluate(() =>
          document.fonts.load('24px "Material Symbols Outlined"'),
        );
        await page.evaluate(
          () =>
            new Promise((r) =>
              requestAnimationFrame(() => requestAnimationFrame(r)),
            ),
        );
        const box = await page.evaluate(() => {
          const h0 = document.querySelector('[data-handle]');
          const r = (
            h0.shadowRoot?.querySelector('.host') ?? h0
          ).getBoundingClientRect();
          return {
            x: r.x + r.width / 2,
            y: r.y + r.height / 2,
            w: Math.round(r.width),
            h: Math.round(r.height),
            item: Math.round(
              document
                .querySelector('mx-list-item, mx-list-button-item')
                .getBoundingClientRect().height,
            ),
            touchAction:
              document.querySelector('[data-handle]').style.touchAction,
            display: getComputedStyle(document.querySelector('[data-handle]'))
              .display,
          };
        });
        const cdp = await context.newCDPSession(page);
        const touch = (type, y) =>
          cdp.send('Input.dispatchTouchEvent', {
            type,
            touchPoints: type === 'touchEnd' ? [] : [{ x: box.x, y }],
          });
        await touch('touchStart', box.y);
        for (let i = 1; i <= 8; i += 1) {
          await touch('touchMove', box.y + i * 8);
          await page.waitForTimeout(16);
        }
        const r = await page.evaluate(() => ({
          lifted: window.lifted,
          canceled: window.canceled,
        }));
        await touch('touchEnd');
        console.log(
          `${mode} | ${item}, ${slot} | ${name} | ${box.display} ${box.w}x${box.h}, item ${box.item}, touch-action ${box.touchAction} | lifted ${r.lifted}, pointercancel ${r.canceled}`,
        );
        await context.close();
      }
await browser.close();
