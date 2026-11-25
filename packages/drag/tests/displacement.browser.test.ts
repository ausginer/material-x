/**
 * Every row move that the library makes, with `layoutAnimation`: a key move, a drop
 * that moves the gap, and a return home. The row animations are so long that a frame
 * moves nothing, so a row that is drawn elsewhere has jumped. A test ends them itself
 * to see where the rows stand.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { landing } from '../src/sortable/landing.ts';
import {
  layoutAnimation,
  type LayoutAnimationOptions,
} from '../src/sortable/layout-animation.ts';
import { xy } from '../src/sortable/xy.ts';
import {
  ReorderResolution,
  type OnReorder,
  type ReorderRequest,
  type SortableConfig,
  type SortableController,
} from '../src/sortable.ts';
import {
  basicSortable,
  canEmulateReducedMotion,
  commands,
  faultMessages,
  frames,
  log,
  makeList,
  onCleanup,
  order,
  row,
  rowsOf,
  wait,
} from './support/harness.ts';

// An hour: a loaded machine's slow frame still moves a row by nothing.
const TIMING = { duration: 3_600_000, easing: 'linear' } as const;

const timing = () => TIMING;

type Axis = 'y' | 'xy';

type Fixture = Readonly<{ list: HTMLElement; controller: SortableController }>;

/** Five rows of different sizes: a column of 100 px, or a field that wraps. */
function build(
  axis: Axis = 'y',
  config: Partial<SortableConfig> = {},
  options: LayoutAnimationOptions = { timing },
): Fixture {
  const list = makeList(
    5,
    document.body,
    `position:absolute;top:0;left:0;${axis === 'xy' ? 'display:flex;flex-wrap:wrap;' : ''}`,
  );

  for (const [i, element] of rowsOf(list).entries()) {
    element.tabIndex = 0;
    element.textContent = '';
    element.style.width =
      axis === 'xy' ? `${[60, 90, 70, 60, 80][i]}px` : '100px';
    element.style.height =
      axis === 'xy' ? '40px' : `${[40, 60, 30, 50, 40][i]}px`;
  }

  const controller = basicSortable(list, {
    displacement: layoutAnimation(options),
    ...(axis === 'xy' ? { axis: xy() } : {}),
    ...config,
  });

  return { list, controller };
}

type Point = readonly [left: number, top: number];

function drawn(element: HTMLElement): Point {
  const { left, top } = element.getBoundingClientRect();

  return [left, top];
}

/** The rows that an operation can displace, and where each is drawn. */
function positions(
  list: HTMLElement,
  item: HTMLElement,
): ReadonlyMap<HTMLElement, Point> {
  return new Map(
    rowsOf(list)
      .filter((element) => element !== item)
      .map((element) => [element, drawn(element)]),
  );
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Ends the rows' animations, so that each row is drawn where it stands. */
function finish(rows: Iterable<HTMLElement>): void {
  for (const element of rows) {
    for (const animation of element.getAnimations()) {
      animation.finish();
    }
  }
}

/** The greatest distance of a row from where it was drawn in `before`. */
function farthest(before: ReadonlyMap<HTMLElement, Point>): number {
  return Math.max(
    ...[...before].map(([element, point]) => distance(point, drawn(element))),
  );
}

/**
 * The greatest distance that a row is drawn from where it is at the call, in any
 * frame until the returned function is called.
 */
function watch(list: HTMLElement, item: HTMLElement): () => number {
  const before = positions(list, item);
  let worst = 0;
  let isLive = true;
  const step = (): void => {
    if (isLive) {
      worst = Math.max(worst, farthest(before));
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
  return () => {
    isLive = false;
    return Math.max(worst, farthest(before));
  };
}

/** Drops `r0` with no frame between its last move and the release. */
async function flick(
  axis: Axis,
  list: HTMLElement,
): Promise<
  Readonly<{ before: ReadonlyMap<HTMLElement, Point>; stop: () => number }>
> {
  const [left, top] = drawn(row('r0'));
  const native = requestAnimationFrame;

  await commands.pointerMove(left + 20, top + 10);
  await commands.pointerDown();
  await commands.pointerMove(left + 30, top + 14, 2);
  await frames();

  const stop = watch(list, row('r0'));
  const before = positions(list, row('r0'));

  // No frame resolves the move, so the drop's resolution is the first to see it.
  globalThis.requestAnimationFrame = () => 0;
  onCleanup(() => {
    globalThis.requestAnimationFrame = native;
  });
  await commands.pointerMove(
    left + (axis === 'xy' ? 110 : 20),
    top + (axis === 'xy' ? 20 : 120),
  );
  await commands.pointerUp();
  globalThis.requestAnimationFrame = native;
  await frames(3);
  return { before, stop };
}

/** Whether each row that the action displaced is drawn where it was. */
async function expectHeld(
  list: HTMLElement,
  item: HTMLElement,
  action: () => unknown,
): Promise<void> {
  const before = positions(list, item);
  const stop = watch(list, item);

  await action();
  await frames(3);
  expect(stop()).toBeLessThan(1);
  // The action moved at least one row, so holding it is the animations' work.
  finish(before.keys());
  expect(farthest(before)).toBeGreaterThan(10);
}

/** Whether no row moves, and none has an animation that draws it elsewhere. */
async function expectStill(
  list: HTMLElement,
  item: HTMLElement,
  action: () => unknown,
): Promise<void> {
  const before = positions(list, item);
  const stop = watch(list, item);

  await action();
  await frames(3);
  expect(stop()).toBeLessThan(1);
  finish(before.keys());
  expect(farthest(before)).toBeLessThan(1);
}

async function key(id: string, name: string): Promise<void> {
  row(id).focus();
  await commands.keyPress(name);
}

/** Drags `id` over its neighbors and holds it. */
async function hold(axis: Axis, id = 'r0'): Promise<void> {
  const [left, top] = drawn(row(id));

  await commands.pointerMove(left + 20, top + 10);
  await commands.pointerDown();
  await commands.pointerMove(left + 30, top + 12, 2);
  await frames();
  await commands.pointerMove(
    left + (axis === 'xy' ? 110 : 20),
    top + (axis === 'xy' ? 20 : 120),
    2,
  );
  await frames(3);
}

/** Drags `id` over the row `over`, with the rows at rest. */
async function holdOver(id: string, over: string): Promise<void> {
  const [left, top] = drawn(row(id));
  const [overLeft, overTop] = drawn(row(over));

  await commands.pointerMove(left + 20, top + 10);
  await commands.pointerDown();
  await commands.pointerMove(left + 30, top + 12, 2);
  await frames();
  await commands.pointerMove(overLeft + 20, overTop + 10, 3);
  await frames(3);
  finish(document.querySelectorAll<HTMLElement>('.row'));
}

/** The same as `hold`, with the rows at rest. */
async function holdDisplaced(axis: Axis, id?: string): Promise<void> {
  await hold(axis, id);
  finish(document.querySelectorAll<HTMLElement>('.row'));
}

type Verdict = Readonly<{
  onReorder: OnReorder;
  resolve(resolution: ReorderResolution): void;
}>;

/** An `onReorder` that the test resolves. */
function pending(): Verdict {
  const { promise, resolve } = Promise.withResolvers<ReorderResolution>();

  return { onReorder: () => promise, resolve };
}

/** A key move of `r0` that waits for its verdict, with the rows at rest. */
async function keyPending(
  axis: Axis,
  config: Partial<SortableConfig>,
): Promise<Fixture & Readonly<{ verdict: Verdict }>> {
  const verdict = pending();
  const fixture = build(axis, { onReorder: verdict.onReorder, ...config });

  await key('r0', 'ArrowDown');
  await frames();
  finish(rowsOf(fixture.list));
  return { ...fixture, verdict };
}

const commit: OnReorder = ({ item, next }) => {
  item.parentElement!.insertBefore(item, next);
  return ReorderResolution.accept();
};

const commitLater: OnReorder = async (request, context) => {
  await wait(100);
  return await commit(request, context);
};

/** Moves the rows around the item, as a keyed renderer may. */
const commitNeighbors: OnReorder = ({ item, from, to }) => {
  const list = item.parentElement!;
  const rows = rowsOf(list);

  if (to > from) {
    for (const moved of rows.slice(from + 1, to + 1)) {
      item.before(moved);
    }
  } else {
    item.after(...rows.slice(to, from));
  }

  return ReorderResolution.accept();
};

/** Appends every row in `rows`' order, as a renderer that keeps no position may. */
function appendAll(list: HTMLElement, rows: readonly HTMLElement[]): void {
  for (const element of rows) {
    list.append(element);
  }
}

/** Appends every row, with the item at `index`, or else where the request asks. */
function commitAll(
  { item, to }: ReorderRequest,
  index = to,
): ReorderResolution {
  const list = item.parentElement!;
  const rows = rowsOf(list).filter((element) => element !== item);

  rows.splice(index, 0, item);
  appendAll(list, rows);
  return ReorderResolution.accept();
}

/** Puts every row back in the order that it has. */
function putBack({ item }: ReorderRequest): void {
  const list = item.parentElement!;

  appendAll(list, rowsOf(list));
}

const rejectAll: OnReorder = (request) => {
  putBack(request);
  return ReorderResolution.reject();
};

const COMMITS = [
  ['at once', commit],
  ['after 100 ms', commitLater],
  ["by moving the neighbor's node", commitNeighbors],
] as const;

const AXES = ['y', 'xy'] as const;
const LANDINGS = [
  ['with landing', { landing: landing({ duration: 100 }) }],
  ['without landing', {}],
] as const;

describe.each(AXES)('#265 the rows that %s() displaces', (axis) => {
  it('should be drawn where they were after a drop whose last resolution moves the gap', async () => {
    const { list } = build(axis);
    const { before, stop } = await flick(axis, list);

    expect(order(list)).not.toBe('r0,r1,r2,r3,r4');
    expect(stop()).toBeLessThan(1);
    finish(before.keys());
    expect(farthest(before)).toBeGreaterThan(10);
  });

  describe.each(LANDINGS)('%s', (_, config) => {
    it('should be drawn where they were after Escape', async () => {
      const { list } = build(axis, config);

      await holdDisplaced(axis);
      await expectHeld(list, row('r0'), () => commands.keyPress('Escape'));
      expect(log).toEqual(['start', 'end:canceled']);
    });

    it('should be drawn where they were after requestCancel', async () => {
      const { list, controller } = build(axis, config);

      await holdDisplaced(axis);
      await expectHeld(list, row('r0'), () => {
        controller.requestCancel();
      });
    });

    it('should be drawn where they were after a cancel right after invalidate', async () => {
      const { list, controller } = build(axis, config);

      await holdDisplaced(axis);
      await expectHeld(list, row('r0'), () => {
        controller.invalidate();
        controller.requestCancel();
      });
    });

    it('should be drawn where they were after a later rejection', async () => {
      const { list, verdict } = await keyPending(axis, config);

      await expectHeld(list, row('r0'), () => {
        verdict.resolve(ReorderResolution.reject());
      });
      expect(log).toEqual(['start', 'end:rejected']);
    });

    it('should be drawn where they were after an accepted move that is never committed', async () => {
      const { list, verdict } = await keyPending(axis, config);

      await expectHeld(list, row('r0'), () => {
        verdict.resolve(ReorderResolution.accept());
      });
      expect(log).toEqual(['start', 'end:accepted']);
    });

    it('should be drawn where they were after a return when the consumer emptied its array', async () => {
      const items: HTMLElement[] = [];
      const { list, verdict } = await keyPending(axis, {
        ...config,
        items: () => {
          if (items.length === 0) {
            items.push(...rowsOf(document.querySelector('#list')!));
          }

          return items;
        },
      });

      items.length = 0;
      await expectHeld(list, row('r0'), () => {
        verdict.resolve(ReorderResolution.reject());
      });
    });

    it('should stay where they are after a rejection at once', async () => {
      const { list } = build(axis, {
        ...config,
        onReorder: () => ReorderResolution.reject(),
      });

      await expectStill(list, row('r0'), () => key('r0', 'ArrowDown'));
    });

    it('should stay where they are after an onReorder that throws', async () => {
      const { list } = build(axis, {
        ...config,
        onReorder: () => {
          throw new Error('no');
        },
      });

      await expectStill(list, row('r0'), () => key('r0', 'ArrowDown'));
      expect(faultMessages()).toEqual(['no']);
    });

    it.each(COMMITS)(
      'should be drawn where they were after a key move that is committed %s',
      async (_name, onReorder) => {
        const { list } = build(axis, { ...config, onReorder });

        await expectHeld(list, row('r0'), async () => {
          await key('r0', 'ArrowDown');
          await wait(150);
        });
        expect(order(list)).toBe('r1,r0,r2,r3,r4');
      },
    );

    it('should be drawn where they were after a key move up', async () => {
      const { list } = build(axis, config);

      await expectHeld(list, row('r2'), () => key('r2', 'ArrowUp'));
      expect(order(list)).toBe('r0,r2,r1,r3,r4');
    });
  });

  describe.each(LANDINGS)(
    'and a consumer moves around the placeholder, %s',
    (_, config) => {
      it.each([
        ['down', 'r1', 'ArrowDown', 'r0,r2,r1,r3,r4'],
        ['up', 'r3', 'ArrowUp', 'r0,r1,r3,r2,r4'],
      ])(
        'should be drawn where they were after a key move %s that appends every row',
        async (_name, id, name, expected) => {
          const { list } = build(axis, {
            ...config,
            onReorder: (request) => commitAll(request),
          });

          await expectHeld(list, row(id), () => key(id, name));
          expect(order(list)).toBe(expected);
        },
      );

      it('should be drawn where they were after a key move whose later verdict appends every row', async () => {
        const { list } = build(axis, {
          ...config,
          onReorder: async (request) => {
            await wait(50);
            return commitAll(request);
          },
        });

        await expectHeld(list, row('r1'), async () => {
          await key('r1', 'ArrowDown');
          await wait(150);
        });
        expect(order(list)).toBe('r0,r2,r1,r3,r4');
      });

      it.each([
        ['down', 'r0', 'r3'],
        ['up', 'r4', 'r1'],
      ])(
        'should stay where they are after a drop %s that appends every row',
        async (_name, id, over) => {
          const { list } = build(axis, {
            ...config,
            onReorder: (request) => commitAll(request),
          });

          await holdOver(id, over);
          await expectStill(list, row(id), () => commands.pointerUp());
          expect(order(list)).not.toBe('r0,r1,r2,r3,r4');
          expect(log).toEqual(['start', 'end:accepted']);
        },
      );

      it('should stay where they are after a drop whose later verdict appends every row', async () => {
        const { list } = build(axis, {
          ...config,
          onReorder: async (request) => {
            await wait(50);
            return commitAll(request);
          },
        });

        await holdOver('r0', 'r3');
        await expectStill(list, row('r0'), async () => {
          await commands.pointerUp();
          await wait(100);
        });
        expect(log).toEqual(['start', 'end:accepted']);
      });

      it('should be drawn where they were after a flick that appends every row', async () => {
        const { list } = build(axis, {
          ...config,
          onReorder: (request) => commitAll(request),
        });
        const { before, stop } = await flick(axis, list);

        expect(order(list)).not.toBe('r0,r1,r2,r3,r4');
        expect(stop()).toBeLessThan(1);
        finish(before.keys());
        expect(farthest(before)).toBeGreaterThan(10);
      });

      it('should stay where they are after a key move that puts every row back and rejects', async () => {
        const { list } = build(axis, { ...config, onReorder: rejectAll });

        await expectStill(list, row('r1'), () => key('r1', 'ArrowDown'));
        expect(log).toEqual(['start', 'end:rejected']);
      });

      it('should be drawn where they were after a drop that puts every row back and rejects', async () => {
        const { list } = build(axis, { ...config, onReorder: rejectAll });

        await holdOver('r0', 'r3');
        await expectHeld(list, row('r0'), () => commands.pointerUp());
        expect(log).toEqual(['start', 'end:rejected']);
      });

      it('should be drawn where they were after a drop that puts every row back and throws', async () => {
        const { list } = build(axis, {
          ...config,
          onReorder(request) {
            putBack(request);
            throw new Error('no');
          },
        });

        await holdOver('r0', 'r3');
        await expectHeld(list, row('r0'), () => commands.pointerUp());
        expect(faultMessages()).toEqual(['no']);
      });

      it.each([
        ['another place', 'r0', 'r3', 1, 'r1,r0,r2,r3,r4'],
        ['the first place', 'r1', 'r4', 0, 'r1,r0,r2,r3,r4'],
      ])(
        'should be drawn where they were after a drop that puts the item in %s',
        async (_name, id, over, index, expected) => {
          const { list } = build(axis, {
            ...config,
            onReorder: (request) => commitAll(request, index),
          });

          await holdOver(id, over);
          await expectHeld(list, row(id), () => commands.pointerUp());
          expect(order(list)).toBe(expected);
        },
      );

      it('should stay where they are after a cancel in onStart of a key move', async () => {
        const fixture = build(axis, {
          ...config,
          onStart() {
            fixture.controller.requestCancel();
          },
        });
        const { list } = fixture;

        await expectStill(list, row('r1'), () => key('r1', 'ArrowDown'));
      });
    },
  );

  it('should keep their animations through the commit and the release', async () => {
    const verdict = pending();
    const { list } = build(axis, {
      onReorder: async (request, context) => {
        await verdict.onReorder(request, context);
        return await commitNeighbors(request, context);
      },
    });

    await key('r0', 'ArrowDown');
    await frames();

    const before = row('r1').getAnimations();

    verdict.resolve(ReorderResolution.accept());
    await frames(3);
    expect(before).toHaveLength(1);
    expect(order(list)).toBe('r1,r0,r2,r3,r4');
    expect(row('r1').getAnimations()).toEqual(before);
    expect(before[0]!.playState).toBe('running');
  });
});

describe('#265 a row move', () => {
  it('should start from the distance that the flow moved the row', async () => {
    build();
    await key('r0', 'ArrowDown');

    const [animation] = row('r1').getAnimations();

    expect(
      (animation!.effect as KeyframeEffect).getKeyframes()[0],
    ).toMatchObject({
      translate: '0px 40px',
    });
  });

  it('should be reported before onReorder', async () => {
    const seen: number[] = [];

    build('y', {
      onReorder(request, context) {
        seen.push(row('r1').getAnimations().length);
        return commit(request, context);
      },
    });
    await key('r0', 'ArrowDown');
    expect(seen).toEqual([1]);
  });

  it('should be followed by another from where the row is drawn', async () => {
    const { list } = build('y', { landing: landing({ duration: 10 }) });

    await key('r0', 'ArrowDown');
    await wait(50);

    const [animation] = row('r1').getAnimations();

    animation!.pause();
    animation!.currentTime = TIMING.duration / 2;

    const before = drawn(row('r1'));

    await key('r0', 'ArrowUp');
    await frames(3);
    expect(order(list)).toBe('r0,r1,r2,r3,r4');
    expect(distance(before, drawn(row('r1')))).toBeLessThan(1);
  });

  it('should hold the rows after a cancel of a drag whose collection grew among them', async () => {
    const { list, controller } = build();

    await holdDisplaced('y');

    const added = document.createElement('div');

    added.className = 'row';
    added.style.cssText = 'width:100px;height:25px';
    // Between the home gap and the placeholder, so the return crosses it.
    row('r1').after(added);
    controller.invalidate();
    await expectHeld(list, row('r0'), () => {
      controller.requestCancel();
    });
  });

  it.each(LANDINGS)(
    'should hold the rows when the item leaves the collection and stays in the list, %s',
    async (_, config) => {
      let hasItem = true;
      const { list, controller } = build('y', {
        ...config,
        items: () =>
          rowsOf(document.querySelector('#list')!).filter(
            (element) => hasItem || element.id !== 'r1',
          ),
      });

      await holdDisplaced('y', 'r1');
      hasItem = false;
      await expectHeld(list, row('r1'), () => {
        controller.invalidate();
      });
      expect(log).toEqual(['start', 'end:canceled']);
    },
  );

  it('should start no animation in a drop on its own gap', async () => {
    const { list } = build();
    const [left, top] = drawn(row('r0'));

    await commands.pointerMove(left + 20, top + 10);
    await commands.pointerDown();
    await commands.pointerMove(left + 32, top + 12, 2);
    await frames();
    await commands.pointerUp();
    await frames();
    expect(log).toEqual(['start', 'end:noop']);
    expect(rowsOf(list).flatMap((element) => element.getAnimations())).toEqual(
      [],
    );
  });
});

describe('#265 a return that has no place to go', () => {
  it('should start no animation and add no fault when the anchor left the container', async () => {
    const { list, verdict } = await keyPending('y', {});

    row('r1').remove();
    verdict.resolve(ReorderResolution.reject());
    await frames(3);
    expect(faultMessages()).toEqual([]);
    expect(rowsOf(list).flatMap((element) => element.getAnimations())).toEqual(
      [],
    );
  });

  it('should start no animation and add no fault when the placeholder was removed', async () => {
    const { list, verdict } = await keyPending('y', {});

    list.querySelector('[data-drag-placeholder]')!.remove();
    verdict.resolve(ReorderResolution.reject());
    await frames(3);
    expect(faultMessages()).toEqual([]);
    expect(rowsOf(list).flatMap((element) => element.getAnimations())).toEqual(
      [],
    );
  });

  it('should start no animation and add no fault when the item was removed', async () => {
    const { list, verdict } = await keyPending('y', {});

    row('r0').remove();
    verdict.resolve(ReorderResolution.reject());
    await frames(3);
    expect(faultMessages()).toEqual([]);
    expect(rowsOf(list).flatMap((element) => element.getAnimations())).toEqual(
      [],
    );
  });

  it('should start no animation and add no fault when the item was moved to another container', async () => {
    const { list, verdict } = await keyPending('y', {});
    const other = document.createElement('div');

    document.body.append(other);
    onCleanup(() => other.remove());
    other.append(row('r0'));
    verdict.resolve(ReorderResolution.reject());
    await frames(3);
    expect(faultMessages()).toEqual([]);
    expect(rowsOf(list).flatMap((element) => element.getAnimations())).toEqual(
      [],
    );
  });

  it('should start no animation and add no fault when the anchor of the drop left the container', async () => {
    const { list, verdict } = await keyPending('y', {});

    // The drop's gap is between r1 and r2, and the home gap is before r1.
    row('r2').remove();
    verdict.resolve(ReorderResolution.reject());
    await frames(3);
    expect(faultMessages()).toEqual([]);
    expect(list.querySelector('[data-drag-placeholder]')).toBeNull();
  });

  it('should report what a landing reports without displacement', async () => {
    const { verdict } = await keyPending('y', { landing: landing() });

    row('r1').remove();
    verdict.resolve(ReorderResolution.reject());
    await frames(3);
    expect(faultMessages()).toEqual(['sortable/anchor-outside-container']);
  });
});

describe('#265 a row lifted while its animation runs', () => {
  /** `r1` in flight, 20 px from its place. */
  async function inFlight(
    config: Partial<SortableConfig> = {},
  ): Promise<Animation> {
    build('y', config);
    await key('r0', 'ArrowDown');
    await frames();

    const [animation] = row('r1').getAnimations();

    animation!.pause();
    animation!.currentTime = TIMING.duration / 2;
    return animation!;
  }

  it('should be drawn where it was, with its animation ended', async () => {
    const verdict = pending();
    let onReorder = commit;
    const animation = await inFlight({
      onReorder: (request, context) => onReorder(request, context),
    });
    const before = drawn(row('r1'));

    ({ onReorder } = verdict);
    await key('r1', 'ArrowDown');
    await frames();
    expect(row('r1').matches(':popover-open')).toBe(true);
    expect(distance(before, drawn(row('r1')))).toBeLessThan(1);
    expect(animation.playState).toBe('idle');
  });

  it('should keep its animation when the press activates nothing', async () => {
    let declined = false;
    const animation = await inFlight({
      items: () =>
        rowsOf(document.querySelector('#list')!).filter(
          (element) => !declined || element.id !== 'r1',
        ),
    });
    const [left, top] = drawn(row('r1'));

    await commands.pointerMove(left + 10, top + 10);
    await commands.pointerDown();
    declined = true;
    await commands.pointerMove(left + 10, top + 40, 2);
    await frames();
    expect(log).toEqual(['start', 'end:accepted']);
    expect(animation.playState).toBe('paused');
  });
});

describe('#265 timing', () => {
  it('should be called when an animation starts, and give its values', async () => {
    let calls = 0;

    build(
      'y',
      {},
      {
        timing: () => {
          calls += 1;
          return { duration: 1000 * calls, easing: 'ease-in' };
        },
      },
    );
    await key('r0', 'ArrowDown');
    expect(calls).toBe(1);
    expect(row('r1').getAnimations()[0]!.effect!.getTiming()).toMatchObject({
      duration: 1000,
      easing: 'ease-in',
    });
    await key('r0', 'ArrowDown');
    expect(calls).toBe(2);
    expect(row('r2').getAnimations()[0]!.effect!.getTiming()).toMatchObject({
      duration: 2000,
    });
  });

  it('should be 160 ms and ease-out without one', async () => {
    build('y', {}, {});
    await key('r0', 'ArrowDown');
    expect(row('r1').getAnimations()[0]!.effect!.getTiming()).toMatchObject({
      duration: 160,
      easing: 'ease-out',
    });
  });

  it('should end the operation with a fault when it throws', async () => {
    const { list } = build(
      'y',
      {},
      {
        timing: () => {
          throw new Error('no timing');
        },
      },
    );

    await key('r0', 'ArrowDown');
    await frames();
    expect(faultMessages()[0]).toBe('no timing');
    expect(order(list)).toBe('r0,r1,r2,r3,r4');
    expect(list.querySelector('[data-drag-placeholder]')).toBeNull();
  });
});

describe.runIf(canEmulateReducedMotion)('#265 prefers-reduced-motion', () => {
  beforeEach(() => {
    onCleanup(() => commands.emulateReducedMotion(false));
  });

  it.each(AXES)(
    'should start no animation in a key move of %s()',
    async (axis) => {
      await commands.emulateReducedMotion(true);

      const { list } = build(axis);

      await key('r0', 'ArrowDown');
      expect(order(list)).toBe('r1,r0,r2,r3,r4');
      expect(
        rowsOf(list).flatMap((element) => element.getAnimations()),
      ).toEqual([]);
    },
  );

  it('should start no animation in a pointer drag', async () => {
    await commands.emulateReducedMotion(true);

    const { list } = build();

    await hold('y');
    expect(rowsOf(list).flatMap((element) => element.getAnimations())).toEqual(
      [],
    );
    await commands.pointerUp();
    expect(order(list)).not.toBe('r0,r1,r2,r3,r4');
  });

  it('should not call timing', async () => {
    let calls = 0;

    await commands.emulateReducedMotion(true);
    build(
      'y',
      {},
      {
        timing: () => {
          calls += 1;
          return TIMING;
        },
      },
    );
    await key('r0', 'ArrowDown');
    expect(calls).toBe(0);
  });

  it('should end a running animation at the next report', async () => {
    build();
    await key('r0', 'ArrowDown');
    expect(row('r1').getAnimations()).toHaveLength(1);
    await commands.emulateReducedMotion(true);
    await key('r0', 'ArrowUp');
    expect(row('r1').getAnimations()).toEqual([]);
  });

  it('should start animations again once the preference is gone', async () => {
    await commands.emulateReducedMotion(true);
    build();
    await key('r0', 'ArrowDown');
    await commands.emulateReducedMotion(false);
    await key('r0', 'ArrowUp');
    expect(row('r1').getAnimations()).toHaveLength(1);
  });
});

describe('#265 the rects that an operation reads', () => {
  /** The rects that the library reads while `action` runs, with a landing. */
  async function reads(action: () => Promise<unknown>): Promise<number> {
    const native = Element.prototype.getBoundingClientRect;
    let count = 0;

    Element.prototype.getBoundingClientRect = function getBoundingClientRect(
      this: Element,
    ) {
      count += 1;
      return native.call(this);
    };

    try {
      await action();
    } finally {
      Element.prototype.getBoundingClientRect = native;
    }

    return count;
  }

  const config = { landing: landing({ duration: 10 }) };
  const EXPECTED = [
    { axis: 'y', displacement: false, key: 2, drop: 2, cancel: 1 },
    { axis: 'xy', displacement: false, key: 2, drop: 2, cancel: 1 },
    // The crossed row twice for a key, and the two crossed rows for a return.
    { axis: 'y', displacement: true, key: 4, drop: 2, cancel: 5 },
    // All four other rows, twice.
    { axis: 'xy', displacement: true, key: 10, drop: 2, cancel: 9 },
  ] as const;

  describe.each(EXPECTED)(
    '$axis(), with displacement: $displacement',
    ({ axis, displacement, key: inKey, drop: inDrop, cancel: inCancel }) => {
      /** Without displacement, the slot is empty. */
      function mount(): Fixture {
        return build(axis, {
          ...config,
          ...(displacement ? {} : { displacement: undefined as never }),
        });
      }

      it('should be as many in a key move', async () => {
        mount();
        row('r0').focus();
        expect(await reads(() => commands.keyPress('ArrowDown'))).toBe(inKey);
      });

      it('should be as many in a drop after a resolved move', async () => {
        mount();
        await holdDisplaced(axis);
        await commands.pointerMove(
          axis === 'xy' ? 111 : 21,
          axis === 'xy' ? 20 : 120,
        );
        await frames(3);
        expect(await reads(() => commands.pointerUp())).toBe(inDrop);
      });

      it('should be as many in a cancel', async () => {
        mount();
        await holdDisplaced(axis);
        await frames(3);
        expect(await reads(() => commands.keyPress('Escape'))).toBe(inCancel);
      });
    },
  );
});
