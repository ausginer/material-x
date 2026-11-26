// Chromium, no package code: does `touch-action: none` on an element stop a pan that starts on its content?
// Run from packages/material-x: node ../../.plan/inline-handle-1/probes/slot-text.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(`${process.cwd()}/package.json`)(
  'playwright',
);
const browser = await chromium.launch();
console.log(`# chromium ${browser.version()}`);
const BOX =
  'display:inline-block;inline-size:40px;block-size:40px;touch-action:none;background:silver;font-size:40px;line-height:1';
const CASES = {
  'light text': ['<div id=t>W</div>', ''],
  'shadow slot (contents) with light text': [
    '<div id=t>W</div>',
    '<slot></slot>',
  ],
  'shadow slot, display: block': [
    '<div id=t>W</div>',
    '<slot style="display:block"></slot>',
  ],
  'shadow slot (contents), touch-action: none on it too': [
    '<div id=t>W</div>',
    '<slot style="touch-action:none"></slot>',
  ],
  'shadow span with a slot': [
    '<div id=t>W</div>',
    '<span><slot></slot></span>',
  ],
  'shadow div with a slot': ['<div id=t>W</div>', '<div><slot></slot></div>'],
  'shadow slot with a light span': [
    '<div id=t><span>W</span></div>',
    '<slot></slot>',
  ],
  'shadow slot with a light div': [
    '<div id=t><div>W</div></div>',
    '<slot></slot>',
  ],
  'shadow text, no slot': ['<div id=t></div>', 'W'],
};
for (const [name, [html, shadow]] of Object.entries(CASES)) {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 400, height: 400 },
  });
  const page = await context.newPage();
  await page.setContent(
    `<!doctype html><style>body{margin:20px;height:2000px}#t{${BOX}}</style>${html}`,
  );
  await page.evaluate((s) => {
    if (s)
      document.querySelector('#t').attachShadow({ mode: 'open' }).innerHTML = s;
    window.canceled = false;
    addEventListener(
      'pointercancel',
      () => {
        window.canceled = true;
      },
      true,
    );
  }, shadow);
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  const cdp = await context.newCDPSession(page);
  const touch = (type, y) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x: 40, y }],
    });
  await touch('touchStart', 300);
  await touch('touchEnd');
  await touch('touchStart', 42);
  for (let i = 1; i <= 8; i += 1) {
    await touch('touchMove', 42 - i * 2);
    await page.waitForTimeout(16);
  }
  for (let i = 1; i <= 8; i += 1) {
    await touch('touchMove', 26 - i * 2);
    await page.waitForTimeout(16);
  }
  const r = await page.evaluate(() => ({
    canceled: window.canceled,
    scroll: scrollY,
  }));
  await touch('touchEnd');
  console.log(
    `${name}: pointercancel ${r.canceled}, scrollY ${Math.round(r.scroll)}`,
  );
  await context.close();
}
await browser.close();
