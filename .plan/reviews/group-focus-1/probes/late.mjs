// Run from packages/material-x:
//   node ../../.plan/reviews/group-focus-1/probes/late.mjs <engine> <bundle>
// The group's definition after its first member has keyboard focus, and a
// page's badge on an earlier member, as notification badges are placed.
import {
  open,
  focus,
  pixels,
  ring,
  text,
  whole,
} from '../../focus-cover-1/probes/lib.mjs';
const [engine, bundle] = process.argv.slice(2);
const { browser, page, load, key, errors } = await open(engine, bundle);
console.log(`# ${engine} ${browser.version()}`);
const TAB = engine === 'webkit' ? 'Alt+Tab' : 'Tab';
const state = () =>
  page.evaluate(() => {
    const h = document.querySelector('#b1').shadowRoot.querySelector('.host');
    return `isolation ${getComputedStyle(document.querySelector('#g')).isolation}, visible ${h.matches(':focus-visible')}, z ${getComputedStyle(h).zIndex}`;
  });
await load(
  '<script>{const d=customElements.define.bind(customElements);customElements.define=(n,c,o)=>{if(n==="mx-connected-button-group"&&!window.later)window.later=()=>d(n,c,o);else d(n,c,o)}}</script><mx-connected-button-group id=g color=tonal><mx-button id=b1>One</mx-button><mx-button id=b2>Two</mx-button></mx-connected-button-group>',
);
await page.evaluate(() => document.querySelector('#before').focus());
await page.keyboard.press(TAB);
console.log(`before the group is defined: ${await state()}`);
await page.evaluate(() => window.later());
await page.waitForTimeout(80);
console.log(`after it: ${await state()}`);
await page.keyboard.press('Shift');
console.log(`after a key: ${await state()}`);
for (const z of ['', 'z-index:1', 'z-index:2']) {
  await load(
    `<mx-connected-button-group id=g color=tonal><mx-button id=b1>One<span id=x style="position:absolute;top:-6px;right:-8px;width:20px;height:20px;border-radius:10px;background:red;${z}"></span></mx-button><mx-button id=b2>Two</mx-button></mx-connected-button-group>`,
  );
  const n = async () => {
    await pixels(page);
    return page.evaluate(() => {
      const b = document.querySelector('#x').getBoundingClientRect();
      let k = 0;
      const i = window.__img;
      for (let y = Math.floor(b.y * 2); y < b.bottom * 2; y++)
        for (let x = Math.floor(b.x * 2); x < b.right * 2; x++) {
          const p = (y * i.width + x) * 4;
          if (i.data[p] > 240 && i.data[p + 1] < 20 && i.data[p + 2] < 20) k++;
        }
      return k;
    });
  };
  const rest = await n();
  await page.evaluate(() => document.querySelector('#before').focus());
  await page.keyboard.press(TAB);
  await page.keyboard.press(TAB);
  console.log(
    `a badge on the first member's corner, ${z || 'no z-index'}: red pixels at rest ${rest}, with keyboard focus on the second ${await n()}`,
  );
}
// The complete ring in RTL and with a forced-colors page, for the split button.
for (const [dir, opt] of [['rtl', {}]])
  for (const n of ['mx-button', 'mx-icon-button']) {
    await load(
      `<div dir=${dir}><mx-split-button id=s color=tonal>Save</mx-split-button></div>`,
    );
    await key();
    const g = await focus(page, ['#s', n]);
    await pixels(page);
    const r = await ring(page, g);
    console.log(`${dir} split ${n}: ${whole(r) ? 'whole' : text(r)}`);
  }
console.log(`page errors: ${errors.length}`);
await browser.close();
