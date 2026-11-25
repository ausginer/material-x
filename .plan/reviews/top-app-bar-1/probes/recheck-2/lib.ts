// Opens the built mx-top-app-bar. node <probe>.ts <packages> <chromium|firefox|webkit>, with the packages built.
import { join } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { rolldown } from 'rolldown';
export const [PACKAGES, ENGINE] = process.argv.slice(2) as [
  string,
  'chromium' | 'firefox' | 'webkit',
];
const b = await rolldown({
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
const { output } = await b.generate({ format: 'iife' });
export const code = output.map((c) => ('code' in c ? c.code : '')).join('\n');
export const browser = await { chromium, firefox, webkit }[ENGINE].launch(
  ENGINE === 'chromium' ? { channel: 'chromium' } : {},
);
export const BAR =
  '<mx-top-app-bar id=bar><h1>Title</h1></mx-top-app-bar><div id=tall style="height:5000px;width:200px"></div>';
export async function open(html: string, opts: any = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 800, height: 600 },
    ...opts,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  PAGEERROR', e.message));
  await page.setContent(html);
  await page.addScriptTag({ content: code });
  await settle(page);
  return page;
}
export const settle = (t: any) =>
  t.evaluate(
    () =>
      new Promise((r) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => setTimeout(r, 60)),
        ),
      ),
  );
export const on = (t: any, id = 'bar') =>
  t.evaluate((i: string) => {
    const e: any = document.getElementById(i);
    return `${e.matches(':state(scrolled)') ? 'on' : 'off'}${e.matches(':state(scrolled)') === scrollY > 0 ? '' : ' WRONG'}@${+scrollY.toFixed(2)}`;
  }, id);
export async function walk(
  t: any,
  ys: number[] = [0, 1, 300, 1e6, 0],
  id = 'bar',
) {
  const out: string[] = [];
  for (const y of ys) {
    await t.evaluate(
      (v: number) => scrollTo({ top: v, behavior: 'instant' }),
      y,
    );
    await settle(t);
    out.push(await on(t, id));
  }
  return out.join(' ');
}
