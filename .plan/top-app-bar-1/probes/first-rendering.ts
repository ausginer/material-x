// Copy to packages/material-x and run there, with the packages built:
//   node first-rendering.ts <packages> <chromium|firefox|webkit> [variant...]
// Reads the state and the drawn color of a bar that is hidden
// and shown, and the state against `scrollY > 0`, for the built bar and for
// candidates that are edits of the built files.
import { join } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { rolldown } from 'rolldown';

const [PACKAGES, ENGINE, ...ONLY] = process.argv.slice(2) as [
  string,
  'chromium' | 'firefox' | 'webkit',
];
type Edit = Readonly<{ js?: [string, string][]; css?: [string, string][] }>;
const BUILT_CALLBACK =
  'toggleState(internals(this), "scrolled", !entries.at(-1).isIntersecting);';
const BUILT_BOX =
  '.scroll-start{visibility:hidden;border:0;block-size:0;inline-size:0;margin:0;padding:0;position:absolute;inset:0}';
const BUILT_OPTIONS = 'rootMargin: "0px 1000000px"';
const tall = (h: number, callback: string, margin = h, box = h): Edit => ({
  js: [
    [
      BUILT_OPTIONS,
      `rootMargin: "${margin}px 1000000px 0px", threshold: [0, 1]`,
    ],
    [BUILT_CALLBACK, `const e = entries.at(-1); ${callback}`],
  ],
  css: [
    [
      BUILT_BOX,
      `.scroll-start{visibility:hidden;border:0;block-size:${box}px;inline-size:1px;margin:0;padding:0;position:absolute;inset:-${box}px auto auto 0}`,
    ],
  ],
});
const RECT =
  'if (e.boundingClientRect.height) toggleState(internals(this), "scrolled", e.boundingClientRect.bottom < 0);';
const inverse = (
  top: number,
  state = 'entries.at(-1).boundingClientRect.top < 0',
  box = 1,
  sides = 1000000,
): Edit => ({
  js: [
    [BUILT_OPTIONS, `rootMargin: "${top}px ${sides}px -100%", threshold: 1e-9`],
    [BUILT_CALLBACK, `toggleState(internals(this), "scrolled", ${state});`],
  ],
  css: [
    [
      BUILT_BOX,
      `.scroll-start{visibility:hidden;border:0;block-size:${box}px;inline-size:${box}px;margin:0;padding:0;position:absolute;inset:0}`,
    ],
  ],
});
const VARIANTS: Record<string, Edit> = {
  built: {},
  // The transition's start at the first rendering is the resting color.
  'starting-style': {
    css: [
      [
        '.lead,.trail{',
        '@starting-style{:host(:state(scrolled)){background-color:var(--md-top-app-bar-container-color,var(--md-sys-color-surface,#f7fbea))}}.lead,.trail{',
      ],
    ],
  },
  // A size observer on the bar starts the observer again when the bar is rendered.
  'size observer': {
    js: [
      [
        BUILT_CALLBACK,
        'if (scrollStart.checkVisibility()) toggleState(internals(this), "scrolled", !entries.at(-1).isIntersecting);',
      ],
      [
        'observer.observe(scrollStart);',
        'size.observe(scrollStart.getRootNode().host);',
      ],
      ['observer.disconnect();', 'observer.disconnect(); size.disconnect();'],
      [
        'use(this, {',
        'const size = new ResizeObserver(() => { if (!scrollStart.checkVisibility()) { observer.disconnect(); this.r = false; } else if (!this.r) { this.r = true; observer.observe(scrollStart); } }); use(this, {',
      ],
    ],
  },
  // A second target in the box, which the viewport always holds while it is rendered.
  'two targets': {
    js: [
      [
        BUILT_CALLBACK,
        'for (const e of entries) this[e.target === scrollStart ? "a" : "b"] = e.isIntersecting; if (this.b) toggleState(internals(this), "scrolled", !this.a);',
      ],
      [
        'observer.observe(scrollStart);',
        'observer.observe(scrollStart); const f = scrollStart.firstChild ?? scrollStart.appendChild(document.createElement("div")); f.style.cssText = "position:fixed;inset:0;width:0;height:0"; observer.observe(f);',
      ],
    ],
  },
  'tall box': tall(1e6, RECT),
  // The area is everything above the viewport, and the box is inside it when it is
  // scrolled away. A box that isn't rendered is at rest.
  'area above': inverse(1e7),
  'area above, ratio': inverse(1e7, 'entries.at(-1).intersectionRatio > 0'),
  'area above, 1e8': inverse(1e8),
  'area above, 1e6': inverse(1e6),
  // Each of these takes one requirement away, and must be wrong somewhere.
  'area above, isIntersecting': inverse(1e7, 'entries.at(-1).isIntersecting'),
  'area above, no sides': inverse(1e7, undefined, undefined, 0),
  'area above, no size': inverse(1e7, undefined, 0),
};
const edit = (code: string, edits: [string, string][] = []) =>
  edits.reduce((text, [from, to]) => {
    if (text.split(from).length !== 2) throw new Error(`no match: ${from}`);
    return text.replace(from, () => to);
  }, code);
const bundle = async (variant: Edit) => {
  const b = await rolldown({
    input: 'entry',
    platform: 'browser',
    plugins: [
      {
        name: 'entry',
        resolveId: (id) => (id === 'entry' ? id : null),
        load: (id) =>
          id === 'entry'
            ? `import ${JSON.stringify(join(PACKAGES, 'material-x/top-app-bar/top-app-bar.js'))};`
            : null,
        transform: (code, id) =>
          id.endsWith('top-app-bar/top-app-bar.js')
            ? edit(code, variant.js)
            : id.endsWith('top-app-bar/styles/default/main.css.js')
              ? edit(code, variant.css)
              : null,
      },
    ],
  });
  const { output } = await b.generate({ format: 'iife' });
  return output.map((c) => ('code' in c ? c.code : '')).join('\n');
};
const browser = await { chromium, firefox, webkit }[ENGINE].launch(
  ENGINE === 'chromium' ? { channel: 'chromium' } : {},
);
const settle = (t: any) =>
  t.evaluate(
    () =>
      new Promise((r) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => setTimeout(r, 60)),
        ),
      ),
  );
const open = async (code: string, html: string, opts: any = {}) => {
  const ctx = await browser.newContext({
    viewport: { width: 800, height: 600 },
    ...opts,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  PAGEERROR', e.message));
  await page.setContent(html);
  await page.addScriptTag({ content: code });
  await settle(page);
  return page;
};
const scroll = async (t: any, y: number, x = 0) => {
  await t.evaluate(
    ([left, top]: number[]) => scrollTo({ left, top, behavior: 'instant' }),
    [x, y],
  );
  await settle(t);
};
const calls = () => {
  const w = window as any;
  w.calls = 0;
  const Native = IntersectionObserver;
  w.IntersectionObserver = class extends Native {
    constructor(f: any, o: any) {
      super((...a: any) => {
        w.calls += 1;
        f(...a);
      }, o);
    }
  };
};
const read = (t: any) =>
  t.evaluate(() => {
    const e: any = document.getElementById('bar');
    return [e.matches(':state(scrolled)'), scrollY, scrollX];
  });
const D = '<!doctype html><style>body{margin:0}</style>';
const TALL = '<div style="height:4000px"></div>';
const BAR = '<mx-top-app-bar id=bar>T</mx-top-app-bar>';
// name, page, show, hide, [scroll while hidden or shown, ...], see `hidden`
const DIALOG = `<dialog id=d>${BAR}</dialog>`;
const SHOWN: [string, string, string, string, number[]][] = [
  // steps: positions while hidden first time, shown at; then hidden, scrolled, shown
  ['dialog', DIALOG, 'd.showModal()', 'd.close()', []],
  [
    'popover',
    `<div popover=manual id=d>${BAR}</div>`,
    'd.showPopover()',
    'd.hidePopover()',
    [],
  ],
  [
    'details',
    `<details id=d><summary>s</summary>${BAR}</details>`,
    'd.open=true',
    'd.open=false',
    [],
  ],
  [
    'display',
    `<style>.h{display:none}</style><div id=d class=h>${BAR}</div>`,
    'd.className=""',
    'd.className="h"',
    [],
  ],
  [
    'content-visibility',
    `<style>.h{content-visibility:hidden}</style><div id=d class=h>${BAR}</div>`,
    'd.className=""',
    'd.className="h"',
    [],
  ],
  [
    'visibility',
    `<style>.h{visibility:hidden}</style><div id=d class=h>${BAR}</div>`,
    'd.className=""',
    'd.className="h"',
    [],
  ],
];
const STEPS: [number, number][] = [
  [0, 0],
  [0, 300],
  [300, 300],
  [300, 0],
];
const CSS: Record<string, string> = {
  plain: '',
  quirks: 'Q',
  'html margin-top': 'html{margin-top:46px}',
  'html top': 'html{position:relative;top:20px}',
  'html negative margin': 'html{margin-top:-30px}',
  'html height 0': 'html{height:0}',
  'html,body height 100%': 'html,body{height:100%}',
  'body absolute': 'body{position:absolute;inset:0 0 auto}',
  'html zoom 1.1': 'html{zoom:1.1}',
  'html zoom 1.5': 'html{zoom:1.5}',
  'html zoom .67': 'html{zoom:.67}',
  'html zoom 3': 'html{zoom:3}',
  'body zoom .5': 'body{zoom:.5}',
  'html rtl': 'html{direction:rtl}',
  'html vertical-rl': 'html{writing-mode:vertical-rl}',
  'html transform': 'html{transform:translateY(40px)}',
  'html rotate': 'html{rotate:1deg}',
  'html contain': 'html{contain:layout paint;perspective:100px}',
  'html overflow-x hidden': 'html{overflow-x:hidden}',
  'bar content-visibility': '#bar{content-visibility:auto}',
  'bar display contents': '#bar{display:contents}',
  'bar transform':
    '#bar{opacity:.5;filter:blur(1px);transform:translateY(5px)}',
  'bar fixed': '#bar{position:fixed;inset-inline:0}',
  'bar strict': '#bar{overflow:clip;contain:strict;height:64px}',
  'bar zoom 1.3': '#bar{zoom:1.3}',
  'bar rtl': '#bar{direction:rtl}',
  'bar vertical-rl': '#bar{writing-mode:vertical-rl}',
  'universal !important':
    '*,*::before,*::after{margin:9px!important;padding:9px!important;border:3px solid!important;inset:auto!important;box-sizing:border-box!important}',
  'body transformed': 'body{transform:translateZ(0)}',
};
const YS = [0, 1, 20, 300, 2000, 1e6, 0, 3000, 0];
console.log(`# ${ENGINE} ${browser.version()}`);
for (const [name, variant] of Object.entries(VARIANTS)) {
  if (ONLY.length && !ONLY.includes(name)) continue;
  console.log(`## ${name}`);
  const code = await bundle(variant);
  for (const [label, html, show, hide] of SHOWN)
    for (const [from, to] of STEPS) {
      const lines: string[] = [];
      for (const first of [true, false]) {
        if (first && from !== 0) continue;
        const page = await open(
          code,
          `${D}<style>#bar:state(scrolled){outline:1px solid}</style>${html}${TALL}`,
        );
        if (!first) {
          await page.evaluate(show);
          await scroll(page, from);
          await page.waitForTimeout(350);
          await page.evaluate(hide);
        }
        await settle(page);
        await scroll(page, to);
        const [hidden] = await read(page);
        await page.evaluate(() => {
          const w = window as any;
          w.c = [];
          const t0 = performance.now();
          const f = () => {
            if (bar.getClientRects().length && bar.checkVisibility())
              w.c.push([
                performance.now() - t0,
                getComputedStyle(bar).backgroundColor,
                bar.matches(':state(scrolled)'),
              ]);
            if (performance.now() - t0 < 900) requestAnimationFrame(f);
          };
          requestAnimationFrame(f);
        });
        await page.evaluate(show);
        await page.waitForTimeout(1000);
        const [after, y] = await read(page);
        lines.push(
          `${first ? 'first' : 'again'}: hidden ${hidden ? 'on' : 'off'}, ${await page.evaluate(
            () => {
              const { c } = window as any;
              const end = c.at(-1);
              const wrong = c.filter((x: any) => x[1] !== end[1]);
              return `color ${wrong.length} frames ${wrong.length ? Math.round(wrong.at(-1)[0] - c[0][0]) : 0}ms from ${c[0][1]}, state ${c.filter((x: any) => x[2] !== end[2]).length} frames`;
            },
          )}${after === y > 0 ? '' : ' END WRONG'}`,
        );
        await page.context().close();
      }
      console.log(`${label} ${from}->${to} | ${lines.join(' | ')}`);
    }
  const walk = async (
    label: string,
    html: string,
    ys = YS,
    opts = {},
    xs = true,
  ) => {
    const page = await open(code, html, opts);
    const wrong: string[] = [];
    let n = 0;
    for (const [y, x] of [
      ...ys.map((v) => [v, 0]),
      ...(xs
        ? [
            [0, 3000],
            [300, 3000],
            [1, 3000],
            [0, -3000],
            [1, -3000],
          ]
        : []),
    ]) {
      await scroll(page, y!, x!);
      const [on, sy, sx] = await read(page);
      n += 1;
      if (on !== sy > 0) wrong.push(`${on ? 'on' : 'off'}@y${sy},x${sx}`);
    }
    if (wrong.length) console.log(`WRONG ${label}: ${wrong.join(' ')}`);
    await page.context().close();
    return wrong.length;
  };
  const big = `${BAR}<div style="height:5000px;width:6000px"></div>`;
  let bad = 0;
  for (const [n, css] of Object.entries(CSS))
    bad +=
      (await walk(n, css === 'Q' ? big : `${D}<style>${css}</style>${big}`)) &&
      1;
  console.log(`pages wrong ${bad} of ${Object.keys(CSS).length}`);
  bad = 0;
  const scales = [1, 1.1, 1.25, 1.5, 1.75, 2, 2.625, 3];
  for (const deviceScaleFactor of scales)
    bad +=
      (await walk(
        `dsf ${deviceScaleFactor}`,
        D + big,
        [0, 0.25, 0.34, 0.5, 0.67, 0.75, 1, 1.5, 2, 0.5, 0],
        { deviceScaleFactor },
        false,
      )) && 1;
  console.log(`scales wrong ${bad} of ${scales.length}`);
  bad = 0;
  const heights = [333, 599, 601, 733, 1080, 2161];
  for (const height of heights)
    bad +=
      (await walk(
        `viewport ${height}`,
        D + big,
        [0, 1, 2, 1, 0, 1e6, 0, 1],
        { viewport: { width: 801, height } },
        false,
      )) && 1;
  console.log(`viewport heights wrong ${bad} of ${heights.length}`);
  for (const h of [900000, 1500000, 12000000])
    await walk(
      `page ${h}`,
      `${D}${BAR}<div style="height:${h}px"></div>`,
      [0, 1, h, 0, h / 2, h, 1, 0],
      {},
      false,
    );
  {
    const page = await open(';', `${D}${BAR}${TALL}`);
    await page.evaluate(calls);
    await page.addScriptTag({ content: code });
    await settle(page);
    const before = await page.evaluate('calls');
    for (let y = 10; y <= 2000; y += 10)
      await page.evaluate((top: number) => {
        scrollTo({ top, behavior: 'instant' });
        return new Promise((r) => requestAnimationFrame(r));
      }, y);
    await settle(page);
    console.log(
      'callbacks over 200 steps',
      ((await page.evaluate('calls')) as number) - (before as number),
    );
    for (const [from, to] of STEPS) {
      await scroll(page, from);
      await page.waitForTimeout(350);
      await page.evaluate(() => {
        (window as any).kept = bar;
        bar.remove();
      });
      await scroll(page, to);
      await page.evaluate(() => {
        const w = window as any;
        w.c = [];
        w.n = 0;
        document.body.prepend(w.kept);
        const t0 = performance.now();
        const f = () => {
          w.c.push([
            performance.now() - t0,
            getComputedStyle(bar).backgroundColor,
          ]);
          if (performance.now() - t0 < 600) requestAnimationFrame(f);
        };
        requestAnimationFrame(f);
      });
      await page.waitForTimeout(700);
      console.log(
        `inserted again ${from}->${to}`,
        await page.evaluate(() => {
          const { c } = window as any;
          const wrong = c.filter((x: any) => x[1] !== c.at(-1)[1]);
          return `color ${wrong.length} frames ${wrong.length ? Math.round(wrong.at(-1)[0] - c[0][0]) : 0}ms`;
        }),
      );
    }
    await page.context().close();
  }
  // Frame, and what the box adds to the page.
  const page = await open(code, `${D}${BAR}${TALL}`);
  console.log(
    'overflow',
    await page.evaluate(() =>
      [
        document.documentElement.scrollHeight,
        document.documentElement.scrollWidth,
        document.elementFromPoint(0, 0)!.localName,
      ].join(' '),
    ),
  );
  await page.context().close();
  const outer = await open(
    code,
    `${D}<iframe id=f style="width:400px;height:300px;margin-top:900px"></iframe>${TALL}`,
  );
  const frame = outer.frames()[1]!;
  await frame.setContent(`${D}${BAR}${TALL}`);
  await frame.addScriptTag({ content: code });
  for (const oy of [0, 700]) {
    await scroll(outer, oy);
    for (const y of [0, 1, 300, 0]) {
      await scroll(frame, y);
      const [on, sy] = await read(frame);
      if (on !== sy > 0) console.log(`WRONG frame ${oy}: ${on}@${sy}`);
    }
  }
  await outer.context().close();
}
await browser.close();
