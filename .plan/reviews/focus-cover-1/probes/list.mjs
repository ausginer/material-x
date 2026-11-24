// node list.mjs <engine> <bundle> [forced]  (from packages/material-x)
import { open, focus, pixels, ring, whole, text } from './lib.mjs';
const [engine, bundle, forced] = process.argv.slice(2);
const schemes = forced
  ? [
      { forcedColors: 'active' },
      { forcedColors: 'active', colorScheme: 'dark' },
    ]
  : [{}];
for (const opt of schemes) {
  const { browser, page, load, key, errors } = await open(engine, bundle, opt);
  console.log(`# ${engine} ${browser.version()} ${JSON.stringify(opt)}`);
  const T = ['mx-list-item', 'mx-list-button-item', 'mx-list-link-item'];
  const it = (t, a = '', c = t) =>
    `<${t} ${a} ${t === T[0] ? 'tabindex=0' : t === T[2] ? 'href=#x' : ''}>${c}</${t}>`;
  const IMG =
    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='orange'/></svg>";
  const pairs = new Set();
  let n = 0,
    good = 0;
  const bad = new Map();
  const check = async (label, html, path, { css = '', act, tol } = {}) => {
    await load(html, css);
    await key();
    const g = await focus(page, path);
    if (act) {
      await act(g);
    }
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );
    await pixels(page);
    n++;
    if (!g.visible || g.style === 'none') {
      bad.set(label, `NOT FOCUS-VISIBLE ${JSON.stringify(g)}`);
      return g;
    }
    if (forced) {
      const k = await page.evaluate(
        ([x, y, d]) => {
          const m = window.__img;
          const at = (yy) => [
            ...m.data
              .slice((Math.floor(yy * d) * m.width + Math.floor(x * d)) * 4)
              .slice(0, 3),
          ];
          return [at(y + 1.5), at(y - 1), at(y + 5)];
        },
        [g.x + g.w / 2, g.y, 2],
      );
      g.color = `rgb(${k[0].join(' ')})`;
      pairs.add(
        `${label.match(/mx-list-\w*-?item/)?.[0]} outline ${k[0]} outside ${k[1]} inside ${k[2]} | ${label.includes('[selected] ') && label.indexOf('[selected]') < label.indexOf(', beside') ? 'selected' : ''}`,
      );
    }
    const r = await ring(page, g, tol);
    if (whole(r)) good++;
    else
      bad.set(
        label,
        `${text(r)} ${JSON.stringify(r.seen)} offset ${g.offset} color ${g.color}`,
      );
    return g;
  };
  const first = await check(
    'first read',
    `<mx-list style="width:300px">${it(T[1])}${it(T[1])}</mx-list>`,
    ['mx-list-button-item'],
  );
  console.log(
    'indicator',
    first.style,
    first.width,
    first.offset,
    first.color,
    'z',
    first.z,
  );
  const L = ['mx-list', 'mx-sortable-list'];
  const dirs = forced
    ? ['dir=ltr']
    : [
        'dir=ltr',
        'dir=rtl',
        'style="writing-mode:vertical-rl"',
        'style="writing-mode:vertical-lr"',
        'style="writing-mode:sideways-lr"',
      ];
  for (const l of L)
    for (const d of dirs)
      for (const t of T)
        for (const nb of T) {
          const states = nb === T[0] ? [''] : ['', 'selected', 'disabled'];
          for (const self of t === T[0] ? [''] : ['', 'selected'])
            for (const s of states)
              for (const pos of ['first', 'middle', 'last']) {
                const items = [it(nb, s), it(nb, s)];
                items.splice(
                  { first: 0, middle: 1, last: 2 }[pos],
                  0,
                  it(t, `id=f ${self}`),
                );
                const size = d.includes('writing')
                  ? 'block-size:500px;inline-size:260px'
                  : 'width:300px';
                const attr = d.includes('style')
                  ? d.replace('"w', `"${size};w`)
                  : `${d} style="${size}"`;
                await check(
                  `${l} ${d} ${t} [${self}] ${pos}, beside ${nb} [${s}]`,
                  `<${l} ${attr}>${items.join('')}</${l}>`,
                  ['#f'],
                );
              }
        }
  for (const t of T)
    for (const l of L) {
      const wrap = (c, a = '') =>
        `<${l} style="width:300px">${it(T[1])}${it(t, `id=f ${a}`, c)}${it(T[2])}</${l}>`;
      const c = {
        'large image lead': `<img slot=lead data-large src="${IMG}">Label<span slot=support>s</span>`,
        'large image lead, opacity': `<img slot=lead data-large style="opacity:.99" src="${IMG}">Label<span slot=support>s</span>`,
        'large image lead, positioned': `<img slot=lead data-large style="position:relative" src="${IMG}">Label`,
        'large image lead, in a positioned span': `<span slot=lead data-large style="position:relative"><img style="width:56px;height:56px;display:block" src="${IMG}"></span>Label`,
        'large video lead': `<div slot=lead data-video data-large style="background:orange"></div>Label<span slot=overline>o</span><span slot=support>s</span>`,
        'avatar, icons':
          '<span slot=lead data-avatar>A</span>Label<mx-icon slot=trail>star</mx-icon>',
        'three lines':
          'Label<span slot=overline>o</span><span slot=support>one two three four five six seven eight nine ten eleven twelve</span><span slot=trail>99</span>',
        'long label': 'word '.repeat(60),
        handle: '<mx-icon slot=lead data-handle>drag</mx-icon>Label',
        'slotted checkbox and button':
          'Label<mx-checkbox slot=trail></mx-checkbox>',
      };
      for (const [k, h] of Object.entries(c))
        await check(`${l} ${t} content: ${k}`, wrap(h), ['#f']);
      await check(`${l} ${t} hovered neighbor`, wrap('x'), ['#f'], {
        act: async (g) => {
          await page.mouse.move(g.x + 100, g.y + g.h + 20);
          await page.waitForTimeout(250);
        },
      });
      await check(`${l} ${t} hovered itself`, wrap('x'), ['#f'], {
        act: async (g) => {
          await page.mouse.move(g.x + 100, g.y + g.h / 2);
          await page.waitForTimeout(250);
        },
      });
      await check(`${l} ${t} square container`, wrap('x'), ['#f'], {
        css: `${t}{--md-list-item-container-shape:0}`,
      });
      await check(`${l} ${t} container color, page gap 0`, wrap('x'), ['#f'], {
        css: `${l}{gap:0!important}`,
      });
    }
  console.log(`${good}/${n} whole`);
  for (const p of pairs) console.log('  ' + p);
  for (const [k, v] of bad) console.log(`  BAD ${k}: ${v}`);
  console.log('page errors', errors.length, errors[0] ?? '');
  await browser.close();
}
