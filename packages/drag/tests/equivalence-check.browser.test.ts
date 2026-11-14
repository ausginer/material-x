/**
 * `drag:DRD-52`: the development equivalence check, which a published build
 * folds away. It runs in the source projects only.
 */
import { describe, expect, it } from 'vitest';
import {
  basicSortable,
  commands,
  faultMessages,
  frames,
  grab,
  makeList,
  moveHeld,
  onCleanup,
} from './support/harness.ts';

describe('drag:DRD-52 development equivalence check', () => {
  it('should report a placeholder that a committed move displaces along x', async () => {
    const style = document.createElement('style');

    // Only the placeholder moves along x, and only at an even position.
    style.textContent =
      '[data-drag-placeholder]:nth-child(even) { margin-left: 9px; }';
    document.head.append(style);
    onCleanup(() => style.remove());

    basicSortable(makeList(8));

    const { height } = document.querySelector('#r1')!.getBoundingClientRect();
    const start = await grab('#r1', 0, 10);

    for (let step = 1; step <= 4; step += 1) {
      // oxlint-disable-next-line no-await-in-loop -- one crossing per step
      await moveHeld(start.x, start.y + step * height);
      // oxlint-disable-next-line no-await-in-loop -- the check runs a frame later
      await frames();
    }

    await commands.keyPress('Escape');
    expect(faultMessages()).toContain(
      'drag: the predicted insertion geometry disagreed with a fresh measurement at the placeholder; the linear shift rule does not hold for this list',
    );
  });
});
