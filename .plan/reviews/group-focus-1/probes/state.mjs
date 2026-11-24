// Run from packages/material-x, with the package built:
//   node ../../.plan/reviews/focus-cover-1/probes/bundle.mjs <bundle>
//   node ../../.plan/reviews/group-focus-1/probes/state.mjs <engine> <bundle>
// Reads RF-126's property 2 and 3 after each way that focus can arrive, change
// or leave. A member is one of the five buttons among the group's children, and
// the expected isolation follows from its control's `:focus-visible` alone.
import { open } from '../../focus-cover-1/probes/lib.mjs';
const [engine, bundle] = process.argv.slice(2);
const { browser, page, load } = await open(engine, bundle);
console.log(`# ${engine} ${browser.version()}`);
const TAB = engine === 'webkit' ? 'Alt+Tab' : 'Tab';
const read = (sel = '#g') =>
  page.evaluate((s) => {
    const MEMBERS =
      'mx-button,mx-link-button,mx-icon-button,mx-switch-button,mx-switch-icon-button';
    const wait = () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return wait().then(() => {
      let root = document;
      let g;
      for (const part of s.split(' >> ')) {
        g = root.querySelector(part);
        if (!g) return 'no group';
        root = g.shadowRoot;
      }
      const boxes = g.isConnected
        ? [...g.children]
            .filter((c) => c.matches(MEMBERS))
            .map((c) => c.shadowRoot.querySelector('.host'))
        : [];
      const visible = boxes.map((b) => b.matches(':focus-visible'));
      const z = boxes.map((b) => getComputedStyle(b).zIndex);
      const isolation = getComputedStyle(g).isolation;
      const ok =
        (isolation === 'isolate') === visible.includes(true) &&
        z.every((v, i) => (v === '1') === visible[i]);
      return `${ok ? 'ok      ' : 'MISMATCH'} isolation ${isolation}, visible [${visible.map(Number)}], focus within ${g.matches(':focus-within')}, z [${z}], state ${g.matches(':state(focus-visible)')}`;
    });
  }, sel);
const say = async (name, sel) => console.log(`${name}: ${await read(sel)}`);
const tab = async (n = 1) => {
  await page.evaluate(() => document.querySelector('#before').focus());
  for (let i = 0; i < n; i += 1) await page.keyboard.press(TAB);
};
const click = async (sel) => {
  const [x, y] = await page.evaluate((s) => {
    const e = document.querySelector(s);
    const b = (
      e.shadowRoot?.querySelector('.host') ?? e
    ).getBoundingClientRect();
    return [b.x + b.width / 2, b.y + b.height / 2];
  }, sel);
  await page.mouse.click(x, y);
};
const run = async (sel, f, arg) => page.$eval(sel, f, arg);
const B = (id, t = id, inner = '') =>
  `<mx-button id=${id}>${t}${inner}</mx-button>`;
const G = (inner = B('b1') + B('b2') + B('b3'), id = 'g') =>
  `<mx-connected-button-group id=${id}>${inner}</mx-connected-button-group>`;
const OUT = '<br><button id=out>out</button>';

console.log('## arriving');
await load(G() + OUT);
await say('rest');
await run('#b1', (e) => e.focus());
await say('script focus with no input before');
await load(G() + OUT);
await click('#out');
await run('#b1', (e) => e.focus());
await say('script focus after a click');
await load(G() + OUT);
await tab(1);
await run('#b2', (e) => e.focus());
await say('script focus after Tab');
await load(G() + OUT);
await click('#b1');
await run('#b2', (e) => e.focus({ focusVisible: true }));
await say(
  'script focus of another member with focusVisible: true, after a click',
);
await load(G() + OUT);
await click('#b1');
await run('#b1', (e) =>
  e.shadowRoot.querySelector('.host').focus({ focusVisible: true }),
);
await say('script focus of the clicked control itself with focusVisible: true');
await load(G() + OUT);
await tab(1);
await run('#b1', (e) =>
  e.shadowRoot.querySelector('.host').focus({ focusVisible: false }),
);
await say(
  'script focus of the Tab-focused control itself with focusVisible: false',
);
await load(G(`<mx-button id=b1 autofocus>a</mx-button>${B('b2')}`) + OUT);
await say('autofocus');
await load(`<dialog id=d>${G()}</dialog>${OUT}`);
await run('#d', (e) => e.showModal());
await say('a modal dialog that opens by script');
await page.keyboard.press('Escape');
await say('and closes');
await load(`${G(B('b1') + B('b2'))}<dialog id=d><button>x</button></dialog>`);
await tab(1);
await run('#d', (e) => e.showModal());
await say('a modal dialog elsewhere, opened from a Tab-focused member');
await page.keyboard.press('Escape');
await say('closed, focus restored');
await load(`${G(B('b1') + B('b2'))}<dialog id=d><button>x</button></dialog>`);
await click('#b1');
await run('#d', (e) => e.showModal());
await say('the same from a clicked member');
await page.keyboard.press('Escape');
await say('closed by Escape, focus restored');

console.log('## while focused');
for (const k of [
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'a',
  'Enter',
  'F2',
  'Escape',
]) {
  await load(G() + OUT);
  await click('#b1');
  await page.keyboard.press(k);
  await say(`a click, then ${k}`);
}
await load(G() + OUT);
await click('#b1');
await page.evaluate(() =>
  document
    .querySelector('#b1')
    .addEventListener('keydown', (e) => e.stopPropagation()),
);
await page.keyboard.press('a');
await say('a click, then a, with the page stopping keydown on the member');
await load(G() + OUT);
await tab(1);
await click('#b1');
await say('Tab, then a click on the same member');
await page.mouse.down();
await say('Tab, then pressed');
await page.mouse.up();
await click('#b2');
await say('then a click on another');
await click('#b2');
await say('and again');
await page.keyboard.press(TAB);
await say('then Tab');
await page.keyboard.press(TAB);
await page.keyboard.press(TAB);
await say('then Tab out');
await load(
  G(B('b1', 'one', '<span tabindex=0 id=in>in</span>') + B('b2')) + OUT,
);
await tab(1);
await say('a member with a focusable span, Tab 1');
await page.keyboard.press(TAB);
await say('the span, Tab 2');
await page.keyboard.press('Shift+' + TAB);
await say('back to the control');
await click('#in');
await say('a click on the span');

console.log('## leaving');
for (const [n, f] of [
  ['blur()', (e) => e.shadowRoot.activeElement.blur()],
  ['disabled', (e) => (e.disabled = true)],
  ['removed', (e) => e.remove()],
  ['replaced by a clone', (e) => e.replaceWith(e.cloneNode(true))],
  ['re-appended', (e) => e.parentNode.append(e)],
  ['hidden', (e) => (e.hidden = true)],
  ['visibility: hidden', (e) => (e.style.visibility = 'hidden')],
  ['inert', (e) => (e.inert = true)],
  ['slot=none', (e) => (e.slot = 'none')],
  ['group disabled', (e) => (e.parentNode.disabled = true)],
  ['group hidden', (e) => (e.parentNode.hidden = true)],
  ['group inert', (e) => (e.parentNode.inert = true)],
  [
    'group removed and put back',
    (e) => {
      const g = e.parentNode;
      const p = g.parentNode;
      const n = g.nextSibling;
      g.remove();
      p.insertBefore(g, n);
    },
  ],
  [
    'moveBefore to the end of the group',
    (e) => e.parentNode.moveBefore?.(e, null),
  ],
  ['moveBefore out of the group', (e) => document.body.moveBefore?.(e, null)],
  [
    'group moved by moveBefore',
    (e) => document.body.moveBefore?.(e.parentNode, null),
  ],
]) {
  await load(G() + OUT);
  await tab(1);
  await run('#b1', f);
  await page.waitForTimeout(80);
  await say(n);
  await page.keyboard.press('Shift');
  await say('  then Shift');
  if (await page.$('#g #b2')) {
    await run('#g', (e) => {
      e.hidden = false;
      e.inert = false;
      e.disabled = false;
    });
    await click('#b2');
    await say('  then a click on b2');
    await tab(1);
    await say('  then Tab in again');
  }
}
console.log('## a window switch');
for (const [n, f] of [
  ['Tab', () => tab(1)],
  ['a click', () => click('#b1')],
]) {
  await load(G() + OUT);
  await f();
  const other = await page.context().newPage();
  await other.setContent('<button autofocus>x</button>');
  await other.bringToFront();
  await other.mouse.click(5, 5);
  await say(`${n}, another page in front`);
  await page.bringToFront();
  await say('back');
  await other.close();
}
console.log('## two groups, moves and late definitions');
await load(G() + '<br>' + G(B('c1') + B('c2'), 'h') + OUT);
await tab(1);
await run('#c1', (e) => e.focus());
await say('focus moved to a second group, the first');
await say('  the second', '#h');
await load(G() + '<br>' + G(B('c1') + B('c2'), 'h') + OUT);
await tab(1);
await run('#b1', (e) => document.querySelector('#h').moveBefore?.(e, null));
await say(
  'moveBefore of the Tab-focused member into a second group, the first',
);
await say('  the second', '#h');
await page.keyboard.press('Shift');
await say('  the second after a key', '#h');
await load(G() + '<br>' + B('o1') + OUT);
await tab(1);
await page.evaluate(() =>
  document.activeElement.shadowRoot.activeElement.blur(),
);
await click('#o1');
await run('#o1', (e) => document.querySelector('#g').moveBefore?.(e, null));
await say(
  'a clicked button moved by moveBefore into a group that had keyboard focus',
);

console.log('## what a child can be');
await load(G('<mx-checkbox id=c></mx-checkbox>' + B('b2')) + OUT);
await tab(1);
await say('mx-checkbox as a child, Tab-focused');
await load(G('<mx-fab id=c>f</mx-fab>' + B('b2')) + OUT);
await tab(1);
await say('mx-fab as a child');
await load(G('<mx-text-field id=c></mx-text-field>' + B('b2')) + OUT);
await tab(1);
await say('mx-text-field as a child');
await click('#c');
await say('mx-text-field as a child, clicked');
await load(
  G('<x-own id=c></x-own>' + B('b2')) +
    OUT +
    '<script>customElements.define("x-own",class extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"}).innerHTML="<button>own</button>"}})</script>',
);
await tab(1);
await say("a page's own element with a native button in its shadow tree");
await load(G('<mx-button id=b1 slot=other>x</mx-button>' + B('b2')) + OUT);
await tab(1);
await say('a child in no slot of the group');
await load(
  '<x-wrap id=w><mx-button id=b1>One</mx-button><mx-button id=b2 color=tonal>Two</mx-button></x-wrap>' +
    OUT +
    '<script>customElements.define("x-wrap",class extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"}).innerHTML="<mx-connected-button-group id=g color=tonal><slot></slot></mx-connected-button-group>"}})</script>',
);
await tab(1);
console.log(
  'buttons forwarded through a slot into a group:',
  await page.evaluate(() => {
    const g = document.querySelector('#w').shadowRoot.querySelector('#g');
    const b = document.querySelector('#b1');
    const h = b.shadowRoot.querySelector('.host');
    return `isolation ${getComputedStyle(g).isolation}, visible ${h.matches(':focus-visible')}, z ${getComputedStyle(h).zIndex}, data-first ${'first' in b.dataset}, inner corner set ${getComputedStyle(h).borderRadius}`;
  }),
);
console.log('## the split button');
const SG = '#s >> mx-connected-button-group';
await load(
  '<mx-split-button id=s>Save<span tabindex=0 id=in>in</span></mx-split-button>' +
    OUT,
);
await tab(1);
await say('leading, Tab', SG);
await page.keyboard.press(TAB);
await say('content, Tab', SG);
await page.keyboard.press(TAB);
await say('trailing, Tab', SG);
await run('#s', (e) => (e.disabled = true));
await page.waitForTimeout(80);
await say('then disabled', SG);
await run('#s', (e) => (e.disabled = false));
await run('#s', (e) => {
  const p = e.parentNode;
  const n = e.nextSibling;
  e.remove();
  p.insertBefore(e, n);
});
await say('then removed and put back', SG);
await click('#s >> nothing'.split(' ')[0]).catch(() => {});
await tab(1);
await say('then Tab', SG);
await browser.close();
