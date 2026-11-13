/**
 * `drag:DRD-35`, `drag:DRI-8`, `drag:DRI-9` and `drag:DRI-10`: the lists that
 * `queue()` and `stack()` make, and `requestStep` and `use` with a receiver.
 */
import { describe, expect, it, vi } from 'vitest';
import type { BehaviorOperation, Drag, Outcome } from '../src/draggable.ts';
import * as Callbacks from '../src/kernel/callbacks.ts';
import { layoutAnimation } from '../src/sortable/layout-animation.ts';
import { y } from '../src/sortable/y.ts';
import {
  basicSortable,
  dragAndDrop,
  faultMessages,
  grab,
  log,
  makeList,
  managed,
  release,
  targetOf,
} from './support/harness.ts';

/** An operation that names its item. */
interface Named extends BehaviorOperation {
  readonly item: HTMLElement;
}

/** One object per name, whose private method is requested with it as receiver. */
class Recorder {
  readonly name: string;
  readonly seen: Array<string | null> = [];

  constructor(name: string) {
    this.name = name;
  }

  request(drag: Pick<Drag<Named>, 'requestStep'>): void {
    drag.requestStep(this.#record, this);
  }

  #record(operation: Named | null): void {
    this.seen.push(operation ? operation.item.id : null);
    log.push(this.name);
  }
}

/** A callback that records each call's receiver and argument in `calls`. */
function recordInto(
  calls: Array<[unknown, number]>,
): (this: unknown, argument: number) => void {
  return function record(this: unknown, argument: number): void {
    calls.push([this, argument]);
  };
}

describe('drag:DRD-35 callback lists', () => {
  it('should keep duplicate checking apart from insertion', () => {
    const list = Callbacks.queue<number>();
    const calls: Array<[unknown, number]> = [];
    const callback = recordInto(calls);
    const a = {};

    expect(list._has(callback, a)).toBe(false);
    list._add(callback, a);
    expect(list._has(callback, a)).toBe(true);
    expect(list._has(callback, undefined)).toBe(false);
    expect(list._has(callback, {})).toBe(false);
    // `add` never coalesces.
    list._add(callback, a);
    list._add(callback, undefined);

    list._run(1);
    list._run(2);
    list._run(3);
    expect(list._empty).toBe(true);
    expect(calls).toEqual([
      [a, 1],
      [a, 2],
      [undefined, 3],
    ]);
  });

  it('should run a queue first in first out, each entry on its receiver', () => {
    const list = Callbacks.queue<number>();
    const calls: Array<[unknown, number]> = [];
    const callback = recordInto(calls);
    const a = {};
    const b = {};

    list._add(callback, a);
    list._add(callback, undefined);
    list._add(callback, b);
    list._run(1);
    list._run(2);
    list._run(3);
    expect(calls).toEqual([
      [a, 1],
      [undefined, 2],
      [b, 3],
    ]);
  });

  it('should run a stack last in first out, each entry on its receiver', () => {
    const list = Callbacks.stack<number>();
    const calls: Array<[unknown, number]> = [];
    const callback = recordInto(calls);
    const a = {};
    const b = {};

    list._add(callback, a);
    list._add(callback, undefined);
    list._add(callback, b);
    list._run(1);
    list._run(2);
    list._run(3);
    expect(calls).toEqual([
      [b, 1],
      [undefined, 2],
      [a, 3],
    ]);
  });

  it.each([
    ['queue', () => Callbacks.queue<number>()],
    ['stack', () => Callbacks.stack<number>()],
  ])(
    'should be empty before the first add and after the last run of a %s',
    (_, create) => {
      const list = create();
      const callback = recordInto([]);
      const emptiness = [list._empty];

      list._add(callback, undefined);
      emptiness.push(list._empty);
      list._add(callback, {});
      list._run(1);
      emptiness.push(list._empty);
      list._run(2);
      emptiness.push(list._empty);
      expect(emptiness).toEqual([true, false, false, true]);
    },
  );

  it('should remove an entry before calling it, so a throw leaves the rest', () => {
    const list = Callbacks.stack<null>();
    const ran: string[] = [];

    list._add(() => {
      ran.push('first');
    }, undefined);
    list._add(() => {
      throw new Error('last');
    }, undefined);

    expect(() => {
      list._run(null);
    }).toThrow('last');
    expect(list._empty).toBe(false);
    list._run(null);
    expect(ran).toEqual(['first']);
    expect(list._empty).toBe(true);
  });

  it('should drop every entry on clear', () => {
    const list = Callbacks.queue<number>();

    list._add(() => {
      throw new Error('never');
    }, undefined);
    list._clear();
    expect(list._empty).toBe(true);
  });
});

describe('drag:DRI-8 steps with a receiver', () => {
  it('should run one method once per receiver, in request order', async () => {
    const list = makeList(2);
    const a = new Recorder('a');
    const b = new Recorder('b');

    managed<undefined, unknown, Named>(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: (drag) => ({
        item: drag.item,
        start() {
          a.request(drag);
          b.request(drag);
          a.request(drag);
          b.request(drag);
          log.push('start finished');
        },
      }),
    });

    await grab('#r0');
    expect(log).toEqual(['start finished', 'a', 'b']);
    expect(a.seen).toEqual(['r0']);
    expect(b.seen).toEqual(['r0']);
    await release();
  });

  it('should call a step requested while idle on its receiver at once', () => {
    const list = makeList(1);
    const a = new Recorder('a');
    const panel = managed<undefined, unknown, Named>(list, {
      admit: () => null,
      activate: () => null,
    });

    a.request(panel);
    expect(a.seen).toEqual([null]);
  });

  it('should keep a step requested with no receiver apart from the same step with one', async () => {
    const list = makeList(2);
    const receivers: unknown[] = [];
    const holder = {};

    function record(this: unknown): void {
      receivers.push(this);
    }

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: (drag) => ({
        start() {
          drag.requestStep(record);
          drag.requestStep(record, holder);
          drag.requestStep(record);
        },
      }),
    });

    await grab('#r0');
    expect(receivers).toEqual([undefined, holder]);
    await release();
  });

  it('should run a pair again when its running step requests it, and coalesce a waiting one', async () => {
    const list = makeList(2);
    const other = new Recorder('other');

    /** Requests itself until `left` runs out, and `other` on every run. */
    class Looper {
      readonly drag: Drag<Named>;
      left = 2;

      constructor(drag: Drag<Named>) {
        this.drag = drag;
      }

      request(): void {
        this.drag.requestStep(this.#step, this);
      }

      #step(): void {
        log.push(`loop:${this.left}`);
        this.left -= 1;

        if (this.left > 0) {
          this.request();
        }

        other.request(this.drag);
      }
    }

    managed<undefined, unknown, Named>(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: (drag) => ({
        item: drag.item,
        start() {
          new Looper(drag).request();
        },
      }),
    });

    await grab('#r0');
    // The running pair is off the queue, so its own request queues it again,
    // ahead of the `other` it requests next. The second run finds `other` still
    // waiting, so `other` runs once.
    expect(log).toEqual(['loop:2', 'loop:1', 'other']);
    await release();
  });

  it('should keep precedence: destruction before steps, steps before the decision', async () => {
    const list = makeList(2);
    const a = new Recorder('a');
    const b = new Recorder('b');
    const panel = managed<undefined, unknown, Named>(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate: (drag) => ({
        item: drag.item,
        start() {
          panel.requestCancel('decided');
          a.request(drag);
        },
        settle() {
          log.push('settle');
        },
      }),
    });

    await grab('#r0');
    // The step runs before the decision is applied, and receives null behind it.
    expect(log).toEqual(['a', 'settle']);
    expect(a.seen).toEqual([null]);
    await release();

    log.length = 0;
    await grab('#r1');
    panel.requestStep(() => {
      b.request(panel);
      void panel.requestDestroy();
    });
    // Destruction outranks the waiting pair, and teardown drops it.
    expect(b.seen).toEqual([]);
    b.request(panel);
    expect(b.seen).toEqual([]);
  });

  it('should scope a receiver step to its operation', async () => {
    const list = makeList(3);
    const a = new Recorder('a');
    const kept: Array<Drag<Named>> = [];

    managed<undefined, unknown, Named>(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        kept.push(drag);
        return { item: drag.item };
      },
    });

    await dragAndDrop('#r0', 40);
    a.request(kept[0]!);
    expect(a.seen).toEqual([]);
    await grab('#r2');
    a.request(kept[0]!);
    expect(a.seen).toEqual([]);
    a.request(kept[1]!);
    expect(a.seen).toEqual(['r2']);
    await release();
  });

  it('should report a throw from a receiver step as a fault', () => {
    const panel = managed(makeList(1), {
      admit: () => null,
      activate: () => null,
    });
    const thrower = {
      message: 'from a receiver step',
      step(this: { message: string }): void {
        throw new Error(this.message);
      },
    };

    panel.requestStep(thrower.step, thrower);
    expect(faultMessages()).toEqual(['from a receiver step']);
  });
});

/** Records the receiver and argument of each call, under a name. */
class Cleanup {
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  dispose(outcome?: Outcome | null): void {
    log.push(
      outcome === undefined
        ? this.name
        : `${this.name}:${outcome?.type ?? null}`,
    );
  }
}

describe('drag:DRI-9 operation cleanup with a receiver', () => {
  it('should run operation cleanup last in first out, on each receiver, once per call', async () => {
    const list = makeList(2);
    const a = new Cleanup('a');
    const b = new Cleanup('b');

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        drag.use(a.dispose, a);
        drag.use(() => {
          log.push('free');
        });
        drag.use(b.dispose, b);
        // Not coalesced: every registration runs.
        drag.use(a.dispose, a);
        return {};
      },
    });

    await dragAndDrop('#r0', 40);
    expect(log).toEqual(['a:skipped', 'b:skipped', 'free', 'a:skipped']);
  });

  it('should continue the walk past a throwing receiver disposer', async () => {
    const list = makeList(2);
    const thrower = {
      message: 'from a disposer',
      dispose(this: { message: string }): void {
        throw new Error(this.message);
      },
    };
    const a = new Cleanup('a');

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        drag.use(a.dispose, a);
        drag.use(thrower.dispose, thrower);
        return {};
      },
    });

    await dragAndDrop('#r0', 40);
    expect(faultMessages()).toEqual(['from a disposer']);
    expect(log).toEqual(['a:skipped']);
  });

  it('should run a late disposer at once, on its receiver, inside the walk that adds it', async () => {
    const list = makeList(2);
    const late = new Cleanup('late');
    let kept: Drag | null = null;

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        kept = drag;
        drag.use(() => {
          log.push('first registered');
        });
        drag.use(() => {
          log.push('adder before');
          drag.use(late.dispose, late);
          log.push('adder after');
        });
        return {};
      },
    });

    await dragAndDrop('#r0', 40);
    expect(log).toEqual([
      'adder before',
      'late:skipped',
      'adder after',
      'first registered',
    ]);
    log.length = 0;
    kept!.use(late.dispose, late);
    expect(log).toEqual(['late:skipped']);
  });
});

describe('drag:DRI-10 controller cleanup with a receiver', () => {
  it('should run controller cleanup on each receiver at teardown, and a late one at once', async () => {
    const list = makeList(1);
    const a = new Cleanup('a');
    const b = new Cleanup('b');
    const panel = managed(list, { admit: () => null, activate: () => null });

    panel.use(a.dispose, a);
    panel.use(() => {
      log.push('adder before');
      panel.use(b.dispose, b);
      log.push('adder after');
    });
    panel.use(a.dispose, a);
    await panel.requestDestroy();
    expect(log).toEqual([
      'a:null',
      'adder before',
      'b:null',
      'adder after',
      'a:null',
    ]);
    log.length = 0;
    panel.use(b.dispose, b);
    expect(log).toEqual(['b:null']);
  });

  it('should leave a step requested from a disposer during teardown unrun', async () => {
    const list = makeList(1);
    const stepper = {
      step(this: { name: string }): void {
        log.push(this.name);
      },
      name: 'step',
    };
    const panel = managed(list, { admit: () => null, activate: () => null });

    panel.use(() => {
      panel.requestStep(stepper.step, stepper);
    });
    await panel.requestDestroy();
    expect(log).toEqual([]);
  });
});

describe('drag:DRD-35 capabilities passed with their receivers', () => {
  it('should call the axis and the sink on themselves', async () => {
    const list = makeList(4);
    const install = layoutAnimation();
    const geometry = y()();
    const sink = install();
    const invalidate = vi.spyOn(geometry, 'invalidate');
    const retire = vi.spyOn(geometry, 'retire');
    const retireSink = vi.spyOn(sink, 'retire');
    const controller = basicSortable(list, {
      axis: () => geometry,
      displacement: () => sink,
    });

    await grab('#r0');
    const before = invalidate.mock.calls.length;

    window.dispatchEvent(new Event('resize'));
    // The step runs at once: no pass is running.
    expect(invalidate.mock.calls.length).toBe(before + 1);
    await release();
    await controller.requestDestroy();

    expect(faultMessages()).toEqual([]);
    expect(
      invalidate.mock.contexts.every((context) => context === geometry),
    ).toBe(true);
    expect(retire.mock.contexts).toEqual([geometry]);
    expect(retireSink.mock.contexts).toEqual([sink]);
  });
});
