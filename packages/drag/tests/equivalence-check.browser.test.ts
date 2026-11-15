/**
 * `drag:DRD-52` and `drag:DRD-67`: the equivalence oracle in
 * `support/oracles.ts`, which checks the window `y()` predicts after a committed
 * move against a fresh measurement. These are its liveness tests, so a refactor
 * that disconnects it from drag's call protocol fails here. They run against the
 * source and the published build.
 */
import { describe, expect, it } from 'vitest';
import { roundTrip, sweepGaps } from './support/gap-conformance.ts';
import {
  basicSortable,
  commands,
  equivalenceChecks,
  frames,
  grab,
  makeList,
  moveHeld,
  onCleanup,
  press,
  rowsOf,
  takeMismatches,
} from './support/harness.ts';

/**
 * Drags `#r1` down across `crossings` rows of `height`, one committed move per
 * step, and lets the frame after each move run the oracle.
 */
async function crossRows(crossings: number, height: number): Promise<void> {
  const start = await grab('#r1', 0, 10);

  for (let step = 1; step <= crossings; step += 1) {
    // oxlint-disable-next-line no-await-in-loop -- one crossing per step
    await moveHeld(start.x, start.y + step * height);
    // oxlint-disable-next-line no-await-in-loop -- the oracle runs a frame later
    await frames();
  }

  await commands.keyPress('Escape');
}

describe('drag:DRD-52 equivalence oracle', () => {
  it('should check a plain column and record no mismatch', async () => {
    basicSortable(makeList(8));
    await crossRows(4, 40);
    expect(equivalenceChecks()).toBeGreaterThan(0);
    expect(takeMismatches()).toEqual([]);
  });

  it('should report a placeholder that a committed move displaces along x', async () => {
    const style = document.createElement('style');

    // Only the placeholder moves along x, and only at an even position.
    style.textContent =
      '[data-drag-placeholder]:nth-child(even) { margin-left: 9px; }';
    document.head.append(style);
    onCleanup(() => style.remove());

    basicSortable(makeList(8));

    const { height } = document.querySelector('#r1')!.getBoundingClientRect();

    await crossRows(4, height);
    expect(takeMismatches()).toContain('the placeholder');
  });

  it('should report a slot in a block column whose margins collapse on both sides of each row', async () => {
    const list = makeList(4, document.body, 'display:block');
    const rows = rowsOf(list);

    for (const [i, height] of [70, 55, 30, 90].entries()) {
      Object.assign(rows[i]!.style, {
        height: `${height}px`,
        marginTop: '6px',
        marginBottom: '10px',
      });
    }

    basicSortable(list);

    const [dragged, ...destination] = rows;
    const { bottom } = list.getBoundingClientRect();
    const start = await press(dragged!);

    await commands.pointerMove(start.x, start.y + 8, 2);
    await sweepGaps({
      rows: destination,
      placeholder: () => list.querySelector('[data-drag-placeholder]'),
      pointerX: start.x,
      path: roundTrip(Math.round(start.y + 8), Math.round(bottom + 10), 4),
    });
    await commands.keyPress('Escape');
    expect(
      takeMismatches().some((mismatch) => mismatch.startsWith('slot ')),
    ).toBe(true);
  });
});
