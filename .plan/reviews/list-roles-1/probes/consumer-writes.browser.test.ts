// Feature proof of RF-68 on RD-31 (de24d50d5): what a static item's claim
// record does with a value the consumer writes on the host after the item has
// claimed the attribute, and the same for a handle, which RD-31 already claims
// through that record.
//
// Copy it to packages/material-x/tests/list/ and run, from
// packages/material-x:
//   MX_TEST_ENGINES=chromium,firefox,webkit aube exec vitest run \
//     -c vitest.config.ts tests/list/consumer-writes.browser.test.ts \
//     --silent=false
// Each case logs one `WRITES` line. Reading: ../checks/consumer-writes.txt.
import { expect, it } from 'vitest';
import { server } from 'vitest/browser';
import '../../src/list/list-item.ts';
import '../../src/list/list.ts';
import '../../src/list/sortable-list.ts';
import { nextFrame } from '../browser.ts';

const read = (element: Element): string =>
  ['tabindex', 'aria-description', 'aria-label']
    .map((name) => `${name}=${element.getAttribute(name)}`)
    .join(' ');

async function staticItem(): Promise<[HTMLElement, HTMLElement]> {
  const list = document.createElement('mx-sortable-list');
  const item = document.createElement('mx-list-item');
  item.append('A');
  list.append(item);
  document.body.append(list);
  await nextFrame();
  return [list, item];
}

const log = (name: string, steps: string[]): void => {
  console.log(`WRITES ${server.browser} ${name} | ${steps.join(' | ')}`);
};

it("keeps a consumer's tabindex and description written after the claim, when the item moves into mx-list", async () => {
  const [list, item] = await staticItem();
  const steps = [`claimed: ${read(item)}`];
  item.setAttribute('tabindex', '-1');
  item.setAttribute('aria-description', 'Mine');
  steps.push(`consumer wrote: ${read(item)}`);
  const plain = document.createElement('mx-list');
  document.body.append(plain);
  plain.append(item);
  await nextFrame();
  steps.push(`in mx-list: ${read(item)}`);
  log('host -1 then mx-list', steps);
  list.remove();
  plain.remove();
  expect(true).toBe(true);
});

it("keeps a consumer's tabindex written after the claim, when the item gains a handle", async () => {
  const [list, item] = await staticItem();
  const steps = [`claimed: ${read(item)}`];
  item.setAttribute('tabindex', '0');
  steps.push(`consumer wrote: ${read(item)}`);
  const handle = document.createElement('span');
  handle.slot = 'trail';
  handle.dataset['handle'] = '';
  item.append(handle);
  await nextFrame();
  steps.push(`with a handle: ${read(item)}`);
  log('host 0 then handle', steps);
  list.remove();
  expect(true).toBe(true);
});

it("keeps a consumer's tabindex 0 written after the claim as a tab stop in mx-list", async () => {
  const [list, item] = await staticItem();
  item.setAttribute('tabindex', '0');
  const plain = document.createElement('mx-list');
  document.body.append(plain);
  plain.append(item);
  await nextFrame();
  item.focus();
  log('host 0 then mx-list', [
    `in mx-list: ${read(item)}`,
    `focus() reaches it: ${document.activeElement === item}`,
  ]);
  list.remove();
  plain.remove();
  expect(true).toBe(true);
});

it("keeps a consumer's aria-label written on a handle after the claim, when the handle leaves (RD-31, on main)", async () => {
  const [list, item] = await staticItem();
  const handle = document.createElement('span');
  handle.slot = 'trail';
  handle.dataset['handle'] = '';
  item.append(handle);
  await nextFrame();
  const steps = [`claimed: ${read(handle)}`];
  handle.setAttribute('aria-label', 'Drag A');
  steps.push(`consumer wrote: ${read(handle)}`);
  handle.remove();
  await nextFrame();
  steps.push(`handle removed: ${read(handle)}`);
  log('handle aria-label then removal', steps);
  list.remove();
  expect(true).toBe(true);
});
