// What mx-sortable-list paints, frame by frame, on the built elements: the footprint in a key move and a pointer drag, the flight, and the state's reach.
// node list.mjs <repository> <chromium|firefox|webkit>
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const [ROOT, ENGINE] = process.argv.slice(2);
const require = createRequire(`${ROOT}/package.json`);
const pw = require('playwright');
const { rolldown } = await import(
  pathToFileURL(require.resolve('rolldown')).href
);
const src = `${['list/sortable-list', 'list/list', 'list/list-item', 'list/list-button-item', 'icon/icon'].map((e) => `import '${ROOT}/packages/material-x/${e}.js';`).join('')} import * as React from ${JSON.stringify(require.resolve('react'))}; import { createRoot } from ${JSON.stringify(require.resolve('react-dom/client'))}; import { flushSync } from ${JSON.stringify(require.resolve('react-dom'))}; window.React = React; window.createRoot = createRoot; window.flushSync = flushSync;`;
const b = await rolldown({
  input: 'e',
  platform: 'browser',
  transform: { define: { 'process.env.NODE_ENV': '"production"' } },
  plugins: [
    {
      name: 'e',
      resolveId: (i) => (i === 'e' ? i : null),
      load: (i) => (i === 'e' ? src : null),
    },
  ],
});
const { output } = await b.generate({ format: 'iife', name: 'mx' });
const code = output.map((c) => c.code ?? '').join('\n');
const browser = await pw[ENGINE].launch(
  ENGINE === 'chromium' ? { channel: 'chromium' } : {},
);
console.log(`# ${ENGINE} ${browser.version()}`);
const on = (body) =>
  `list.addEventListener('reorder', (e) => { if (e.target !== list) return; ${body} })`;
const COMMITS = {
  handler: on('list.insertBefore(e.item, e.next)'),
  microtask: on(
    'Promise.resolve().then(() => list.insertBefore(e.item, e.next))',
  ),
  'setTimeout 0': on('setTimeout(() => list.insertBefore(e.item, e.next))'),
  'next frame': on(
    'requestAnimationFrame(() => list.insertBefore(e.item, e.next))',
  ),
  '100 ms': on('setTimeout(() => list.insertBefore(e.item, e.next), 100)'),
  '700 ms': on('setTimeout(() => list.insertBefore(e.item, e.next), 700)'),
  never: '',
  refused: on('e.preventDefault()'),
};
const NAMES = ['Inbox', 'Starred', 'Sent', 'Drafts'];
const html = (tag = 'mx-list-button-item', extra = '') =>
  `<mx-sortable-list id=l style="inline-size:300px">${NAMES.map((t) => `<${tag}>${t}${extra}</${tag}>`).join('')}</mx-sortable-list>`;
const REACT = (sync) =>
  `const h = React.createElement; function App() { const [items, setItems] = React.useState(${JSON.stringify(NAMES)}); const move = ({ from, to }) => setItems((c) => { const n = c.slice(); const [m] = n.splice(from, 1); n.splice(to, 0, m); return n; }); return h('mx-sortable-list', { id: 'l', onreorder: (e) => ${sync ? 'flushSync(() => move(e))' : 'move(e)'} }, items.map((t) => h('mx-list-button-item', { key: t }, t))); } createRoot(document.getElementById('r')).render(h(App));`;
const open = async (body, setup, { reduce = false, css = '' } = {}) => {
  const ctx = await browser.newContext({
    viewport: { width: 500, height: 500 },
    reducedMotion: reduce ? 'reduce' : 'no-preference',
    hasTouch: true,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  ERROR', e.message));
  await page.setContent(
    `<!doctype html><style>body{margin:40px;font:16px sans-serif}${css}</style>${body}`,
  );
  await page.addScriptTag({ content: code });
  await page.evaluate((s) => {
    window.list = document.getElementById('l');
    new Function(s)();
    window.list ??= null;
  }, setup);
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    const w = window;
    w.list = document.getElementById('l');
    w.frames = [];
    w.item = null;
    w.rec = true;
    w.paint = () => {
      const p = w.list.querySelector(':scope > [data-drag-placeholder]');
      if (!p) return null;
      const s = getComputedStyle(p);
      return (
        s.visibility === 'visible' &&
        s.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
        Number(s.opacity) > 0 &&
        s.display !== 'none'
      );
    };
    w.handlers = [];
    w.list.addEventListener('reorder', () => w.handlers.push(w.paint()), true);
    const f = () => {
      if (w.rec) {
        const p = w.list.querySelector(':scope > [data-drag-placeholder]');
        w.frames.push({
          p: w.paint(),
          top: p ? Math.round(p.getBoundingClientRect().top) : null,
          h: p ? Math.round(p.getBoundingClientRect().height) : null,
          y: w.item ? Math.round(w.item.getBoundingClientRect().top) : null,
          fly: w.item
            ? w.item
                .getAnimations()
                .some((a) =>
                  a.effect
                    .getKeyframes()
                    .some((k) => k.translate && k.translate !== 'none'),
                )
            : false,
        });
      }
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  return { ctx, page };
};
const sum = (page) =>
  page.evaluate(() => {
    const f = window.frames,
      P = f.filter((x) => x.p !== null),
      fly = f.filter((x) => x.fly);
    const r = `placeholder frames ${P.length ? (P.length > 3 ? 'many' : 'few') : 0}, painting ${P.some((x) => x.p) ? (P.every((x) => x.p) ? 'all' : 'some') : 'none'}${P.length ? `, at ${[...new Set(P.map((x) => x.top))].join('/')} h${[...new Set(P.map((x) => x.h))].join('/')}` : ''}; handlers ${window.handlers}; flight ${fly.length > 5 ? 'yes' : 'no'}${fly.length ? ` ${fly[0].y}>${fly.at(-1).y}` : ''}; rest ${f.at(-1)?.y}; order ${[...window.list.children].map((e) => e.textContent.slice(0, 2)).join('')}; state ${window.list.matches(':state(command)')}`;
    window.frames = [];
    window.handlers = [];
    return r;
  });
const key = async (page, name, k = 'ArrowDown') => {
  await page.evaluate((n) => {
    window.item = [...window.list.children].find((e) =>
      e.textContent.startsWith(n),
    );
    const t = window.item.querySelector('[data-handle]') ?? window.item;
    t.focus();
    window.frames = [];
    window.handlers = [];
  }, name);
  await page.keyboard.press(k);
};
const at = (page, name) =>
  page.evaluate((n) => {
    const e = [...window.list.children].find((x) =>
      x.textContent.startsWith(n),
    );
    window.item = e;
    const t = e.querySelector('[data-handle]') ?? e;
    const r = t.getBoundingClientRect();
    return [r.x + Math.min(60, r.width / 2), r.y + r.height / 2];
  }, name);
const down = async (page, name, dy) => {
  const p = await at(page, name);
  await page.mouse.move(...p);
  await page.mouse.down();
  await page.evaluate(() => {
    window.frames = [];
    window.handlers = [];
  });
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(p[0], p[1] + (dy * i) / 6);
    await page.waitForTimeout(25);
  }
};
const drag = async (page, name, dy) => {
  await down(page, name, dy);
  await page.mouse.up();
};
for (const reduce of [false, true]) {
  console.log(`## ${reduce ? 'reduce' : 'no preference'}`);
  for (const [n, c] of Object.entries(COMMITS)) {
    for (const tag of reduce
      ? ['mx-list-button-item']
      : ['mx-list-button-item', 'mx-list-item']) {
      const { ctx, page } = await open(html(tag), c, { reduce });
      await key(page, 'Starred');
      await page.waitForTimeout(n === 'never' || n === '700 ms' ? 1700 : 1000);
      console.log(`key | ${n} | ${tag} | ${await sum(page)}`);
      await ctx.close();
    }
    {
      const { ctx, page } = await open(html(), c, { reduce });
      await drag(page, 'Starred', 58);
      await page.waitForTimeout(n === 'never' || n === '700 ms' ? 1700 : 1000);
      console.log(`pointer | ${n} | ${await sum(page)}`);
      await ctx.close();
    }
  }
  for (const sync of [false, true]) {
    const { ctx, page } = await open(
      '<div id=r style="inline-size:300px"></div>',
      REACT(sync),
      { reduce },
    );
    await key(page, 'Starred');
    await page.waitForTimeout(1000);
    console.log(
      `key | React ${sync ? 'flushSync' : 'state'} | ${await sum(page)}`,
    );
    await drag(page, 'Starred', -58);
    await page.waitForTimeout(1000);
    console.log(
      `pointer after it | React ${sync ? 'flushSync' : 'state'} | ${await sum(page)}`,
    );
    await ctx.close();
  }
}
console.log('## sequences: what the pointer drag paints, held');
const held = async (page, name, dy) => {
  await down(page, name, dy);
  await page.waitForTimeout(80);
  const r = await sum(page);
  await page.mouse.up();
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    window.frames = [];
  });
  return r;
};
const SEQ = [
  [
    'after an accepted key move',
    COMMITS.handler,
    async (p) => {
      await key(p, 'Inbox');
      await p.waitForTimeout(1000);
    },
  ],
  [
    'in the flight of a key move, another item',
    COMMITS.handler,
    async (p) => {
      await key(p, 'Inbox');
      await p.waitForTimeout(150);
    },
  ],
  [
    'after a refused key move',
    COMMITS.refused,
    async (p) => {
      await key(p, 'Inbox');
      await p.waitForTimeout(50);
    },
  ],
  [
    'after a key move that timed out',
    '',
    async (p) => {
      await key(p, 'Inbox');
      await p.waitForTimeout(900);
    },
  ],
  [
    'after a key move that Escape ended',
    '',
    async (p) => {
      await key(p, 'Inbox');
      await p.waitForTimeout(80);
      await p.keyboard.press('Escape');
      await p.waitForTimeout(900);
    },
  ],
  [
    'after a disconnection in a key move',
    '',
    async (p) => {
      await key(p, 'Inbox');
      await p.waitForTimeout(80);
      await p.evaluate(() => {
        const n = list.parentNode;
        list.remove();
        n.append(list);
      });
      await p.waitForTimeout(150);
    },
  ],
  [
    'after a move in the DOM in a key move',
    '',
    async (p) => {
      await key(p, 'Inbox');
      await p.waitForTimeout(80);
      await p.evaluate(() => document.body.prepend(list));
      await p.waitForTimeout(150);
    },
  ],
  [
    'after a key at the edge',
    COMMITS.handler,
    async (p) => {
      await key(p, 'Drafts');
      await p.waitForTimeout(100);
    },
  ],
  [
    'after the item left in a key move',
    '',
    async (p) => {
      await key(p, 'Inbox');
      await p.waitForTimeout(80);
      await p.evaluate(() => list.children[0].remove());
      await p.waitForTimeout(900);
    },
  ],
  [
    'after K K P K',
    COMMITS.handler,
    async (p) => {
      await key(p, 'Inbox');
      await p.waitForTimeout(800);
      await key(p, 'Inbox');
      await p.waitForTimeout(800);
      await drag(p, 'Starred', 30);
      await p.waitForTimeout(800);
      await key(p, 'Starred');
      await p.waitForTimeout(800);
    },
  ],
  ['no key move before', COMMITS.handler, async () => {}],
];
for (const [n, c, go] of SEQ) {
  const { ctx, page } = await open(html(), c);
  await go(page);
  console.log(`${n} | ${await held(page, 'Sent', -58)}`);
  await key(page, 'Drafts', 'ArrowUp');
  await page.waitForTimeout(80);
  console.log(`   then a key move | ${(await sum(page)).split('; flight')[0]}`);
  await ctx.close();
}
{
  const { ctx, page } = await open(html(), '');
  await down(page, 'Inbox', 58);
  await page.evaluate(() => {
    const n = list.parentNode;
    list.remove();
    n.append(list);
  });
  await page.mouse.up();
  await page.waitForTimeout(200);
  await key(page, 'Sent');
  await page.waitForTimeout(200);
  console.log(
    `a key move after a disconnection in a pointer drag | ${await sum(page)}`,
  );
  await ctx.close();
}
{
  const { ctx, page } = await open(
    html(),
    on('setTimeout(() => list.insertBefore(e.item, e.next), 300)'),
  );
  await down(page, 'Inbox', 58);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(80);
  console.log(`an arrow during a pointer drag | ${await sum(page)}`);
  await page.mouse.up();
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    window.frames = [];
  });
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(80);
  console.log(`an arrow in the commit of a pointer drop | ${await sum(page)}`);
  await page.waitForTimeout(1500);
  await ctx.close();
}
{
  const { ctx, page } = await open(
    html('mx-list-item', '<mx-icon slot=lead data-handle>x</mx-icon>'),
    COMMITS['100 ms'],
  );
  await key(page, 'Starred');
  await page.waitForTimeout(1000);
  console.log(`key by a handle, 100 ms | ${await sum(page)}`);
  console.log(
    `pointer by a handle after it | ${await held(page, 'Sent', -58)}`,
  );
  await ctx.close();
}
if (ENGINE === 'chromium') {
  const { ctx, page } = await open(
    html(
      'mx-list-item',
      '<mx-icon slot=lead data-handle style="touch-action:none">x</mx-icon>',
    ),
    COMMITS['100 ms'],
  );
  await key(page, 'Starred');
  await page.waitForTimeout(1000);
  const cdp = await ctx.newCDPSession(page);
  const p = await at(page, 'Sent');
  const s = (type, pts) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  await page.evaluate(() => {
    window.frames = [];
  });
  await s('touchStart', [{ x: p[0], y: p[1] }]);
  for (let i = 1; i <= 6; i++) {
    await s('touchMove', [{ x: p[0], y: p[1] - 10 * i }]);
    await page.waitForTimeout(25);
  }
  console.log(`a finger's drag after a key move | ${await sum(page)}`);
  await s('touchEnd', []);
  await ctx.close();
}
console.log('## the state and the page');
const CSS = {
  'page shows the placeholder': '[data-drag-placeholder]{visibility:visible}',
  'page styles the state':
    'mx-sortable-list:state(command){outline:3px solid red}',
  'transition on all': '*{transition:all 400ms}',
  'page outline on the placeholder':
    '[data-drag-placeholder]{outline:2px solid red}',
  'page opacity': '[data-drag-placeholder]{opacity:1!important}',
};
for (const [n, css] of Object.entries(CSS)) {
  const { ctx, page } = await open(html(), '', { css });
  await key(page, 'Starred');
  await page.waitForTimeout(120);
  console.log(
    `${n} | list outline ${await page.evaluate('getComputedStyle(list).outlineStyle')} | ${(await sum(page)).split('; flight')[0]}`,
  );
  await page.waitForTimeout(900);
  await key(page, 'Starred');
  await page.waitForTimeout(120);
  console.log(`   again | ${(await sum(page)).split('; flight')[0]}`);
  await page.waitForTimeout(900);
  console.log(
    `   pointer after it | ${(await held(page, 'Sent', -58)).split('; flight')[0]}`,
  );
  await ctx.close();
}
{
  // What the state hides: nothing but the list's own placeholder.
  const inner = `<mx-sortable-list id=n>${['x', 'y', 'z'].map((t) => `<mx-list-item>${t}</mx-list-item>`).join('')}</mx-sortable-list>`;
  const { ctx, page } = await open(
    `<mx-sortable-list id=l style="inline-size:300px"><mx-list-item id=a>Aa<div data-drag-placeholder id=inside>in</div></mx-list-item><mx-list-item>Bb</mx-list-item><mx-list-item>Cc${inner}</mx-list-item><div id=own data-drag-placeholder style="block-size:5px">own</div></mx-sortable-list><mx-list id=plain><mx-list-item>P</mx-list-item><div id=pp data-drag-placeholder style="block-size:5px">pp</div></mx-list>`,
    '',
  );
  await key(page, 'Aa');
  await page.waitForTimeout(100);
  console.log(
    'in a key move | ' +
      (await page.evaluate(() =>
        JSON.stringify(
          Object.fromEntries(
            [
              ...document.querySelectorAll(
                'mx-list-item,[data-drag-placeholder],mx-list,mx-sortable-list',
              ),
            ].map((e, i) => [
              (e.id || e.localName) + i,
              getComputedStyle(e).visibility[0] +
                (e.matches(':state(command)') ? '!' : ''),
            ]),
          ),
        ),
      )),
  );
  await page.waitForTimeout(900);
  console.log(
    'after it | ' +
      (await page.evaluate(() =>
        JSON.stringify(
          Object.fromEntries(
            [...document.querySelectorAll('[data-drag-placeholder]')].map(
              (e, i) => [
                (e.id || e.localName) + i,
                getComputedStyle(e).visibility[0],
              ],
            ),
          ),
        ),
      )),
  );
  await ctx.close();
}
{
  // A nested list's key move and the outer list's drag.
  const inner = `<mx-sortable-list id=n>${['x', 'y', 'z'].map((t) => `<mx-list-item>${t}</mx-list-item>`).join('')}</mx-sortable-list>`;
  const { ctx, page } = await open(
    `<mx-sortable-list id=l style="inline-size:300px"><mx-list-item>Aa</mx-list-item><mx-list-item>Bb</mx-list-item><mx-list-item>Cc<div>${inner}</div></mx-list-item></mx-sortable-list>`,
    '',
  );
  await page.evaluate(() => n.children[0].focus());
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(100);
  console.log(
    'nested key move | ' +
      (await page.evaluate(
        () =>
          `outer state ${l.matches(':state(command)')}, inner ${n.matches(':state(command)')}, placeholders ${[...document.querySelectorAll('[data-drag-placeholder]')].map((e) => e.parentNode.id + getComputedStyle(e).visibility)}`,
      )),
  );
  await page.waitForTimeout(900);
  console.log(
    `outer pointer drag after it | ${(await held(page, 'Aa', 40)).split('; flight')[0]}`,
  );
  await ctx.close();
}
{
  // Pixels: the placeholder's box in a pending key move, twice, then with the page removing the placeholder's painting. The lift's shadow is still by then.
  const { ctx, page } = await open(
    html(),
    on('setTimeout(() => list.insertBefore(e.item, e.next), 100)'),
    { css: 'mx-list-button-item{--md-x:0}' },
  );
  await page.evaluate(() => {
    const real = window.setTimeout;
    window.setTimeout = (f, t, ...a) =>
      real(f, t === 500 ? 8000 : t === 100 ? 8000 : t, ...a);
  });
  await key(page, 'Starred');
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const b = list
      .querySelector('[data-drag-placeholder]')
      ?.getBoundingClientRect();
    return b && { x: b.x, y: b.y, width: b.width, height: b.height };
  });
  const shot = () => page.screenshot({ clip: r });
  const one = await shot(),
    again = await shot();
  await page.evaluate(() => {
    const s = document.createElement('style');
    s.textContent = '[data-drag-placeholder]{visibility:hidden!important}';
    document.head.append(s);
  });
  const two = await shot();
  console.log(
    `pixels in the placeholder's box after 1.5 s of a pending key move: stable ${one.equals(again)}, as with a hidden placeholder ${one.equals(two)}`,
  );
  await ctx.close();
}
await browser.close();
