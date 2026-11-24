// Candidates for the value indicator's box, on the built mx-slider: does the
// shown indicator add scrollable overflow, where is it, is it clipped, and how
// is a signed text drawn?
//
// node indicator-overflow.ts <packages> <chromium|firefox|webkit>
// Build the packages first.
import { join } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { rolldown } from 'rolldown';

const [PACKAGES, ENGINE] = process.argv.slice(2) as [
  string,
  'chromium' | 'firefox' | 'webkit',
];
const build = await rolldown({
  input: join(PACKAGES, 'material-x/slider/slider.js'),
  platform: 'browser',
});
const { output } = await build.generate({
  format: 'iife',
  name: 'slider',
  exports: 'named',
});
const code = output.map((c) => ('code' in c ? c.code : '')).join('\n');

// The text's box is the last child of `.indicator`, or `.indicator` itself.
const LOOK =
  'block-size:44px;box-sizing:border-box;padding:12px 10px;border-radius:22px;background:#313033;color:#fff;font:400 14px/20px sans-serif;letter-spacing:.5px;white-space:nowrap;pointer-events:none;z-index:1;unicode-bidi:plaintext;';
const CSS: Record<string, string> = {
  // The built pseudo-element, unchanged.
  built: '',
  // Inside the track, by flex: each spacer takes half of the free space, and
  // the longer one gives way first.
  flex: `.indicator{position:absolute;inset-inline:0;inset-block-end:calc(100% + 12px);display:none;z-index:1;pointer-events:none}
    .indicator::before,.indicator::after{content:'';flex:1 1 max(0px,2 * var(--CENTER) - 100%)}
    .indicator::after{flex-basis:max(0px,100% - 2 * var(--CENTER))}
    .text{${LOOK}block-size:auto;min-block-size:44px;white-space:normal;overflow-wrap:anywhere;flex:none;max-inline-size:100%}
    .input:is(:active,:focus-visible)~.indicator{display:flex}`,
  // Inside the track, by anchor positioning.
  'anchor in the track': `.handle{anchor-name:--h}
    .indicator{${LOOK}display:none;position:absolute;position-anchor:--h;inset-block-end:calc(100% + 12px);inset-inline:0;inline-size:max-content;justify-self:anchor-center}
    .input:is(:active,:focus-visible)~.indicator{display:block}`,
  // Inside the viewport, by anchor positioning, without the top layer.
  'anchor in the viewport': `.handle{anchor-name:--h}
    .indicator{${LOOK}display:none;position:fixed;position-anchor:--h;inset:auto;inset-inline:0;bottom:calc(anchor(top) + 12px);inline-size:max-content;justify-self:anchor-center;position-visibility:anchors-visible}
    .input:is(:active,:focus-visible)~.indicator{display:block}`,
  // The same, by a position area, whose span is the whole containing block.
  'area in the viewport': `.handle{anchor-name:--h}
    .indicator{${LOOK}display:none;position:fixed;position-anchor:--h;inset:auto;position-area:block-start;margin:0;margin-block-end:12px;inline-size:max-content;position-visibility:anchors-visible}
    .input:is(:active,:focus-visible)~.indicator{display:block}`,
  // The same in the top layer.
  'anchor in the top layer': `.handle{anchor-name:--h}
    .indicator{${LOOK}border:0;margin:0;position:fixed;position-anchor:--h;inset:auto;inset-inline:0;bottom:calc(anchor(top) + 12px);inline-size:max-content;justify-self:anchor-center;position-visibility:anchors-visible}`,
};

const browser = await { chromium, firefox, webkit }[ENGINE].launch();
console.log(`# ${ENGINE} ${browser.version()}`);

async function open(html: string, candidate: string, dir = 'ltr') {
  const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.setContent(
    `<!doctype html><html dir=${dir}><style>body{margin:0;padding-top:80px}</style>${html}`,
  );
  await page.addScriptTag({ content: code });
  await page.evaluate(
    ([candidate, css]) => {
      const slider = document.querySelector('mx-slider')!;
      const root = slider.shadowRoot!;
      if (candidate === 'built') return;
      // The published name of the centre.
      const names = [...root.adoptedStyleSheets]
        .flatMap((s) => [...s.cssRules])
        .map((r) => r.cssText)
        .join('\n');
      const centre = /inset-inline-start:\s*calc\(var\((--[\w-]+)\)/u.exec(
        names,
      )![1]!;
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(
        `.handle::after{content:none!important}` +
          css!.replaceAll('--CENTER', centre),
      );
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      const box = document.createElement('span');
      box.className = 'indicator';
      box.ariaHidden = 'true';
      const text =
        candidate === 'flex'
          ? box.appendChild(document.createElement('span'))
          : box;
      if (text !== box) text.className = 'text';
      const s = slider as any;
      text.textContent = s.valuetext ?? String(s.value);
      root.querySelector('.track')!.append(box);
      if (candidate === 'anchor in the top layer') {
        box.popover = 'manual';
        const input = root.querySelector('.input')!;
        input.addEventListener('focus', () => box.showPopover());
        input.addEventListener('blur', () => box.hidePopover());
      }
    },
    [candidate, CSS[candidate]!],
  );
  return page;
}

const CASES: Array<[string, string, string?]> = [
  [
    'container, 100',
    '<div id=c style="overflow:auto;inline-size:300px;padding-top:80px"><mx-slider indicator value=100></mx-slider></div>',
  ],
  [
    'container, 1000000',
    '<div id=c style="overflow:auto;inline-size:300px;padding-top:80px"><mx-slider indicator max=1000000 value=1000000></mx-slider></div>',
  ],
  ['page, 100', '<mx-slider id=c indicator value=100></mx-slider>'],
  ['page, 0', '<mx-slider id=c indicator value=0></mx-slider>'],
  ['page, 50', '<mx-slider id=c indicator value=50></mx-slider>'],
  [
    'page gutter 16, 10000',
    '<div style="padding:0 16px"><mx-slider id=c indicator max=10000 value=10000></mx-slider></div>',
  ],
  [
    'page gutter 16, long text',
    '<div style="padding:0 16px"><mx-slider id=c indicator valuetext="A long value text" value=100></mx-slider></div>',
  ],
  [
    'page gutter 60, 100',
    '<div style="padding:0 60px"><mx-slider id=c indicator value=100></mx-slider></div>',
  ],
  ['rtl page, 100', '<mx-slider id=c indicator value=100></mx-slider>', 'rtl'],
  [
    'rtl slider in ltr page, 0',
    '<mx-slider id=c dir=rtl indicator value=0></mx-slider>',
  ],
  [
    'ltr slider in rtl page, 0',
    '<mx-slider id=c dir=ltr indicator value=0></mx-slider>',
    'rtl',
  ],
  [
    'rtl slider in ltr page, 40',
    '<mx-slider id=c dir=rtl indicator value=40></mx-slider>',
  ],
  [
    '30px slider, long text, end',
    '<div style="display:flex;justify-content:end"><mx-slider id=c style="inline-size:30px" indicator valuetext="A long value text" value=100></mx-slider></div>',
  ],
  [
    'overflow hidden card, 100',
    '<div id=c style="overflow:hidden;inline-size:300px"><mx-slider indicator value=100></mx-slider></div>',
  ],
  [
    'translated sheet, scroll, 100',
    '<div style="translate:40px 0"><div id=c style="overflow:auto;inline-size:300px;padding-top:80px"><mx-slider indicator value=100></mx-slider></div></div>',
  ],
  [
    'translated scroll container, 100',
    '<div id=c style="translate:40px 0;overflow:auto;inline-size:300px;padding-top:80px"><mx-slider indicator value=100></mx-slider></div>',
  ],
  [
    'contain: paint, 100',
    '<div id=c style="contain:paint;overflow:auto;inline-size:300px;padding-top:80px"><mx-slider indicator value=100></mx-slider></div>',
  ],
];
for (const candidate of Object.keys(CSS)) {
  console.log(`## ${candidate}`);
  for (const [name, html, dir] of CASES) {
    const page = await open(html, candidate, dir);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(150);
    const r = await page.evaluate((built) => {
      const c = document.getElementById('c')!;
      const root = document.querySelector('mx-slider')!.shadowRoot!;
      const h = root.querySelector('.handle')!.getBoundingClientRect();
      const t = built
        ? null
        : (root.querySelector('.text') ?? root.querySelector('.indicator'))!;
      const b = t?.getBoundingClientRect();
      const f = (n: number) => Math.round(n * 10) / 10;
      const doc = document.documentElement;
      return {
        own: c.scrollWidth - c.clientWidth,
        page: doc.scrollWidth - doc.clientWidth,
        pageV: doc.scrollHeight - doc.clientHeight,
        box: b && [f(b.left), f(b.right), f(b.top), f(b.width)],
        offCentre: b && f(b.left + b.width / 2 - h.left - h.width / 2),
        gap: b && f(h.top - b.bottom),
      };
    }, candidate === 'built');
    console.log(name.padEnd(34), JSON.stringify(r));
    await page.close();
  }
}
await browser.close();
