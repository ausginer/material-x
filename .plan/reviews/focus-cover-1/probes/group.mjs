// node group.mjs <engine> <bundle>   (from packages/material-x)
import { open, focus, pixels, ring, whole, text } from './lib.mjs';
const [engine, bundle] = process.argv.slice(2);
const { browser, page, load, key, errors } = await open(engine, bundle);
console.log(`# ${engine} ${browser.version()}`);
const TAGS = [
  'mx-button',
  'mx-link-button',
  'mx-icon-button',
  'mx-switch-button',
  'mx-switch-icon-button',
];
let n = 0,
  good = 0;
const bad = [];
const tally = new Map();
const raf = () =>
  page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
const read = async (bucket, label, path, act) => {
  await key();
  const g0 = await focus(page, path);
  if (act) await act(g0);
  await raf();
  const g = await focus(page, path);
  await pixels(page);
  n++;
  const t = tally.get(bucket) ?? [0, 0];
  tally.set(bucket, t);
  t[1]++;
  if (!g.visible || g.style === 'none') {
    bad.push(`${label}: NOT FOCUS-VISIBLE ${JSON.stringify(g)}`);
    return g;
  }
  const r = await ring(page, g);
  if (whole(r)) {
    good++;
    t[0]++;
  } else bad.push(`${label}: ${text(r)} ${JSON.stringify(r.seen)} z ${g.z}`);
  return g;
};
const COLORS = ['', 'outlined', 'elevated', 'text', 'tonal'],
  SIZES = ['', 'xsmall', 'medium', 'large', 'xlarge'];
const b = (t, i, a = '') =>
  `<${t} value=${i} ${t === 'mx-link-button' ? 'href=#x' : ''} ${a}>${t.includes('icon') ? '<mx-icon>star</mx-icon>' : 'Ab'}</${t}>`;
const grp = (t, attrs = '', kids = [0, 1, 2].map((i) => b(t, i)).join('')) =>
  `<div style="padding:10px"><mx-connected-button-group ${attrs}>${kids}</mx-connected-button-group></div>`;
for (const t of TAGS)
  for (const c of COLORS)
    for (const s of SIZES) {
      await load(grp(t, `${c && `color=${c}`} ${s && `size=${s}`}`));
      for (const i of [0, 1, 2])
        await read(
          'size and color, ltr',
          `${t} color ${c} size ${s} member ${i}`,
          [`${t}@${i}`],
        );
    }
for (const t of TAGS)
  for (const [k, st] of [
    ['rtl', 'dir=rtl'],
    ['vertical-rl', 'style="writing-mode:vertical-rl"'],
    ['column', 'style="flex-direction:column"'],
  ]) {
    await load(grp(t, st));
    for (const i of [0, 1, 2])
      await read(k, `${t} ${k} member ${i}`, [`${t}@${i}`]);
  }
for (const t of TAGS.slice(3))
  for (const v of [0, 1, 2]) {
    await load(grp(t, `value=${v}`));
    for (const i of [0, 1, 2]) {
      await read('selected', `${t} value ${v} member ${i}`, [`${t}@${i}`]);
      await read(
        'neighbor hovered',
        `${t} value ${v} member ${i}, next hovered`,
        [`${t}@${i}`],
        async (g) => {
          await page.mouse.move(g.x + g.w + 12, g.y + g.h / 2);
          await page.waitForTimeout(250);
        },
      );
      await page.mouse.move(690, 690);
    }
  }
for (const t of TAGS) {
  await load(grp(t, '', b(t, 0) + b(t, 1, 'disabled') + b(t, 2)));
  for (const i of [0, 2])
    await read('beside disabled', `${t} member ${i} beside disabled`, [
      `${t}@${i}`,
    ]);
  await load(grp(t));
  await read(
    'itself pressed',
    `${t} pressed by Space`,
    [`${t}@0`],
    async () => {
      await page.keyboard.down(' ');
    },
  );
  await page.keyboard.up(' ');
}
for (const c of COLORS)
  for (const s of SIZES)
    for (const o of ['', 'open'])
      for (const d of ['ltr', 'rtl']) {
        await load(
          `<div style="padding:10px" dir=${d}><mx-split-button ${o} ${c && `color=${c}`} ${s && `size=${s}`}>Save</mx-split-button></div>`,
        );
        await read(
          'split button',
          `split ${d} color ${c} size ${s} ${o} leading`,
          ['mx-split-button', 'mx-button'],
        );
        await read(
          'split button',
          `split ${d} color ${c} size ${s} ${o} trailing`,
          ['mx-split-button', 'mx-icon-button'],
        );
      }
await load(
  `<mx-button-group>${b('mx-button', 0)}${b('mx-button', 1)}</mx-button-group>`,
);
for (const i of [0, 1])
  await read('standard group', `standard member ${i}`, [`mx-button@${i}`]);
await load(`<mx-button-group>${grp('mx-button')}</mx-button-group>`);
for (const i of [0, 1, 2])
  await read('connected in standard', `connected in standard ${i}`, [
    `mx-button@${i}`,
  ]);
await load(
  grp(
    'x',
    '',
    `<mx-split-button id=a>A</mx-split-button><mx-split-button id=b>B</mx-split-button>${b('mx-button', 2)}`,
  ),
);
for (const id of ['#a', '#b']) {
  await read('split in connected', `split in connected ${id} leading`, [
    id,
    'mx-button',
  ]);
  await read('split in connected', `split in connected ${id} trailing`, [
    id,
    'mx-icon-button',
  ]);
}
await load(
  grp(
    'x',
    '',
    `<mx-connected-button-group>${b('mx-button', 0)}${b('mx-button', 1)}</mx-connected-button-group><mx-button>C</mx-button>`,
  ),
);
for (const i of [0, 1])
  await read('connected in connected', `connected in connected ${i}`, [
    `mx-button@${i}`,
  ]);
await load(
  grp(
    'x',
    '',
    [0, 1, 2].map((i) => `<span>${b('mx-button', i)}</span>`).join(''),
  ),
);
for (const i of [0, 1, 2])
  await read('wrapped in a span', `wrapped in a span ${i}`, [`mx-button@${i}`]);
await load(
  grp(
    'x',
    '',
    [0, 1, 2]
      .map((i) => `<span style="position:relative">${b('mx-button', i)}</span>`)
      .join(''),
  ),
);
for (const i of [0, 1, 2])
  await read(
    'wrapped in a positioned span',
    `wrapped in a positioned span ${i}`,
    [`mx-button@${i}`],
  );
console.log(`${good}/${n} whole`);
for (const [k, [a, z]] of tally) console.log(`  ${k}: ${a}/${z}`);
for (const x of bad.slice(0, 40)) console.log(`  BAD ${x}`);
if (bad.length > 40) console.log(`  … and ${bad.length - 40} more`);
await browser.close();
