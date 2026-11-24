// When Chromium's `:active` comes and goes on the built slider's input under
// emulated touch: a finger that rests, and one that scrolls the page. It is what
// the held state shows by `:active`, beside the pointer events that would set it.
// Run from packages/material-x, with the packages built:
//   node ../../.plan/slider-1/probes/held-state-touch.ts
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/package.json`);
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await (
  await browser.newContext({
    hasTouch: true,
    viewport: { width: 500, height: 400 },
  })
).newPage();
const cdp = await page.context().newCDPSession(page);
await page.setContent(
  '<!doctype html><div style="padding:60px;height:2000px"><input id=q type=range style="width:380px;height:44px;touch-action:pan-y"></div>',
);
await page.evaluate(() => {
  const q = document.querySelector('#q')!;
  const log: string[] = ((globalThis as any).log = []);
  let start = 0;
  addEventListener(
    'pointerdown',
    () => {
      start = performance.now();
    },
    true,
  );
  for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'])
    addEventListener(
      t,
      () => log.push(`${t} ${Math.round(performance.now() - start)}`),
      true,
    );
  let was = false;
  const read = () => {
    const is = q.matches(':active');
    if (is !== was) {
      log.push(
        `[${is ? 'active' : 'not active'} ${Math.round(performance.now() - start)}]`,
      );
      was = is;
    }
    requestAnimationFrame(read);
  };
  read();
});
const at = { x: 150, y: 82 };
const touch = (type: string, p?: { x: number; y: number }) =>
  cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [p] : [] });
const take = async (name: string) =>
  console.log(
    `${name}: ${await page.evaluate(() => (globalThis as any).log.splice(0).join(', '))}`,
  );
await touch('touchStart', at);
await page.waitForTimeout(400);
await touch('touchEnd');
await page.waitForTimeout(200);
await take('rests 400 ms, lifts');
await touch('touchStart', at);
for (let i = 1; i < 15; i++) {
  await touch('touchMove', { x: at.x, y: at.y - 8 * i });
  await page.waitForTimeout(16);
}
await touch('touchEnd');
await page.waitForTimeout(200);
await take('scrolls at once');
await page.evaluate(() => scrollTo(0, 0));
await page.waitForTimeout(100);
await touch('touchStart', at);
await page.waitForTimeout(150);
for (let i = 1; i < 15; i++) {
  await touch('touchMove', { x: at.x, y: at.y - 8 * i });
  await page.waitForTimeout(16);
}
await touch('touchEnd');
await page.waitForTimeout(200);
await take('rests 150 ms, then scrolls');
await browser.close();
