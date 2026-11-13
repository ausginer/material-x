/**
 * The sortable tests that read the displacement sink's `report` and `settle`,
 * which only the unpublished installer types declare, and the rect index's
 * layout. They run in the source projects only.
 */
import { describe, expect, it, vi } from 'vitest';
import type { DisplacementSink } from '../src/sortable/axis.ts';
import { layoutAnimation } from '../src/sortable/layout-animation.ts';
import { STRIDE, TOP } from '../src/sortable/rect-index.ts';
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

/** One `settle` call, with the rows read since the call before it. */
type SettleCall = Readonly<{
  values: number[] | Float64Array;
  items: readonly HTMLElement[];
  first: number;
  end: number;
  /** `items`'s length, and its range's elements, when the call returns. */
  length: number;
  range: readonly HTMLElement[];
  /** The destination rows whose rect was read since the previous call. */
  read: readonly Element[];
  /** A copy of the range's slots, taken when the call returns. */
  settled: number[] | Float64Array;
}>;

/**
 * Wraps `sink.settle` and the rect read, and records each call. A measurement
 * passes the cache's slot array, a `number[]` with a slot per destination row. The
 * drop's confirmation and the linear shift's probe pass a one-slot scratch, a
 * `Float64Array` of `STRIDE` values.
 */
function recordSettles(
  sink: DisplacementSink,
  dragged: HTMLElement,
): SettleCall[] {
  const calls: SettleCall[] = [];
  let read: Element[] = [];
  const readRect = Element.prototype.getBoundingClientRect;
  const settle = sink.settle.bind(sink);

  Element.prototype.getBoundingClientRect = function recorded(this: Element) {
    if (
      this !== dragged &&
      this.classList.contains('row') &&
      !this.hasAttribute('data-drag-placeholder')
    ) {
      read.push(this);
    }

    return readRect.call(this);
  };
  onCleanup(() => {
    Element.prototype.getBoundingClientRect = readRect;
  });
  sink.settle = (values, items, first, end) => {
    settle(values, items, first, end);
    calls.push({
      values,
      items,
      first,
      end,
      length: items.length,
      range: items.slice(first, end),
      read,
      settled: values.slice(first * STRIDE, end * STRIDE),
    });
    read = [];
  };

  return calls;
}

/** The calls a measurement made: it passes the slot array, not a scratch. */
function measurementsOf(calls: readonly SettleCall[]): SettleCall[] {
  return calls.filter((call) => Array.isArray(call.values));
}

/**
 * The cache's own slot array and element array, the same two objects in every
 * call, each call with the range whose rows it read.
 */
function expectCacheRanges(
  measurements: readonly SettleCall[],
  destination: number,
): void {
  expect(new Set(measurements.map((call) => call.values)).size).toBe(1);
  expect(new Set(measurements.map((call) => call.items)).size).toBe(1);

  for (const { values, length, range, read } of measurements) {
    expect(Array.isArray(values)).toBe(true);
    expect(length).toBe(destination);
    expect(read).toEqual(range);
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
    const settle = vi.spyOn(sink!, 'settle');
    const start = await press('#r0');

    await commands.pointerMove(start.x, start.y + 20, 2);
    await commands.pointerMove(start.x, start.y + 62, 3);
    await frames(3);
    await commands.pointerMove(start.x, start.y + 65);
    await frames(3);

    const firstReport = report.mock.invocationCallOrder[0]!;
    const settledInFlight = settle.mock.contexts.filter(
      (_, call) => settle.mock.invocationCallOrder[call]! > firstReport,
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

  it("drag:DRD-50 should settle each range y() measures in the cache's own buffer and element array", async () => {
    const list = makeList(12);
    const install = layoutAnimation({ duration: 3000 });
    let sink: DisplacementSink | null = null;

    basicSortable(list, {
      displacement: () => {
        sink = install();
        return sink;
      },
    });

    const calls = recordSettles(sink!, document.querySelector('#r0')!);
    const start = await press('#r0');

    await commands.pointerMove(start.x, start.y + 20, 2);
    await frames();

    // One row at a time, so that the window grows by one slot per resolution.
    for (let dy = 60; dy <= 260; dy += 40) {
      // oxlint-disable-next-line no-await-in-loop -- one resolution per step
      await moveHeld(start.x, start.y + dy);
    }

    await release();

    const measurements = measurementsOf(calls);

    expectCacheRanges(measurements, 11);
    expect(
      measurements.filter((call) => call.first > 0).length,
    ).toBeGreaterThanOrEqual(3);
    expect(faults).toEqual([]);
    expect(log).toEqual(['start', 'end:accepted']);
    // The confirmation and the probe: one slot, its own row.
    for (const { items, first, end, range, read } of calls) {
      if (!measurements.some((call) => call.items === items)) {
        expect([first, end]).toEqual([0, 1]);
        expect(read).toEqual(range);
      }
    }
  });

  it("drag:DRD-50 should settle each xy() rebuild in the cache's own buffer and element array", async () => {
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

    const calls = recordSettles(sink!, document.querySelector('#r0')!);
    const start = centerOf('#r0');

    // Two committed moves: each rebuilds the field with the sink composed.
    await grab('#r0', 60, 0);
    await moveHeld(start.x + 100, start.y);
    await moveHeld(start.x + 200, start.y);
    await release();

    const measurements = measurementsOf(calls);

    expectCacheRanges(measurements, 11);
    expect(
      measurements.filter((call) => call.first === 0 && call.end === 11).length,
    ).toBeGreaterThanOrEqual(2);
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
    const calls = recordSettles(sink!, dragged);
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

    const overR3 = measurementsOf(calls).find((call) =>
      call.range.includes(r3),
    )!;

    expect(overR3.first).toBeGreaterThan(0);
    expect(overR3.settled[overR3.range.indexOf(r3) * STRIDE + TOP]).toBeCloseTo(
      settledTop,
      0,
    );
    expect(placeholderGap()).toBe(expected);
    expect(expected).toBe(3);
    expect(r3.getAnimations()).toHaveLength(1);
    await commands.keyPress('Escape');
    expect(faults).toEqual([]);
  });
});
