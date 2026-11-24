// node stack.mjs <engine> <bundle>: the page's own stacking around a connected
// group, the private variable's reach, and what else a list item's change reaches.
import { open, focus, pixels, ring, text } from './lib.mjs';
const [engine, bundle] = process.argv.slice(2);
const { browser, page, load, key } = await open(engine, bundle);
console.log(`# ${engine} ${browser.version()}`);
const top = (sel) =>
  page.evaluate((s) => {
    const e = document.querySelector(s),
      b = e.getBoundingClientRect();
    const t = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    return t === e || e.contains(t)
      ? 'on top'
      : `covered by ${t?.id || t?.localName}`;
  }, sel);
const G = (tip, a = '') =>
  `<mx-connected-button-group id=g ${a}><mx-button id=b1>One${tip}</mx-button><mx-button id=b2>Two</mx-button></mx-connected-button-group>`;
const after = (css, id = 'after') =>
  `<div id=${id} style="height:60px;width:300px;background:#eee;${css}">after</div>`;
const tip = (css) =>
  `<span id=tip style="position:absolute;top:100%;left:0;margin-top:4px;width:60px;height:20px;background:pink;${css}">tip</span>`;
for (const [n, h] of [
  [
    'tooltip in a button, z-index 10, then a static block',
    G(tip('z-index:10')) + after(''),
  ],
  [
    'tooltip in a button, z-index 10, then position:relative',
    G(tip('z-index:10')) + after('position:relative'),
  ],
  [
    'tooltip in a button, z-index 10, then position:relative z-index 1',
    G(tip('z-index:10')) + after('position:relative;z-index:1'),
  ],
  [
    'tooltip in a button, z-index 10, then transform',
    G(tip('z-index:10')) + after('transform:translate(0)'),
  ],
  [
    'tooltip in a button, z-index 10, then another group',
    G(tip('z-index:10')) +
      `<div><mx-connected-button-group id=h><mx-button>Three</mx-button><mx-button>Four</mx-button></mx-connected-button-group></div>`,
  ],
  [
    'tooltip in a button, z-index 10, then a button',
    G(tip('z-index:10')) + `<div><mx-button id=h>Three</mx-button></div>`,
  ],
  [
    'tooltip in a button, z-index 10, then a text field',
    G(tip('z-index:10')) + `<div><mx-text-field id=h></mx-text-field></div>`,
  ],
  [
    'tooltip in a button, z-index 10, then a list',
    G(tip('z-index:10')) +
      `<mx-list><mx-list-button-item id=h>x</mx-list-button-item></mx-list>`,
  ],
  [
    'tooltip in a button, no z-index, then position:relative',
    G(tip('')) + after('position:relative'),
  ],
  [
    'tooltip slotted beside the buttons, z-index 10, then position:relative',
    `<div style="position:relative"><mx-connected-button-group><mx-button>One</mx-button>${tip('z-index:10;top:50px')}</mx-connected-button-group></div>${after('position:relative')}`,
  ],
  [
    'fixed overlay in a button (a hand-made menu), z-index 1000, then position:relative z-index 1',
    G(
      '<span id=tip style="position:fixed;left:40px;top:130px;width:60px;height:20px;background:pink;z-index:1000"></span>',
    ) + after('position:relative;z-index:1'),
  ],
  [
    'popover in a button, shown, then z-index 1000',
    G(
      '<span id=tip popover=manual style="margin:0;inset:auto;left:40px;top:130px;width:60px;height:20px">tip</span>',
    ) + after('position:relative;z-index:1000'),
  ],
  [
    'split button: tooltip in its label, z-index 10, then position:relative',
    `<mx-split-button>Save${tip('z-index:10')}</mx-split-button>` +
      after('position:relative'),
  ],
  [
    'tooltip in a plain mx-button (no group), z-index 10, then position:relative',
    `<mx-button>One${tip('z-index:10')}</mx-button>` +
      after('position:relative'),
  ],
  [
    'tooltip in a standard group, z-index 10, then position:relative',
    `<mx-button-group><mx-button>One${tip('z-index:10')}</mx-button></mx-button-group>` +
      after('position:relative'),
  ],
]) {
  await load(h);
  await page.evaluate(() => {
    const t = document.querySelector('#tip');
    if (t.popover) t.showPopover();
  });
  console.log(`${n}: tip ${await top('#tip')}`);
}
// The page's own overlay over a focused button, around the group.
for (const [n, h] of [
  [
    'overlay, position absolute, after the group',
    `<div style="position:relative">${G('')}<div id=ov style="position:absolute;inset:0;background:#fffa"></div></div>`,
  ],
  [
    'overlay before the group',
    `<div style="position:relative"><div id=ov style="position:absolute;inset:0;background:#fffa"></div>${G('')}</div>`,
  ],
  [
    'badge slotted after the buttons, absolute',
    `<div style="position:relative"><mx-connected-button-group id=g><mx-button id=b1>One</mx-button><mx-button>Two</mx-button><span id=ov style="position:absolute;left:30px;top:0;width:20px;height:20px;background:red"></span></mx-connected-button-group></div>`,
  ],
  [
    'badge slotted after the buttons, absolute, z-index 1',
    `<div style="position:relative"><mx-connected-button-group id=g><mx-button id=b1>One</mx-button><mx-button>Two</mx-button><span id=ov style="position:absolute;left:30px;top:0;width:20px;height:20px;background:red;z-index:1"></span></mx-connected-button-group></div>`,
  ],
  [
    'text with a negative margin over the group',
    `${G('')}<div id=ov style="margin-top:-30px;height:20px;width:100px;background:#eee">x</div>`,
  ],
  [
    'z-index -1 decoration in a button',
    `<div style="background:#ddd">${G('<span id=ov style="position:absolute;inset:-6px;background:gold;z-index:-1"></span>')}</div>`,
  ],
]) {
  await load(h);
  const rest = await top('#ov');
  await key();
  await focus(page, ['#b1']);
  console.log(`${n}: at rest ${rest}, button focused ${await top('#ov')}`);
}
// Paint of a z-index -1 child and a blend mode: screenshots are compared by hash across bundles.
import crypto from 'node:crypto';
for (const [n, h] of [
  [
    'z-index -1 decoration',
    `<div style="background:#ddd;padding:20px">${G('<span style="position:absolute;inset:-6px;background:gold;z-index:-1"></span>')}</div>`,
  ],
  [
    'mix-blend-mode in a button',
    `<div style="background:#36c;padding:20px">${G('<span style="position:absolute;inset:-6px;background:gold;mix-blend-mode:multiply"></span>')}</div>`,
  ],
  [
    'group part mix-blend-mode by the page',
    `<div style="background:#36c;padding:20px"><style>mx-button::part(impl){mix-blend-mode:multiply}</style>${G('')}</div>`,
  ],
  [
    'page isolates it back: isolation auto',
    `<div style="background:#36c;padding:20px"><style>mx-connected-button-group{isolation:auto}mx-button::part(impl){mix-blend-mode:multiply}</style>${G('')}</div>`,
  ],
]) {
  await load(h);
  const s = await page.screenshot();
  console.log(
    `${n}: paint ${crypto.createHash('md5').update(s).digest('hex').slice(0, 8)}`,
  );
}
// The reach of --_focus-z-index.
for (const [n, h, p] of [
  [
    'button in a popover in a slotted span',
    `<mx-connected-button-group><mx-button>One</mx-button><div popover=manual id=pop><mx-button id=in>In</mx-button></div></mx-connected-button-group>`,
    ['#in'],
  ],
  [
    'button in a popover in a slotted button',
    `<mx-connected-button-group><mx-button>One<div popover=manual id=pop><mx-button id=in>In</mx-button></div></mx-button></mx-connected-button-group>`,
    ['#in'],
  ],
  [
    'standard group in a slotted wrapper',
    `<mx-connected-button-group><div><mx-button-group><mx-button id=in>In</mx-button></mx-button-group></div></mx-connected-button-group>`,
    ['#in'],
  ],
  [
    'button in a popover in a split button label',
    `<mx-split-button>Save<div popover=manual id=pop><mx-button id=in>In</mx-button></div></mx-split-button>`,
    ['#in'],
  ],
  ['button outside a group', `<mx-button id=in>In</mx-button>`, ['#in']],
  [
    'button in a standard group',
    `<mx-button-group><mx-button id=in>In</mx-button></mx-button-group>`,
    ['#in'],
  ],
  [
    'button after a page sets --_focus-z-index',
    `<style>body{--_focus-z-index:7}</style><mx-button id=in>In</mx-button>`,
    ['#in'],
  ],
]) {
  await load(h);
  await page.evaluate(() => document.querySelector('#pop')?.showPopover());
  await key();
  const g = await focus(page, p);
  console.log(`${n}: focused z-index ${g.z} (focus-visible ${g.visible})`);
}
// A focused button in a popover in the group, under a positioned sibling in the same popover.
await load(
  `<mx-connected-button-group><mx-button>One</mx-button><div popover=manual id=pop style="inset:auto;left:40px;top:200px;width:200px;height:60px"><mx-button id=in>In</mx-button><div id=ov style="position:absolute;inset:0;background:#fffa"></div></div></mx-connected-button-group>`,
);
await page.evaluate(() => document.querySelector('#pop').showPopover());
const r0 = await top('#in');
await key();
await focus(page, ['#in']);
console.log(
  `overlay in the popover over its button: at rest button ${r0}; focused: ${await page.evaluate(
    () => {
      const b = document
        .querySelector('#in')
        .shadowRoot.querySelector('.host')
        .getBoundingClientRect();
      return document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
        .id;
    },
  )}`,
);
// Material elements inside a list item, against the same outside: the indicator's computed values.
const KIDS = {
  'mx-button': 'B',
  'mx-icon-button': '<mx-icon>star</mx-icon>',
  'mx-link-button': 'L',
  'mx-switch-button': 'S',
  'mx-checkbox': '',
  'mx-radio': '',
  'mx-fab': 'F',
  'mx-text-field': '',
  'mx-multiline-text-field': '',
  'mx-list-button-item': 'i',
  'mx-list-item': 'i',
  'mx-split-button': 's',
};
const outline = () =>
  page.evaluate(() => {
    let e = document.activeElement;
    while (e?.shadowRoot?.activeElement) e = e.shadowRoot.activeElement;
    const c = [e, ...(e.getRootNode().querySelectorAll?.('*') ?? [])]
      .map((x) => [x, getComputedStyle(x)])
      .filter(
        ([x, s]) => x.getRootNode() !== document && s.outlineStyle === 'solid',
      )
      .map(
        ([x, s]) =>
          `${x.localName}.${x.className} ${s.outlineWidth} ${s.outlineOffset} ${s.outlineColor}`,
      );
    return c.join(' | ') || 'none';
  });
for (const t of [
  'mx-list-item',
  'mx-list-button-item',
  'mx-list-link-item',
  'mx-connected-button-group',
])
  for (const [k, c] of Object.entries(KIDS)) {
    const inner = `<${k} id=in ${k === 'mx-link-button' ? 'href=#x' : ''} ${k === 'mx-list-item' ? 'tabindex=0' : ''}>${c}</${k}>`;
    const out = [];
    for (const h of [
      inner,
      `<${t} ${t.includes('link') ? 'href=#y' : ''}>${t.includes('group') ? `<div>${inner}</div>` : `Label<span slot=trail>${inner}</span>`}</${t}>`,
    ]) {
      await load(`<button id=b0>z</button>${h}`);
      await page.evaluate(() => document.querySelector('#b0').focus());
      await page.keyboard.press('Shift');
      await page.evaluate(() => document.querySelector('#in').focus());
      await page.waitForTimeout(20);
      out.push(await outline());
    }
    if (out[0] !== out[1])
      console.log(
        `DIFFERS ${k} in ${t}: outside "${out[0]}", inside "${out[1]}"`,
      );
  }
console.log('nested elements read');
await browser.close();
