// The mouse's held state with two buttons, presses and ends; signed texts; equal bounds. Three engines.
// node recheck-mouse.ts <packages> <engine>
import { open, browser, ENGINE } from './lib.ts';
console.log(`# ${ENGINE} ${browser.version()}`);
const H = (a = '') =>
  `<style>body{margin:0} mx-slider{inline-size:204px;margin:100px}</style><form id=f><fieldset id=fs style="border:0;margin:0;padding:0"><mx-slider id=s name=n value=30 indicator ${a}></mx-slider></fieldset></form>`;
async function run(name: string, go: any, a = '') {
  const page = await open(H(a));
  const b = await page.evaluate(() => {
    const w = window as any;
    w.s = document.getElementById('s');
    w.f = document.getElementById('f');
    w.fs = document.getElementById('fs');
    w.log = [];
    for (const t of ['input', 'change'])
      w.s.addEventListener(t, () => w.log.push(t + w.s.value));
    w.mark = (m: string) =>
      w.log.push(
        `-${m}[v${w.s.value} ${w.s.matches(':state(pressed)') ? 'HELD' : 'rest'} h${getComputedStyle(w.q(w.s, '.handle')).width} ${getComputedStyle(w.q(w.s, '.indicator')).display}]`,
      );
    const r = w.inp(w.s).getBoundingClientRect();
    return [r.left + 2, r.top + r.height / 2];
  });
  const at = (f: number, dy = 0): [number, number] => [
    b[0]! + f * 200,
    b[1]! + dy,
  ];
  const m = page.mouse;
  await go({
    m,
    at,
    page,
    js: (c: string) => page.evaluate(c),
    mark: async (x: string) => {
      await page.waitForTimeout(60);
      await page.evaluate((x) => (window as any).mark(x), x);
    },
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => (window as any).mark('end'));
  console.log(name, '|', ((await page.evaluate('log')) as string[]).join(' '));
  await page.context().close();
}
await run(
  'press and rest 400 ms, drag 150 px below, release there',
  async ({ m, at, page, mark }: any) => {
    await m.move(...at(0.7));
    await m.down();
    await page.waitForTimeout(400);
    await mark('rest');
    await m.move(...at(0.7, 150), { steps: 4 });
    await mark('below');
    await page.waitForTimeout(400);
    await mark('below');
    await m.up();
  },
);
await run(
  'press on the handle and rest',
  async ({ m, at, page, mark }: any) => {
    await m.move(...at(0.3));
    await m.down();
    await page.waitForTimeout(400);
    await mark('rest');
    await m.up();
  },
);
await run(
  'drag out of the window, release there',
  async ({ m, at, mark }: any) => {
    await m.move(...at(0.5));
    await m.down();
    await m.move(-50, -50, { steps: 4 });
    await mark('out');
    await m.up();
  },
);
await run('right button', async ({ m, at, mark }: any) => {
  await m.move(...at(0.7));
  await m.down({ button: 'right' });
  await mark('down');
  await m.up({ button: 'right' });
});
await run('middle button', async ({ m, at, mark }: any) => {
  await m.move(...at(0.7));
  await m.down({ button: 'middle' });
  await mark('down');
  await m.up({ button: 'middle' });
});
await run(
  'left pressed while the right is down, drag',
  async ({ m, at, mark }: any) => {
    await m.move(...at(0.7));
    await m.down({ button: 'right' });
    await m.down();
    await mark('both');
    await m.move(...at(0.8), { steps: 3 });
    await mark('moved');
    await m.up();
    await mark('left up');
    await m.up({ button: 'right' });
  },
);
await run(
  'right pressed while the left is down, drag',
  async ({ m, at, mark }: any) => {
    await m.move(...at(0.7));
    await m.down();
    await m.down({ button: 'right' });
    await mark('both');
    await m.move(...at(0.8), { steps: 3 });
    await mark('moved');
    await m.up();
    await mark('left up');
    await m.up({ button: 'right' });
  },
);
for (const [n, c] of [
  ['disabled', 's.disabled=true'],
  ['fieldset', 'fs.disabled=true'],
  ['removed', 's.remove()'],
  ['moved', 'f.prepend(s)'],
  ['hidden', 's.style.display="none"'],
  ['value 90', 's.value=90'],
  ['reset', 'f.reset()'],
  ['max 50', 's.max=50'],
  ['size', 's.size="large"'],
  ['indicator off and on', 's.indicator=false;s.indicator=true'],
] as const)
  await run(
    `down at 70, ${n}, moved to 80, up`,
    async ({ m, at, mark, js }: any) => {
      await m.move(...at(0.7));
      await m.down();
      await js(c);
      await mark('did');
      await m.move(...at(0.8), { steps: 3 });
      await mark('moved');
      await m.up();
      await js('if(!s.isConnected)fs.append(s)');
    },
  );
await run(
  'disabled and enabled in a press, then a new press',
  async ({ m, at, mark, js }: any) => {
    await m.move(...at(0.7));
    await m.down();
    await js('s.disabled=true');
    await m.up();
    await js('s.disabled=false');
    await mark('enabled');
    await m.move(...at(0.2));
    await m.down();
    await mark('down');
    await m.up();
  },
);
await run(
  'Escape, arrow and Tab while down',
  async ({ m, at, mark, page }: any) => {
    await m.move(...at(0.7));
    await m.down();
    await page.keyboard.press('ArrowUp');
    await mark('arrow');
    await page.keyboard.press('Escape');
    await mark('escape');
    await m.up();
  },
);
await run(
  'a page that prevents pointerdown',
  async ({ m, at, mark, js }: any) => {
    await js('s.addEventListener("pointerdown", (e) => e.preventDefault())');
    await m.move(...at(0.7));
    await m.down();
    await mark('down');
    await m.up();
  },
);
await run('a page that takes the capture', async ({ m, at, mark, js }: any) => {
  await js(
    's.addEventListener("pointerdown", (e) => document.body.setPointerCapture(e.pointerId))',
  );
  await m.move(...at(0.7));
  await m.down();
  await mark('down');
  await m.move(...at(0.8));
  await m.up();
});
for (const size of [
  '',
  'size=small',
  'size=medium',
  'size=large',
  'size=xlarge',
])
  for (const dis of ['', 'disabled'])
    await run(
      `held handle, ${size || 'xsmall'} ${dis}`,
      async ({ m, at, mark }: any) => {
        await m.move(...at(0.7));
        await m.down();
        await mark('down');
        await m.up();
      },
      `${size} ${dis}`,
    );
// Signed and mixed texts: the order of the characters from the left.
for (const dir of ['ltr', 'rtl'])
  for (const [n, a] of [
    ['-18', 'value=-18'],
    ['-18°', 'value=-18 valuetext="-18°"'],
    ['−18° U+2212', 'valuetext="−18°"'],
    ['+5', 'valuetext="+5"'],
    ['-18 %', 'valuetext="-18 %"'],
    ['-1.5e-7', 'step=any value=-18 valuetext="-1.5e-7"'],
    ['18–20', 'valuetext="18–20"'],
    ['Arabic', 'valuetext="-18 درجة"'],
    ['Hebrew', 'valuetext="18- מעלות"'],
    ['digits first, Arabic', 'valuetext="18 درجة"'],
    ['Intl ar', 'valuetext="؜-١٨"'],
    ['Intl he', 'valuetext="‎-18"'],
    ['(18)', 'valuetext="(18)"'],
    ['blank valuetext', 'valuetext=""'],
    ['space valuetext', 'valuetext=" "'],
  ] as const) {
    const page = await open(
      `<style>body{margin:100px}</style><mx-slider id=s dir=${dir} min=-55 max=55 indicator ${a}></mx-slider>`,
    );
    console.log(
      dir,
      n,
      '|',
      JSON.stringify(
        await page.evaluate(() => {
          const w = window as any;
          w.inp(w.s).focus({ focusVisible: true });
          const t = w.q(w.s, '.text');
          const node = t.firstChild;
          if (!node)
            return {
              width: t.getBoundingClientRect().width,
              aria: w.inp(w.s).getAttribute('aria-valuetext'),
            };
          const out: any[] = [];
          [...node.data].forEach((c: string, i: number) => {
            const r = document.createRange();
            r.setStart(node, i);
            r.setEnd(node, i + 1);
            const b = r.getBoundingClientRect();
            if (b.width) out.push([b.left, c]);
          });
          return out
            .sort((x, y) => x[0] - y[0])
            .map((x) => x[1])
            .join(' ');
        }),
      ),
    );
    await page.context().close();
  }
await browser.close();
