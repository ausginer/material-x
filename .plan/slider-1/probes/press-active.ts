// How long a bare native range stays `:active` while the mouse button is down.
// The page has a doctype: in quirks mode a bare `:active` doesn't match.
//
// node press-active.ts
import { chromium, firefox, webkit } from 'playwright';

const controls = {
  range: '<input id="q" type="range" style="width: 400px">',
  button: '<button id="q" style="width: 400px">b</button>',
};
// The offset from the left end, the distance of the first move, and whether a
// move comes later.
const presses = {
  'the track, still': [100, 0, 0],
  'the track, moved by 2 px at once': [100, 2, 0],
  'the track, moved by 1 px after 500 ms': [100, 0, 1],
  'the thumb, still': [200, 0, 0],
} as const;

for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch();
  console.log(`# ${type.name()} ${browser.version()}`);

  for (const [control, html] of Object.entries(controls)) {
    for (const [name, [offset, first, later]] of Object.entries(presses)) {
      const page = await browser.newPage();
      await page.setContent(
        `<!doctype html><style>#q:active { color: red }</style>${html}`,
      );
      await page.evaluate(() => {
        const control = document.querySelector('#q')!;
        const log: string[] = ((globalThis as any).log = []);
        addEventListener('pointerdown', () => {
          const start = performance.now();
          let was = false;
          const read = () => {
            const is = control.matches(':active');
            if (is !== was) {
              const time = Math.round(performance.now() - start);
              log.push(`${is ? 'on' : 'off'} ${time} ms`);
              was = is;
            }
            requestAnimationFrame(read);
          };
          read();
        });
      });
      const box = (await page.locator('#q').boundingBox())!;
      const x = box.x + offset;
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      if (first) await page.mouse.move(x + first, y);
      await page.waitForTimeout(500);
      if (later) await page.mouse.move(x + later, y);
      await page.waitForTimeout(500);
      const log = await page.evaluate(() => (globalThis as any).log);
      console.log(`${control}, ${name}: ${log.join(', ')}`);
      await page.close();
    }
  }

  await browser.close();
}
