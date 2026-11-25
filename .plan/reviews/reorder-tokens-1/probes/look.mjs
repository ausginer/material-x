// Reads what a lifted item and its drop zone paint on the built package, with
// real input, in the three engines: each item kind with and without a handle,
// each frame of a pointer drag and its flight, key moves, a page's rules,
// forced colors, a cancel, a re-grab, a disconnection, and a plain list.
//
// Run from packages/material-x, with core, drag and material-x built:
//   node ../../.plan/reviews/reorder-tokens-1/probes/look.mjs [engine ...]
import { createRequire } from 'node:module';
import store from '@ydinjs/tproc/store/index.js';
import { toCSSValue } from '@ydinjs/tproc/processToken.js';

const require = createRequire(`${process.cwd()}/package.json`);
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const playwright = require('playwright');
const resolveAny = (name) => {
  try {
    return require.resolve(name);
  } catch {
    return rootRequire.resolve(name);
  }
};
const { rolldown } = await import(resolveAny('rolldown'));

// The tokens' values from the store, not from the package's sheets.
for (const name of [
  'container.color',
  'drop-zone.color',
  'shape',
  'label-text.color',
  'overline.color',
  'supporting-text.color',
  'trailing-supporting-text.color',
  'leading-icon.color',
  'trailing-icon.color',
  'state-layer.color',
  'state-layer.opacity',
  'shadow-color',
]) {
  const token = store.getToken(`md.comp.list.reorder.list-item.${name}`);
  console.log(
    `token ${name}: ${JSON.stringify(token && toCSSValue(store.select(token).entry?.resolvedValue ?? store.select(token).value))}, deprecated ${token && store.isTokenDeprecated(token)}`,
  );
}

const source =
  ['sortable-list', 'list', 'list-item', 'list-button-item', 'list-link-item']
    .map((e) => `import ${JSON.stringify(`${process.cwd()}/list/${e}.js`)};`)
    .join('') +
  `import { sortable } from ${JSON.stringify(require.resolve('@ydinjs/drag/sortable.js'))};` +
  `import { y } from ${JSON.stringify(require.resolve('@ydinjs/drag/sortable/y.js'))};` +
  'window.sortable = sortable; window.y = y;';
const build = await rolldown({
  input: 'entry',
  platform: 'browser',
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

const item = (id, tag, { handle = false, attrs = '', plain = false } = {}) =>
  `<${tag} id=${id} ${attrs}>${plain ? '' : `<i slot=lead data-icon ${handle ? 'data-handle' : ''}>=</i><span slot=overline>over</span>`}${id}${plain ? '' : '<span slot=support>sup</span><i slot=trail data-icon>t</i><span slot=trail data-text>x</span>'}</${tag}>`;
const KINDS = [
  ['static', 'mx-list-item', ''],
  ['button', 'mx-list-button-item', ''],
  ['selected', 'mx-list-button-item', 'selected'],
  ['link', 'mx-list-link-item', 'href="#x"'],
  ['selectedlink', 'mx-list-link-item', 'href="#x" selected'],
  ['disabled', 'mx-list-button-item', 'disabled'],
  ['selecteddisabled', 'mx-list-button-item', 'selected disabled'],
];

// A page that stops native dragging lifts a link in each engine.
const html = (inner, rule = '', { tag = 'mx-sortable-list' } = {}) =>
  `<!doctype html><style>body{margin:40px;font:16px sans-serif}${rule}</style><${tag} id=l style="inline-size:300px">${inner}<mx-list-item id=z>Last</mx-list-item></${tag}><script>${code}</script>
<script>
document.addEventListener('dragstart', (e) => { if (window.noNative) e.preventDefault(); }, true);
window.look = (item) => {
  const box = item.shadowRoot.querySelector('.host') ?? item;
  const color = (e) => e ? getComputedStyle(e).color : '-';
  const ripple = item.shadowRoot.querySelector('.ripple');
  const wave = ripple && getComputedStyle(ripple, '::after');
  const z = document.querySelector('[data-drag-placeholder]');
  const zs = z && getComputedStyle(z);
  return {
    state: (item.matches(':state(drag)') ? 'drag' : '-') + (item.matches(':popover-open') ? ' open' : ''),
    host: getComputedStyle(item).backgroundColor,
    hostColor: color(item),
    box: getComputedStyle(box).backgroundColor,
    boxColor: color(box),
    radius: getComputedStyle(box).borderTopLeftRadius,
    label: color(item.shadowRoot.querySelector('.label')),
    over: color(item.querySelector('[slot=overline]')),
    sup: color(item.querySelector('[slot=support]')),
    lead: color(item.querySelector('[slot=lead]')),
    trail: color(item.querySelector('[slot=trail][data-icon]')),
    text: color(item.querySelector('[data-text]')),
    wave: wave ? wave.backgroundColor + '/' + wave.opacity : '-',
    zone: zs ? (zs.visibility + ' ' + zs.backgroundColor + '/' + zs.opacity + ' ' + zs.borderTopLeftRadius) : '-',
  };
};
</script>`;
const show = (o) =>
  Object.entries(o)
    .map(([k, v]) => `${k} ${v}`)
    .join(', ');
const diff = (a, b) =>
  Object.entries(b)
    .filter(([k, v]) => a[k] !== v)
    .map(([k, v]) => `${k} ${a[k]} -> ${v}`)
    .join('; ') || 'none';

for (const E of process.argv.length > 2
  ? process.argv.slice(2)
  : ['chromium', 'firefox', 'webkit']) {
  const browser = await playwright[E].launch();
  console.log(`\n# ${E} ${browser.version()}`);
  const open = async (content, context = {}) => {
    const page = await (await browser.newContext(context)).newPage();
    page.on('pageerror', (e) => console.log(`  pageerror ${e.message}`));
    await page.setContent(content);
    await page.waitForTimeout(100);
    return page;
  };
  const read = (page, id) =>
    page.evaluate((i) => window.look(document.getElementById(i)), id);
  const at = async (page, selector) => {
    const b = await page.locator(selector).boundingBox();
    return [b.x + b.width / 2, b.y + b.height / 2];
  };
  const press = async (page, id, handle) => {
    const [x, y] = await at(page, handle ? `#${id} [data-handle]` : `#${id}`);
    await page.mouse.move(x, y);
    await page.mouse.down();
    return [x, y];
  };
  const lift = async (page, id, handle) => {
    const [x, y] = await press(page, id, handle);
    await page.mouse.move(x, y + 12, { steps: 4 });
    await page.waitForTimeout(30);
    return [x, y];
  };
  const start = (page, id) =>
    page.evaluate((i) => {
      window.frames = [];
      window.go = true;
      const el = document.getElementById(i);
      const f = () => {
        window.frames.push(JSON.stringify(window.look(el)));
        if (window.go) requestAnimationFrame(f);
      };
      f();
    }, id);
  const stop = async (page) => {
    const raw = await page.evaluate(() => {
      window.go = false;
      return window.frames;
    });
    const runs = [];
    for (const r of raw) {
      const o = JSON.parse(r);
      delete o.radius;
      delete o.wave;
      const key = `${o.state} | host ${o.host} box ${o.box} label ${o.label} lead ${o.lead} trail ${o.trail} zone ${o.zone}`;
      if (runs.at(-1)?.[0] === key) runs.at(-1)[1]++;
      else runs.push([key, 1]);
    }
    for (const [k, n] of runs) console.log(`    ${n}x ${k}`);
  };

  console.log('## a pointer drag of each kind, settled 600 ms');
  for (const native of [true, false])
    for (const handle of [false, true])
      for (const [id, tag, attrs] of KINDS) {
        if (!native && tag !== 'mx-list-link-item') continue;
        const page = await open(html(item(id, tag, { handle, attrs })));
        await page.evaluate((v) => (window.noNative = !v), native);
        const rest = await read(page, id);
        await lift(page, id, handle);
        await page.waitForTimeout(600);
        const l = await read(page, id);
        console.log(
          `${id}${handle ? ' by handle' : ''}${native ? '' : ', native drag prevented'}: ${show(l)}`,
        );
        if (attrs.includes('disabled'))
          console.log(`    against rest: ${diff(rest, l)}`);
        await page.mouse.up();
        await page.waitForTimeout(900);
        await page.mouse.move(1, 1);
        await page.evaluate(() => document.activeElement?.blur());
        await page.waitForTimeout(500);
        console.log(
          `    after the drop against rest: ${diff(rest, await read(page, id))}`,
        );
        await page.context().close();
      }

  console.log('## each frame of a pointer drag, its drop and its flight');
  for (const [id, tag, attrs] of KINDS.slice(0, 3)) {
    const page = await open(html(item(id, tag, { attrs })));
    await page.mouse.move(...(await at(page, `#${id}`)));
    await page.waitForTimeout(400);
    await start(page, id);
    const [x, y] = await lift(page, id, false);
    await page.mouse.move(x, y + 40, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(1000);
    console.log(`  ${id}`);
    await stop(page);
    await page.context().close();
  }

  console.log(
    '## a key move: by a handle, and on a link; commit at once, after 100 ms, refused',
  );
  for (const [id, tag, attrs, handle] of [
    ['static', 'mx-list-item', '', true],
    ['static', 'mx-list-item', '', false],
    ['selected', 'mx-list-button-item', 'selected', true],
    ['link', 'mx-list-link-item', 'href="#x"', false],
    ['selectedlink', 'mx-list-link-item', 'href="#x" selected', false],
  ])
    for (const mode of ['now', 'later', 'refused', 'never']) {
      const page = await open(html(item(id, tag, { handle, attrs })));
      await page.evaluate((m) => {
        const l = document.getElementById('l');
        l.addEventListener('reorder', (e) => {
          const go = () => l.insertBefore(e.item, e.next);
          if (m === 'now') go();
          else if (m === 'later') setTimeout(go, 100);
          else if (m === 'refused') e.preventDefault();
        });
      }, mode);
      await page.evaluate(
        ([i, h]) =>
          (h
            ? document.querySelector(`#${i} [data-handle]`)
            : document.getElementById(i)
          ).focus(),
        [id, handle],
      );
      await page.waitForTimeout(500);
      const rest = await read(page, id);
      const seen = [];
      await page.exposeFunction('seen', (v) => seen.push(v));
      await page.evaluate((i) => {
        const el = document.getElementById(i);
        document.getElementById('l').addEventListener(
          'reorder',
          () => {
            window.seen(window.look(el));
            let n = 0;
            const f = () => {
              if (!el.matches(':state(drag)') || n++ > 60) return;
              window.seen(window.look(el));
              requestAnimationFrame(f);
            };
            requestAnimationFrame(f);
          },
          true,
        );
      }, id);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(700);
      const diffs = new Set(
        seen.map((s) => diff(rest, { ...s, state: rest.state, zone: '-' })),
      );
      const zones = new Set(seen.map((s) => `${s.state} zone ${s.zone}`));
      console.log(
        `${id}${handle ? ' by handle' : ''}, ${mode}: ${seen.length} reads; against rest: ${[...diffs].join(' // ') || '-'}; ${[...zones].join(' // ')}`,
      );
      await page.context().close();
    }

  console.log("## a page's rules, in a pointer drag");
  for (const [name, rule] of [
    [
      'page rule',
      '#static,#button{background-color:rgb(0,0,255);color:rgb(255,0,0)}',
    ],
    [
      'page rule, important',
      '#static,#button{background-color:rgb(0,0,255)!important;color:rgb(255,0,0)!important}',
    ],
    ['popover rule', '[popover]{background:red;color:blue}'],
    [
      'popover rule, important',
      '[popover]{background:red!important;color:blue!important}',
    ],
    [
      'container color on the list',
      'mx-sortable-list{--md-list-item-container-color:rgb(9,9,9)}',
    ],
    [
      'a theme on the list',
      'mx-sortable-list{--md-sys-color-tertiary-container:rgb(1,1,1);--md-sys-color-on-tertiary-container:rgb(2,2,2);--md-sys-color-surface-container-low:rgb(3,3,3)}',
    ],
    [
      'a theme on the item',
      'mx-sortable-list>*{--md-sys-color-tertiary-container:rgb(1,1,1);--md-sys-color-on-tertiary-container:rgb(2,2,2)}',
    ],
    ['a list shape', 'mx-sortable-list{--md-list-container-shape:33px}'],
    [
      'a gradient as the container color',
      'mx-sortable-list{--md-list-item-container-color:linear-gradient(red,blue)}',
    ],
  ])
    for (const [id, tag] of KINDS.slice(0, 2)) {
      const page = await open(html(item(id, tag), rule));
      const rest = await read(page, id);
      await lift(page, id, false);
      const l = await read(page, id);
      console.log(
        `${name}, ${id}: rest host ${rest.host}/${rest.hostColor} box ${rest.box} label ${rest.label}; lifted host ${l.host}/${l.hostColor} box ${l.box} label ${l.label} zone ${l.zone}`,
      );
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
      const after = await read(page, id);
      console.log(
        `    after Escape: host ${after.host}/${after.hostColor} box ${after.box} label ${after.label} state ${after.state} style ${JSON.stringify(await page.evaluate((i) => document.getElementById(i).getAttribute('style'), id))}`,
      );
      await page.mouse.up();
      await page.context().close();
    }

  console.log('## forced colors');
  for (const [id, tag, attrs] of KINDS.slice(0, 3)) {
    const page = await open(html(item(id, tag, { attrs })), {
      forcedColors: 'active',
    });
    const rest = await read(page, id);
    await lift(page, id, false);
    const l = await read(page, id);
    console.log(
      `${id}: forced ${await page.evaluate(() => matchMedia('(forced-colors: active)').matches)}; against rest: ${diff(rest, l)}`,
    );
    console.log(`    lifted: ${show(l)}`);
    await page.mouse.up();
    await page.context().close();
  }

  console.log('## re-grab in flight, then drop');
  {
    const page = await open(html(item('static', 'mx-list-item')));
    await page.evaluate(() =>
      document
        .getElementById('l')
        .addEventListener('reorder', (e) => e.preventDefault()),
    );
    const [x, y] = await lift(page, 'static', false);
    await page.mouse.move(x, y + 60, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(60);
    const flight = await read(page, 'static');
    await page.mouse.move(...(await at(page, '#static')));
    await page.mouse.down();
    const [x2, y2] = await at(page, '#static');
    await page.mouse.move(x2, y2 + 15, { steps: 4 });
    await page.waitForTimeout(30);
    const again = await read(page, 'static');
    await page.mouse.up();
    await page.waitForTimeout(900);
    const end = await read(page, 'static');
    console.log(
      `flight ${flight.state} ${flight.host}/${flight.label}; again ${again.state} ${again.host}/${again.label}; end ${end.state} ${end.host}/${end.label}`,
    );
    await page.context().close();
  }

  console.log('## key move pending, then a pointer drag of another item');
  {
    const page = await open(
      html(item('static', 'mx-list-item') + item('other', 'mx-list-item')),
    );
    await page.evaluate(() => document.getElementById('static').focus());
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(50);
    const pending = await read(page, 'static');
    await lift(page, 'other', false);
    const [a, b] = [await read(page, 'static'), await read(page, 'other')];
    console.log(
      `pending ${pending.state} ${pending.host}; then static ${a.state} ${a.host}/${a.label}; other ${b.state} ${b.host}/${b.label}; zone ${b.zone}`,
    );
    await page.mouse.up();
    await page.waitForTimeout(700);
    await page.context().close();
  }

  console.log('## a disconnection in a pointer drag');
  {
    const page = await open(html(item('static', 'mx-list-item')));
    const rest = await read(page, 'static');
    await lift(page, 'static', false);
    await page.evaluate(() => {
      const l = document.getElementById('l');
      const p = l.parentNode;
      l.remove();
      p.append(l);
    });
    await page.mouse.up();
    await page.waitForTimeout(700);
    console.log(`against rest: ${diff(rest, await read(page, 'static'))}`);
    await page.context().close();
  }
  console.log('## the lifted item moved to a plain list in a pointer drag');
  {
    const page = await open(html(item('static', 'mx-list-item')));
    const rest = await read(page, 'static');
    await lift(page, 'static', false);
    await page.evaluate(() => {
      const p = document.createElement('mx-list');
      p.id = 'p';
      document.body.append(p);
      p.append(document.getElementById('static'));
    });
    await page.waitForTimeout(100);
    console.log(`against rest: ${diff(rest, await read(page, 'static'))}`);
    await page.mouse.up();
    await page.waitForTimeout(900);
    console.log(
      `after the release, against rest: ${diff(rest, await read(page, 'static'))}`,
    );
    await page.context().close();
  }
  console.log("## a consumer's own drag sortable on a plain mx-list");
  {
    const page = await open(
      html(item('static', 'mx-list-item'), '', { tag: 'mx-list' }),
    );
    await page.evaluate(() => {
      const l = document.getElementById('l');
      window.sortable(l, {
        items: () =>
          [...l.children].filter(
            (c) => !c.hasAttribute('data-drag-placeholder'),
          ),
        axis: window.y(),
        onReorder: () => {},
      });
    });
    await lift(page, 'static', false);
    const l = await read(page, 'static');
    console.log(`state ${l.state} host ${l.host} zone ${l.zone}`);
    await page.mouse.up();
    await page.context().close();
  }
  await browser.close();
}
