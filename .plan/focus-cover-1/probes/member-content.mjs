// Run from packages/material-x, with the package built:
//   node ../../.plan/reviews/focus-cover-1/probes/bundle.mjs <bundle>
//   node ../../.plan/focus-cover-1/probes/member-content.mjs <engine> <bundle>
// What a page's content inside a member shows while a member has keyboard focus,
// with the member raised, as built, and with its indicator alone raised as an
// element. Both keep the group's isolation. `main` is neither.
import { open, pixels } from '../../reviews/focus-cover-1/probes/lib.mjs';
const [engine, bundle] = process.argv.slice(2);
const { browser, page, load } = await open(engine, bundle);
console.log(`# ${engine} ${browser.version()}`);
const TAB = engine === 'webkit' ? 'Alt+Tab' : 'Tab';
const FLAT = '.host:focus-visible{z-index:auto!important}';
const CANDIDATES = {
  'as on main': [':host{isolation:auto!important}', FLAT],
  'the member raised (built)': ['', ''],
  'the indicator alone raised': [
    '',
    `${FLAT}.host:focus-visible{outline-color:transparent!important}.probe-ring{position:absolute;inset:-5px;border:3px solid var(--ring);border-radius:8px;z-index:1;pointer-events:none;display:none}.host:focus-visible .probe-ring{display:block}`,
  ],
};
const apply = ([group, button]) =>
  page.evaluate(
    ([g, b]) => {
      const sheet = (text) => {
        const s = new CSSStyleSheet();
        s.replaceSync(text);
        return s;
      };
      for (const e of document.querySelectorAll(
        'mx-connected-button-group,mx-button',
      )) {
        const isGroup = e.localName === 'mx-connected-button-group';
        e.shadowRoot.adoptedStyleSheets.push(sheet(isGroup ? g : b));
        if (!isGroup && b.includes('probe-ring')) {
          const r = document.createElement('div');
          r.className = 'probe-ring';
          r.style.setProperty(
            '--ring',
            getComputedStyle(document.documentElement).color,
          );
          e.shadowRoot.querySelector('.host').append(r);
        }
      }
    },
    [group, button],
  );
const mark = (css) =>
  `<span id=x style="position:absolute;width:20px;height:20px;background:red;${css}"></span>`;
const other = (css) =>
  `<span id=y style="position:absolute;width:30px;height:20px;background:lime;${css}"></span>`;
const CORNER = 'top:-6px;right:-8px;border-radius:10px;';
const CASES = [
  [
    "a badge with z-index 1 on the first member's corner",
    mark(`${CORNER}z-index:1`),
    '',
    2,
  ],
  [
    "a badge with z-index 2 on the first member's corner",
    mark(`${CORNER}z-index:2`),
    '',
    2,
  ],
  [
    "a badge with z-index 1 on the focused member's corner",
    mark(`${CORNER}z-index:1`),
    '',
    1,
  ],
  [
    'a tooltip with z-index 10 in the focused member, under z-index 1 in the next',
    mark('left:20px;top:100%;z-index:10'),
    other('left:-30px;top:100%;z-index:1'),
    1,
  ],
  [
    'a z-index -1 decoration in the focused member',
    mark('left:4px;top:4px;z-index:-1'),
    '',
    1,
  ],
];
const red = async () => {
  await pixels(page);
  return page.evaluate(() => {
    const b = document.querySelector('#x').getBoundingClientRect();
    const i = window.__img;
    let n = 0;
    for (let y = Math.floor(b.y * 2); y < b.bottom * 2; y++)
      for (let x = Math.floor(b.x * 2); x < b.right * 2; x++) {
        const p = (y * i.width + x) * 4;
        if (i.data[p] > 240 && i.data[p + 1] < 20 && i.data[p + 2] < 20) n++;
      }
    return n;
  });
};
for (const [name, styles] of Object.entries(CANDIDATES))
  for (const [what, a, b, tabs] of CASES) {
    await load(
      `<div style="position:relative;background:#ddd"><mx-connected-button-group id=g color=tonal><mx-button id=b1>One${a}</mx-button><mx-button id=b2>Two${b}</mx-button><mx-button>Three</mx-button></mx-connected-button-group></div>`,
    );
    await apply(styles);
    const rest = await red();
    await page.evaluate(() => document.querySelector('#before').focus());
    for (let i = 0; i < tabs; i += 1) await page.keyboard.press(TAB);
    console.log(
      `${name} | ${what} | at rest ${rest}, with keyboard focus ${await red()}`,
    );
  }
await browser.close();
