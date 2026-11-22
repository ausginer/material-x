// Feature-proof probe for RF-70 (PR #120): the branch's dragged-level row, run on
// mx-list-link-item with href="#". Not part of the branch.
import { afterEach, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import '../../src/list/list-link-item.ts';
import '../../src/list/sortable-list.ts';
import { nextFrame } from '../browser.ts';

afterEach(async () => {
  await commands.pointerRelease().catch(() => {});
  document.body.replaceChildren();
});

it.each([1, 2, 3])(
  'link item lifts under the row gesture (run %i)',
  async () => {
    const list = document.createElement('mx-sortable-list');
    list.style.setProperty('--_drag-duration', '0s');
    const items = ['A', 'B'].map((label) => {
      const item = document.createElement('mx-list-link-item');
      item.setAttribute('href', '#');
      item.textContent = label;
      return item;
    });
    list.append(...items);
    document.body.append(list);
    await nextFrame();
    const path: string[] = [];
    document.addEventListener(
      'dragstart',
      (e) => {
        path.push(
          e
            .composedPath()
            .slice(0, 3)
            .map((n) => (n as Element).localName ?? (n as Node).nodeName)
            .join('<'),
        );
      },
      { capture: true, once: true },
    );
    const box = items[0]!.shadowRoot!.querySelector<HTMLElement>('.host')!;
    const { left, top, width, height } = box.getBoundingClientRect();
    const [x, y] = [left + width / 2, top + height / 2];
    await commands.pointerPress(x, y);
    await commands.pointerMove(x, y + 12, 3);
    const lifted = await expect
      .poll(() => items[0]!.matches(':state(drag)'))
      .toBe(true)
      .then(
        () => true,
        () => false,
      );
    const engine = navigator.userAgent.includes('Firefox')
      ? 'firefox'
      : navigator.userAgent.includes('Chrome')
        ? 'chromium'
        : 'webkit';
    console.log(
      `RF70-LINK ${engine} lifted=${lifted} dragstart=${path.join(' | ') || 'none'} draggable=${box.draggable}`,
    );
  },
);
