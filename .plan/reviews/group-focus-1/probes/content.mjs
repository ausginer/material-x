// Run from packages/material-x:
//   node ../../.plan/reviews/group-focus-1/probes/content.mjs <engine> <bundle>
// What the raise and the isolation change inside a group and its members: the
// page's content in a member, at rest, with a pointer's focus and with the
// keyboard's. Each case prints which of two overlapping elements is on top.
import { open } from '../../focus-cover-1/probes/lib.mjs';
const [engine, bundle] = process.argv.slice(2);
const { browser, page, load } = await open(engine, bundle);
console.log(`# ${engine} ${browser.version()}`);
const TAB = engine === 'webkit' ? 'Alt+Tab' : 'Tab';
const abs = (id, css) =>
  `<span id=${id} style="position:absolute;width:30px;height:20px;background:pink;${css}"></span>`;
const G = (a = '', b = '', more = '') =>
  `<div style="position:relative;background:#ddd"><mx-connected-button-group id=g color=tonal><mx-button id=b1>One${a}</mx-button><mx-button id=b2>Two${b}</mx-button><mx-button id=b3>Three</mx-button>${more}</mx-connected-button-group></div>`;
const at = (sel) =>
  page.evaluate((s) => {
    const b = document.querySelector(s).getBoundingClientRect();
    let t = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    return t.id || t.localName;
  }, sel);
const px = async (sel) => {
  const b = await page.$eval(sel, (e) => {
    const r = e.getBoundingClientRect();
    return {
      x: r.x + r.width / 2 - 1,
      y: r.y + r.height / 2 - 1,
      width: 2,
      height: 2,
    };
  });
  const d = (await page.screenshot({ clip: b })).toString('base64');
  return page.evaluate(async (s) => {
    const i = new Image();
    i.src = `data:image/png;base64,${s}`;
    await i.decode();
    const c = document.createElement('canvas').getContext('2d');
    c.drawImage(i, 0, 0);
    return [...c.getImageData(0, 0, 1, 1).data].slice(0, 3).join(' ');
  }, d);
};
const click = async (sel) => {
  const [x, y] = await page.evaluate((s) => {
    const b = document
      .querySelector(s)
      .shadowRoot.querySelector('.host')
      .getBoundingClientRect();
    return [b.x + 6, b.y + b.height / 2];
  }, sel);
  await page.mouse.click(x, y);
  await page.mouse.move(690, 690);
};
for (const [n, html, probe, who] of [
  [
    'a z-index -1 decoration in the focused member, inside its box',
    G(abs('x', 'left:4px;top:4px;z-index:-1')),
    '#x',
    1,
  ],
  [
    'the same in another member',
    G('', abs('x', 'left:4px;top:4px;z-index:-1')),
    '#x',
    1,
  ],
  [
    'a mark with no z-index in the first member, over the second, second focused',
    G(abs('x', 'left:calc(100% + 10px);top:8px')),
    '#x',
    2,
  ],
  [
    'a mark with z-index 1 in the first member, over the second, second focused',
    G(abs('x', 'left:calc(100% + 10px);top:8px;z-index:1')),
    '#x',
    2,
  ],
  [
    'a mark with z-index 2 in the first member, over the second, second focused',
    G(abs('x', 'left:calc(100% + 10px);top:8px;z-index:2')),
    '#x',
    2,
  ],
  [
    'a tooltip with z-index 10 in the focused member, a badge with z-index 1 in the next over it',
    G(
      abs('x', 'left:20px;top:100%;z-index:10'),
      abs('y', 'left:-30px;top:100%;z-index:1'),
    ),
    '#x',
    1,
  ],
  [
    'the same, a badge with z-index 2',
    G(
      abs('x', 'left:20px;top:100%;z-index:10'),
      abs('y', 'left:-30px;top:100%;z-index:2'),
    ),
    '#x',
    1,
  ],
]) {
  await load(html);
  const out = [`rest ${await at('#x')} ${await px('#x')}`];
  await click(`#b${who}`);
  out.push(`pointer ${await at('#x')} ${await px('#x')}`);
  await page.evaluate(() => document.querySelector('#before').focus());
  for (let i = 0; i < who; i += 1) await page.keyboard.press(TAB);
  out.push(`keyboard ${await at('#x')} ${await px('#x')}`);
  console.log(`${n}: ${out.join(' | ')}`);
}
await browser.close();
