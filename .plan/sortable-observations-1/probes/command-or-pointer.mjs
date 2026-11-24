// Whether a microtask queued in drag's `onStart` has run when `onReorder` is
// called, for a command and for a pointer drop, with real input. A key that
// starts no command calls neither.
//
// Run from packages/material-x, with the packages built:
//   node ../../.plan/sortable-observations-1/probes/command-or-pointer.mjs
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
const drag = `${process.cwd()}/../drag`;
const source = `import { sortable, ReorderResolution } from ${JSON.stringify(`${drag}/sortable.js`)}; import { y } from ${JSON.stringify(`${drag}/sortable/y.js`)}; import { landing } from ${JSON.stringify(`${drag}/sortable/landing.js`)}; window.d = { sortable, ReorderResolution, y, landing };`;
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
for (const E of ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[E].launch();
  console.log(`# ${E} ${browser.version()}`);
  const page = await browser.newPage();
  await page.setContent(
    `<!doctype html><style>#r>div{block-size:40px;inline-size:200px;background:#ddd;margin:2px}</style><div id=r>${[1, 2, 3].map((i) => `<div tabindex=0>${i}</div>`).join('')}</div><script>${code}</script>`,
  );
  await page.evaluate(() => {
    const r = document.getElementById('r');
    window.log = [];
    let fresh = false;
    window.d.sortable(r, {
      items: () => [...r.querySelectorAll('[tabindex]')],
      axis: window.d.y(),
      landing: window.d.landing(),
      onStart: () => {
        fresh = true;
        queueMicrotask(() => {
          fresh = false;
        });
        window.log.push('start');
      },
      onReorder: (q) => {
        window.log.push(`reorder, the same run as start: ${fresh}`);
        r.insertBefore(q.item, q.next);
        return window.d.ReorderResolution.accept();
      },
      onEnd: (x) => {
        window.log.push(`end ${x.type}`);
      },
    });
  });
  const take = () =>
    page.evaluate(() => window.log.splice(0).join(' > ') || 'nothing');
  await page.evaluate(() => document.querySelectorAll('[tabindex]')[0].focus());
  for (const [name, act] of [
    ['a key, down', () => page.keyboard.press('ArrowDown')],
    [
      'a key at the edge, down',
      async () => {
        await page.evaluate(() =>
          document.querySelectorAll('[tabindex]')[2].focus(),
        );
        await page.keyboard.press('ArrowDown');
      },
    ],
    ['a key that names no command', () => page.keyboard.press('a')],
    [
      'a pointer drop, one slot',
      async () => {
        const b = await page.evaluate(() => {
          const q = document
            .querySelectorAll('[tabindex]')[0]
            .getBoundingClientRect();
          return [q.x + 20, q.y + 20];
        });
        await page.mouse.move(...b);
        await page.mouse.down();
        await page.mouse.move(b[0], b[1] + 60, { steps: 6 });
        await page.mouse.up();
      },
    ],
    [
      'a pointer drop after one move of 60 px',
      async () => {
        const b = await page.evaluate(() => {
          const q = document
            .querySelectorAll('[tabindex]')[0]
            .getBoundingClientRect();
          return [q.x + 20, q.y + 20];
        });
        await page.mouse.move(...b);
        await page.mouse.down();
        await page.mouse.move(b[0], b[1] + 60);
        await page.mouse.up();
      },
    ],
  ]) {
    await act();
    await page.waitForTimeout(400);
    console.log(`${name}: ${await take()}`);
  }
  await browser.close();
}
