// Whether anything cheap keeps a range's held state in WebKit, where `:active`
// goes about 0.1 s after a still press on the track, and what a held state from
// pointer events has to handle: where the release arrives, with and without
// pointer capture. Run from the repository's root:
//   node .plan/slider-1/probes/press-active-variants.ts
import { createRequire } from 'node:module';

const require = createRequire(
  `${process.cwd()}/packages/material-x/package.json`,
);
const { chromium, firefox, webkit } = require('playwright');

const VARIANTS: Record<string, readonly [css: string, script: string]> = {
  bare: ['', ''],
  'the thumb with pointer-events: none': [
    '#q::-webkit-slider-thumb { pointer-events: none }',
    '',
  ],
  'the track and the thumb with pointer-events: none': [
    '#q::-webkit-slider-thumb, #q::-webkit-slider-runnable-track { pointer-events: none }',
    '',
  ],
  'user-select: none': ['#q { -webkit-user-select: none }', ''],
  'the thumb with no change of width': [
    '#q { appearance: none } #q::-webkit-slider-thumb { appearance: none; width: 4px; height: 20px }',
    '',
  ],
  'pointer capture on pointerdown': [
    '',
    'q.addEventListener("pointerdown", (e) => q.setPointerCapture(e.pointerId));',
  ],
  'preventDefault on mousemove': [
    '',
    'q.addEventListener("mousemove", (e) => e.preventDefault());',
  ],
};

for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch();
  console.log(`# ${type.name()} ${browser.version()}`);
  for (const [name, [css, script]] of Object.entries(VARIANTS)) {
    const page = await browser.newPage();
    await page.setContent(
      `<!doctype html><style>#p { padding: 20px; width: 400px } #q { width: 400px } ${css}</style><div id=p><input id=q type=range><div id=after style="height:200px"></div></div><script>const q = document.getElementById('q');${script}</script>`,
    );
    await page.evaluate(() => {
      const q = document.querySelector('#q')!;
      const log: string[] = ((globalThis as any).log = []);
      for (const t of [
        'pointerdown',
        'pointermove',
        'pointerup',
        'pointercancel',
        'lostpointercapture',
        'mousemove',
        'mouseup',
      ])
        addEventListener(
          t,
          (e: any) =>
            log.push(
              `${t}@${(e.target as Element).id || (e.target as Element).nodeName}${e.isTrusted ? '' : '!'}`,
            ),
          true,
        );
      addEventListener(
        'pointerdown',
        () => {
          let was = '';
          const start = performance.now();
          const read = () => {
            const is =
              ['#q', '#p', 'html']
                .filter((s) => document.querySelector(s)!.matches(':active'))
                .join('+') || 'none';
            if (is !== was) {
              log.push(
                `[active ${is} ${Math.round(performance.now() - start)} ms]`,
              );
              was = is;
            }
            requestAnimationFrame(read);
          };
          read();
        },
        true,
      );
    });
    const box = (await page.locator('#q').boundingBox())!;
    await page.mouse.move(box.x + 100, box.y + box.height / 2);
    await page.evaluate(() => ((globalThis as any).log.length = 0));
    await page.mouse.down();
    await page.waitForTimeout(500);
    const still = await page.evaluate(() =>
      (globalThis as any).log.splice(0).join(' '),
    );
    await page.mouse.move(box.x + 100, box.y + 150);
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(100);
    const out = await page.evaluate(() =>
      (globalThis as any).log.splice(0).join(' '),
    );
    console.log(`${name}\n  still: ${still}\n  moved out and released: ${out}`);
    await page.close();
  }
  await browser.close();
}
