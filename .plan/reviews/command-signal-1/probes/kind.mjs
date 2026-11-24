// `onStart`'s kind on the published build of drag, by mouse, touch, pen and key, and what each start leads to.
// node kind.mjs <repository> <chromium|firefox|webkit>
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const [ROOT, ENGINE] = process.argv.slice(2);
const require = createRequire(`${ROOT}/package.json`);
const pw = require('playwright');
const { rolldown } = await import(
  pathToFileURL(require.resolve('rolldown')).href
);
const src = `export * from '${ROOT}/packages/drag/sortable.js'; export { y } from '${ROOT}/packages/drag/sortable/y.js'; export { xy } from '${ROOT}/packages/drag/sortable/xy.js'; export { landing } from '${ROOT}/packages/drag/sortable/landing.js'; export { freeDrag, FreeDragResolution } from '${ROOT}/packages/drag/free-drag.js';`;
const b = await rolldown({
  input: 'e',
  platform: 'browser',
  plugins: [
    {
      name: 'e',
      resolveId: (i) => (i === 'e' ? i : null),
      load: (i) => (i === 'e' ? src : null),
    },
  ],
});
const { output } = await b.generate({ format: 'iife', name: 'D' });
const code = output.map((c) => c.code ?? '').join('\n');
const browser = await pw[ENGINE].launch(
  ENGINE === 'chromium' ? { channel: 'chromium' } : {},
);
console.log(`# ${ENGINE} ${browser.version()}`);
const run = async (name, setup, go, { axis = 'y', html } = {}) => {
  const ctx = await browser.newContext({
    viewport: { width: 500, height: 500 },
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.setContent(
    `<!doctype html><style>body{margin:20px}#l>*{block-size:40px;inline-size:200px;background:#ccc;touch-action:none}</style>${html ?? '<div id=l><div id=r0 tabindex=0>0</div><div id=r1 tabindex=0>1</div><div id=r2 tabindex=0>2</div><div id=r3 tabindex=0>3</div></div>'}`,
  );
  await page.addScriptTag({ content: code });
  await page.evaluate(
    ({ setup, axis }) => {
      const w = window;
      w.log = [];
      const l = document.getElementById('l');
      addEventListener('error', (e) => {
        w.log.push('ERROR:' + (e.error?.message ?? e.message));
        e.preventDefault();
      });
      const base = {
        items: () => [...l.children].filter((e) => e.id),
        axis: D[axis](),
        onStart(...a) {
          w.log.push(`start:${a[0].id}:${a[1]}:args${a.length}`);
          queueMicrotask(() => w.log.push('microtask'));
          setTimeout(() => w.log.push('task'));
        },
        onReorder({ item, next, from, to }) {
          w.log.push(`reorder:${from}>${to}`);
          l.insertBefore(item, next);
          return D.ReorderResolution.accept();
        },
        onEnd(r) {
          w.log.push(`end:${r.type}${r.origin ? ':' + r.origin : ''}`);
        },
      };
      w.make = (o) => {
        w.c = D.sortable(l, { ...base, ...o });
      };
      new Function('base', 'l', setup || 'make({})')(base, l);
    },
    { setup, axis },
  );
  const cdp = ENGINE === 'chromium' ? await ctx.newCDPSession(page) : null;
  const at = (id) =>
    page.evaluate((id) => {
      const r = document.getElementById(id).getBoundingClientRect();
      return [r.x + 30, r.y + 20];
    }, id);
  const t = {
    page,
    js: (c) => page.evaluate(c),
    frames: () => page.waitForTimeout(80),
    key: async (id, k) => {
      await page.evaluate((id) => document.getElementById(id).focus(), id);
      await page.keyboard.press(k);
      await page.waitForTimeout(80);
    },
    mouse: async (id, dy, up = true) => {
      const [x, y] = await at(id);
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y + dy / 2, { steps: 3 });
      await page.mouse.move(x, y + dy, { steps: 3 });
      await page.waitForTimeout(60);
      if (up) {
        await page.mouse.up();
        await page.waitForTimeout(80);
      }
    },
    touch: async (id, dy) => {
      const [x, y] = await at(id);
      const s = (type, p) =>
        cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p });
      await s('touchStart', [{ x, y }]);
      for (let i = 1; i <= 5; i++)
        await s('touchMove', [{ x, y: y + (dy * i) / 5 }]);
      await page.waitForTimeout(60);
      await s('touchEnd', []);
      await page.waitForTimeout(80);
    },
    pen: async (id, dy) => {
      const [x, y] = await at(id);
      const s = (type, yy, buttons) =>
        cdp.send('Input.dispatchMouseEvent', {
          type,
          x,
          y: yy,
          button: 'left',
          buttons,
          clickCount: 1,
          pointerType: 'pen',
        });
      await s('mousePressed', y, 1);
      for (let i = 1; i <= 5; i++) await s('mouseMoved', y + (dy * i) / 5, 1);
      await page.waitForTimeout(60);
      await s('mouseReleased', y + dy, 0);
      await page.waitForTimeout(80);
    },
    // The kernel reads pointer events; a dispatched one runs the same code in an engine whose touch and pen can't be emulated.
    synth: async (id, dy, pointerType) => {
      const [x, y] = await at(id);
      await page.evaluate(
        ({ id, x, y, dy, pointerType }) => {
          const e = document.getElementById(id);
          const f = (type, yy, buttons) =>
            new PointerEvent(type, {
              bubbles: true,
              composed: true,
              cancelable: true,
              clientX: x,
              clientY: yy,
              pointerId: 1,
              pointerType,
              isPrimary: true,
              button: type === 'pointermove' ? -1 : 0,
              buttons,
            });
          HTMLElement.prototype.setPointerCapture = () => {};
          HTMLElement.prototype.hasPointerCapture = () => true;
          HTMLElement.prototype.releasePointerCapture = () => {};
          e.dispatchEvent(f('pointerdown', y, 1));
          for (let i = 1; i <= 5; i++)
            e.dispatchEvent(f('pointermove', y + (dy * i) / 5, 1));
          e.dispatchEvent(f('pointerup', y + dy, 0));
        },
        { id, x, y, dy, pointerType },
      );
      await page.waitForTimeout(80);
    },
  };
  await go(t);
  await page.waitForTimeout(60);
  console.log(
    `${name} | ${(await page.evaluate('log')).join(' ')} | ${await page.evaluate('[...l.children].map(e=>e.id||e.tagName).join("")')} ph:${await page.evaluate('document.querySelectorAll("[data-drag-placeholder]").length')} pop:${await page.evaluate('document.querySelectorAll(":popover-open").length')}`,
  );
  await ctx.close();
};
await run('mouse', '', (t) => t.mouse('r0', 90));
if (ENGINE === 'chromium') {
  await run('touch (CDP)', '', (t) => t.touch('r0', 90));
  await run('pen (CDP)', '', (t) => t.pen('r0', 90));
}
for (const p of ['mouse', 'touch', 'pen', ''])
  await run(`dispatched ${p || 'no type'}`, '', (t) => t.synth('r0', 90, p));
for (const k of ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'])
  await run(`key ${k}`, '', (t) => t.key('r1', k));
for (const k of ['ArrowDown', 'ArrowRight'])
  await run(`key ${k}, xy`, '', (t) => t.key('r1', k), { axis: 'xy' });
await run('key, landing', 'make({ landing: D.landing() })', async (t) => {
  await t.key('r1', 'ArrowDown');
  await t.page.waitForTimeout(500);
});
for (const [n, id, k] of [
  ['edge, end', 'r3', 'ArrowDown'],
  ['edge, start', 'r0', 'ArrowUp'],
  ['not an arrow', 'r1', 'a'],
  ['Enter', 'r1', 'Enter'],
])
  await run(`declined: ${n}`, '', (t) => t.key(id, k));
await run(
  'declined: data-drag-ignore',
  'document.getElementById("r1").innerHTML = "<input id=i data-drag-ignore>"; make({})',
  (t) => t.key('i', 'ArrowDown'),
);
await run('declined: handle is null', 'make({ handle: () => null })', (t) =>
  t.key('r1', 'ArrowDown'),
);
await run(
  'declined: prevented before',
  'document.addEventListener("keydown", (e) => e.preventDefault(), true); make({})',
  (t) => t.key('r1', 'ArrowDown'),
);
await run(
  'declined: the item leaves at the second pull',
  'let n = 0; make({ items: () => (++n > 1 ? [] : base.items()) })',
  (t) => t.key('r1', 'ArrowDown'),
);
await run('declined: altKey pointer', '', async (t) => {
  await t.page.keyboard.down('Alt');
  await t.mouse('r0', 90);
  await t.page.keyboard.up('Alt');
});
await run('press without a move', '', (t) => t.mouse('r0', 0));
for (const [n, start] of [
  ['cancels', 'c.requestCancel("x")'],
  ['destroys', 'void c.requestDestroy()'],
  ['throws', 'throw new Error("boom")'],
  ['invalidates', 'c.invalidate()'],
  ['removes the item', 'a[0].remove(); c.invalidate()'],
  ['reorders the list', 'l.append(a[0]); c.invalidate()'],
])
  for (const how of ['key', 'mouse'])
    await run(
      `onStart ${n}, ${how}; then a key and a mouse`,
      `make({ onStart(...a) { base.onStart(...a); if (!window.once) { window.once = 1; ${start}; } } })`,
      async (t) => {
        if (how === 'key') await t.key('r1', 'ArrowDown');
        else await t.mouse('r1', 50);
        await t.js('log.push("|")');
        await t.key('r0', 'ArrowDown').catch(() => {});
        await t.mouse('r3', -50).catch(() => {});
      },
    );
await run(
  'onReorder rejects, key',
  'make({ onReorder: () => { log.push("reorder"); return D.ReorderResolution.reject("no"); } })',
  (t) => t.key('r1', 'ArrowDown'),
);
await run(
  'onReorder throws, key',
  'make({ onReorder: () => { log.push("reorder"); throw new Error("boom"); } })',
  (t) => t.key('r1', 'ArrowDown'),
);
await run(
  'onReorder pending, a key and a mouse refused, then settled',
  'make({ onReorder: ({item,next}) => { log.push("reorder"); return new Promise((r) => { window.settle = () => { l.insertBefore(item, next); r(D.ReorderResolution.accept()); }; }); } })',
  async (t) => {
    await t.key('r1', 'ArrowDown');
    await t.key('r0', 'ArrowDown');
    await t.mouse('r3', -50);
    await t.js('settle()');
    await t.frames();
    await t.mouse('r0', 50);
    await t.js('settle()');
  },
);
await run('key during a mouse drag', '', async (t) => {
  await t.mouse('r0', 50, false);
  await t.page.keyboard.press('ArrowDown');
  await t.page.mouse.up();
  await t.frames();
});
await run('mixed: K M K K M M K', '', async (t) => {
  await t.key('r0', 'ArrowDown');
  await t.mouse('r3', -50);
  await t.key('r1', 'ArrowUp');
  await t.key('r1', 'ArrowDown');
  await t.mouse('r2', 50);
  await t.mouse('r2', -50);
  await t.key('r0', 'ArrowDown');
});
await run(
  'mixed with cancels: M Escape, K, M out and back, K',
  '',
  async (t) => {
    await t.mouse('r0', 50, false);
    await t.page.keyboard.press('Escape');
    await t.page.mouse.up();
    await t.frames();
    await t.key('r0', 'ArrowDown');
    await t.mouse('r3', 50);
    await t.key('r2', 'ArrowUp');
  },
);
await run(
  'onStart takes the item alone',
  'make({ onStart: (item) => { log.push("start:" + item.id); } })',
  async (t) => {
    await t.key('r0', 'ArrowDown');
    await t.mouse('r3', -50);
  },
);
await run('no onStart', 'make({ onStart: undefined })', async (t) => {
  await t.key('r0', 'ArrowDown');
  await t.mouse('r3', -50);
});
await run(
  'onStart receiver',
  'make({ onStart() { log.push("this:" + (this && typeof this === "object" ? Object.keys(this).sort().join() : typeof this)); } })',
  (t) => t.key('r0', 'ArrowDown'),
);
await run(
  'freeDrag onStart args',
  'D.freeDrag(l, { subject: undefined, onStart(...a) { log.push("free:" + a.length + ":" + a.map((x) => typeof x)); }, onDrop: () => D.FreeDragResolution.accept?.() })',
  (t) => t.mouse('r0', 50),
).catch((e) => console.log('freeDrag: ' + e.message.slice(0, 100)));
await browser.close();
