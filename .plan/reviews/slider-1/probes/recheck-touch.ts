// The recheck's touch, second finger, pen and mouse in Chromium, on the built slider and, where it compares, on a bare range.
// node recheck-touch.ts <packages> chromium
import { open, browser, ENGINE } from './lib.ts';
console.log(`# ${ENGINE} ${browser.version()}`);
const only = process.argv[4];
const page0 = (attrs: string, extra = '') =>
  `<style>body{margin:0} mx-slider,#n{inline-size:204px;margin:100px 0 0 100px;display:block} #n{block-size:44px;touch-action:pan-y} #n::-webkit-slider-thumb{appearance:none;inline-size:4px;block-size:44px}#n{appearance:none}</style><form id=f><fieldset id=fs style="border:0;margin:0;padding:0"><mx-slider id=s name=n indicator ${attrs}></mx-slider></fieldset></form><input id=n type=range ${attrs}>${extra}<div style="height:3000px"></div>`;
async function run(
  name: string,
  attrs: string,
  go: (t: any) => Promise<void>,
  native = false,
) {
  if (only && !name.includes(only)) return;
  const page = await open(page0(attrs), { hasTouch: true });
  const cdp = await page.context().newCDPSession(page);
  const boxes = await page.evaluate(() => {
    const w = window as any;
    w.logs = { s: [], n: [] };
    w.s = document.getElementById('s');
    w.n = document.getElementById('n');
    w.f = document.getElementById('f');
    w.fs = document.getElementById('fs');
    for (const [k, host, el] of [
      ['s', w.s, w.inp(w.s)],
      ['n', document.getElementById('n'), document.getElementById('n')],
    ] as any) {
      const log = w.logs[k];
      for (const t of ['input', 'change'])
        host.addEventListener(t, (e: any) =>
          log.push(
            t +
              (k === 's'
                ? w.s.value +
                  (new FormData(w.f).get('n') == String(w.s.value)
                    ? ''
                    : '!form' + new FormData(w.f).get('n'))
                : e.target.value),
          ),
        );
      for (const t of ['pointerdown', 'pointercancel', 'pointerup'])
        el.addEventListener(t, (e: any) =>
          log.push(t.replace('pointer', 'p.') + (e.isPrimary ? '' : '(2nd)')),
        );
    }
    w.st = () => {
      const s = w.s,
        i = w.inp(s);
      return `[v${s.value} in${i.value} f${new FormData(w.f).get('n')} d${Math.round(w.frac(s) * ((s.max ?? 100) - (s.min ?? 0)) + (s.min ?? 0))} t"${w.q(s, '.text').textContent}" ${s.matches(':state(pressed)') ? 'HELD' : 'rest'} h${getComputedStyle(w.q(s, '.handle')).width} ${getComputedStyle(w.q(s, '.indicator')).display}]`;
    };
    const at = (e: any) => {
      const r = e.getBoundingClientRect();
      return [r.left + 2, r.top + r.height / 2];
    };
    return { s: at(w.inp(w.s)), n: at(document.getElementById('n')) };
  });
  for (const k of native ? (['s', 'n'] as const) : (['s'] as const)) {
    const b = boxes[k];
    const send = async (type: string, ...pts: any[]) => {
      await cdp
        .send('Input.dispatchTouchEvent', { type, touchPoints: pts } as any)
        .catch((e: any) => console.log('   ERR', e.message));
      await page.waitForTimeout(60);
    };
    const at = (f: number, dy = 0, id = 0) => ({
      x: b[0]! + f * 200,
      y: b[1]! + dy,
      id,
    });
    const js = (c: string) => page.evaluate(c);
    const mark = (m: string) =>
      page.evaluate(
        ([m, k]) => {
          const w = window as any;
          w.logs[k!].push('-' + m + (k === 's' ? w.st() : ''));
        },
        [m, k],
      );
    const pan = async (f: number, n = 8) => {
      for (let i = 1; i <= n; i++) {
        await send('touchMove', at(f, -i * 12));
      }
    };
    await go({ page, send, at, js, mark, pan, cdp, b, k });
    await page.waitForTimeout(250);
    await mark('end');
    console.log(
      `${name}${native ? ' (' + (k === 's' ? 'mx' : 'bare') + ')' : ''} | ${(await page.evaluate((k) => (window as any).logs[k], k)).join(' ')} | y${await page.evaluate('scrollY')}`,
    );
  }
  await page.context().close();
}
const W: Array<[string, string]> = [
  ['value=90', 's.value=90'],
  ['attribute=60', 's.setAttribute("value","60")'],
  ['max=50', 's.max=50'],
  ['min=80', 's.min=80'],
  ['step=40', 's.step=40'],
  ['reset', 'f.reset()'],
  ['value=null', 's.value=null'],
  ['same value', 's.value=s.value'],
];
console.log(
  '## reviewer-1 and a script write at each moment; the last mark is the end',
);
for (const [n, w] of W) {
  await run(
    `scroll; ${n} while held`,
    'value=30',
    async ({ send, at, pan, js, mark }) => {
      await send('touchStart', at(0.7));
      await mark('down');
      await js(w);
      await mark('wrote');
      await pan(0.7);
      await send('touchEnd');
    },
  );
  await run(
    `scroll; ${n} after the cancel, finger down`,
    'value=30',
    async ({ send, at, pan, js }) => {
      await send('touchStart', at(0.7));
      await pan(0.7);
      await js(w);
      await send('touchEnd');
    },
  );
  await run(
    `scroll; ${n} after the lift`,
    'value=30',
    async ({ send, at, pan, js }) => {
      await send('touchStart', at(0.7));
      await pan(0.7);
      await send('touchEnd');
      await js(w);
    },
  );
  await run(`slide; ${n} in it`, 'value=30', async ({ send, at, js, mark }) => {
    await send('touchStart', at(0.5));
    await send('touchMove', at(0.6));
    await send('touchMove', at(0.65));
    await js(w);
    await mark('wrote');
    await send('touchMove', at(0.7));
    await send('touchEnd');
  });
  await run(
    `tap; ${n} while held`,
    'value=30',
    async ({ send, at, js }) => {
      await send('touchStart', at(0.7));
      await js(w);
      await send('touchEnd');
    },
    true,
  );
}
await run(
  'scroll, then attribute 60',
  'value=30',
  async ({ send, at, pan, js }) => {
    await send('touchStart', at(0.7));
    await pan(0.7);
    await send('touchEnd');
    await js('s.setAttribute("value","60")');
  },
);
await run(
  'scroll, then max=300, no value',
  '',
  async ({ send, at, pan, js }) => {
    await send('touchStart', at(0.3));
    await pan(0.3);
    await send('touchEnd');
    await js('s.max=300');
  },
);
await run('scroll, 200 then max=300', '', async ({ send, at, pan, js }) => {
  await js('s.value=200');
  await send('touchStart', at(0.3));
  await pan(0.3);
  await send('touchEnd');
  await js('s.max=300');
});
console.log('## tap, slide, scroll, cancel');
await run(
  'tap',
  'value=30',
  async ({ send, at, mark }) => {
    await send('touchStart', at(0.7));
    await mark('down');
    await send('touchEnd');
  },
  true,
);
await run(
  'tap, 800 ms',
  'value=30',
  async ({ send, at, mark, page }) => {
    await send('touchStart', at(0.7));
    await page.waitForTimeout(800);
    await mark('down');
    await send('touchEnd');
  },
  true,
);
await run(
  'tap on the handle',
  'value=30',
  async ({ send, at }) => {
    await send('touchStart', at(0.3));
    await send('touchEnd');
  },
  true,
);
await run(
  'tap at both, the second reverts',
  'value=30',
  async ({ send, at }) => {
    await send('touchStart', at(0.7));
    await send('touchEnd');
    await send('touchStart', at(0.3));
    await send('touchEnd');
  },
);
await run(
  'slide',
  'value=30',
  async ({ send, at, mark }) => {
    await send('touchStart', at(0.5));
    for (const f of [0.55, 0.6, 0.7]) {
      await send('touchMove', at(f));
      await mark('m');
    }
    await send('touchEnd');
  },
  true,
);
await run(
  'slide back to the start number',
  'value=30',
  async ({ send, at }) => {
    await send('touchStart', at(0.5));
    for (const f of [0.45, 0.4, 0.35, 0.3]) await send('touchMove', at(f));
    await send('touchEnd');
  },
  true,
);
await run('slide beyond both ends', 'value=30', async ({ send, at }) => {
  await send('touchStart', at(0.5));
  for (const f of [0.7, 1.2, 0.5, -0.3]) await send('touchMove', at(f));
  await send('touchEnd');
});
await run(
  'slide and cancel',
  'value=30',
  async ({ send, at, mark }) => {
    await send('touchStart', at(0.5));
    for (const f of [0.55, 0.6]) await send('touchMove', at(f));
    await send('touchCancel');
  },
  true,
);
await run(
  'press and cancel',
  'value=30',
  async ({ send, at }) => {
    await send('touchStart', at(0.5));
    await send('touchCancel');
  },
  true,
);
await run(
  'a step wider than the slide, then lift',
  'value=50 step=50',
  async ({ send, at }) => {
    await send('touchStart', at(0.5));
    for (const f of [0.55, 0.6]) await send('touchMove', at(f));
    await send('touchEnd');
  },
  true,
);
await run(
  'a step wider than the slide off the handle, then lift',
  'value=0 step=50',
  async ({ send, at, mark }) => {
    await send('touchStart', at(0.5));
    for (const f of [0.55, 0.6]) await send('touchMove', at(f));
    await mark('moved');
    await send('touchEnd');
  },
  true,
);
console.log('## an input handler that writes, on a tap');
await run(
  'tap, handler writes 90',
  'value=30',
  async ({ send, at, js, k }) => {
    await js(
      k === 's'
        ? 's.addEventListener("input",()=>{s.value=90})'
        : 'n.addEventListener("input",()=>{n.value=90})',
    );
    await send('touchStart', at(0.7));
    await send('touchEnd');
  },
  true,
);
await run(
  'tap, handler writes the same',
  'value=30',
  async ({ send, at, js, k }) => {
    await js(
      k === 's'
        ? 's.addEventListener("input",()=>{s.value=s.value})'
        : 'n.addEventListener("input",()=>{n.value=n.value})',
    );
    await send('touchStart', at(0.7));
    await send('touchEnd');
  },
  true,
);
await run(
  'tap, handler disables',
  'value=30',
  async ({ send, at, js, k }) => {
    await js(
      k === 's'
        ? 's.addEventListener("input",()=>{s.disabled=true})'
        : 'n.addEventListener("input",()=>{n.disabled=true})',
    );
    await send('touchStart', at(0.7));
    await send('touchEnd');
  },
  true,
);
await run(
  'slide, handler writes 10',
  'value=30',
  async ({ send, at, js, k }) => {
    await js(
      k === 's'
        ? 's.addEventListener("input",()=>{s.value=10})'
        : 'n.addEventListener("input",()=>{n.value=10})',
    );
    await send('touchStart', at(0.5));
    for (const f of [0.55, 0.6, 0.7]) await send('touchMove', at(f));
    await send('touchEnd');
  },
  true,
);
console.log('## disable, removal, hiding');
for (const [n, w] of [
  ['disabled', 's.disabled=true'],
  ['fieldset', 'fs.disabled=true'],
  ['disabled and enabled', 's.disabled=true; s.disabled=false'],
  ['removed', 's.remove()'],
  ['removed and back', 's.remove(); fs.append(s)'],
  ['moved', 'f.prepend(s)'],
  ['hidden', 's.style.display="none"'],
  [
    'hidden and shown',
    's.style.display="none"; s.offsetWidth; s.style.display=""',
  ],
] as const) {
  await run(`held: ${n}`, 'value=30', async ({ send, at, js, mark }) => {
    await send('touchStart', at(0.7));
    await js(w);
    await mark('did');
    await send('touchMove', at(0.72));
    await send('touchMove', at(0.8));
    await send('touchEnd');
  });
  await run(`slide: ${n}`, 'value=30', async ({ send, at, js, mark }) => {
    await send('touchStart', at(0.5));
    await send('touchMove', at(0.6));
    await send('touchMove', at(0.65));
    await js(w);
    await mark('did');
    await send('touchMove', at(0.7));
    await send('touchMove', at(0.8));
    await send('touchEnd');
  });
}
await run(
  'after hidden and shown in a slide, a tap',
  'value=30',
  async ({ send, at, js, mark }) => {
    await send('touchStart', at(0.5));
    await send('touchMove', at(0.6));
    await js('s.style.display="none"; s.offsetWidth;');
    await send('touchEnd');
    await js('s.style.display=""');
    await mark('shown');
    await send('touchStart', at(0.2));
    await send('touchEnd');
  },
);
console.log('## a key at each moment');
for (const [n, pre, post] of [
  ['while held, then lift', 1, 0],
  ['while held, then scroll', 1, 1],
] as const)
  await run(
    `ArrowUp ${n}`,
    'value=30',
    async ({ send, at, js, pan, page, mark }) => {
      await js('s.focus()');
      await send('touchStart', at(0.7));
      await page.keyboard.press('ArrowUp');
      await mark('key');
      if (post) await pan(0.7);
      await send('touchEnd');
    },
  );
await run(
  'ArrowUp in a slide',
  'value=30',
  async ({ send, at, page, mark }) => {
    await send('touchStart', at(0.5));
    await send('touchMove', at(0.6));
    await send('touchMove', at(0.65));
    await page.keyboard.press('ArrowUp');
    await mark('key');
    await send('touchMove', at(0.7));
    await send('touchEnd');
  },
  true,
);
await run(
  'ArrowUp after the cancel, finger down',
  'value=30',
  async ({ send, at, pan, page, js }) => {
    await js('s.focus()');
    await send('touchStart', at(0.7));
    await pan(0.7);
    await page.keyboard.press('ArrowUp');
    await send('touchEnd');
  },
);
await run(
  'ArrowDown after the scroll',
  'value=30',
  async ({ send, at, pan, page, js }) => {
    await send('touchStart', at(0.7));
    await pan(0.7);
    await send('touchEnd');
    await js('s.focus()');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
  },
);
await run(
  'Tab focus, focus-visible after the scroll',
  'value=30',
  async ({ send, at, pan }) => {
    await send('touchStart', at(0.7));
    await pan(0.7);
    await send('touchEnd');
  },
);
console.log('## a second finger');
const two = async (name: string, go: any) => run(name, 'value=30', go, true);
await two(
  'slide; 2nd on it, lifts; 1st moves, lifts',
  async ({ send, at, mark }: any) => {
    await send('touchStart', at(0.5));
    await send('touchMove', at(0.6));
    await send('touchMove', at(0.65));
    await send('touchStart', at(0.65), at(0.9, 0, 1));
    await mark('2 down');
    await send('touchMove', at(0.7), at(0.9, 0, 1));
    await mark('moved');
    await send('touchEnd', at(0.9, 0, 1));
    await mark('2 up');
    await send('touchMove', at(0.72));
    await send('touchMove', at(0.78));
    await mark('moved');
    await send('touchEnd');
  },
);
await two(
  'slide; 2nd on it, 1st lifts first',
  async ({ send, at, mark }: any) => {
    await send('touchStart', at(0.5));
    await send('touchMove', at(0.6));
    await send('touchMove', at(0.65));
    await send('touchStart', at(0.65), at(0.9, 0, 1));
    await send('touchEnd', at(0.65));
    await mark('1 up');
    await send('touchMove', at(0.95, 0, 1));
    await send('touchMove', at(1, 0, 1));
    await mark('2 moved');
    await send('touchEnd');
  },
);
await two(
  'slide; 2nd elsewhere, lifts; 1st moves, lifts',
  async ({ send, at, mark }: any) => {
    await send('touchStart', at(0.5));
    await send('touchMove', at(0.6));
    await send('touchMove', at(0.65));
    await send('touchStart', at(0.65), at(0.9, 300, 1));
    await send('touchMove', at(0.7), at(0.9, 300, 1));
    await mark('moved');
    await send('touchEnd', at(0.9, 300, 1));
    await mark('2 up');
    await send('touchMove', at(0.78));
    await mark('moved');
    await send('touchEnd');
  },
);
await two(
  'slide; 2nd on it, lifts; then cancel',
  async ({ send, at, mark }: any) => {
    await send('touchStart', at(0.5));
    await send('touchMove', at(0.6));
    await send('touchMove', at(0.65));
    await send('touchStart', at(0.65), at(0.9, 0, 1));
    await send('touchEnd', at(0.9, 0, 1));
    await mark('2 up');
    await send('touchCancel');
  },
);
await two(
  'slide; 2nd on it; cancel with both',
  async ({ send, at, mark }: any) => {
    await send('touchStart', at(0.5));
    await send('touchMove', at(0.6));
    await send('touchMove', at(0.65));
    await send('touchStart', at(0.65), at(0.9, 0, 1));
    await send('touchCancel');
  },
);
await two(
  'held; 2nd on it, lifts; 1st lifts',
  async ({ send, at, mark }: any) => {
    await send('touchStart', at(0.5));
    await send('touchStart', at(0.5), at(0.9, 0, 1));
    await mark('2 down');
    await send('touchEnd', at(0.9, 0, 1));
    await mark('2 up');
    await send('touchEnd');
  },
);
await two(
  'held; 2nd on it, lifts; 1st scrolls',
  async ({ send, at, mark, pan }: any) => {
    await send('touchStart', at(0.5));
    await send('touchStart', at(0.5), at(0.9, 0, 1));
    await send('touchEnd', at(0.9, 0, 1));
    await mark('2 up');
    await pan(0.5);
    await send('touchEnd');
  },
);
await two(
  'held; 2nd on it, 1st lifts first',
  async ({ send, at, mark }: any) => {
    await send('touchStart', at(0.5));
    await send('touchStart', at(0.5), at(0.9, 0, 1));
    await send('touchEnd', at(0.5));
    await mark('1 up');
    await send('touchEnd');
  },
);
await two(
  'held on the handle; 2nd on it, lifts; 1st lifts',
  async ({ send, at, mark }: any) => {
    await send('touchStart', at(0.3));
    await send('touchStart', at(0.3), at(0.9, 0, 1));
    await mark('2 down');
    await send('touchEnd', at(0.9, 0, 1));
    await mark('2 up');
    await send('touchEnd');
  },
);
await two('held; 2nd slides; 1st lifts', async ({ send, at, mark }: any) => {
  await send('touchStart', at(0.5));
  await send('touchStart', at(0.5), at(0.9, 0, 1));
  await send('touchMove', at(0.5), at(0.8, 0, 1));
  await send('touchMove', at(0.5), at(0.7, 0, 1));
  await mark('2 moved');
  await send('touchEnd', at(0.7, 0, 1));
  await mark('2 up');
  await send('touchEnd');
});
await two('held; two fingers scroll', async ({ send, at, mark }: any) => {
  await send('touchStart', at(0.5));
  await send('touchStart', at(0.5), at(0.9, 0, 1));
  for (let i = 1; i < 8; i++)
    await send('touchMove', at(0.5, -i * 12), at(0.9, -i * 12, 1));
  await send('touchEnd');
});
await two(
  'slide; 2nd on it, lifts, touches again, lifts; 1st lifts',
  async ({ send, at, mark }: any) => {
    await send('touchStart', at(0.5));
    await send('touchMove', at(0.6));
    await send('touchMove', at(0.65));
    for (let i = 0; i < 2; i++) {
      await send('touchStart', at(0.65), at(0.9, 0, 1));
      await send('touchEnd', at(0.9, 0, 1));
      await mark('2 up');
    }
    await send('touchEnd');
  },
);
await two(
  '1st elsewhere; 2nd taps the slider',
  async ({ send, at, mark }: any) => {
    await send('touchStart', at(0.5, 300));
    await send('touchStart', at(0.5, 300), at(0.7, 0, 1));
    await mark('2 down');
    await send('touchEnd', at(0.7, 0, 1));
    await mark('2 up');
    await send('touchEnd');
  },
);
await two(
  '1st elsewhere; 2nd slides the slider',
  async ({ send, at, mark }: any) => {
    await send('touchStart', at(0.5, 300));
    await send('touchStart', at(0.5, 300), at(0.7, 0, 1));
    for (const f of [0.75, 0.8, 0.9])
      await send('touchMove', at(0.5, 300), at(f, 0, 1));
    await mark('2 moved');
    await send('touchEnd', at(0.9, 0, 1));
    await send('touchEnd');
  },
);
console.log(
  '## the slider has focus from a tap on its label (a tap on the slider itself gives none in this emulation)',
);
const tapped = async ({ send, at, mark, js, page }: any) => {
  await js(
    '{const l=document.createElement("span");l.slot="label";l.textContent="Label";l.style.cssText="position:absolute;top:40px;left:20px";s.append(l)}',
  );
  const p = await page.evaluate(() => {
    const r = document.querySelector('[slot=label]')!.getBoundingClientRect();
    return { x: r.left + 5, y: r.top + 5, id: 0 };
  });
  await send('touchStart', p);
  await send('touchEnd');
  await page.waitForTimeout(300);
  await mark(
    'label tapped, focus ' + (await js('document.activeElement === s')),
  );
};
for (const [n, c] of [
  ['nothing', '1'],
  ['value=90', 's.value=90'],
  ['attribute', 's.setAttribute("value","60")'],
  ['max=50', 's.max=50'],
  ['reset', 'f.reset()'],
] as const)
  for (const then of ['Tab', 'blur()', 'a tap on the page'])
    await run(
      `focused: scroll, ${n} while held, then ${then}`,
      'value=30',
      async (t) => {
        await tapped(t);
        await t.send('touchStart', t.at(0.7));
        await t.js(c);
        await t.pan(0.7);
        await t.send('touchEnd');
        await t.mark('scrolled');
        if (then === 'Tab') await t.page.keyboard.press('Tab');
        else if (then === 'blur()') await t.js('document.activeElement.blur()');
        else {
          await t.send('touchStart', { x: 5, y: 400, id: 0 });
          await t.send('touchEnd');
        }
      },
    );
for (const [n, c] of [
  ['disabled', 's.disabled=true'],
  ['fieldset', 'fs.disabled=true'],
  ['moved', 'f.prepend(s)'],
  ['removed', 's.remove()'],
  ['blurred', 'document.activeElement.blur()'],
  ['another element focused', 'n.focus()'],
] as const)
  for (const end of ['lift', 'scroll'])
    await run(`focused: held, ${n}, ${end}`, 'value=30', async (t) => {
      await tapped(t);
      await t.send('touchStart', t.at(0.7));
      await t.js(c);
      await t.mark('did');
      if (end === 'scroll') await t.pan(0.7);
      await t.send('touchEnd');
    });
console.log('## what a mutation would change');
await run(
  'mutants: two scrolls',
  'value=30',
  async ({ send, at, pan, js, page }) => {
    for (let i = 0; i < 2; i++) {
      await js('scrollTo(0,0)');
      await page.waitForTimeout(100);
      await send('touchStart', at(0.7));
      await pan(0.7);
      await send('touchEnd');
    }
  },
);
await run(
  'mutants: a release missed while hidden, then a press',
  'value=30',
  async ({ at, js, page, mark }) => {
    await page.mouse.move(at(0.5).x, at(0.5).y);
    await page.mouse.down();
    await js('s.remove()');
    await page.mouse.up();
    await js('fs.append(s)');
    await mark('back');
    await page.mouse.move(at(0.7).x, at(0.7).y);
    await page.mouse.down();
    await page.mouse.move(at(0.8).x, at(0.8).y);
    await mark('down');
    await page.mouse.up();
  },
);
await run(
  'mutants: a slide left by disabling, then a scroll',
  'value=30',
  async ({ send, at, js, pan, page }) => {
    await send('touchStart', at(0.5));
    await send('touchMove', at(0.6));
    await send('touchMove', at(0.65));
    await js('s.disabled=true');
    await send('touchEnd');
    await js('s.disabled=false');
    await send('touchStart', at(0.2));
    await pan(0.2);
    await send('touchEnd');
  },
);
console.log('## pen and mouse');
const mouse =
  (cdp: any, pt: any, pointerType: string) =>
  (type: string, f: any, button = 'left', buttons = 1) =>
    cdp.send('Input.dispatchMouseEvent', {
      type,
      x: f.x,
      y: f.y,
      button,
      buttons,
      clickCount: 1,
      pointerType,
    });
for (const pt of ['mouse', 'pen']) {
  const P = (n: string, go: any, native = true) =>
    run(
      `${pt}: ${n}`,
      'value=30',
      async (t) => go({ ...t, ev: mouse(t.cdp, 0, pt) }),
      native,
    );
  await P('press, rest, release', async ({ ev, at, mark, page }: any) => {
    await ev('mousePressed', at(0.7));
    await page.waitForTimeout(300);
    await mark('down');
    await ev('mouseReleased', at(0.7));
  });
  await P(
    'press on the handle, release',
    async ({ ev, at, mark, page }: any) => {
      await ev('mousePressed', at(0.3));
      await mark('down');
      await ev('mouseReleased', at(0.3));
    },
  );
  await P('drag', async ({ ev, at, mark, page }: any) => {
    await ev('mousePressed', at(0.5));
    for (const f of [0.55, 0.6, 0.7]) await ev('mouseMoved', at(f));
    await mark('moved');
    await ev('mouseReleased', at(0.7));
  });
  await P('drag, away vertically', async ({ ev, at, mark, page }: any) => {
    await ev('mousePressed', at(0.5));
    for (const d of [20, 60, 150]) await ev('mouseMoved', at(0.6, d));
    await page.waitForTimeout(300);
    await mark('moved');
    await ev('mouseReleased', at(0.6, 150));
  });
  await P('right button', async ({ ev, at, mark }: any) => {
    await ev('mousePressed', at(0.7), 'right', 2);
    await mark('down');
    await ev('mouseReleased', at(0.7), 'right', 0);
  });
  await P('left in the right', async ({ ev, at, mark, page }: any) => {
    await ev('mousePressed', at(0.7), 'right', 2);
    await ev('mousePressed', at(0.7), 'left', 3);
    await mark('both');
    await ev('mouseMoved', at(0.8), 'left', 3);
    await mark('moved');
    await ev('mouseReleased', at(0.8), 'left', 2);
    await mark('left up');
    await ev('mouseReleased', at(0.8), 'right', 0);
  });
  await P('right in the left', async ({ ev, at, mark, page }: any) => {
    await ev('mousePressed', at(0.7));
    await ev('mousePressed', at(0.7), 'right', 3);
    await mark('both');
    await ev('mouseMoved', at(0.8), 'left', 3);
    await ev('mouseReleased', at(0.8), 'left', 2);
    await mark('left up');
    await page.waitForTimeout(100);
    await ev('mouseReleased', at(0.8), 'right', 0);
  });
  await P('write 90 while down', async ({ ev, at, mark, js }: any) => {
    await ev('mousePressed', at(0.7));
    await js('s.value=90; n.value=90');
    await mark('wrote');
    await ev('mouseReleased', at(0.7));
  });
  await P('key while down', async ({ ev, at, mark, page }: any) => {
    await ev('mousePressed', at(0.7));
    await page.keyboard.press('ArrowUp');
    await mark('key');
    await ev('mouseReleased', at(0.7));
  });
  await P('disabled while down', async ({ ev, at, mark, js }: any) => {
    await ev('mousePressed', at(0.7));
    await js('s.disabled=true;n.disabled=true');
    await mark('did');
    await ev('mouseMoved', at(0.8));
    await ev('mouseReleased', at(0.8));
    await js('s.disabled=false;n.disabled=false');
    await mark('enabled');
    await ev('mousePressed', at(0.2));
    await ev('mouseReleased', at(0.2));
  });
}
await run(
  'a finger slides, a mouse presses',
  'value=30',
  async ({ send, at, mark, cdp }) => {
    const ev = mouse(cdp, 0, 'mouse');
    await send('touchStart', at(0.5));
    await send('touchMove', at(0.6));
    await send('touchMove', at(0.65));
    await ev('mousePressed', at(0.2));
    await mark('mouse down');
    await send('touchEnd');
    await mark('finger up');
    await ev('mouseReleased', at(0.2));
  },
  true,
);
await run(
  'a finger is held, a mouse presses',
  'value=30',
  async ({ send, at, mark, cdp }) => {
    const ev = mouse(cdp, 0, 'mouse');
    await send('touchStart', at(0.5));
    await ev('mousePressed', at(0.2));
    await mark('mouse down');
    await send('touchEnd');
    await mark('finger up');
    await ev('mouseReleased', at(0.2));
  },
  true,
);
console.log('## the label');
await run(
  'a finger on the label rests',
  'value=30',
  async ({ send, at, mark, js, page }) => {
    await js(
      '{const l=document.createElement("span");l.slot="label";l.textContent="Label";s.append(l)}',
    );
    const p = await page.evaluate(() => {
      const r = document.querySelector('[slot=label]')!.getBoundingClientRect();
      return { x: r.left + 5, y: r.top + 5, id: 0 };
    });
    await send('touchStart', p);
    await page.waitForTimeout(300);
    await mark('down');
    await send('touchEnd');
  },
);
await browser.close();
