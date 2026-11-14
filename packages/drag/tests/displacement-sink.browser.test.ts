/**
 * The sortable tests that read the displacement sink's `report` and `displaced`,
 * which only the unpublished installer types declare. They run in the source
 * projects only.
 */
import { ancestry, type Space } from '@ydinjs/box-quad';
import { describe, expect, it, vi } from 'vitest';
import type {
  AxisContext,
  DisplacementSink,
  InsertionGeometry,
} from '../src/sortable/axis.ts';
import { type Insertion, insertionAt } from '../src/sortable/domain.ts';
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

  Element.prototype.getBoundingClientRect = function getBoundingClientRect(
    this: Element,
  ) {
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

/** One vector `xy()` passed to the sink. */
type Report = Readonly<{ id: string; dx: number; dy: number }>;

/**
 * A wrapping field of 100 × 60 cells, three per row in a 300 px flex container,
 * with `c0` dragged: hidden, and a placeholder in its place. `add` appends cells.
 */
function wrappingField(count: number) {
  const list = document.createElement('div');
  const cells: HTMLElement[] = [];
  const add = (n: number): void => {
    for (let i = 0; i < n; i += 1) {
      const cell = document.createElement('div');

      cell.id = `c${cells.length}`;
      cell.style.cssText = 'width:100px;height:60px;background:#ddd';
      list.append(cell);
      cells.push(cell);
    }
  };

  list.style.cssText = 'display:flex;flex-wrap:wrap;width:300px;margin:8px';
  add(count);

  const placeholder = document.createElement('div');
  const dragged = cells[0]!;

  placeholder.style.cssText = 'width:100px;height:60px';
  dragged.before(placeholder);
  dragged.style.display = 'none';
  document.body.append(list);

  return { list, cells, placeholder, dragged, add };
}

/**
 * Where flow puts `cell`, in viewport units, whatever an animation draws. It reads
 * layout offsets, which ignore transforms, and nothing from the index.
 */
function flowPosition(list: HTMLElement, cell: HTMLElement): [number, number] {
  const rect = list.getBoundingClientRect();

  return [
    rect.left + cell.offsetLeft - list.offsetLeft,
    rect.top + cell.offsetTop - list.offsetTop,
  ];
}

/** Records every report, and delegates each call to `inner` when there is one. */
function recordingSink(
  reports: Report[],
  inner: DisplacementSink | null,
): DisplacementSink {
  return {
    get dx() {
      return inner ? inner.dx : 0;
    },
    get dy() {
      return inner ? inner.dy : 0;
    },
    report(element, dx, dy, reportSpace) {
      reports.push({ id: element.id, dx, dy });
      inner?.report(element, dx, dy, reportSpace);
    },
    displaced: (element) => (inner ? inner.displaced(element) : false),
    retire() {
      inner?.retire();
    },
  };
}

/**
 * Drives `xy()` the way an operation does: for each target, a resolution at the
 * target cell's flow center, the placeholder moved to the gap it returns, then
 * `moved`. After each committed move, every reported vector is its cell's flow
 * travel, negated, and every unreported cell kept its flow position.
 */
function driveCommittedMoves(
  setup: ReturnType<typeof wrappingField>,
  geometry: InsertionGeometry,
  context: AxisContext,
  reports: Report[],
  version: number,
  targets: readonly number[],
): void {
  const { list, cells, placeholder, dragged } = setup;
  const snapshot = { items: cells.slice(), version };
  const destination = cells.filter((cell) => cell !== dragged);
  let insertion: Insertion = insertionAt(
    destination,
    [...list.children]
      .filter((element) => element !== dragged)
      .indexOf(placeholder),
  );

  for (const target of targets) {
    const [x, y] = flowPosition(list, destination[target]!);
    const query = {
      pointerX: x + 50,
      pointerY: y + 30,
      snapshot,
      insertion,
      item: dragged,
    };
    const resolved = geometry.resolve(query, context);

    expect(resolved).not.toBeNull();

    const before = destination.map((cell) => flowPosition(list, cell));

    if (resolved!.after) {
      resolved!.after.before(placeholder);
    } else {
      resolved!.before!.after(placeholder);
    }

    insertion = resolved!;
    reports.length = 0;
    geometry.moved({ ...query, insertion }, context);

    const reported = new Map(reports.map((report) => [report.id, report]));

    for (const [slot, cell] of destination.entries()) {
      const [x0, y0] = before[slot]!;
      const [x1, y1] = flowPosition(list, cell);
      const report = reported.get(cell.id);

      if (report) {
        expect(report.dx).toBeCloseTo(x0 - x1, 1);
        expect(report.dy).toBeCloseTo(y0 - y1, 1);
      } else {
        expect([x0 - x1, y0 - y1]).toEqual([0, 0]);
      }
    }
  }
}

/**
 * The real `xy()` installer over a 12-cell wrapping field, with a recording sink
 * that delegates to `inner`. Retired with the sink after the test.
 */
function installXy(inner: DisplacementSink | null) {
  const setup = wrappingField(12);
  const reports: Report[] = [];
  const itemSpace: Space = [];

  ancestry(setup.list, itemSpace);

  const context: AxisContext = {
    placeholder: setup.placeholder,
    displacement: recordingSink(reports, inner),
    space: itemSpace,
  };
  const geometry = xy()();

  onCleanup(() => {
    geometry.retire();
    inner?.retire();
  });

  return { setup, reports, context, geometry };
}

describe('xy() reported vectors', () => {
  it("drag:DRD-62 should report each xy() cell's flow travel across committed moves that wrap", () => {
    const { setup, reports, context, geometry } = installXy(null);

    driveCommittedMoves(setup, geometry, context, reports, 1, [4, 9, 1, 10, 5]);
  });

  it("drag:DRD-62 should report each xy() cell's flow travel while displaced cells are still animating", () => {
    const { setup, reports, context, geometry } = installXy(
      layoutAnimation({ duration: 60_000, easing: 'linear' })(),
    );

    driveCommittedMoves(setup, geometry, context, reports, 1, [4, 9, 1, 10, 5]);

    // Running animations at the end: every move after the first measured cells
    // that an animation still drew away from their flow positions.
    expect(
      setup.cells.filter((cell) => cell.getAnimations().length > 0).length,
    ).toBeGreaterThan(0);
  });

  it("drag:DRD-62 should report each xy() cell's flow travel after the same installer retires and measures a larger collection", () => {
    const { setup, reports, context, geometry } = installXy(null);

    driveCommittedMoves(setup, geometry, context, reports, 1, [4, 9, 1, 10, 5]);
    geometry.retire();
    setup.add(9);
    driveCommittedMoves(setup, geometry, context, reports, 2, [15, 2, 19, 7]);
  });
});
