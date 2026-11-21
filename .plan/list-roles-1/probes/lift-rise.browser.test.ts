// Probe for RF-68's lift `transition`: the host's computed `--_level` on each
// frame after the sortable list sets the `drag` state, while drag's lift holds
// the item, for mx-list-item and mx-list-button-item, with real pointer input.
//
// Copy it to packages/material-x/tests/scratch/ and run, from
// packages/material-x:
//   MX_TEST_ENGINES=chromium,firefox,webkit aube exec just test \
//     tests/scratch/rise-probe.browser.test.ts --silent=false
// Each case logs one `RISE` line. Reading: ../checks/lift-rise.txt.
import { $ } from '@ydinjs/core/utils/DOM.js';
import { expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import '../../src/list/list-button-item.ts';
import '../../src/list/list-item.ts';
import '../../src/list/sortable-list.ts';
import { nextFrame } from '../browser.ts';

for (const tag of ['mx-list-item', 'mx-list-button-item'] as const) {
  it(`should read the rise of ${tag}`, async () => {
    const list = document.createElement('mx-sortable-list');
    const items = ['A', 'B', 'C'].map((label) => {
      const item = document.createElement(tag);
      item.append(label);
      return item;
    });
    list.append(...items);
    document.body.append(list);
    await nextFrame();
    const a = items[0]!;
    const level = (): string =>
      getComputedStyle(a).getPropertyValue('--_level').trim();
    const style = getComputedStyle(list);
    const rest = level();
    const { left, top, width, height } = a.getBoundingClientRect();
    const [x, y] = [left + width / 2, top + height / 2];
    let started = 0;
    const seen: string[] = [];
    await commands.pointerPress(x, y);
    const watch = (async () => {
      while (!a.matches(':state(drag)')) {
        await new Promise((r) => requestAnimationFrame(r));
      }
      started = performance.now();
      seen.push(`state ${level()}`);
      for (let i = 0; i < 6; i += 1) {
        await new Promise((r) => requestAnimationFrame(r));
        seen.push(
          `+${Math.round(performance.now() - started)}ms ${level()} popover-open=${a.matches(':popover-open') || $(a, '.host')?.matches(':popover-open')}`,
        );
      }
    })();
    await commands.pointerMove(x, y + 12, 3);
    await watch;
    await new Promise((r) => setTimeout(r, 1000));
    seen.push(`+1000ms ${level()}`);
    await commands.pointerRelease();
    console.log(
      `RISE ${navigator.userAgent.includes('Firefox') ? 'firefox' : navigator.userAgent.includes('Chrome') ? 'chromium' : 'webkit'} ${tag} rest=${rest} duration=${style.getPropertyValue('--_drag-duration')} | ${seen.join(' | ')}`,
    );
    list.remove();
    expect(true).toBe(true);
  });
}
