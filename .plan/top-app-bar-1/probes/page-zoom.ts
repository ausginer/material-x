// The bar under a page zoom, the one that a user makes, in Playwright's WebKit.
// The public API has no page zoom, and the engine's protocol does:
// Playwright.setPageZoomFactor. From the repository root, with the packages built:
//   node .plan/top-app-bar-1/probes/page-zoom.ts <packages> [headed]
// headed is the GTK port and needs a display. headless is the WPE port.
import { join } from 'node:path';
import { webkit } from 'playwright';
import { rolldown } from 'rolldown';

const [PACKAGES, mode] = process.argv.slice(2) as [string, string?];
const bundle = await rolldown({
  input: 'entry',
  platform: 'browser',
  plugins: [
    {
      name: 'entry',
      resolveId: (id) => (id === 'entry' ? id : null),
      load: (id) =>
        id === 'entry'
          ? `import ${JSON.stringify(join(PACKAGES, 'material-x/top-app-bar/top-app-bar.js'))};`
          : null,
    },
  ],
});
const { output } = await bundle.generate({ format: 'iife' });
const code = output.map((c) => ('code' in c ? c.code : '')).join('\n');
const browser = await webkit.launch({ headless: mode !== 'headed' });
console.log(`# webkit ${browser.version()}, ${mode ?? 'headless'}`);

async function setPageZoom(page: any, zoomFactor: number): Promise<void> {
  const { delegate } = page._connection.toImpl(page);
  await delegate._browserContext._browser._browserSession.send(
    'Playwright.setPageZoomFactor',
    { pageProxyId: delegate._pageProxySession.sessionId, zoomFactor },
  );
}

const FACTORS = [1, 0.5, 0.75, 0.9, 1.1, 1.15, 1.25, 1.5, 1.75, 2, 2.5, 3];
const STEPS = [0, 1, 2, 5, 20, 100, 150, 300, 600, 1500, 1e6, 0, 300, 0, 3, 0];
const BODY = `<!doctype html><style>body{margin:0}mx-top-app-bar{--md-top-app-bar-container-color:#c00;--md-top-app-bar-on-scroll-container-color:#c00}</style>
<mx-top-app-bar id=bar>T</mx-top-app-bar><div style="height:5000px"></div>`;
// A page with no bar: a sticky header and a fixed box of its own.
const PLAIN = `<!doctype html><style>body{margin:0}#bar{position:sticky;top:0;height:64px;background:#c00}</style>
<div id=bar>T</div><div id=fixed style="position:fixed;top:0;right:0;width:20px;height:20px"></div><div style="height:5000px"></div>`;

const settle = (target: any) =>
  target.evaluate(
    () =>
      new Promise((r) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => setTimeout(r, 60)),
        ),
      ),
  );

/** The state against the root's top, which keeps the fraction that scrollY loses. */
async function walk(target: any): Promise<string> {
  const wrong: string[] = [];
  const lost: string[] = [];
  let pinned = true;
  for (const step of STEPS) {
    await target.evaluate((y: number) => scrollTo(0, y), step);
    await settle(target);
    const { top, y, on, bar } = await target.evaluate(() => ({
      top: document.documentElement.getBoundingClientRect().top,
      y: scrollY,
      on: document.getElementById('bar')!.matches(':state(scrolled)'),
      bar: document.getElementById('bar')!.getBoundingClientRect().top,
    }));
    if (on !== top < 0) wrong.push(`${on ? 'on' : 'off'}@${top.toFixed(2)}`);
    if (y > 0 !== top < 0) lost.push(`scrollY ${y} at ${top.toFixed(2)}`);
    if (Math.abs(bar) > 1) pinned = false;
  }
  return `${wrong.length ? `WRONG ${wrong.join(' ')}` : 'right'} | ${pinned ? 'pinned' : 'NOT PINNED'}${lost.length ? ` | ${lost.join(', ')}` : ''}`;
}

const FRAME = (css: string) =>
  `<!doctype html><style>body{margin:0}</style><div style="${css}"><iframe style="border:0;width:400px;height:300px;display:block"></iframe></div><div style="height:3000px"></div>`;

async function open(html: string, frame: string | null, zoom: number) {
  const context = await browser.newContext({
    viewport: { width: 800, height: 600 },
  });
  const page = await context.newPage();
  await setPageZoom(page, zoom);
  let target: any = page;
  if (frame !== null) {
    await page.setContent(FRAME(frame));
    target = page.frames()[1]!;
  }
  await target.setContent(html);
  await target.addScriptTag({ content: code });
  return { context, page, target };
}

console.log('## The state under a page zoom, set before the page and after it');
for (const where of ['page', 'frame'])
  for (const factor of FACTORS)
    for (const when of ['before', 'after']) {
      const { context, page, target } = await open(
        BODY,
        where === 'frame' ? '' : null,
        when === 'before' ? factor : 1,
      );
      if (when === 'after') {
        await target.evaluate(() => scrollTo(0, 300));
        await page.waitForTimeout(200);
        await setPageZoom(page, factor);
        await page.waitForTimeout(200);
      }
      const dpr = await target.evaluate(() => devicePixelRatio);
      const first =
        when === 'after'
          ? await target.evaluate(
              () =>
                `${document.getElementById('bar')!.matches(':state(scrolled)') ? 'on' : 'off'} at ${scrollY} when the zoom is set | `,
            )
          : '';
      console.log(
        `${where} | page zoom ${factor}, set ${when}, dpr ${dpr.toFixed(2)} | ${first}${await walk(target)}`,
      );
      await context.close();
    }

console.log('## A frame with a CSS zoom: what pins, and what is drawn');
const IS_RED = async (page: any) => {
  const png = (
    await page.screenshot({ clip: { x: 60, y: 4, width: 1, height: 1 } })
  ).toString('base64');
  const [r, g] = await page.evaluate(async (d: string) => {
    const image = new Image();
    image.src = `data:image/png;base64,${d}`;
    await image.decode();
    const c = document.createElement('canvas').getContext('2d')!;
    c.drawImage(image, 0, 0);
    return [...c.getImageData(0, 0, 1, 1).data];
  }, png);
  return r > 100 && g < 100;
};
for (const [name, html] of [
  ['the bar', BODY],
  ['a page with no bar', PLAIN],
] as const)
  for (const zoom of [1, 0.5, 1.1, 1.5, 2, 3]) {
    const { context, page, target } = await open(html, `zoom:${zoom}`, 1);
    const out: string[] = [];
    for (const y of [0, 20, 150, 300, 600, 1500]) {
      await target.evaluate((v: number) => scrollTo(0, v), y);
      await settle(target);
      const r = await target.evaluate(() => {
        const bar = document.getElementById('bar')!;
        const fixed = document.getElementById('fixed');
        return `sticky ${bar.getBoundingClientRect().top.toFixed(0)}${fixed ? ` fixed ${fixed.getBoundingClientRect().top.toFixed(0)}` : ` ${bar.matches(':state(scrolled)') ? 'on' : 'off'}`}`;
      });
      out.push(`@${y} ${r} ${(await IS_RED(page)) ? 'drawn' : 'NOT DRAWN'}`);
    }
    console.log(`${name} | frame zoom ${zoom} | ${out.join(', ')}`);
    await context.close();
  }
await browser.close();
