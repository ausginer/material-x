// Two readings on the built mx-slider.
//
// press - a press on the handle, at each offset from its centre, without a
//   move: the value after it, and the events. Beside it, the native range as
//   the browser draws it (its own wide thumb) and the native range with the
//   slider's 4px thumb, so the engine's part is seen.
// width - the inline size in containers that shrink to their content, of the
//   built slider, of the built slider with the input in flow (`static`), of a
//   native range and of the built mx-text-field. A block container and a narrow one are beside them, where
//   the slider has to fill and to shrink.
//
// node press-and-width.ts <packages> <chromium|firefox|webkit>
// Build the packages first.
import { join } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { rolldown } from 'rolldown';

const [PACKAGES, ENGINE] = process.argv.slice(2) as [
  string,
  'chromium' | 'firefox' | 'webkit',
];
const build = await rolldown({
  input: 'entry',
  platform: 'browser',
  plugins: [
    {
      name: 'entry',
      resolveId: (id) => (id === 'entry' ? id : null),
      load: (id) =>
        id === 'entry'
          ? ['slider/slider.js', 'text-field/text-field.js']
              .map(
                (p) =>
                  `import ${JSON.stringify(join(PACKAGES, 'material-x', p))};`,
              )
              .join('')
          : null,
    },
  ],
});
const { output } = await build.generate({
  format: 'iife',
  name: 'slider',
  exports: 'named',
});
const code = output.map((c) => ('code' in c ? c.code : '')).join('\n');
const browser = await { chromium, firefox, webkit }[ENGINE].launch();
console.log(`# ${ENGINE} ${browser.version()}`);
const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
await page.setContent(`<!doctype html><style>
body{margin:20px} mx-slider,input{inline-size:200px;margin:0 0 20px;display:block}
#thin{all:unset;appearance:none;display:block;inline-size:200px;block-size:44px;margin-block-end:20px}
#thin::-webkit-slider-runnable-track{block-size:100%}
#thin::-webkit-slider-thumb{appearance:none;inline-size:4px;block-size:100%}
#thin::-moz-range-thumb{border:0;border-radius:0;inline-size:4px;block-size:44px;box-sizing:border-box}
</style><mx-slider id="slider"></mx-slider><input id="thin" type="range"><input id="native" type="range">
<script>${code.replaceAll('</script', '<\\/script')}</script>`);
await page.evaluate(() => {
  (window as any).log = [];
  for (const type of ['input', 'change']) {
    document.addEventListener(type, (e) => {
      (window as any).log.push(type[0] + (e.target as any).value);
    });
  }
});
console.log(
  ' press, from value 40, by the offset from the thumb’s centre in px',
);
// Half a 4px thumb inside the slider, and up to 8px in the native one.
for (const [id, max, offsets] of [
  ['slider', 100, [-1.9, -1.6, -1, -0.5, 0, 0.5, 1, 1.6, 1.9]],
  ['slider', 1000, [-1.9, -1, 0, 1, 1.9]],
  ['slider', 20, [-1.9, 0, 1.9]],
  ['thin', 100, [-1.6, -1, 0, 1, 1.6]],
  ['native', 100, [-6, -3, 0, 3, 6]],
] as const) {
  const out: string[] = [];
  for (const offset of offsets) {
    const point = await page.evaluate(
      ([id, max]) => {
        const el = document.getElementById(id) as any;
        el.max = max;
        el.value = max * 0.4;
        const input: HTMLInputElement =
          el.shadowRoot?.querySelector('input') ?? el;
        const r = input.getBoundingClientRect();
        // The browser's own thumb is 16px in Chromium and WebKit.
        const thumb = id === 'native' ? 16 : 4;
        (window as any).log.length = 0;
        return {
          x: r.x + thumb / 2 + 0.4 * (r.width - thumb),
          y: r.y + r.height / 2,
        };
      },
      [id, max] as const,
    );
    await page.mouse.move(point.x + offset, point.y);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(40);
    out.push(
      `${offset}: ${await page.evaluate((id) => `${(document.getElementById(id) as any).value} [${(window as any).log.join(' ')}]`, id)}`,
    );
  }
  console.log(`  ${id} max=${max}  ${out.join(', ')}`);
}

await page.evaluate(() => {
  const main = document.createElement('main');
  document.body.replaceChildren(main);
  document.querySelector('style')!.remove();
});
const CONTAINERS = {
  'block 400px': 'width:400px',
  'flex row 400px': 'display:flex;width:400px',
  'flex row, beside text': 'display:flex;width:400px',
  'flex column, align start':
    'display:flex;flex-direction:column;align-items:start;width:400px',
  'flex row, long text': 'display:flex;width:400px',
  'grid, auto columns':
    'display:grid;grid-auto-flow:column;justify-content:start;width:400px',
  'absolutely positioned': 'position:absolute',
  'inline-block': 'display:inline-block',
  'max-content': 'width:max-content',
  'min-content': 'width:min-content',
  'block 60px': 'width:60px',
  'flex row 60px': 'display:flex;width:60px',
};
console.log(
  ' width, in px: the built slider, the input in flow, a native range at display:block, the built mx-text-field',
);
for (const [name, css] of Object.entries(CONTAINERS)) {
  const sizes = await page.evaluate(
    ([name, css]) =>
      ['built', 'static', 'native', 'field'].map((kind) => {
        const c = document.createElement('div');
        c.style.cssText = css!;
        const el =
          kind === 'native'
            ? Object.assign(document.createElement('input'), { type: 'range' })
            : document.createElement(
                kind === 'field' ? 'mx-text-field' : 'mx-slider',
              );
        if (kind === 'native') {
          el.style.cssText = 'display:block;margin:0';
        }
        if (kind === 'static') {
          const s = new CSSStyleSheet();
          s.replaceSync('.input{position:static;display:block}');
          el.shadowRoot!.adoptedStyleSheets.push(s);
        }
        c.append(el);
        if (name.includes('text')) {
          const text = document.createElement('span');
          text.textContent = 'text '.repeat(name.includes('long') ? 60 : 1);
          c.append(text);
        }
        document.querySelector('main')!.append(c);
        const r = el.getBoundingClientRect();
        const overflow = c.scrollWidth > c.clientWidth ? ' overflows' : '';
        // The input has to cover the track in the new form too.
        const input = el.shadowRoot?.querySelector('input');
        const track = el.shadowRoot?.querySelector('.track');
        const covers =
          !track ||
          !input ||
          JSON.stringify(input.getBoundingClientRect()) ===
            JSON.stringify(track!.getBoundingClientRect());
        return `${kind} ${r.width.toFixed(1)}x${r.height.toFixed(1)}${overflow}${covers ? '' : ' input differs from track'}`;
      }),
    [name, css] as const,
  );
  console.log(`  ${name.padEnd(26)} ${sizes.join(', ')}`);
}
await browser.close();
