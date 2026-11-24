// A bar that is first rendered at the document's start after it connected: what it draws.
import { open, settle, on, browser, ENGINE } from './lib.ts';
console.log(`# ${ENGINE} ${browser.version()}`);
for (const [name, html, show] of [
  [
    'a full-screen dialog opened at the start',
    '<dialog id=d><mx-top-app-bar id=bar>T</mx-top-app-bar></dialog>',
    'd.showModal()',
  ],
  [
    'display:none at 500px, shown by a wider viewport',
    '<style>@media (max-width:700px){mx-top-app-bar{display:none}}</style><mx-top-app-bar id=bar>T</mx-top-app-bar>',
    'resize',
  ],
  [
    'a closed details, opened',
    '<details id=d><summary>s</summary><mx-top-app-bar id=bar>T</mx-top-app-bar></details>',
    'd.open=true',
  ],
  [
    'control: connects visible',
    '<mx-top-app-bar id=bar>T</mx-top-app-bar>',
    '',
  ],
] as const) {
  const page = await open(
    `<!doctype html><style>body{margin:0}</style>${html}<div style="height:4000px"></div>`,
    { viewport: { width: show === 'resize' ? 500 : 800, height: 600 } },
  );
  const before = await on(page);
  await page.evaluate(() => {
    const w = window as any;
    w.t = [];
    w.c = [];
    bar.addEventListener('transitionrun', (e: any) => w.t.push(e.propertyName));
    const t0 = performance.now();
    const f = () => {
      w.c.push([
        Math.round(performance.now() - t0),
        getComputedStyle(bar).backgroundColor,
        bar.getClientRects().length,
      ]);
      if (performance.now() - t0 < 1500) requestAnimationFrame(f);
    };
    w.start = () => requestAnimationFrame(f);
    w.start();
  });
  if (show === 'resize')
    await page.setViewportSize({ width: 800, height: 600 });
  else if (show) await page.evaluate(show);
  await page.waitForTimeout(1700);
  console.log(
    name,
    '| before',
    before,
    '| after',
    await on(page),
    '|',
    await page.evaluate(() => {
      const w = window as any;
      const shown = w.c.filter((x: any) => x[2]);
      const rest = shown.at(-1)[1];
      const wrong = shown.filter((x: any) => x[1] !== rest);
      return `transitions ${w.t.join() || 'none'}; drawn frames not at rest ${wrong.length} of ${shown.length}, for ${wrong.length ? wrong.at(-1)[0] - shown[0][0] : 0} ms, first ${shown[0][1]} rest ${rest}`;
    }),
  );
  await page.context().close();
}
await browser.close();
