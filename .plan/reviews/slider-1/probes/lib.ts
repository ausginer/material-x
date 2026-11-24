// Opens the built mx-slider. node <probe>.ts <packages> <chromium|firefox|webkit>, with the packages built.
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
          ? ['slider/slider', 'text-field/text-field']
              .map(
                (m) =>
                  `import ${JSON.stringify(join(PACKAGES, 'material-x/' + m + '.js'))};`,
              )
              .join('\n')
          : null,
    },
  ],
});
const { output } = await b.generate({ format: 'iife' });
export const code = output.map((c) => ('code' in c ? c.code : '')).join('\n');
export const browser = await { chromium, firefox, webkit }[ENGINE].launch(
  ENGINE === 'chromium' ? { channel: 'chromium' } : {},
);
export async function open(html: string, opts: any = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 800, height: 600 },
    ...opts,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.setContent(`<!doctype html>${html}`);
  await page.addScriptTag({ content: code });
  await page.evaluate(() => {
    (window as any).inp = (s: any) => s.shadowRoot.querySelector('.input');
    (window as any).q = (s: any, c: string) => s.shadowRoot.querySelector(c);
    (window as any).frac = (s: any) => {
      const t = s.shadowRoot.querySelector('.track').getBoundingClientRect(),
        h = s.shadowRoot.querySelector('.handle').getBoundingClientRect();
      return +((h.left + h.width / 2 - t.left - 2) / (t.width - 4)).toFixed(4);
    };
  });
  return page;
}
