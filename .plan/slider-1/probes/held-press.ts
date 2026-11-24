// A touch press that the browser may still turn into a scroll: the built
// mx-slider's restoration, against a slider that holds the press's `input`
// until the finger moves the value or lifts, and one that restores the owner.
// Chromium by emulated touch through CDP.
//
// node held-press.ts <packages>
// Build the packages first.
import { chromium } from 'playwright';
import { built, hold, restoreOwner } from './held-press-variants.ts';

const browser = await chromium.launch({ channel: 'chromium' });
console.log(`# chromium ${browser.version()}`);
const HTML = (attrs = '', after = 3000) =>
  `<!doctype html><style>body{margin:0} mx-slider{inline-size:204px;margin:60px 0 0 100px}</style><mx-slider id=s ${attrs}></mx-slider><div style="height:${after}px"></div>`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function run(
  code: string,
  name: string,
  html: string,
  go: (t: any) => Promise<void>,
  read = 's.value',
) {
  const ctx = await browser.newContext({
    viewport: { width: 800, height: 600 },
    hasTouch: true,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.setContent(html);
  await page.addScriptTag({ content: code });
  const cdp = await ctx.newCDPSession(page);
  const b = await page.evaluate(() => {
    const w = window as any;
    w.log = [];
    const input = w.s.shadowRoot.querySelector('.input');
    for (const t of ['input', 'change'])
      w.s.addEventListener(t, () => w.log.push(`${t}${w.s.value}`));
    for (const t of [
      'pointerdown',
      'pointermove',
      'pointercancel',
      'pointerup',
      'touchcancel',
    ])
      input.addEventListener(t, (e: any) =>
        w.log.push(t.replace('pointer', 'p.')),
      );
    const r = input.getBoundingClientRect();
    return [r.left + 2, r.top + r.height / 2];
  });
  const send = (type: string, pts: any[]) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts } as any);
  const at = (f: number, dy = 0, id = 0) => ({
    x: b[0]! + f * 200,
    y: b[1]! + dy,
    id,
  });
  const drag = async (
    f: number,
    dx: number,
    dy: number,
    steps = 10,
    finish = true,
  ) => {
    const from = at(f);
    await send('touchStart', [from]);
    for (let i = 1; i <= steps; i++) {
      await send('touchMove', [
        { ...from, x: from.x + (dx * i) / steps, y: from.y + (dy * i) / steps },
      ]);
      await sleep(16);
    }
    if (finish) await send('touchEnd', []);
    await sleep(200);
  };
  await go({ page, send, at, drag });
  const log = (await page.evaluate(() => (window as any).log)) as string[];
  const short = log
    .filter((l, i) => l !== log[i - 1])
    .map((l, i, all) =>
      all.length > 16 && i > 4 && i < all.length - 3 ? '' : l,
    )
    .filter(Boolean);
  console.log(
    `${name} | ${short.join(' ')} | ${JSON.stringify(await page.evaluate(read))}`,
  );
  await ctx.close();
}

for (const [label, code] of [
  ['built', built],
  ['restores the owner', restoreOwner],
  ['holds the press', hold],
] as const) {
  console.log(`## ${label}`);
  const ev =
    (js: string) =>
    async ({ page }: any) =>
      page.evaluate(js);
  await run(
    code,
    'vertical pan',
    HTML(),
    ({ drag }) => drag(0.21, 0, -100),
    '[s.value, scrollY]',
  );
  await run(
    code,
    'vertical pan, 1 px steps',
    HTML(),
    ({ drag }) => drag(0.21, 0, -100, 100),
    '[s.value, scrollY]',
  );
  for (const angle of [20, 30, 40, 45, 50, 60, 70, 80])
    await run(
      code,
      `pan at ${angle} deg, 2 px steps`,
      HTML('max=1000 value=500'),
      ({ drag }) =>
        drag(
          0.21,
          100 * Math.cos((angle * Math.PI) / 180),
          -100 * Math.sin((angle * Math.PI) / 180),
          50,
        ),
      '[s.value, scrollY]',
    );
  await run(code, 'tap', HTML(), ({ drag }) => drag(0.21, 0, 0, 0));
  await run(code, 'long press, no move', HTML(), async ({ send, at }) => {
    await send('touchStart', [at(0.21)]);
    await sleep(900);
    await send('touchEnd', []);
    await sleep(200);
  });
  await run(code, 'horizontal drag', HTML(), ({ drag }) => drag(0.21, 60, 0));
  await run(
    code,
    'horizontal, then far vertical',
    HTML(),
    async ({ send, at }) => {
      await send('touchStart', [at(0.21)]);
      for (let i = 1; i < 6; i++)
        await send('touchMove', [at(0.21 + i * 0.05)]);
      for (let i = 1; i < 10; i++) await send('touchMove', [at(0.46, -i * 15)]);
      await send('touchEnd', []);
      await sleep(150);
    },
    '[s.value, scrollY]',
  );
  await run(
    code,
    'slide, then the system cancels',
    HTML(),
    async ({ send, at }) => {
      await send('touchStart', [at(0.21)]);
      for (let i = 1; i < 6; i++) {
        await send('touchMove', [at(0.21 + i * 0.05)]);
        await sleep(16);
      }
      await send('touchCancel', []);
      await sleep(200);
    },
  );
  await run(
    code,
    'drag from the handle, step 25',
    HTML('step=25'),
    ({ drag }) => drag(0.5, 60, 0),
  );
  await run(code, 'drag off the handle, step 25', HTML('step=25'), ({ drag }) =>
    drag(0.3, 30, 0),
  );
  await run(code, 'cancelled pan, then a key', HTML('value=30'), async (t) => {
    await t.drag(0.7, 0, -100);
    await ev('s.focus()')(t);
    await t.page.keyboard.press('ArrowUp');
  });
  await run(
    code,
    'cancelled pan, then a tap',
    HTML('value=30', 0),
    async (t) => {
      await t.drag(0.7, 0, -100);
      await t.drag(0.5, 0, 0, 0);
    },
  );
  await run(
    code,
    'mouse press and drag',
    HTML('value=30'),
    async ({ page, at }) => {
      const p = at(0.5);
      await page.mouse.move(p.x, p.y);
      await page.mouse.down();
      await page.mouse.move(p.x + 20, p.y);
      await page.mouse.up();
    },
  );
  await run(code, 'pan on the handle', HTML(), ({ drag }) =>
    drag(0.5, 0, -100),
  );
  await run(code, 'attribute 30, then 60', HTML('value=30'), async (t) => {
    await t.drag(0.7, 0, -100);
    await ev('s.setAttribute("value","60")')(t);
  });
  await run(code, 'midpoint, then max=300', HTML(), async (t) => {
    await t.drag(0.3, 0, -100);
    await ev('s.max=300')(t);
  });
  await run(code, 'value=200, then max=300', HTML(), async (t) => {
    await ev('s.value=200')(t);
    await t.drag(0.3, 0, -100);
    await ev('s.max=300')(t);
  });
  const during =
    (js: string) =>
    async ({ send, at, page }: any) => {
      await send('touchStart', [at(0.7)]);
      await sleep(50);
      await page.evaluate(js);
      for (let i = 1; i < 10; i++) {
        await send('touchMove', [at(0.7, -i * 12)]);
        await sleep(16);
      }
      await send('touchEnd', []);
      await sleep(150);
    };
  await run(
    code,
    'script sets 90 during',
    HTML('value=30'),
    during('s.value=90'),
  );
  await run(
    code,
    'attribute set to 60 during',
    HTML('value=30'),
    during('s.setAttribute("value","60")'),
  );
  await run(
    code,
    'form reset during',
    `<form id=f>${HTML('value=30')}</form>`,
    during('f.reset()'),
  );
  await run(code, 'max=50 during', HTML('value=80'), during('s.max=50'));
  await run(code, 'echo in input (controlled)', HTML('value=30'), async (t) => {
    await ev('s.addEventListener("input",()=>{s.value=s.value})')(t);
    await t.drag(0.7, 0, -100);
  });
  await run(code, 'snap to 20 in input', HTML('value=40'), async (t) => {
    await ev(
      's.addEventListener("input",()=>{s.value=Math.round(s.value/20)*20})',
    )(t);
    await t.drag(0.7, 0, -100);
  });
  await run(
    code,
    'feedback from a player',
    HTML('value=30'),
    async (t) => {
      await ev(
        'p=30;s.addEventListener("input",()=>{p=s.value});setInterval(()=>{s.value=p},10);0',
      )(t);
      await t.drag(0.7, 0, -100);
      await sleep(100);
    },
    '[s.value,p]',
  );
  await run(
    code,
    'script sets 90 during a tap',
    HTML('value=30'),
    async ({ send, at, page }: any) => {
      await send('touchStart', [at(0.7)]);
      await sleep(50);
      await page.evaluate('s.value=90');
      await send('touchEnd', []);
      await sleep(150);
    },
  );
  await run(
    code,
    'disabled during',
    HTML('value=30'),
    during('s.disabled=true'),
  );
  await run(
    code,
    'moved in the DOM during',
    HTML('value=30'),
    during('document.body.append(s)'),
    '[s.value, s.shadowRoot.querySelector(".input").value]',
  );
  await run(
    code,
    'two fingers',
    HTML('value=30'),
    async ({ send, at }: any) => {
      await send('touchStart', [at(0.7)]);
      await sleep(50);
      await send('touchStart', [at(0.7), at(0.9, 0, 1)]);
      for (let i = 1; i < 10; i++) {
        await send('touchMove', [at(0.7, -i * 15), at(0.9, -i * 15, 1)]);
        await sleep(16);
      }
      await send('touchEnd', []);
      await sleep(200);
    },
    '[s.value, s.shadowRoot.querySelector(".input").value]',
  );
}
await browser.close();
