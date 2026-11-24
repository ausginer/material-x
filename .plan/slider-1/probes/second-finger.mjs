// A second finger on a bare native range during a slide, in Chromium: what fires
// at its touch, at its lift, at later moves of the first, and at a cancel.
// Run from packages/material-x: node ../../.plan/slider-1/probes/second-finger.mjs
import { createRequire } from 'node:module';
const pw = createRequire(`${process.cwd()}/package.json`)('playwright');
const b = await pw.chromium.launch();
for (const end of ['touchEnd-second', 'touchEnd-none']) {
  const p = await b.newPage();
  await p.setContent(
    '<!doctype html><div style="padding:50px"><input type=range style="width:400px;touch-action:pan-y"></div><div style="height:3000px">',
  );
  await p.evaluate(() => {
    window.l = [];
    for (const t of [
      'pointerdown',
      'pointerup',
      'pointercancel',
      'input',
      'change',
    ])
      document.addEventListener(
        t,
        (e) =>
          l.push(
            t +
              (e.pointerId != null
                ? ' id' + e.pointerId + (e.isPrimary ? 'P' : '')
                : ' ' + e.target.value),
          ),
        true,
      );
  });
  const s = await p.context().newCDPSession(p);
  const box = await p.locator('input').boundingBox();
  const y = box.y + box.height / 2;
  const pt = (dx, id) => ({ x: box.x + dx, y, id });
  const send = async (type, ...touchPoints) => {
    await s.send('Input.dispatchTouchEvent', { type, touchPoints });
    await p.waitForTimeout(60);
  };
  await send('touchStart', pt(50, 0));
  for (let i = 1; i <= 5; i++) await send('touchMove', pt(50 + 20 * i, 0));
  await p.evaluate(() => l.push('-2nd'));
  await send('touchStart', pt(150, 0), pt(350, 1));
  await p.evaluate(() => l.push('-lift2'));
  const [t] = end.split('-');
  if (end !== 'touchEnd-none') await send(t, pt(350, 1));
  await p.evaluate(() => l.push('-more'));
  for (let i = 1; i <= 3; i++)
    await send(
      'touchMove',
      ...(end === 'touchEnd-none'
        ? [pt(150 + 20 * i, 0), pt(350, 1)]
        : [pt(150 + 20 * i, 0)]),
    );
  await p.evaluate(() => l.push('-cancel'));
  await send('touchCancel').catch((e) => console.log(e.message));
  console.log(end, (await p.evaluate(() => l)).join(' '));
  await p.close();
}
await b.close();
