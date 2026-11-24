// The bar with the area above the viewport: what it draws as it is shown, frames,
// and what a box of 1px could take part in. node <probe>.ts <packages> <engine>
import http from 'node:http';
import { open, settle, on, walk, browser, ENGINE, BAR, code } from './lib.ts';
console.log(`# ${ENGINE} ${browser.version()}`);
const D = '<!doctype html><style>body{margin:0}</style>';
const TALL = '<div style="height:4000px"></div>';
const ONE = '<mx-top-app-bar id=bar>T</mx-top-app-bar>';
const record = (page: any) =>
  page.evaluate(() => {
    const w = window as any;
    w.c = [];
    w.t = [];
    const bar = document.getElementById('bar')!;
    bar.addEventListener('transitionrun', (e: any) => w.t.push(e.propertyName));
    const t0 = performance.now();
    const f = () => {
      if (bar.getClientRects().length)
        w.c.push([
          performance.now() - t0,
          getComputedStyle(bar).backgroundColor,
        ]);
      if (performance.now() - t0 < 900) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
const drawn = async (page: any) => {
  await page.waitForTimeout(1000);
  return page.evaluate(() => {
    const { c, t } = window as any;
    const wrong = c.filter((x: any) => x[1] !== c.at(-1)[1]);
    return `${wrong.length} frames${wrong.length ? ` ${Math.round(wrong.at(-1)[0] - c[0][0])}ms` : ''}, transitions ${t.join() || 'none'}`;
  });
};
// 1. First shown, by each way, at the start and on a scrolled page.
const WAYS: [string, string, string][] = [
  [
    'display: none',
    `<div id=d style="display:none">${ONE}</div>`,
    'd.style.display=""',
  ],
  [
    'the bar display: none',
    `<mx-top-app-bar id=bar style="display:none">T</mx-top-app-bar>`,
    'bar.style.display=""',
  ],
  [
    'hidden attribute',
    `<style>[hidden]{display:none!important}</style><mx-top-app-bar id=bar hidden>T</mx-top-app-bar>`,
    'bar.hidden=false',
  ],
  ['modal dialog', `<dialog id=d>${ONE}</dialog>`, 'd.showModal()'],
  [
    'full-screen modal dialog',
    `<style>dialog{margin:0;border:0;padding:0;inline-size:100vw;block-size:100vh;max-inline-size:none;max-block-size:none}</style><dialog id=d>${ONE}${TALL}</dialog>`,
    'd.showModal()',
  ],
  ['dialog, show()', `<dialog id=d>${ONE}</dialog>`, 'd.show()'],
  [
    'manual popover',
    `<div popover=manual id=d>${ONE}</div>`,
    'd.showPopover()',
  ],
  ['auto popover', `<div popover id=d>${ONE}</div>`, 'd.showPopover()'],
  [
    'media query',
    `<style>@media (max-width:700px){#bar{display:none}}</style>${ONE}`,
    'resize',
  ],
  [
    'container query',
    `<style>#d{container-type:inline-size}@container (max-width:700px){#bar{display:none}}</style><div id=d>${ONE}</div>`,
    'resize',
  ],
  [
    'unslotted, then slotted',
    `<div id=d>${ONE}</div><script>d.attachShadow({mode:'open'}).innerHTML='<p>x</p>'</script>`,
    'd.shadowRoot.innerHTML="<slot></slot>"',
  ],
  [
    'details',
    `<details id=d><summary>s</summary>${ONE}</details>`,
    'd.open=true',
  ],
  [
    'content-visibility: hidden',
    `<div id=d style="content-visibility:hidden">${ONE}</div>`,
    'd.style.contentVisibility=""',
  ],
  [
    'hidden=until-found',
    `<div id=d hidden=until-found>${ONE}</div>`,
    'd.hidden=false',
  ],
  [
    'display: contents wrapper from none',
    `<header id=d style="display:none">${ONE}</header>`,
    'd.style.display="contents"',
  ],
];
for (const [name, html, show] of WAYS) {
  const out: string[] = [];
  for (const y of [0, 300]) {
    const page = await open(`${D}${html}${TALL}`, {
      viewport: { width: show === 'resize' ? 500 : 800, height: 600 },
    });
    await page.evaluate((v) => scrollTo(0, v), y);
    await settle(page);
    const before = await page.evaluate(() => bar.matches(':state(scrolled)'));
    await record(page);
    if (show === 'resize')
      await page.setViewportSize({ width: 800, height: 600 });
    else await page.evaluate(show);
    out.push(
      `at ${y}: hidden ${before ? 'ON' : 'off'}, ${await drawn(page)}, then ${await on(page)}`,
    );
    // Hidden and shown again, at the same position, and shown after a scroll to the start.
    if (show !== 'resize' && /display: none|modal dialog|manual/.test(name)) {
      const hideJs = show.includes('showModal')
        ? 'd.close()'
        : show.includes('Popover')
          ? 'd.hidePopover()'
          : show.replace('=""', '="none"');
      await page.evaluate(hideJs);
      await settle(page);
      await page.evaluate(() => scrollTo(0, 0));
      await settle(page);
      await record(page);
      await page.evaluate(show);
      out.push(
        `hidden there, shown at 0: ${await drawn(page)}, then ${await on(page)}`,
      );
    }
    await page.context().close();
  }
  console.log(`${name} | ${out.join(' | ')}`);
}
// 2. One task or one frame.
for (const [name, y, js] of [
  [
    'hidden and shown in one task',
    300,
    'bar.style.display="none";bar.getClientRects();bar.style.display=""',
  ],
  [
    'hidden and shown in one task, with a style flush',
    300,
    'bar.style.display="none";getComputedStyle(bar).color;bar.style.display=""',
  ],
  [
    'hidden for one frame',
    300,
    'bar.style.display="none";requestAnimationFrame(()=>requestAnimationFrame(()=>{bar.style.display=""}))',
  ],
  [
    'hidden for two frames',
    300,
    'bar.style.display="none";requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{bar.style.display=""})))',
  ],
  ['moved at 300', 300, 'document.body.append(bar)'],
  [
    'removed, inserted later at 300',
    300,
    'window.k=bar;k.remove();setTimeout(()=>document.body.prepend(k),200)',
  ],
  [
    'removed at 300, inserted later at 0',
    300,
    'window.k=bar;k.remove();scrollTo(0,0);setTimeout(()=>document.body.prepend(k),200)',
  ],
] as const) {
  const page = await open(`${D}${ONE}${TALL}`);
  await page.evaluate((v) => scrollTo(0, v), y);
  await settle(page);
  await page.waitForTimeout(400);
  await record(page);
  await page.evaluate(js);
  console.log(`${name} | ${await drawn(page)}, then ${await on(page)}`);
  await page.context().close();
}
// 3. visibility: hidden, 300 to 0: how long after the scroll it is shown.
for (const visible of [false, true])
  for (const wait of [0, 60, 120, 180, 240, 500]) {
    const got: number[] = [];
    for (let i = 0; i < 6; i++) {
      const page = await open(
        `${D}<style>.h{visibility:hidden}</style><div id=d>${ONE}</div>${TALL}`,
      );
      await page.evaluate(() => scrollTo(0, 300));
      await settle(page);
      await page.waitForTimeout(400);
      if (!visible) await page.evaluate('d.className="h"');
      await settle(page);
      got.push(
        await page.evaluate(async (w) => {
          scrollTo(0, 0);
          const t0 = performance.now();
          while (bar.matches(':state(scrolled)'))
            await new Promise((r) => requestAnimationFrame(r));
          await new Promise((r) => setTimeout(r, w));
          d.className = '';
          let n = 0;
          const colors: string[] = [];
          while (performance.now() - t0 < 1200) {
            await new Promise((r) => requestAnimationFrame(r));
            colors.push(getComputedStyle(bar).backgroundColor);
          }
          for (const c of colors) if (c !== colors.at(-1)) n++;
          return n;
        }, wait),
      );
      await page.context().close();
    }
    console.log(
      `visibility ${visible ? 'never hidden (control)' : 'hidden'}: shown ${wait}ms after the state turned off, frames not at rest: ${got.join(' ')}`,
    );
  }
// 4. Frames.
for (const [name, css] of [
  ['scaled .3', 'transform:scale(.3);transform-origin:0 0'],
  ['scaled 3', 'transform:scale(3);transform-origin:0 0'],
  ['rotated', 'transform:rotate(30deg)'],
  ['zoom .5', 'zoom:.5'],
  ['zoom 2.2', 'zoom:2.2'],
  ['clipped by an ancestor', 'clip-path:inset(50% 0 0 0)'],
  ['opacity 0', 'opacity:0'],
  ['0 height', 'height:0'],
] as const) {
  const page = await open(
    `${D}<iframe id=f style="border:0;width:400px;height:300px;${css}"></iframe>${TALL}`,
  );
  const f = page.frames()[1]!;
  await f.setContent(`${D}${BAR}`);
  await f.addScriptTag({ content: code });
  await settle(f);
  console.log(`frame ${name} | ${await walk(f)}`);
  await page.context().close();
}
{
  const server = http.createServer((q, s) =>
    s
      .setHeader('content-type', 'text/html')
      .end(
        `${D}${BAR}<script>${code.replaceAll('</script', '<\\/script')}</script>`,
      ),
  );
  await new Promise<void>((r) => server.listen(0, () => r()));
  const port = (server.address() as any).port;
  for (const [name, attrs] of [
    ['cross-origin', ''],
    ['sandboxed, opaque origin', 'sandbox=allow-scripts'],
  ] as const) {
    const page = await open(
      `${D}<div style="height:200px"></div><iframe id=f ${attrs} src="http://localhost:${port}/" style="border:0;width:400px;height:300px"></iframe>${TALL}`,
    );
    await page.waitForTimeout(700);
    const f = page.frames()[1]!;
    const a = await walk(f);
    await page.evaluate(() => scrollTo(0, 350));
    await settle(page);
    const b = await walk(f);
    // Out of view an engine doesn't draw a cross-origin frame, so it is read when it is back.
    await page.evaluate(() => scrollTo(0, 2500));
    await settle(page);
    await f.evaluate(() => scrollTo(0, 300));
    await page.waitForTimeout(300);
    const out = await on(f);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(500);
    console.log(
      `frame ${name} | ${a} | half out ${b} | scrolled to 300 while out ${out} | back in view ${await on(f)} | ${await walk(f)}`,
    );
    await page.context().close();
  }
  // A cross-origin page opened by itself, reloaded while scrolled, and reached by a fragment.
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}/`);
  await page.evaluate(() => scrollTo(0, 700));
  await settle(page);
  await page.reload();
  await page.waitForTimeout(500);
  const restored = await on(page);
  await page.goto('about:blank');
  await page.goBack();
  await page.waitForTimeout(500);
  console.log(
    `reload while scrolled | ${restored} | back ${await on(page)} | ${await walk(page)}`,
  );
  await page.close();
  server.close();
}
// 5. The box's part, with the box and without it.
const EXTRA: Record<string, (page: any) => Promise<unknown>> = {
  'document size': (p) =>
    p.evaluate(() => {
      const d = document.documentElement;
      return [
        d.scrollWidth,
        d.scrollHeight,
        d.clientWidth,
        d.clientHeight,
        document.body.scrollWidth,
      ];
    }),
  'the furthest scroll': (p) =>
    p.evaluate(() => {
      const r: number[] = [];
      for (const [x, y] of [
        [1e6, 1e6],
        [-1e6, -1e6],
        [0, 0],
      ]) {
        scrollTo(x!, y!);
        r.push(scrollX, scrollY);
      }
      return r;
    }),
  hits: (p) =>
    p.evaluate(() =>
      [
        [0, 0],
        [0.4, 0.4],
        [0.99, 0.99],
        [innerWidth - 0.5, 0.5],
        [innerWidth - 1, 0],
      ].map(([x, y]) =>
        document
          .elementsFromPoint(x!, y!)
          .map((e) => e.localName)
          .join('/'),
      ),
    ),
  'scroll anchoring': (p) =>
    p.evaluate(async () => {
      const r: number[] = [];
      for (const y of [0, 0.5, 1, 40, 300]) {
        scrollTo(0, y);
        await new Promise((f) => setTimeout(f, 100));
        const e = document.createElement('div');
        e.style.height = '100px';
        document.body.prepend(e);
        await new Promise((f) => setTimeout(f, 100));
        r.push(Math.round(scrollY));
        e.remove();
        await new Promise((f) => setTimeout(f, 100));
      }
      scrollTo(0, 0);
      return r;
    }),
  'layout shifts': (p) =>
    p.evaluate(async () => {
      if (!PerformanceObserver.supportedEntryTypes.includes('layout-shift'))
        return 'not supported';
      const r: any[] = [];
      new PerformanceObserver((l) =>
        r.push(...l.getEntries().map((e: any) => [e.value, e.sources?.length])),
      ).observe({ type: 'layout-shift', buffered: true });
      for (const y of [0, 50, 300, 0]) {
        scrollTo(0, y);
        await new Promise((f) => setTimeout(f, 150));
      }
      return r;
    }),
  'select all': (p) =>
    p.evaluate(() => {
      const s = getSelection()!;
      s.selectAllChildren(document.body);
      const t = s.toString();
      const n = s.getRangeAt(0).getClientRects().length;
      s.removeAllRanges();
      return [t.trim().slice(0, 20), n];
    }),
  'a drag from the corner': async (p) => {
    await p.mouse.move(0.5, 0.5);
    await p.mouse.down();
    await p.mouse.move(300, 120, { steps: 4 });
    await p.mouse.up();
    return p.evaluate(() => {
      const t = getSelection()!.toString().length;
      getSelection()!.removeAllRanges();
      return t;
    });
  },
  'events at the corner': async (p) => {
    await p.evaluate(() => {
      (window as any).e = [];
      for (const t of ['pointerover', 'pointerdown', 'click'])
        document.addEventListener(
          t,
          (e: any) =>
            (window as any).e.push(`${t}:${e.composedPath()[0].localName}`),
          { once: true },
        );
    });
    await p.mouse.move(400, 300);
    await p.mouse.click(0.5, 0.5);
    return p.evaluate('e');
  },
  'a hint popover': (p) =>
    p.evaluate(async () => {
      const h = document.createElement('div');
      h.popover = 'hint';
      document.body.append(h);
      if (h.popover !== 'hint') return 'not supported';
      h.showPopover();
      const b = document.createElement('mx-top-app-bar');
      document.body.prepend(b);
      await new Promise((f) => setTimeout(f, 80));
      const r = h.matches(':popover-open');
      b.remove();
      h.remove();
      return r;
    }),
  'element capture of a screenshot differs from no box': async (p) =>
    (await p.screenshot({ clip: { x: 0, y: 0, width: 20, height: 20 } }))
      .length,
  'window.find and innerText': (p) =>
    p.evaluate(() => document.body.innerText.length),
  getAnimations: (p) => p.evaluate(() => document.getAnimations().length),
  'activeElement after focus()': (p) =>
    p.evaluate(() => {
      const b: any = (bar as any).shadowRoot.querySelector('.scroll-start');
      b.focus();
      return document.activeElement!.localName;
    }),
};
const PAGES: Record<string, string> = {
  plain: '',
  rtl: 'html{direction:rtl}',
  'vertical-rl': 'html{writing-mode:vertical-rl}',
  'vertical-lr': 'html{writing-mode:vertical-lr}',
  'zoom 3': 'html{zoom:3}',
  'zoom .1': 'html{zoom:.1}',
  quirks: 'Q',
  'root transform': 'html{transform:translateY(40px)}',
  'forced pointer events':
    '*{pointer-events:auto!important;visibility:visible!important}',
};
for (const [name, css] of Object.entries(PAGES))
  for (const tall of [true, false]) {
    const res: string[][] = [];
    for (const shown of [true, false]) {
      const inner = `<mx-top-app-bar id=bar><button slot=lead>L</button><h1>T</h1></mx-top-app-bar><p>text</p>${tall ? TALL : ''}`;
      const page = await open(
        css === 'Q'
          ? `<style>body{margin:0}</style>${inner}`
          : `${D}<style>${css}</style>${inner}`,
      );
      if (!shown)
        await page.evaluate(() =>
          (bar as any).shadowRoot.querySelector('.scroll-start').hidePopover(),
        );
      await settle(page);
      const r: string[] = [];
      for (const [k, f] of Object.entries(EXTRA)) {
        await page.evaluate(() => scrollTo(0, 0));
        r.push(
          `${k} ${JSON.stringify(await f(page).catch((e: any) => e.message.split('\n')[0]))}`,
        );
      }
      res.push(r);
      await page.context().close();
    }
    const diff = res[0]!
      .filter((x, i) => x !== res[1]![i])
      .map(
        (x, i) =>
          `${x} / without the box: ${res[1]!.find((z) => z.split(' ')[0] === x.split(' ')[0])}`,
      );
    console.log(
      `box's part, ${name}, ${tall ? 'tall' : 'short'} page: ${diff.length ? `DIFFERS ${diff.join('; ')}` : `${res[0]!.length} readings the same`}`,
    );
    if (name === 'plain') console.log(`  ${res[0]!.join('; ')}`);
  }
// 6. Forced colors, and reduced motion.
for (const opts of [
  { forcedColors: 'active' },
  { reducedMotion: 'reduce' },
] as any[]) {
  const page = await open(`${D}${BAR}`, opts);
  console.log(`${JSON.stringify(opts)} | ${await walk(page)}`);
  await page.context().close();
}
await browser.close();
