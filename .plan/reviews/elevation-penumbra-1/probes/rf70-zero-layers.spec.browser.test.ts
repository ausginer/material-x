// Feature-proof probe for RF-70 (PR #120): at rest (level 0), do the list items'
// zero-size elevation layers change pixels? Screenshots the resting list as built,
// and with every elevation layer set to none on the hosts. Not part of the branch.
import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '../../src/list/list-button-item.ts';
import '../../src/list/list-item.ts';
import '../../src/list/list-link-item.ts';
import '../../src/list/list.ts';
import { nextFrame } from '../browser.ts';

it.each([false, true])('resting list, layers removed: %s', async (removed) => {
  const list = document.createElement('mx-list');
  list.style.cssText =
    'display:block;width:240px;padding:24px;background:white';
  for (const tag of [
    'mx-list-item',
    'mx-list-button-item',
    'mx-list-link-item',
  ]) {
    const item = document.createElement(tag);
    if (tag === 'mx-list-link-item') item.setAttribute('href', '#');
    item.textContent = tag;
    if (removed)
      for (const layer of ['penumbra', 'umbra', 'ambient'])
        item.style.setProperty(`--_elevation-${layer}`, 'none');
    list.append(item);
  }
  document.body.append(list);
  await nextFrame();
  await nextFrame();
  const engine = navigator.userAgent.includes('Firefox')
    ? 'firefox'
    : navigator.userAgent.includes('Chrome')
      ? 'chromium'
      : 'webkit';
  await page.screenshot({
    element: list,
    path: `__rf70__/zero-${engine}-${removed ? 'none' : 'built'}.png`,
  });
  expect(true).toBe(true);
});
