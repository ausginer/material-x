// Whether the stop indicator as its own element draws what the built slider's
// gradient draws, and what it adds near the end of the track. Both are drawn on
// the built mx-slider at device scale 4, at the same place, and the pixels are
// compared. `differ` counts the pixels where a channel differs by more than 48
// of 255, so only a part that is displaced or missing is counted, and not the
// anti-aliased edge. The control row hides the stop indicator.
//
// node stop-indicator.ts <packages> <chromium|firefox|webkit>
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
const browser = await { chromium, firefox, webkit }[ENGINE].launch();
console.log(`# ${ENGINE} ${browser.version()}`);
const context = await browser.newContext({
  deviceScaleFactor: 4,
  viewport: { width: 260, height: 90 },
});
const page = await context.newPage();
await page.setContent(
  `<!doctype html><style>body{margin:20px;background:#fff}mx-slider{inline-size:200px}</style><script>${code.replaceAll('</script', '<\\/script')}</script>`,
);
const shoot = async (kind: string, value: number, style: string) => {
  const info = await page.evaluate(
    ([kind, value, style]) => {
      document.querySelector('mx-slider')?.remove();
      const el = document.createElement('mx-slider');
      el.max = 1000;
      el.value = value;
      el.style.cssText = style;
      const root = el.shadowRoot!;
      let stop: HTMLElement | undefined;
      if (kind !== 'built') {
        const built = root.adoptedStyleSheets
          .flatMap((s) => [...s.cssRules])
          .map((r) => r.cssText)
          .join('\n');
        const inactive = /&::?after \{[^}]*?inline-size: (var\(--[\w-]+\))/u.exec(
    built,
  )![1]!;
        const s = new CSSStyleSheet();
        s.replaceSync(
          `.track::after{background:#cceea1 !important;padding:0 !important}
           .stop{position:absolute;inset-block:20px;inset-inline-end:4px;inline-size:min(4px, max(0px, ${inactive} - 4px));border-radius:9999px;background:#516d2f;z-index:1;pointer-events:none;${kind === 'hidden' ? 'display:none' : ''}}`,
        );
        root.adoptedStyleSheets.push(s);
        stop = document.createElement('span');
        stop.className = 'stop';
        root.querySelector('.handle')!.before(stop);
      }
      document.body.append(el);
      const r = stop?.getBoundingClientRect();
      return r && `${r.x.toFixed(2)} + ${r.width.toFixed(2)}`;
    },
    [kind, value, style] as const,
  );
  return { info, png: (await page.screenshot()).toString('base64') };
};
const differ = (a: string, b: string) =>
  page.evaluate(
    async ([a, b]) => {
      const read = async (png: string) => {
        const image = new Image();
        image.src = `data:image/png;base64,${png}`;
        await image.decode();
        const canvas = new OffscreenCanvas(image.width, image.height);
        const c = canvas.getContext('2d')!;
        c.drawImage(image, 0, 0);
        return c.getImageData(0, 0, image.width, image.height).data;
      };
      const [x, y] = [await read(a!), await read(b!)];
      let count = 0;
      for (let i = 0; i < x.length; i += 4) {
        if (
          Math.abs(x[i]! - y[i]!) > 48 ||
          Math.abs(x[i + 1]! - y[i + 1]!) > 48 ||
          Math.abs(x[i + 2]! - y[i + 2]!) > 48
        ) {
          count += 1;
        }
      }
      return count;
    },
    [a, b] as const,
  );
for (const [name, style] of [
  ['ltr', ''],
  ['direction:rtl', 'direction:rtl'],
] as const) {
  for (const value of [0, 500, 900, 925, 940, 960, 1000]) {
    const built = await shoot('built', value, style);
    const element = await shoot('element', value, style);
    const hidden = await shoot('hidden', value, style);
    console.log(
      `  ${name.padEnd(14)} ${String(value).padStart(4)}/1000  differ ${String(await differ(built.png, element.png)).padStart(4)}, without the stop ${String(await differ(built.png, hidden.png)).padStart(4)}, the element's box ${element.info}`,
    );
  }
}
await browser.close();
