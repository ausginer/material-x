// node kinds.mjs <engine> <bundle>: how focus reaches each item kind, and what it draws.
import { open } from './lib.mjs';
import crypto from 'node:crypto';
const [engine, bundle] = process.argv.slice(2);
const { browser, page, load } = await open(engine, bundle);
console.log(`# ${engine} ${browser.version()}`);
const TAB = engine === 'webkit' ? 'Alt+Tab' : 'Tab';
const state = () =>
  page.evaluate(() => {
    let e = document.activeElement;
    const path = [e.id || e.localName];
    while (e?.shadowRoot?.activeElement) {
      e = e.shadowRoot.activeElement;
      path.push(e.className || e.localName);
    }
    const all = (r) =>
      [...r.querySelectorAll('*')].flatMap((x) => [
        x,
        ...(x.shadowRoot ? all(x.shadowRoot) : []),
      ]);
    const o = all(document)
      .filter((x) => {
        const s = getComputedStyle(x);
        return (
          s.outlineStyle !== 'none' &&
          parseFloat(s.outlineWidth) > 0 &&
          s.display !== 'contents'
        );
      })
      .map((x) => {
        const s = getComputedStyle(x);
        return `${x.id || x.localName}.${x.className}: ${s.outlineStyle} ${s.outlineWidth} ${s.outlineOffset} ${s.outlineColor}`;
      });
    return `active ${path.join('>')} | ${o.join(' ; ') || 'no outline'}`;
  });
const H = {
  'static, no tabindex':
    '<mx-list><mx-list-item id=f>x</mx-list-item></mx-list>',
  'static, tabindex 0':
    '<mx-list><mx-list-item id=f tabindex=0>x</mx-list-item></mx-list>',
  'static in sortable':
    '<mx-sortable-list><mx-list-item id=f>x</mx-list-item></mx-sortable-list>',
  button:
    '<mx-list><mx-list-button-item id=f>x</mx-list-button-item></mx-list>',
  'button, selected':
    '<mx-list><mx-list-button-item id=f selected>x</mx-list-button-item></mx-list>',
  'button, disabled':
    '<mx-list><mx-list-button-item id=f disabled>x</mx-list-button-item></mx-list>',
  link: '<mx-list><mx-list-link-item id=f href=#x>x</mx-list-link-item></mx-list>',
  'link, no href':
    '<mx-list><mx-list-link-item id=f>x</mx-list-link-item></mx-list>',
  'link, disabled':
    '<mx-list><mx-list-link-item id=f href=#x disabled>x</mx-list-link-item></mx-list>',
  'button outside a list': '<mx-list-button-item id=f>x</mx-list-button-item>',
  'button item in sortable with a handle':
    '<mx-sortable-list><mx-list-button-item id=f><mx-icon slot=lead data-handle>d</mx-icon>x</mx-list-button-item></mx-sortable-list>',
  'static with a slotted button':
    '<mx-list><mx-list-item id=f>x<button slot=trail id=in>y</button></mx-list-item></mx-list>',
  'static with a slotted mx-checkbox':
    '<mx-list><mx-list-item id=f>x<mx-checkbox slot=trail id=in></mx-checkbox></mx-list-item></mx-list>',
};
for (const [n, h] of Object.entries(H)) {
  await load(h + '<button id=end>e</button>');
  await page.evaluate(() => document.querySelector('#before').focus());
  await page.keyboard.press(TAB);
  await page.waitForTimeout(30);
  console.log(`${n} | Tab: ${await state()}`);
  if (/Tab/.test('Tab') && n.includes('with')) {
    await page.keyboard.press(TAB);
    await page.waitForTimeout(30);
    console.log(`   Tab again: ${await state()}`);
  }
  await page.evaluate(() => document.querySelector('#before').focus());
  await page.keyboard.press('Shift');
  await page.evaluate(() => document.querySelector('#f').focus());
  console.log(`   focus(): ${await state()}`);
  await page.evaluate(() => document.activeElement.blur());
  const b = await page.locator('#f').boundingBox();
  await page.mouse.click(b.x + 20, b.y + b.height / 2);
  await page.waitForTimeout(30);
  console.log(`   click: ${await state()}`);
}
// A lifted item: focused, then raised by a keyboard move or a pointer.
for (const t of ['mx-list-item', 'mx-list-button-item', 'mx-list-link-item']) {
  await load(
    `<mx-sortable-list style="width:300px">${[1, 2, 3].map((i) => `<${t} id=f${i} href=#x>Item ${i}</${t}>`).join('')}</mx-sortable-list>`,
  );
  await page.evaluate(() => document.querySelector('#before').focus());
  await page.keyboard.press(TAB);
  await page.waitForTimeout(30);
  const b = await page.locator('#f1').boundingBox();
  await page.mouse.move(b.x + 150, b.y + 20);
  await page.mouse.down();
  for (let i = 1; i < 8; i++) {
    await page.mouse.move(b.x + 150, b.y + 20 + i * 5);
    await page.waitForTimeout(30);
  }
  console.log(
    `${t} lifted by the pointer, open ${await page.evaluate(() => document.querySelector('#f1').matches(':popover-open'))}: ${await state()}`,
  );
  await page.mouse.up();
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('#before').focus());
  await page.keyboard.press('Shift');
  await page.evaluate(() =>
    document.querySelector('mx-sortable-list').firstElementChild.focus(),
  );
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(500);
  console.log(`${t} after a keyboard move: ${await state()}`);
}
// Paint without focus, to be compared between the two builds in one engine.
for (const [n, h] of Object.entries(H)) {
  await load(h);
  await page.mouse.move(690, 690);
  console.log(
    `paint at rest, ${n}: ${crypto
      .createHash('md5')
      .update(await page.screenshot())
      .digest('hex')
      .slice(0, 10)}`,
  );
}
for (const c of ['', 'outlined', 'elevated', 'text', 'tonal']) {
  await load(
    `<mx-connected-button-group color=${c}><mx-button>One</mx-button><mx-switch-button checked>Two</mx-switch-button><mx-link-button href=#x>x</mx-link-button></mx-connected-button-group><br><mx-split-button color=${c}>S</mx-split-button><br><mx-button-group><mx-button>x</mx-button></mx-button-group>`,
  );
  console.log(
    `paint at rest, groups ${c}: ${crypto
      .createHash('md5')
      .update(await page.screenshot())
      .digest('hex')
      .slice(0, 10)}`,
  );
}
await browser.close();
