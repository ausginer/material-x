// Probe for reviewer-1: does a consumer's flex-item property on an
// interactive item's ::part(impl) still apply? And does a disabled item's
// hit target or click path change? Each row reports its reading as the
// received value of a failing assertion, because the browser project drops
// console output.
//
// Copy to packages/material-x/tests/list/ and run:
//   MX_TEST_ENGINES=chromium,firefox,webkit aube exec vitest run \
//     -c vitest.config.ts --project 'browser*' tests/list/part-layout.browser.test.ts
import { expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import '../../src/list/list-button-item.ts';
import '../../src/list/list-link-item.ts';
import '../../src/list/list.ts';
import { nextFrame } from '../browser.ts';

it('REVIEW ::part(impl) order', async () => {
  const style = document.createElement('style');
  style.textContent = '#second::part(impl) { order: -1 }';
  document.head.append(style);
  const list = document.createElement('mx-list');
  const first = document.createElement('mx-list-button-item');
  first.textContent = 'First';
  const second = document.createElement('mx-list-button-item');
  second.id = 'second';
  second.textContent = 'Second';
  list.append(first, second);
  document.body.append(list);
  await nextFrame();
  const top = (el: Element) =>
    el.shadowRoot!.querySelector('.host')!.getBoundingClientRect().top;
  const reading = JSON.stringify({ first: top(first), second: top(second) });
  list.remove();
  style.remove();
  expect(`REVIEW order ${reading}`).toBe('X');
});

for (const tag of ['mx-list-button-item', 'mx-list-link-item'] as const) {
  it(`REVIEW ${tag} disabled click path`, async () => {
    const list = document.createElement('mx-list');
    const item = document.createElement(tag);
    item.textContent = 'Disabled';
    if (tag === 'mx-list-link-item') item.setAttribute('href', '#x');
    item.toggleAttribute('disabled', true);
    list.append(item);
    document.body.append(list);
    await nextFrame();
    const r = item.shadowRoot!.querySelector('.host')!.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y)!.localName;
    const seen: string[] = [];
    item.addEventListener('click', () => seen.push('item'));
    list.addEventListener('click', () => seen.push('list'));
    await commands.pointerPress(x, y);
    await commands.pointerRelease();
    list.remove();
    expect(`REVIEW ${tag} hit=${hit} clicks=${JSON.stringify(seen)}`).toBe('X');
  });
}
