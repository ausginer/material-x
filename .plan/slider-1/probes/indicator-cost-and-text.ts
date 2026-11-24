// The value indicator as elements inside the track, on the built mx-slider:
// what a value change costs while it is shown, against the built
// pseudo-element, and how signed texts are drawn in both directions.
//
// node indicator-cost-and-text.ts <packages> <chromium|firefox|webkit> [<png directory>]
// Build the packages first.
import { join } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { rolldown } from 'rolldown';

const [PACKAGES, ENGINE, PNG] = process.argv.slice(2) as [
  string,
  'chromium' | 'firefox' | 'webkit',
  string?,
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
const browser = await { chromium, firefox, webkit }[ENGINE].launch();
console.log(`# ${ENGINE} ${browser.version()}`);

const adopt = (bidi: string) => `
  window.adopt = (slider) => {
    const root = slider.shadowRoot;
    const names = [...root.adoptedStyleSheets].flatMap((s) => [...s.cssRules]).map((r) => r.cssText).join('\\n');
    const centre = /inset-inline-start:\\s*calc\\(var\\((--[\\w-]+)\\)/u.exec(names)[1];
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(\`.handle::after{content:none!important}
      .indicator{position:absolute;inset-inline:0;inset-block-end:calc(100% + 12px);display:none;z-index:1;pointer-events:none}
      .indicator::before,.indicator::after{content:'';flex:1 1 max(0px,2 * var(\${centre}) - 100%)}
      .indicator::after{flex-basis:max(0px,100% - 2 * var(\${centre}))}
      .text{flex:none;max-inline-size:100%;box-sizing:border-box;padding:12px 10px;border-radius:22px;background:#313033;color:#fff;font:400 14px/20px sans-serif;letter-spacing:.5px;overflow-wrap:anywhere;${bidi}}
      .input:is(:active,:focus-visible)~.indicator{display:flex}\`);
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    const box = document.createElement('span');
    box.className = 'indicator';
    box.ariaHidden = 'true';
    const text = box.appendChild(document.createElement('span'));
    text.className = 'text';
    const write = () => { text.textContent = slider.valuetext ?? String(slider.value); };
    root.querySelector('.input').addEventListener('input', write);
    write();
    root.querySelector('.track').append(box);
  };`;

// The texts. The order of the drawn glyphs is read by each character's rect.
const TEXTS = [
  '-18',
  '-18°',
  '−18°',
  '−18 °C',
  '-18 %',
  '50',
  'ten',
  'عشرة',
  '-١٨',
  '؜-١٨',
  '١٨ درجة',
  '-18 درجة',
];
for (const bidi of [
  '',
  'unicode-bidi:isolate;direction:ltr',
  'unicode-bidi:plaintext',
]) {
  console.log(`## ${bidi || 'no declaration'}`);
  for (const dir of ['ltr', 'rtl']) {
    const page = await browser.newPage();
    await page.setContent(
      `<!doctype html><body style="margin:100px"><mx-slider dir=${dir} indicator min=-55 max=55 value=-18></mx-slider><script>${code.replaceAll('</script', '<\\/script')}${adopt(bidi)}</script>`,
    );
    await page.evaluate(() =>
      (window as any).adopt(document.querySelector('mx-slider')),
    );
    await page.keyboard.press('Tab');
    const drawn = await page.evaluate((texts) => {
      const t = document
        .querySelector('mx-slider')!
        .shadowRoot!.querySelector('.text')!;
      return texts.map((text) => {
        t.textContent = text;
        const node = t.firstChild!;
        const left = (i: number) => {
          const range = document.createRange();
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          return range.getBoundingClientRect().left;
        };
        // Only the sign's side is read: shaped letters have no simple order.
        const sign = text.search(/[-−]/u);
        const digit = text.search(/[0-9١٨]/u);
        return sign < 0 || digit < 0
          ? `${text} (no sign)`
          : `${text} sign ${left(sign) < left(digit) ? 'left' : 'right'}`;
      });
    }, TEXTS);
    console.log(dir, drawn.map((d) => JSON.stringify(d)).join(' '));
    await page.close();
  }
}

// Style and layout for one change, flushed, held, µs.
const filler = '<p>text <b>bold</b></p>'.repeat(250);
const results = new Map<string, number[]>();
const pages = new Map<string, any>();
for (const kind of ['built', 'elements']) {
  const page = await browser.newPage();
  await page.setContent(
    `<!doctype html><div style="height:120px"></div><mx-slider id=s max=1000 indicator></mx-slider><div>${filler}</div><script>${code.replaceAll('</script', '<\\/script')}${adopt('unicode-bidi:plaintext')}</script>`,
  );
  if (kind === 'elements') {
    await page.evaluate(() =>
      (window as any).adopt(document.querySelector('#s')),
    );
  }
  pages.set(kind, page);
  results.set(kind, []);
}
for (let n = 0; n < 22; n += 1) {
  for (const [kind, page] of pages) {
    await page.bringToFront();
    if (n === 0) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(400);
    }
    const us = await page.evaluate(() => {
      const el = document.getElementById('s')!;
      const input = el.shadowRoot!.querySelector('input')!;
      const box = el.shadowRoot!.querySelector('.handle')!;
      let sink = 0;
      const start = performance.now();
      for (let i = 0; i < 400; i += 1) {
        input.value = String((i * 37) % 1000);
        input.dispatchEvent(
          new Event('input', { bubbles: true, composed: true }),
        );
        sink += box.getBoundingClientRect().x;
      }
      return ((performance.now() - start) * 1000) / 400 + sink * 0;
    });
    if (n > 1) results.get(kind)!.push(us);
  }
}
console.log('## cost of a change, held by keyboard focus');
for (const [kind, all] of results) {
  all.sort((a, b) => a - b);
  console.log(
    `  ${kind.padEnd(9)} median ${all[10]!.toFixed(1)} µs, min ${all[0]!.toFixed(1)}`,
  );
}

if (PNG) {
  const page = await browser.newPage({
    viewport: { width: 420, height: 600 },
    deviceScaleFactor: 2,
  });
  for (const kind of ['built', 'elements']) {
    await page.setContent(
      `<!doctype html><style>body{margin:0;padding:70px 60px;font:12px sans-serif}mx-slider{margin-block-end:62px}</style>${[0, 5, 50, 95, 100].map((v) => `<mx-slider indicator value=${v}></mx-slider>`).join('')}<script>${code.replaceAll('</script', '<\\/script')}${adopt('unicode-bidi:plaintext')}</script>`,
    );
    await page.evaluate((kind) => {
      for (const s of document.querySelectorAll('mx-slider')) {
        if (kind === 'elements') (window as any).adopt(s);
        const sheet = new CSSStyleSheet();
        // Shows every slider's indicator, which only one could show by focus.
        sheet.replaceSync(
          '.indicator{display:flex!important}.handle::after{display:block!important;opacity:1!important}',
        );
        s.shadowRoot!.adoptedStyleSheets = [
          ...s.shadowRoot!.adoptedStyleSheets,
          sheet,
        ];
      }
    }, kind);
    await page.waitForTimeout(300);
    await page.screenshot({
      path: join(PNG, `indicator-${kind}-${ENGINE}.png`),
    });
  }
}
await browser.close();
