// Pointer, capture, touch and the shown value indicator.
import { open, browser, ENGINE } from './lib.ts';
console.log(`# ${ENGINE} ${browser.version()}`);
const CSS =
  '<style>body{margin:0} mx-slider,input{inline-size:204px;margin:60px 0 0 100px;display:block} input{appearance:none} input::-webkit-slider-thumb{appearance:none;width:4px;height:44px} input::-moz-range-thumb{width:4px;height:44px;border:0;box-sizing:border-box} input{height:44px;margin-block:0}</style>';
// 1. Differential against a native range: events of one gesture script.
async function gesture(
  target: 'mx-slider' | 'input',
  page: any,
  script: (
    p: any,
    at: (f: number) => [number, number],
    settle: () => Promise<void>,
  ) => Promise<void>,
) {
  const box = await page
    .locator(target === 'input' ? '#n' : '#s')
    .evaluate((e: any) => {
      const i = e.shadowRoot ? e.shadowRoot.querySelector('.input') : e;
      const r = i.getBoundingClientRect();
      return [r.left, r.top, r.width, r.height];
    });
  const at = (f: number): [number, number] => [
    box[0] + 2 + f * 200,
    box[1] + box[3] / 2,
  ];
  await page.evaluate(
    (id: string) => {
      const w = window as any;
      w.log = [];
      w.ac?.abort();
      w.ac = new AbortController();
      const el: any = document.getElementById(id);
      for (const t of ['input', 'change', 'click'])
        el.addEventListener(
          t,
          () => {
            const v = `${t} ${el.value}`;
            if (w.log.at(-1) !== v) w.log.push(v);
          },
          { signal: w.ac.signal },
        );
    },
    target === 'input' ? 'n' : 's',
  );
  await script(page, at, async () => {
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );
  });
  await page.waitForTimeout(80);
  return (await page.evaluate(() => (window as any).log)).join(', ');
}
const scripts: Record<string, any> = {
  'drag away and back': async (p: any, at: any, s: any) => {
    await p.mouse.move(...at(0.5));
    await p.mouse.down();
    await p.mouse.move(...at(0.8));
    await s();
    await p.mouse.move(...at(0.5));
    await s();
    await p.mouse.up();
  },
  'drag far below': async (p: any, at: any, s: any) => {
    const [x, y] = at(0.3);
    await p.mouse.move(x, y);
    await p.mouse.down();
    await p.mouse.move(x + 60, y + 250);
    await s();
    await p.mouse.move(x + 100, y + 250);
    await s();
    await p.mouse.up();
  },
  'right button': async (p: any, at: any, s: any) => {
    await p.mouse.move(...at(0.3));
    await p.mouse.down({ button: 'right' });
    await p.mouse.move(...at(0.6));
    await s();
    await p.mouse.up({ button: 'right' });
  },
  'press, Escape': async (p: any, at: any, s: any) => {
    await p.mouse.move(...at(0.3));
    await p.mouse.down();
    await p.mouse.move(...at(0.6));
    await s();
    await p.keyboard.press('Escape');
    await s();
    await p.mouse.move(...at(0.7));
    await s();
    await p.mouse.up();
  },
  'press then arrow': async (p: any, at: any, s: any) => {
    await p.mouse.move(...at(0.3));
    await p.mouse.down();
    await p.mouse.up();
    await s();
    await p.keyboard.press('ArrowRight');
    await p.keyboard.press('Home');
    await p.keyboard.press('Home');
  },
  wheel: async (p: any, at: any, s: any) => {
    await p.mouse.move(...at(0.5));
    await p.mouse.wheel(0, 100);
    await s();
  },
};
for (const [name, script] of Object.entries(scripts)) {
  const out: string[] = [];
  for (const t of ['mx-slider', 'input'] as const) {
    const page = await open(
      CSS + '<mx-slider id=s></mx-slider><input id=n type=range>',
    );
    out.push(await gesture(t, page, script));
    await page.context().close();
  }
  console.log(
    name,
    out[0] === out[1] ? 'SAME' : 'DIFF',
    '|',
    out[0],
    out[0] === out[1] ? '' : `| native: ${out[1]}`,
  );
}
// 2. Mid-drag changes.
for (const [name, act] of [
  ['disabled', 's.disabled=true'],
  ['fieldset', 'fs.disabled=true'],
  ['removed', 's.remove()'],
  ['moved', 'document.body.append(s)'],
  ['max', 's.max=60'],
  ['min', 's.min=40'],
  ['hidden', 's.style.display="none"'],
] as const) {
  const page = await open(
    CSS +
      '<fieldset id=fs style="border:0;padding:0;margin:0"><mx-slider id=s indicator></mx-slider></fieldset>',
  );
  const b = await page.evaluate(() => {
    const r = (window as any).inp((window as any).s).getBoundingClientRect();
    return [r.left, r.top + r.height / 2];
  });
  await page.mouse.move(b[0]! + 2 + 60, b[1]!);
  await page.mouse.down();
  await page.evaluate(() => {
    const w = window as any;
    w.S = document.getElementById('s');
    Object.defineProperty(w, 's', { value: w.S, configurable: true });
    w.log = [];
    for (const t of ['input', 'change'])
      w.s.addEventListener(t, () => w.log.push(t + w.s.value));
  });
  await page.evaluate(act);
  await page.waitForTimeout(50);
  await page.mouse.move(b[0]! + 2 + 160, b[1]!, { steps: 3 });
  await page.waitForTimeout(50);
  const during = await page.evaluate(() => {
    const w = window as any;
    return w.s.isConnected
      ? [
          w.s.value,
          w.frac(w.s),
          getComputedStyle(w.q(w.s, '.handle'), '::after').display,
          w.q(w.s, '.handle').getBoundingClientRect().width,
        ]
      : 'gone';
  });
  await page.mouse.up();
  await page.waitForTimeout(400);
  console.log(
    'mid-drag',
    name,
    JSON.stringify(during),
    JSON.stringify(
      await page.evaluate(() => {
        const w = window as any;
        return [
          w.log.join(),
          w.s.value,
          w.s.isConnected &&
            getComputedStyle(w.q(w.s, '.handle'), '::after').display,
          w.inp(w.s).matches(':active'),
        ];
      }),
    ),
  );
  await page.context().close();
}
// 3. The shown indicator at an end: scrollable overflow.
for (const dir of ['ltr', 'rtl'])
  for (const value of ['0', '100'])
    for (const how of ['held', 'focus']) {
      const page = await open(
        `<style>body{margin:0} #c{inline-size:204px;overflow:auto;padding-block-start:80px} </style><div dir=${dir}><div id=c><mx-slider id=s indicator value=${value}></mx-slider></div><div id=d><mx-slider id=s2 indicator value=${value} style="display:block"></mx-slider></div></div>`,
      );
      const read = () =>
        page.evaluate(() => {
          const c = document.getElementById('c')!;
          return [c.scrollWidth - 204, c.clientHeight];
        });
      const rest = await read();
      if (how === 'held') {
        const b = await page.evaluate(() => {
          const r = (window as any)
            .q((window as any).s, '.handle')
            .getBoundingClientRect();
          return [r.left + r.width / 2, r.top + r.height / 2];
        });
        await page.mouse.move(b[0]!, b[1]!);
        await page.mouse.down();
      } else await page.keyboard.press('Tab');
      await page.waitForTimeout(400);
      console.log(
        'overflow',
        dir,
        value,
        how,
        'rest',
        rest.join('/'),
        'shown',
        (await read()).join('/'),
      );
      await page.mouse.up();
      if (how === 'held') {
        const b = await page.evaluate(() => {
          const r = (window as any)
            .q((window as any).s2, '.handle')
            .getBoundingClientRect();
          return [r.left + r.width / 2, r.top + r.height / 2];
        });
        await page.mouse.move(b[0]!, b[1]!);
        await page.mouse.down();
        await page.waitForTimeout(400);
        console.log(
          '   full-width page: scrollWidth - clientWidth',
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          ),
        );
      }
      await page.context().close();
    }
// 4. A press held on the label.
{
  const page = await open(
    CSS +
      '<mx-slider id=s indicator value=40><span slot=label id=l>Label</span></mx-slider>',
  );
  const b = (await page.locator('#l').boundingBox())!;
  await page.mouse.move(b.x + 5, b.y + 5);
  await page.mouse.down();
  await page.waitForTimeout(300);
  console.log(
    'held label',
    JSON.stringify(
      await page.evaluate(() => {
        const w = window as any;
        return [
          w.inp(w.s).matches(':active'),
          w.q(w.s, '.handle').getBoundingClientRect().width,
          getComputedStyle(w.q(w.s, '.handle'), '::after').display,
        ];
      }),
    ),
  );
  await page.mouse.up();
  await page.waitForTimeout(300);
  console.log(
    'after label click',
    JSON.stringify(
      await page.evaluate(() => {
        const w = window as any;
        return [
          w.inp(w.s).matches(':focus-visible'),
          getComputedStyle(w.q(w.s, '.handle'), '::after').display,
        ];
      }),
    ),
  );
  await page.context().close();
}
// 5. Handler rewrites: change.
for (const kind of ['drag', 'key'] as const) {
  const page = await open(CSS + '<mx-slider id=s></mx-slider>');
  const b = await page.evaluate(() => {
    const w = window as any;
    w.log = [];
    w.s.addEventListener('input', () => {
      w.s.value = Math.min(60, w.s.value);
      w.log.push('i' + w.s.value);
    });
    w.s.addEventListener('change', () => w.log.push('c' + w.s.value));
    const r = w.inp(w.s).getBoundingClientRect();
    return [r.left + 2, r.top + r.height / 2];
  });
  if (kind === 'drag') {
    await page.mouse.move(b[0]! + 60, b[1]!);
    await page.mouse.down();
    await page.mouse.move(b[0]! + 160, b[1]!);
    await page.waitForTimeout(80);
    await page.mouse.up();
  } else {
    await page.evaluate(() => (window as any).s.focus());
    await page.keyboard.press('End');
  }
  await page.waitForTimeout(80);
  console.log(
    'rewritten by',
    kind,
    (await page.evaluate(() => (window as any).log)).join(' '),
  );
  await page.context().close();
}
await browser.close();
