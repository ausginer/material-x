// Emulated touch in Chromium.
import { open, browser, ENGINE } from './lib.ts';
console.log(`# ${ENGINE} ${browser.version()}`);
const HTML = (attrs = '', after = 3000) =>
  `<style>body{margin:0} mx-slider{inline-size:204px;margin:60px 0 0 100px}</style><mx-slider id=s ${attrs}></mx-slider><div style="height:${after}px"></div><button id=b>b</button>`;
async function run(
  name: string,
  html: string,
  go: (t: any) => Promise<void>,
  read: string,
) {
  const page = await open(html, { hasTouch: true, isMobile: false });
  const cdp = await page.context().newCDPSession(page);
  const b = await page.evaluate(() => {
    const w = window as any;
    w.log = [];
    for (const t of ['input', 'change'])
      w.s.addEventListener(t, () => {
        const v = t + w.s.value;
        if (w.log.at(-1) !== v) w.log.push(v);
      });
    for (const t of ['pointerdown', 'pointercancel', 'pointerup'])
      w.inp(w.s).addEventListener(t, () => w.log.push(t));
    const r = w.inp(w.s).getBoundingClientRect();
    return [r.left + 2, r.top + r.height / 2];
  });
  const send = (type: string, pts: any[]) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts } as any);
  const at = (f: number, dy = 0, id = 0) => ({
    x: b[0]! + f * 200,
    y: b[1]! + dy,
    id,
  });
  const drag = async (from: any, dx: number, dy: number, end = true) => {
    await send('touchStart', [from]);
    for (let i = 1; i <= 10; i++) {
      await send('touchMove', [
        { ...from, x: from.x + (dx * i) / 10, y: from.y + (dy * i) / 10 },
      ]);
      await page.waitForTimeout(16);
    }
    if (end) {
      await send('touchEnd', []);
      await page.waitForTimeout(200);
    }
  };
  await go({ page, send, at, drag });
  console.log(
    name,
    '|',
    (await page.evaluate(() => (window as any).log)).join(' '),
    '|',
    JSON.stringify(await page.evaluate(read)),
  );
  await page.context().close();
}
const ST =
  '[s.value, frac(s), scrollY, inp(s).matches(":active"), getComputedStyle(q(s,".handle"),"::after").display, q(s,".handle").getBoundingClientRect().width]';
await run(
  'vertical pan',
  HTML('indicator'),
  async ({ drag, at }) => drag(at(0.21), 0, -100),
  ST,
);
await run(
  'vertical pan, held at the end',
  HTML('indicator'),
  async ({ drag, at, page }) => {
    await drag(at(0.21), 0, -100, false);
    await page.waitForTimeout(400);
  },
  ST,
);
await run(
  'pan on a page that cannot scroll',
  HTML('', 0),
  async ({ drag, at }) => drag(at(0.21), 0, -100),
  ST,
);
await run(
  'horizontal drag',
  HTML(),
  async ({ drag, at }) => drag(at(0.21), 60, 0),
  ST,
);
await run(
  'diagonal 30 down, 60 across',
  HTML(),
  async ({ drag, at }) => drag(at(0.21), 60, -30),
  ST,
);
await run(
  'horizontal, then far vertical',
  HTML(),
  async ({ send, at, page }) => {
    await send('touchStart', [at(0.21)]);
    for (let i = 1; i < 6; i++) await send('touchMove', [at(0.21 + i * 0.05)]);
    for (let i = 1; i < 10; i++) await send('touchMove', [at(0.46, -i * 15)]);
    await send('touchEnd', []);
    await page.waitForTimeout(150);
  },
  ST,
);
// Ownership after a cancelled press.
await run(
  'attribute followed after a cancelled press?',
  HTML('value=30'),
  async ({ drag, at, page }) => {
    await drag(at(0.7), 0, -100);
    await page.evaluate(() => {
      (window as any).s.setAttribute('value', '60');
    });
  },
  's.value',
);
await run(
  '  control: no press',
  HTML('value=30'),
  async ({ page }) => {
    await page.evaluate(() => {
      (window as any).s.setAttribute('value', '60');
    });
  },
  's.value',
);
await run(
  'requested number after a cancelled press? (value=200, then max=300)',
  HTML(),
  async ({ drag, at, page }) => {
    await page.evaluate(() => {
      (window as any).s.value = 200;
    });
    await drag(at(0.3), 0, -100);
    await page.evaluate(() => {
      (window as any).s.max = 300;
    });
  },
  's.value',
);
await run(
  '  control: no press',
  HTML(),
  async ({ page }) => {
    await page.evaluate(() => {
      (window as any).s.value = 200;
      (window as any).s.max = 300;
    });
  },
  's.value',
);
await run(
  'midpoint followed after a cancelled press? (max=300)',
  HTML(),
  async ({ drag, at, page }) => {
    await drag(at(0.3), 0, -100);
    await page.evaluate(() => {
      (window as any).s.max = 300;
    });
  },
  's.value',
);
await run(
  '  control: no press',
  HTML(),
  async ({ page }) => {
    await page.evaluate(() => {
      (window as any).s.max = 300;
    });
  },
  's.value',
);
// A script write during the press, before the cancel.
await run(
  'a script write during the press',
  HTML('value=30'),
  async ({ send, at, page }) => {
    await send('touchStart', [at(0.7)]);
    await page.waitForTimeout(50);
    await page.evaluate(() => {
      (window as any).s.value = 90;
    });
    for (let i = 1; i < 10; i++) {
      await send('touchMove', [at(0.7, -i * 12)]);
      await page.waitForTimeout(16);
    }
    await send('touchEnd', []);
    await page.waitForTimeout(100);
  },
  's.value',
);
// Later change events.
await run(
  'cancelled, then blur',
  HTML('value=30'),
  async ({ drag, at, page }) => {
    await page.evaluate(() => (window as any).s.focus());
    await drag(at(0.7), 0, -100);
    await page.evaluate(() => {
      (window as any).s.blur();
      (window as any).b.focus();
    });
    await page.waitForTimeout(100);
  },
  's.value',
);
await run(
  'cancelled, then a tap',
  HTML('value=30', 0),
  async ({ drag, at, send, page }) => {
    await drag(at(0.7), 0, -100);
    await send('touchStart', [at(0.5)]);
    await send('touchEnd', []);
    await page.waitForTimeout(200);
  },
  's.value',
);
await run(
  'two fingers, second on the slider, then a pan',
  HTML('value=30'),
  async ({ send, at, page }) => {
    await send('touchStart', [at(0.7)]);
    await page.waitForTimeout(50);
    await send('touchStart', [at(0.7), at(0.9, 0, 1)]);
    for (let i = 1; i < 10; i++) {
      await send('touchMove', [at(0.7, -i * 15), at(0.9, -i * 15, 1)]);
      await page.waitForTimeout(16);
    }
    await send('touchEnd', []);
    await page.waitForTimeout(200);
  },
  ST,
);
await run(
  'form value after a cancelled press',
  `<form id=f>${HTML('value=30 name=n')}</form>`,
  async ({ drag, at }) => drag(at(0.7), 0, -100),
  '[s.value, new FormData(f).get("n")]',
);
await run(
  'disabled: pan scrolls',
  HTML('disabled'),
  async ({ drag, at }) => drag(at(0.7), 0, -100),
  ST,
);
await run(
  'label: pan scrolls',
  HTML().replace(
    '></mx-slider>',
    '><span slot=label id=l>Label</span></mx-slider>',
  ),
  async ({ drag, at }) => drag(at(0.0, -30), 0, -100),
  ST,
);
await run(
  'in a horizontal scroller, horizontal drag',
  `<div style="overflow-x:auto;width:400px" id=h><div style="width:900px">${HTML()}</div></div>`,
  async ({ drag, at }) => drag(at(0.6), -60, 0),
  '[s.value, h.scrollLeft]',
);
await browser.close();
