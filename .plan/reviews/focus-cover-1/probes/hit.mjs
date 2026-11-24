// node hit.mjs <engine> <bundle>: which element a real click reaches, around a connected group.
import { open } from './lib.mjs';
const [engine, bundle] = process.argv.slice(2);
const { browser, page, load } = await open(engine, bundle);
console.log(`# ${engine} ${browser.version()}`);
const G =
  '<mx-connected-button-group><mx-button>One</mx-button><mx-button>Two</mx-button></mx-connected-button-group>';
const BTN = (css) =>
  `<button id=x style="position:absolute;right:10px;top:8px;width:60px;height:24px;${css}">Close</button>`;
for (const [n, h] of [
  [
    'a page button, positioned, before the group, over its empty end',
    `<div style="position:relative;width:500px">${BTN('')}${G}</div>`,
  ],
  [
    'the same, after the group',
    `<div style="position:relative;width:500px">${G}${BTN('')}</div>`,
  ],
  [
    'the same before it, z-index 1',
    `<div style="position:relative;width:500px">${BTN('z-index:1')}${G}</div>`,
  ],
  [
    'before a split button',
    `<div style="position:relative;width:500px">${BTN('')}<mx-split-button>Save</mx-split-button></div>`,
  ],
  [
    'before a standard group',
    `<div style="position:relative;width:500px">${BTN('')}<mx-button-group><mx-button>One</mx-button></mx-button-group></div>`,
  ],
  [
    'a menu of the page in a split button row: menu first, positioned, then the split',
    `<div style="position:relative;width:500px"><div id=x style="position:absolute;right:0;top:0;width:200px;height:40px;background:#eee">menu</div><mx-split-button>Save</mx-split-button></div>`,
  ],
]) {
  await load(h);
  await page.evaluate(() => {
    window.hit = [];
    document.addEventListener(
      'click',
      (e) => window.hit.push(e.composedPath()[0].id || e.target.localName),
      true,
    );
  });
  const b = await page.locator('#x').boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  console.log(`${n}: ${await page.evaluate(() => hit.join(','))}`);
}
await browser.close();
