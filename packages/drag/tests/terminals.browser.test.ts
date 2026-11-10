/** `drag:DRI-3`, `drag:DRI-4` and `drag:DRI-6`: terminals, cancel and reentrant input. */
import { describe, expect, it } from 'vitest';
import type { Outcome } from '../src/draggable.ts';
import {
  basicSortable,
  centerOf,
  commands,
  dragAndDrop,
  faultMessages,
  frames,
  grab,
  isClean,
  log,
  makeList,
  managed,
  press,
  refusals,
  release,
  rowsOf,
  targetOf,
  wait,
} from './support/harness.ts';

const noteOutcome = (outcome: Outcome): void => {
  log.push(
    outcome.type === 'canceled'
      ? `end:canceled:${outcome.origin}`
      : `end:${outcome.type}`,
  );
};

describe('drag:DRI-3 terminals', () => {
  it.each([
    { kind: 'cancel', before: 'requestCancel' },
    { kind: 'destroy', before: 'requestDestroy' },
    { kind: 'fault', before: 'nothing' },
  ] as const)(
    'should report a throw from activate once and leave the list clean: $before before the throw',
    async ({ kind }) => {
      const list = makeList(1);
      const panel = managed(list, {
        admit: (event) => ({ item: targetOf(event) }),
        activate() {
          if (kind === 'cancel') {
            panel.requestCancel('early');
          } else if (kind === 'destroy') {
            void panel.requestDestroy();
          }

          throw new Error(kind);
        },
      });

      await dragAndDrop('#r0', 30);
      expect(faultMessages()).toEqual([kind]);
      expect(isClean(list)).toBe(true);
    },
  );

  it('should report nothing when activate declines', async () => {
    const list = makeList(2);

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => null,
    });
    await dragAndDrop('#r0', 30);
    expect(faultMessages()).toEqual([]);
  });

  it('should run end once when start throws', async () => {
    const list = makeList(2);

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({
        start() {
          throw new Error('start');
        },
        end: noteOutcome,
      }),
    });
    await dragAndDrop('#r0', 30);
    expect(log).toEqual(['end:canceled:fault']);
  });

  it('should run end once for a drop with no verdict', async () => {
    const list = makeList(2);

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({ end: noteOutcome }),
    });
    await dragAndDrop('#r0', 30);
    expect(log).toEqual(['end:skipped']);
  });

  it('should run end for a release that lands the item on its own gap', async () => {
    const list = makeList(3);

    basicSortable(list);
    await dragAndDrop('#r0', 10);
    expect(log).toEqual(['start', 'end:noop']);
  });
});

describe('drag:DRI-4 cancel', () => {
  it('should ignore a cancel on an idle controller', () => {
    const panel = managed(makeList(1), {
      admit: () => null,
      activate: () => null,
    });

    panel.requestCancel('idle');
    expect(faultMessages()).toEqual([]);
  });

  it('should keep the first reason and origin', async () => {
    const list = makeList(2);
    const reasons: unknown[] = [];
    const panel = managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({
        start() {
          panel.requestCancel('first');
          panel.requestCancel('second');
        },
        end(outcome) {
          reasons.push(outcome);
        },
      }),
    });

    await grab('#r0');
    expect(reasons).toEqual([
      { type: 'canceled', reason: 'first', origin: 'request' },
    ]);
  });

  it('should change nothing with a cancel after the decision', async () => {
    const list = makeList(2);
    const outcomes: Outcome[] = [];
    const panel = managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({
        settle() {
          panel.requestCancel('late');
        },
        end(outcome) {
          outcomes.push(outcome);
        },
      }),
    });

    await dragAndDrop('#r0', 30);
    expect(outcomes).toEqual([{ type: 'skipped' }]);
  });

  it('should cancel on Escape with origin escape', async () => {
    const list = makeList(2);

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({ end: noteOutcome }),
    });
    await grab('#r0');
    await commands.keyPress('Escape');
    expect(log).toEqual(['end:canceled:escape']);
  });

  it('should retire a pending press on Escape, with no terminal', async () => {
    const list = makeList(2);

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({
        start: () => {
          log.push('start');
        },
        end: noteOutcome,
      }),
    });

    const { x, y } = await press('#r0');

    await commands.keyPress('Escape');
    await commands.pointerMove(x, y + 40, 3);
    await release();
    expect(log).toEqual([]);
  });

  it('should cancel on lostpointercapture with origin interrupted', async () => {
    const list = makeList(2);

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({ end: noteOutcome }),
    });
    await grab('#r0');
    // The capture is on the root, and removing it ends the capture.
    list.remove();
    await frames();
    // Firefox reports the lost capture at the next pointer event.
    await commands.pointerMove(300, 300);
    await wait(50);
    expect(log).toEqual(['end:canceled:interrupted']);
  });

  it('should release presentation at once on a cancel with the button held', async () => {
    const list = makeList(4);

    basicSortable(list);
    await grab('#r0');
    await commands.keyPress('Escape');
    expect(isClean(list)).toBe(true);
    expect(log).toEqual(['start', 'end:canceled']);
  });

  it('should not let a retained drag cancel a later operation', async () => {
    const list = makeList(3);
    let first: { requestCancel(reason?: unknown): void } | null = null;

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: (drag) => ({
        start() {
          first ??= drag;
        },
        end: noteOutcome,
      }),
    });
    await dragAndDrop('#r0', 30);
    await grab('#r1');
    first!.requestCancel('stale');
    expect(log).toEqual(['end:skipped']);
    await release();
    expect(log).toEqual(['end:skipped', 'end:skipped']);
  });
});

describe('admission', () => {
  it('should require a primary button press', () => {
    const list = makeList(2);
    let admissions = 0;

    managed(list, {
      admit(event) {
        admissions += 1;
        return { item: targetOf(event) };
      },
      activate: () => ({}),
    });
    list.firstElementChild!.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        isPrimary: true,
        button: 2,
      }),
    );
    list.firstElementChild!.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        isPrimary: false,
        button: 0,
      }),
    );
    expect(admissions).toBe(0);
  });

  it('should refuse a press through data-drag-ignore before the handle, for a custom behavior', async () => {
    const list = makeList(2);
    const row = document.querySelector<HTMLElement>('#r0')!;

    row.innerHTML =
      '<span data-drag-ignore><b id="owned" style="display:block;height:40px"></b></span>';
    managed(list, {
      admit: () => ({ item: row }),
      activate: () => ({
        start: () => {
          log.push('start');
        },
      }),
    });
    await dragAndDrop('#owned', 30);
    expect(log).toEqual([]);
  });

  it('should acquire pointer capture on the root', async () => {
    const list = makeList(2);
    let captured = false;

    list.addEventListener('gotpointercapture', (event) => {
      captured = event.target === list;
    });
    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({}),
    });
    await grab('#r0');
    await frames();
    expect(captured).toBe(true);
  });

  it('should activate only at the threshold', async () => {
    const list = makeList(2);

    managed(list, {
      threshold: 30,
      admit: (event) => ({ item: targetOf(event) }),
      activate: () => ({
        start: () => {
          log.push('start');
        },
      }),
    });

    const { x, y } = await press('#r0');

    await commands.pointerMove(x, y + 29);
    expect(log).toEqual([]);
    await commands.pointerMove(x, y + 31);
    expect(log).toEqual(['start']);
  });
});

describe('drag:DRI-6 reentrant input', () => {
  it('should refuse a nested press, and take the next real one', async () => {
    const list = makeList(3);
    const nested = (): void => {
      list.firstElementChild!.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, isPrimary: true }),
      );
    };
    let admissions = 0;

    managed(list, {
      admit(event) {
        admissions += 1;
        return { item: targetOf(event) };
      },
      activate: () => ({
        start: nested,
        end: noteOutcome,
      }),
    });
    await dragAndDrop('#r1', 30);
    expect(admissions).toBe(1);
    expect(refusals()).toEqual({ trusted: 0, untrusted: 1 });
    await dragAndDrop('#r0', 30);
    expect(admissions).toBe(2);
    expect(log).toEqual(['end:skipped', 'end:skipped']);
  });

  it('should refuse no trusted event during ordinary drags', async () => {
    const list = makeList(5);

    basicSortable(list);
    await dragAndDrop('#r0', 90);
    await dragAndDrop('#r1', 90);
    expect(refusals().trusted).toBe(0);
  });

  it('should let the press after a refused one activate', async () => {
    const list = makeList(3);

    basicSortable(list, {
      onStart() {
        rowsOf(list)[0]!.dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true, isPrimary: true }),
        );
        log.push('start');
      },
    });
    await dragAndDrop('#r1', 45);
    await dragAndDrop('#r2', -45);
    expect(log.filter((line) => line === 'start')).toHaveLength(2);
    expect(centerOf('#r0').y).toBeGreaterThanOrEqual(0);
  });
});
