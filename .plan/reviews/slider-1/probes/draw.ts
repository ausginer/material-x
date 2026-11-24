// Anatomy in each size and at the edges, under page resets, in forced colors, and the text of the value indicator. Screenshots are written beside it, in p/.
import { open, browser, ENGINE } from './lib.ts';
import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
console.log(`# ${ENGINE} ${browser.version()}`);
const SIZES = ['', 'small', 'medium', 'large', 'xlarge'];
const grid = (attrs = '', dir = 'ltr') =>
  `<div dir=${dir} style="display:grid;gap:8px!important;padding:8px!important;inline-size:204px;box-sizing:content-box!important">${SIZES.map((z) => [0, 1, 40, 98, 100].map((v) => `<mx-slider ${z ? `size=${z}` : ''} value=${v} ${attrs}></mx-slider>`).join('')).join('')}</div>`;
const RESETS: Record<string, string> = {
  none: '',
  borderbox:
    '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;border:0}',
  tailwind:
    '*,::before,::after,::backdrop{box-sizing:border-box;margin:0;padding:0;border:0 solid}html{line-height:1.5;-webkit-text-size-adjust:100%}input{font:inherit;color:inherit;background:transparent;border-radius:0}',
  harsh:
    '*{margin:0;padding:0;border:0;outline:0;font:inherit;vertical-align:baseline;background:transparent;box-sizing:border-box;min-width:0;min-height:0;transition:none!important;animation:none!important}',
  inherited:
    'body{line-height:3;letter-spacing:5px;word-spacing:9px;text-indent:30px;text-transform:uppercase;font-style:italic;text-align:right;white-space:pre;cursor:crosshair;list-style:none;border-collapse:collapse;color:red;user-select:none}',
};
const shots: Record<string, Buffer> = {};
for (const dir of ['ltr', 'rtl'])
  for (const [name, css] of Object.entries(RESETS)) {
    const page = await open(
      `<style>body{margin:0}${css}</style>${grid('', dir)}`,
      { viewport: { width: 240, height: 2600 }, deviceScaleFactor: 2 },
    );
    shots[`${dir}-${name}`] = await page.screenshot();
    const rects = await page.evaluate(() =>
      [...document.querySelectorAll('mx-slider')]
        .map((s: any) => {
          const t = s.getBoundingClientRect();
          return ['.track', '.input', '.stop', '.handle']
            .map((c) => {
              const r = s.shadowRoot.querySelector(c).getBoundingClientRect();
              return [r.left - t.left, r.top - t.top, r.width, r.height]
                .map((x: number) => +x.toFixed(2))
                .join(',');
            })
            .join(' ');
        })
        .join('\n'),
    );
    if (name === 'none') {
      (globalThis as any).base = rects;
      if (dir === 'ltr') console.log(rects);
    } else {
      const a = PNG.sync.read(shots[`${dir}-none`]!),
        b = PNG.sync.read(shots[`${dir}-${name}`]!);
      let d = 0;
      for (let i = 0; i < a.data.length; i += 4)
        if (
          Math.abs(a.data[i]! - b.data[i]!) +
            Math.abs(a.data[i + 1]! - b.data[i + 1]!) +
            Math.abs(a.data[i + 2]! - b.data[i + 2]!) >
          24
        )
          d++;
      console.log(
        dir,
        name,
        'same boxes',
        rects === (globalThis as any).base,
        'pixels differing',
        d,
        'size',
        a.width === b.width && a.height === b.height,
      );
    }
    await page.context().close();
  }
writeFileSync(`p/out-${ENGINE}-ltr.png`, shots['ltr-none']!);
// The value indicator's text under inherited properties, and a signed value in RTL.
for (const [name, css, dir, attrs] of [
  ['plain', '', 'ltr', 'value=-18'],
  ['inherited', RESETS['inherited'], 'ltr', 'value=-18'],
  ['rtl signed', '', 'rtl', 'value=-18'],
  ['rtl signed unit', '', 'rtl', 'value=-18 valuetext="-18°"'],
  ['rtl native number', '', 'rtl', 'value=-18'],
] as const) {
  const page = await open(
    `<style>body{margin:0;padding:90px 60px 20px}${css}</style><div dir=${dir}><mx-slider id=s min=-55 max=55 indicator ${attrs} style="inline-size:204px"></mx-slider></div>`,
    { viewport: { width: 330, height: 170 }, deviceScaleFactor: 2 },
  );
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `p/ind-${ENGINE}-${name.replaceAll(' ', '-')}.png`,
  });
  const st = await page.evaluate(() => {
    const c = getComputedStyle(
      (window as any).q(document.getElementById('s'), '.handle'),
      '::after',
    );
    return [
      'fontStyle',
      'textTransform',
      'textIndent',
      'whiteSpace',
      'wordSpacing',
      'letterSpacing',
      'lineHeight',
      'width',
      'height',
    ]
      .map((k) => `${k} ${(c as any)[k]}`)
      .join('; ');
  });
  console.log('indicator', name, st);
  await page.context().close();
}
// Forced colours.
if (ENGINE !== 'webkit')
  for (const scheme of ['light', 'dark'] as const) {
    const page = await open(
      `<style>body{margin:0}</style>${grid()}${grid('disabled')}`,
      {
        viewport: { width: 240, height: 700 },
        deviceScaleFactor: 1,
        forcedColors: 'active',
        colorScheme: scheme,
      },
    );
    await page.keyboard.press('Tab');
    await page.screenshot({ path: `p/fc-${ENGINE}-${scheme}.png` });
    console.log(
      'forced',
      scheme,
      JSON.stringify(
        await page.evaluate(() => {
          const s: any = document.querySelector('mx-slider');
          const sys = (c: string) => {
            const d = document.createElement('i');
            d.style.cssText = `color:${c};forced-color-adjust:none`;
            document.body.append(d);
            return getComputedStyle(d).color;
          };
          const g = (e: any, p?: string) =>
            getComputedStyle(e, p).backgroundColor;
          return {
            canvas: sys('Canvas'),
            text: sys('CanvasText'),
            hl: sys('Highlight'),
            gray: sys('GrayText'),
            inactive: g(s.shadowRoot.querySelector('.track'), '::before'),
            active: g(s.shadowRoot.querySelector('.track'), '::after'),
            stop: g(s.shadowRoot.querySelector('.stop')),
            handle: g(s.shadowRoot.querySelector('.handle')),
            outline: getComputedStyle(s.shadowRoot.querySelector('.handle'))
              .outline,
          };
        }),
      ),
    );
    await page.context().close();
  }
await browser.close();
