// What a keyboard move paints, frame by frame, on the built elements: the
// placeholder, the lifted item, the item's flight and its neighbour. And the
// same for a pointer drop, after the release.
//
// Run from packages/material-x, with the packages built:
//   node ../../.plan/sortable-observations-1/probes/keyboard-move.mjs <chromium|firefox|webkit>
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const playwright = require('playwright');
let rolldownPath;
try {
  rolldownPath = require.resolve('rolldown');
} catch {
  rolldownPath = rootRequire.resolve('rolldown');
}
const { rolldown } = await import(rolldownPath);
const reactPath = JSON.stringify(rootRequire.resolve('react'));
const reactDom = JSON.stringify(rootRequire.resolve('react-dom/client'));
const ENGINE = process.argv[2];
const entries = [
  'list/sortable-list',
  'list/list-item',
  'list/list-button-item',
  'icon/icon',
];
const source = `${entries.map((e) => `import ${JSON.stringify(`${process.cwd()}/${e}.js`)};`).join('')}
import * as React from ${reactPath}; import { createRoot } from ${reactDom};
window.React = React; window.createRoot = createRoot;`;
const build = await rolldown({
  input: 'entry',
  platform: 'browser',
  transform: { define: { 'process.env.NODE_ENV': '"production"' } },
  plugins: [
    {
      name: 'e',
      resolveId: (id) => (id === 'entry' ? id : null),
      load: (id) => (id === 'entry' ? source : null),
    },
  ],
});
const { output } = await build.generate({ format: 'iife', name: 'mx' });
const code = output
  .map((c) => c.code ?? '')
  .join('\n')
  .replaceAll('</script', '<\\/script');
const browser = await playwright[ENGINE].launch();
console.log(`# ${ENGINE} ${browser.version()}`);
// A candidate: the footprint fades in, so a footprint of a frame isn't seen.
const SHEET = process.argv[3] ?? '';
if (SHEET) console.log(`with ${SHEET}`);
const TAB = ENGINE === 'webkit' ? 'Alt+Tab' : 'Tab';

const COMMITS = {
  'in the handler (insertBefore)': `list.addEventListener('reorder', (e) => list.insertBefore(e.item, e.next));`,
  'in the next task (setTimeout 0)': `list.addEventListener('reorder', (e) => setTimeout(() => list.insertBefore(e.item, e.next)));`,
  'after 100 ms': `list.addEventListener('reorder', (e) => setTimeout(() => list.insertBefore(e.item, e.next), 100));`,
  never: '',
  rejected: `list.addEventListener('reorder', (e) => e.preventDefault());`,
};
const VANILLA = (commit) =>
  `<mx-sortable-list id=l style="inline-size:300px">${['Inbox', 'Starred', 'Sent', 'Drafts'].map((t) => `<mx-list-button-item>${t}</mx-list-button-item>`).join('')}</mx-sortable-list><script>${code}</script><script>const list = document.getElementById('l'); ${commit}</script>`;
// As the story does it: React state, set in the event's handler.
const REACT = `<div id=r style="inline-size:300px"></div><script>${code}</script><script>
const h = React.createElement;
function App() {
  const [items, setItems] = React.useState(['Inbox', 'Starred', 'Sent', 'Drafts']);
  return h('mx-sortable-list', { id: 'l', onreorder: ({ from, to }) => setItems((c) => { const n = c.slice(); const [m] = n.splice(from, 1); n.splice(to, 0, m); return n; }) }, items.map((t) => h('mx-list-button-item', { key: t }, t)));
}
createRoot(document.getElementById('r')).render(h(App));
</script>`;

const INSTALL = () => {
  const list = document.getElementById('l');
  const t0 = { t: null };
  window.log = { frames: [], marks: [] };
  const first = [...list.children];
  const item = first[1],
    next = first[2];
  new MutationObserver((rs) => {
    for (const r of rs)
      for (const [k, nodes] of [
        ['placed', r.addedNodes],
        ['removed', r.removedNodes],
      ])
        for (const n of nodes)
          if (n.dataset && 'dragPlaceholder' in n.dataset)
            window.log.marks.push(
              `${k} ${t0.t === null ? '?' : (performance.now() - t0.t).toFixed(0)}`,
            );
  }).observe(list, { childList: true });
  const sample = () => {
    const p = list.querySelector('[data-drag-placeholder]');
    const s = {
      t: t0.t === null ? null : performance.now() - t0.t,
      p: p ? `${p.getBoundingClientRect().top.toFixed(0)}` : null,
      o: p ? Number(getComputedStyle(p).opacity) : null,
      lifted: item.matches(':popover-open'),
      y: item.getBoundingClientRect().top,
      n: next.getBoundingClientRect().top,
      flying: item
        .getAnimations()
        .some((a) => a.effect.getKeyframes().some((k) => k.translate)),
      outline: getComputedStyle(item.shadowRoot.querySelector('.host'))
        .outlineStyle,
    };
    if (t0.t !== null) window.log.frames.push(s);
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
  window.arm = () => {
    t0.t = performance.now();
  };
  window.addEventListener(
    'keydown',
    () => {
      if (t0.t === null) t0.t = performance.now();
    },
    true,
  );
  window.addEventListener(
    'pointerup',
    () => {
      if (t0.t === null) t0.t = performance.now();
    },
    true,
  );
  window.item = item;
};
const summary = (log) => {
  const f = log.frames.filter((x) => x.t !== null);
  const withP = f.filter((x) => x.p !== null),
    fly = f.filter((x) => x.flying);
  const ys = fly.map((x) => Math.round(x.y));
  return `frames with a placeholder ${withP.length}${withP.length ? ` (${withP[0].t.toFixed(0)} to ${withP.at(-1).t.toFixed(0)} ms, at ${[...new Set(withP.map((x) => x.p))].join('/')}, opacity up to ${Math.max(...withP.map((x) => x.o)).toFixed(3)}, lifted item at ${[...new Set(withP.map((x) => Math.round(x.y)))].join('/')}, next at ${[...new Set(withP.map((x) => Math.round(x.n)))].join('/')})` : ''}; marks ${log.marks.join(', ')}; flight ${fly.length} frames${fly.length ? `, ${fly[0].t.toFixed(0)} to ${fly.at(-1).t.toFixed(0)} ms, item ${ys[0]} to ${ys.at(-1)}, next at ${[...new Set(fly.map((x) => Math.round(x.n)))].join('/')}` : ''}; at rest item ${Math.round(f.at(-1).y)} next ${Math.round(f.at(-1).n)}`;
};
for (const reduce of [false, true]) {
  const ctx = await browser.newContext({
    viewport: { width: 500, height: 420 },
    reducedMotion: reduce ? 'reduce' : 'no-preference',
  });
  console.log(
    `## ${reduce ? 'prefers-reduced-motion: reduce' : 'no preference'}`,
  );
  for (const [name, html] of [
    ...Object.entries(COMMITS).map(([k, c]) => [k, VANILLA(c)]),
    ['React state, as the story does it', REACT],
  ]) {
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('  ERROR', e.message));
    await page.setContent(
      `<!doctype html><style>body{margin:40px;font:16px sans-serif}</style>${html}`,
    );
    await page.waitForTimeout(200);
    await page.evaluate(INSTALL);
    if (SHEET)
      await page.evaluate((c) => {
        const x = new CSSStyleSheet();
        x.replaceSync(c);
        document.getElementById('l').shadowRoot.adoptedStyleSheets.push(x);
      }, SHEET);
    for (let i = 0; i < 2; i++) await page.keyboard.press(TAB);
    await page.waitForTimeout(100);
    const focused = await page.evaluate(
      () => document.activeElement.textContent,
    );
    await page.evaluate(() => {
      window.log.frames.length = 0;
    });
    // Tab's keydown armed the clock, so arm it again at the arrow.
    await page.evaluate(() =>
      window.addEventListener(
        'keydown',
        (e) => {
          if (e.key === 'ArrowDown') {
            window.arm();
            window.log.frames.length = 0;
            window.log.marks.length = 0;
          }
        },
        { capture: true },
      ),
    );
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(1500);
    console.log(
      `key, ${name} (${focused}): ${summary(await page.evaluate(() => window.log))}`,
    );
    await page.close();
  }
  if (!reduce) {
    const page = await ctx.newPage();
    await page.setContent(
      `<!doctype html><style>body{margin:40px;font:16px sans-serif}</style>${VANILLA(COMMITS['in the handler (insertBefore)'])}`,
    );
    await page.waitForTimeout(200);
    await page.evaluate(INSTALL);
    const box = await page.evaluate(() => {
      const r = window.item.getBoundingClientRect();
      return [r.x + 60, r.y + r.height / 2];
    });
    await page.mouse.move(...box);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) {
      await page.mouse.move(box[0], box[1] + i * 9);
      await page.waitForTimeout(20);
    }
    await page.evaluate(() => {
      window.log.frames.length = 0;
      window.log.marks.length = 0;
    });
    await page.mouse.up();
    await page.waitForTimeout(1500);
    console.log(
      `pointer drop, in the handler, after the release: ${summary(await page.evaluate(() => window.log))}`,
    );
    await page.close();
  }
  await ctx.close();
}
await browser.close();
