// Run from packages/material-x, with the package built:
//   node ../../.plan/reviews/focus-cover-1/probes/bundle.mjs <bundle>
//   node ../../.plan/focus-cover-1/probes/keyboard-raise.mjs <engine> <bundle>
// RF-126's answer (c): the indicator of each member, the page around the group
// at rest, with a pointer's focus and with the keyboard's, the reach of the
// raise, and what leaves the group isolated.
import {
  open,
  focus,
  pixels,
  ring,
  text,
  whole,
} from '../../reviews/focus-cover-1/probes/lib.mjs';
const [engine, bundle] = process.argv.slice(2);
const { browser, page, load, key } = await open(engine, bundle);
console.log(`# ${engine} ${browser.version()}`);
const TAB = engine === 'webkit' ? 'Alt+Tab' : 'Tab';
/** A function body run in the page, with the page's deep helpers. */
const state = (group = '#g') =>
  page.evaluate((sel) => {
    const path = sel.split(' >> ');
    let root = document;
    let g;
    for (const s of path) {
      g = root.querySelector(s);
      root = g.shadowRoot;
    }
    let a = document.activeElement;
    while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
    return `isolation ${getComputedStyle(g).isolation}, focused ${a?.localName} visible ${a?.matches(':focus-visible')} z ${a ? getComputedStyle(a).zIndex : '-'}`;
  }, group);
const centre = (path) =>
  page.evaluate((p) => {
    let r = document;
    let e;
    for (const s of p) {
      e = r.querySelector(s);
      r = e.shadowRoot;
    }
    const b = (
      e.shadowRoot?.querySelector('.host') ?? e
    ).getBoundingClientRect();
    return [b.x + b.width / 2, b.y + b.height / 2];
  }, path);
const click = async (path) => page.mouse.click(...(await centre(path)));
const rest = () =>
  page.evaluate(() => {
    let a = document.activeElement;
    while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
    a?.blur();
  });
const top = (sel) =>
  page.evaluate((s) => {
    const e = document.querySelector(s);
    const b = e.getBoundingClientRect();
    const t = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    return t === e || e.contains(t) ? 'top' : 'COVERED';
  }, sel);

/** Moves the keyboard's focus to `path` with Tab alone. */
const tabTo = async (path) => {
  await page.evaluate(() => document.querySelector('#before').focus());
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press(TAB);
    const there = await page.evaluate((p) => {
      let r = document;
      let e;
      for (const s of p) {
        e = r.querySelector(s);
        if (r.activeElement !== e) return false;
        r = e.shadowRoot;
      }
      return true;
    }, path);
    if (there) return;
  }
  console.log(`  NOT REACHED ${path}`);
};

console.log('## the indicator');
const KINDS = {
  'mx-button': (n) => `<mx-button id=b${n}>Btn${n}</mx-button>`,
  'mx-icon-button': (n) =>
    `<mx-icon-button id=b${n}><mx-icon>a</mx-icon></mx-icon-button>`,
  'mx-link-button': (n) =>
    `<mx-link-button id=b${n} href=#x>L${n}</mx-link-button>`,
  'mx-switch-button': (n) =>
    `<mx-switch-button id=b${n} value=${n}>S${n}</mx-switch-button>`,
  'mx-switch-icon-button': (n) =>
    `<mx-switch-icon-button id=b${n} value=${n}><mx-icon>a</mx-icon></mx-switch-icon-button>`,
};
for (const dir of ['ltr', 'rtl'])
  for (const [kind, make] of Object.entries(KINDS))
    for (const color of ['tonal', 'elevated'])
      for (const n of [1, 2, 3]) {
        await load(
          `<div dir=${dir}><mx-connected-button-group id=g color=${color} value=2>${[1, 2, 3].map(make).join('')}</mx-connected-button-group></div>`,
        );
        await key();
        const g = await focus(page, [`#b${n}`]);
        await pixels(page);
        const r = await ring(page, g);
        if (!whole(r) || !g.visible)
          console.log(
            `${dir} ${kind} ${color} ${n}: visible ${g.visible} ${text(r)}`,
          );
      }
for (const color of ['tonal', 'elevated'])
  for (const n of ['mx-button', 'mx-icon-button']) {
    await load(`<mx-split-button id=s color=${color}>Save</mx-split-button>`);
    await key();
    const g = await focus(page, ['#s', n]);
    await pixels(page);
    const r = await ring(page, g);
    console.log(`split ${color} ${n}: ${whole(r) ? 'whole' : text(r)}`);
  }
console.log('cases that print no line are whole on their four sides');

console.log('## the page around the group: at rest, a pointer, the keyboard');
const tip = (css) =>
  `<span id=x style="position:absolute;top:100%;left:0;margin-top:8px;width:60px;height:20px;background:pink;${css}">tip</span>`;
const G = (t = '') =>
  `<mx-connected-button-group id=g><mx-button id=b1>One${t}</mx-button><mx-button id=b2>Two</mx-button><mx-button id=b3>Three</mx-button></mx-connected-button-group>`;
const AFTER =
  '<div style="position:relative;height:60px;width:300px;background:#eee">after</div>';
const BTN =
  '<button id=x style="position:absolute;right:10px;top:8px;width:60px;height:24px">C</button>';
const PAGES = {
  'tooltip z 10 in the member, then position:relative': [
    G(tip('z-index:10')) + AFTER,
    ['#b2'],
    ['#b1'],
  ],
  'the same in a split button': [
    `<mx-split-button id=s>Save${tip('z-index:10')}</mx-split-button>${AFTER}`,
    ['#s', 'mx-icon-button'],
    ['#s', 'mx-button'],
  ],
  'a button before, over the empty end': [
    `<div style="position:relative;width:600px">${BTN}${G()}</div>`,
    ['#b1'],
    ['#b1'],
  ],
  'the same before a split button': [
    `<div style="position:relative;width:600px">${BTN}<mx-split-button id=s>Save</mx-split-button></div>`,
    ['#s', 'mx-icon-button'],
    ['#s', 'mx-button'],
  ],
  'a menu after, z auto, over the group': [
    `<div style="position:relative">${G()}<div id=x style="position:absolute;inset:0 auto 0 0;width:80px;background:#fff"></div></div>`,
    null,
    ['#b1'],
  ],
  'a bar before, z-index 1, over the group': [
    `<div style="position:relative"><div id=x style="position:absolute;z-index:1;inset:0 auto 0 0;width:80px;background:#fff"></div>${G()}</div>`,
    null,
    ['#b1'],
  ],
};
for (const [n, [html, pointer, keyboard]] of Object.entries(PAGES)) {
  await load(html);
  const out = [`rest ${await top('#x')}`];
  if (pointer) {
    await click(pointer);
    out.push(`pointer ${await top('#x')}`);
  }
  await rest();
  await tabTo(keyboard);
  out.push(`keyboard ${await top('#x')}`);
  await rest();
  out.push(`after ${await top('#x')}`);
  console.log(`${n}: ${out.join(', ')}`);
}

console.log('## how focus arrives and leaves');
const TWO = `${G()}<button id=out>out</button>`;
await load(TWO);
console.log(`rest: ${await state()}`);
await page.evaluate(() => document.querySelector('#before').focus());
await page.keyboard.press(TAB);
console.log(`Tab: ${await state()}`);
await page.keyboard.press(TAB);
console.log(`Tab again: ${await state()}`);
await click(['#b2']);
console.log(`then a click on the same member: ${await state()}`);
await click(['#b1']);
console.log(`then a click on another member: ${await state()}`);
await page.keyboard.press('Shift');
console.log(`then Shift: ${await state()}`);
await page.keyboard.press('a');
console.log(`then a: ${await state()}`);
await page.keyboard.down('Space');
console.log(`then Space held: ${await state()}`);
await page.keyboard.up('Space');
await click(['#out']);
console.log(`then a click outside: ${await state()}`);
await load(
  G()
    .replaceAll('mx-button', 'mx-switch-button')
    .replace('id=b1', 'id=b1 value=1')
    .replace('id=b2', 'id=b2 value=2')
    .replace('id=b3', 'id=b3 value=3'),
);
await click(['#b1']);
console.log(`switches, a click: ${await state()}`);
await page.keyboard.press('ArrowRight');
console.log(`then an arrow: ${await state()}`);
for (const [n, act] of [
  ['disabled', (e) => (e.disabled = true)],
  ['removed', (e) => e.remove()],
  ['hidden', (e) => (e.hidden = true)],
]) {
  await load(TWO);
  await tabTo(['#b1']);
  const was = await state();
  await page.$eval('#b1', act);
  await page.waitForTimeout(100);
  console.log(`${n} while focused: ${was} -> ${await state()}`);
  await click(['#b2']);
  console.log(`  then a click on another member: ${await state()}`);
}

console.log('## what takes the raise');
const N = (inner) =>
  `<mx-connected-button-group id=g>${inner}<mx-button>Last</mx-button></mx-connected-button-group>`;
for (const [n, html, path, group] of [
  ['a member', N('<mx-button id=in>In</mx-button>'), ['#in']],
  [
    'mx-button in a popover in a member',
    N(
      '<mx-button id=b1>One<div popover=manual id=pop><mx-button id=in>In</mx-button></div></mx-button>',
    ),
    ['#in'],
  ],
  [
    'mx-button in a popover beside the members',
    N('<div popover=manual id=pop><mx-button id=in>In</mx-button></div>'),
    ['#in'],
  ],
  [
    'mx-button in a member, no popover',
    N('<mx-button id=b1>One<mx-button id=in>In</mx-button></mx-button>'),
    ['#in'],
  ],
  [
    'mx-button in a wrapper',
    N('<span><mx-button id=in>In</mx-button></span>'),
    ['#in'],
  ],
  ['a native button as a member', N('<button id=in>In</button>'), ['#in']],
  [
    'a native button in a member',
    N('<mx-button>One<span tabindex=0 id=in>In</span></mx-button>'),
    ['#in'],
  ],
  [
    'a standard group in a wrapper',
    N(
      '<div><mx-button-group><mx-button id=in>In</mx-button></mx-button-group></div>',
    ),
    ['#in'],
  ],
  [
    'mx-button in a popover in a split button',
    '<mx-split-button id=s>Save<div popover=manual id=pop><mx-button id=in>In</mx-button></div></mx-split-button>',
    ['#in'],
    '#s >> mx-connected-button-group',
  ],
  [
    'the trailing member of a split button',
    '<mx-split-button id=s>Save</mx-split-button>',
    ['#s', 'mx-icon-button'],
    '#s >> mx-connected-button-group',
  ],
  [
    'a split button as a member',
    N('<mx-split-button id=s>Save</mx-split-button>'),
    ['#s', 'mx-icon-button'],
  ],
  [
    'a button outside',
    '<mx-button id=in>In</mx-button><mx-connected-button-group id=g></mx-connected-button-group>',
    ['#in'],
  ],
]) {
  await load(html);
  await page.evaluate(() => document.querySelector('#pop')?.showPopover());
  await tabTo(path);
  console.log(`${n}: ${await state(group)}`);
}
// reviewer-2: the popover's own positioned overlay over a focused nested button.
await load(
  '<mx-connected-button-group id=g><mx-button>One<div popover=manual id=pop><div style="position:relative"><mx-button id=in>In</mx-button><div id=x style="position:absolute;inset:0;background:#fffa"></div></div></div></mx-button><mx-button>Two</mx-button></mx-connected-button-group>',
);
await page.evaluate(() => document.querySelector('#pop').showPopover());
await tabTo(['#in']);
console.log(
  `an overlay of the popover over the nested button: ${await top('#x')}`,
);
await browser.close();
