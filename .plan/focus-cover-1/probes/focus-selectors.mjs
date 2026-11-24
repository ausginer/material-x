// Run as keyboard-raise.mjs is: node ../../.plan/focus-cover-1/probes/focus-selectors.mjs <engine> <bundle>
import { open } from '../../reviews/focus-cover-1/probes/lib.mjs';
const [engine, bundle] = process.argv.slice(2);
const { browser, page, load, key } = await open(engine, bundle);
console.log('# ' + engine + ' ' + browser.version());
const H =
  '<mx-connected-button-group id=g><mx-button id=b1>One</mx-button><mx-icon-button id=b2><mx-icon>a</mx-icon></mx-icon-button><mx-link-button id=b3 href="#x">L</mx-link-button><mx-switch-button id=b4 value=1>S</mx-switch-button></mx-connected-button-group><button id=out>out</button>';
const css = `:host(:focus-within){--fw:1}:host(:has(:focus-visible)){--has:1}:host(:has(>:focus-visible)){--hasc:1}:host:has(:focus-visible){--hh:1}:host(:has(:focus)){--hasf:1}:host(:has(*)){--any:1}::slotted(:focus-visible){--sfv:1}::slotted(:focus){--sf:1}::slotted(:focus-within){--sfw:1}`;
const read = () =>
  page.evaluate(() => {
    const g = document.querySelector('#g');
    const c = (e) => (n) => getComputedStyle(e).getPropertyValue(n) || 0;
    const G = c(g);
    const a = document.activeElement;
    const m = a.closest?.('#g') ? c(a) : () => '-';
    const t = a.shadowRoot?.activeElement;
    return `active=${a.id} inner:fv=${t?.matches(':focus-visible')} host matches :focus=${a.matches(':focus')} :fv=${a.matches(':focus-visible')} group: fw=${G('--fw')} has(*)=${G('--any')} has(:fv)=${G('--has')} has(>:fv)=${G('--hasc')} :host:has=${G('--hh')} has(:focus)=${G('--hasf')} slotted: fv=${m('--sfv')} f=${m('--sf')} fw=${m('--sfw')}; g.matches(:has(:fv))=${g.matches(':has(:focus-visible)')}`;
  });
await load(H);
await page.evaluate((c) => {
  const s = new CSSStyleSheet();
  s.replaceSync(c);
  document.querySelector('#g').shadowRoot.adoptedStyleSheets.push(s);
}, css);
console.log('rest', await read());
await page.evaluate(() => document.querySelector('#before').focus());
for (let i = 0; i < 4; i++) {
  await page.keyboard.press(engine === 'webkit' ? 'Alt+Tab' : 'Tab');
  console.log('tab', await read());
}
for (const id of ['b1', 'b4']) {
  await page.mouse.move(690, 690);
  await page.evaluate(() => {
    document.activeElement.blur();
  });
  await page.locator('#' + id).evaluate((e) => {});
  const b = await page.evaluate((i) => {
    const r = document
      .querySelector(i)
      .shadowRoot.querySelector('.host')
      .getBoundingClientRect();
    return [r.x + r.width / 2, r.y + r.height / 2];
  }, '#' + id);
  await page.mouse.click(...b);
  console.log('click ' + id, await read());
  await page.keyboard.press('Shift');
  console.log(' then Shift', await read());
  await page.keyboard.press('a');
  console.log(' then a', await read());
}
await browser.close();
