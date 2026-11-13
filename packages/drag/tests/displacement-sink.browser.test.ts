/**
 * The sortable tests that read the displacement sink's `report` and `displaced`,
 * which only the unpublished installer types declare. They run in the source
 * projects only.
 */
import { describe, expect, it, vi } from 'vitest';
import type { DisplacementSink } from '../src/sortable/axis.ts';
import { layoutAnimation } from '../src/sortable/layout-animation.ts';
import { xy } from '../src/sortable/xy.ts';
import {
  basicSortable,
  centerOf,
  commands,
  faults,
  frames,
  grab,
  log,
  makeList,
  moveHeld,
  onCleanup,
  press,
  release,
  rowsOf,
} from './support/harness.ts';

/** One `displaced` call, with the rows read since the call before it. */
type DisplacedCall = Readonly<{
  element: HTMLElement;
  /** What the sink answered, and the y offset it then held. */
  carried: boolean;
  dy: number;
  /** The destination rows whose rect was read since the previous call. */
  read: readonly Element[];
  /** The presented top of the last row read. */
  top: number;
}>;

/**
 * Wraps `sink.displaced` and the rect read, and records each call. A measurement,
 * the drop's confirmation and the linear shift's probe each read one row and then
 * ask the sink about that row.
 */
function recordDisplaced(
  sink: DisplacementSink,
  dragged: HTMLElement,
): DisplacedCall[] {
  const calls: DisplacedCall[] = [];
  let read: Element[] = [];
  let top = Number.NaN;
  const readRect = Element.prototype.getBoundingClientRect;
  const displaced = sink.displaced.bind(sink);

  Element.prototype.getBoundingClientRect = function recorded(this: Element) {
    const rect = readRect.call(this);

    if (
      this !== dragged &&
      this.classList.contains('row') &&
      !this.hasAttribute('data-drag-placeholder')
    ) {
      read.push(this);
      ({ top } = rect);
    }

    return rect;
  };
  onCleanup(() => {
    Element.prototype.getBoundingClientRect = readRect;
  });
  sink.displaced = (element) => {
    const carried = displaced(element);

    calls.push({ element, carried, dy: sink.dy, read, top });
    read = [];
    return carried;
  };

  return calls;
}

/** Each call asked about exactly the row read before it, and nothing else read. */
function expectOwnRows(calls: readonly DisplacedCall[]): void {
  for (const { element, read } of calls) {
    expect(read).toEqual([element]);
  }
}

describe('sortable options', () => {
  it('should call the layoutAnimation sink with its receiver, with rows in flight', async () => {
    const list = makeList(4);
    const install = layoutAnimation({ duration: 3000 });
    let sink: DisplacementSink | null = null;

    basicSortable(list, {
      displacement: () => {
        sink = install();
        return sink;
      },
    });

    // The spies call the class's methods with the receiver they are given.
    const report = vi.spyOn(sink!, 'report');
    const displaced = vi.spyOn(sink!, 'displaced');
    const start = await press('#r0');

    await commands.pointerMove(start.x, start.y + 20, 2);
    await commands.pointerMove(start.x, start.y + 62, 3);
    await frames(3);
    await commands.pointerMove(start.x, start.y + 65);
    await frames(3);

    const firstReport = report.mock.invocationCallOrder[0]!;
    const settledInFlight = displaced.mock.contexts.filter(
      (_, call) => displaced.mock.invocationCallOrder[call]! > firstReport,
    );
    const running = rowsOf(list).reduce(
      (sum, row) => sum + row.getAnimations().length,
      0,
    );

    await release();
    expect(faults).toEqual([]);
    expect(running).toBeGreaterThan(0);
    expect(report.mock.contexts.length).toBeGreaterThan(0);
    expect(report.mock.contexts.every((context) => context === sink)).toBe(
      true,
    );
    expect(settledInFlight.length).toBeGreaterThan(0);
    expect(settledInFlight.every((context) => context === sink)).toBe(true);
  });

  it('drag:DRD-50 should settle each row y() measures by asking the sink about that row', async () => {
    const list = makeList(12);
    const install = layoutAnimation({ duration: 3000 });
    let sink: DisplacementSink | null = null;

    basicSortable(list, {
      displacement: () => {
        sink = install();
        return sink;
      },
    });

    const calls = recordDisplaced(sink!, document.querySelector('#r0')!);
    const start = await press('#r0');

    await commands.pointerMove(start.x, start.y + 20, 2);
    await frames();

    // One row at a time, so that the window grows by one slot per resolution.
    for (let dy = 60; dy <= 260; dy += 40) {
      // oxlint-disable-next-line no-await-in-loop -- one resolution per step
      await moveHeld(start.x, start.y + dy);
    }

    await release();

    expectOwnRows(calls);
    // The window grew across at least three slots after slot 0.
    expect(
      new Set(calls.map((call) => call.element)).size,
    ).toBeGreaterThanOrEqual(4);
    expect(faults).toEqual([]);
    expect(log).toEqual(['start', 'end:accepted']);
  });

  it('drag:DRD-50 should settle each row of an xy() rebuild by asking the sink about that row', async () => {
    const list = makeList(
      12,
      document.body,
      'display:flex;flex-wrap:wrap;width:300px',
    );

    for (const row of rowsOf(list)) {
      row.style.cssText = 'width:100px;height:60px;touch-action:none';
    }

    const install = layoutAnimation({ duration: 3000 });
    let sink: DisplacementSink | null = null;

    basicSortable(list, {
      axis: xy(),
      displacement: () => {
        sink = install();
        return sink;
      },
    });

    const calls = recordDisplaced(sink!, document.querySelector('#r0')!);
    const start = centerOf('#r0');

    // Two committed moves: each rebuilds the field with the sink composed.
    await grab('#r0', 60, 0);
    await moveHeld(start.x + 100, start.y);
    await moveHeld(start.x + 200, start.y);
    await release();

    expectOwnRows(calls);
    // Two rebuilds of the 11 destination rows, at least.
    expect(new Set(calls.map((call) => call.element)).size).toBe(11);
    expect(calls.length).toBeGreaterThanOrEqual(22);
    expect(faults).toEqual([]);
    expect(rowsOf(list).indexOf(document.querySelector('#r0')!)).toBe(2);
  });

  it('drag:DRD-50 should settle a row in flight when the window grows over it, and hold the gap its flow position gives', async () => {
    const list = makeList(10);
    // Linear and long, so that a row in flight is drawn most of a row below its
    // flow position for the whole test.
    const install = layoutAnimation({ duration: 60_000, easing: 'linear' });
    let sink: DisplacementSink | null = null;
    const controller = basicSortable(list, {
      displacement: () => {
        sink = install();
        return sink;
      },
    });
    const dragged = document.querySelector<HTMLElement>('#r0')!;
    const calls = recordDisplaced(sink!, dragged);
    // Layout values that ignore transforms: where flow puts a row.
    const flowTop = (row: HTMLElement): number =>
      list.getBoundingClientRect().top + row.offsetTop - list.offsetTop;
    const flowCenter = (row: HTMLElement): number =>
      flowTop(row) + row.offsetHeight / 2;
    const placeholderGap = (): number => {
      const placeholder = list.querySelector('[data-drag-placeholder]')!;

      return [...list.children]
        .filter((element) => element !== dragged)
        .indexOf(placeholder);
    };
    // `y()`'s rule over the flow positions of every row, with the placeholder's
    // center as the incumbent.
    const gapFor = (pointerY: number): number => {
      const placeholder = list.querySelector<HTMLElement>(
        '[data-drag-placeholder]',
      )!;
      const destination = rowsOf(list).filter((row) => row !== dragged);
      const anchor = flowCenter(placeholder);
      let best = Math.abs(pointerY - anchor);
      let nearest = -1;

      for (const [i, row] of destination.entries()) {
        const distance = Math.abs(pointerY - flowCenter(row));

        if (distance < best) {
          best = distance;
          nearest = i;
        }
      }

      if (nearest === -1) {
        return placeholderGap();
      }

      return flowCenter(destination[nearest]!) > anchor ? nearest + 1 : nearest;
    };
    const start = await press(dragged);
    const r3 = document.querySelector<HTMLElement>('#r3')!;

    await commands.pointerMove(start.x, start.y + 20, 2);
    await frames();
    // Over r3, in one sample: one resolution, with nothing in flight, measures
    // slots 0 to 3, and one committed move displaces r1, r2 and r3 by a row up.
    await commands.pointerMove(start.x, start.y + 125);
    await frames();
    expect(placeholderGap()).toBe(3);
    await frames(2);
    expect(r3.getAnimations()).toHaveLength(1);

    // Every slot is unmeasured again, and the next resolution grows the window
    // up from the placeholder, over r3 while it is drawn about a row low.
    controller.invalidate();
    calls.length = 0;

    // Taken before the resolution, which may move the placeholder and so r3.
    const pointerY = start.y + 105;
    const expected = gapFor(pointerY);
    const settledTop = flowTop(r3);

    await moveHeld(start.x, pointerY);

    const overR3 = calls.find((call) => call.element === r3)!;

    expect(overR3.carried).toBe(true);
    expect(overR3.top - overR3.dy).toBeCloseTo(settledTop, 0);
    expect(placeholderGap()).toBe(expected);
    expect(expected).toBe(3);
    expect(r3.getAnimations()).toHaveLength(1);
    await commands.keyPress('Escape');
    expect(faults).toEqual([]);
  });
});
