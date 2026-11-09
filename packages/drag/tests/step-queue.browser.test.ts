/**
 * The step-queue model on `drag/step-queue-model`: receiver-aware `requestStep`.
 * Not adopted, and the contract does not describe it.
 */
import { describe, expect, it } from 'vitest';
import type { BehaviorOperation, Drag } from '../src/draggable.ts';
import { StepQueue } from '../src/kernel/step-queue.ts';
import {
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

describe('step-queue model: the queue alone', () => {
  it('should coalesce by step and receiver together', () => {
    const queue = new StepQueue<number>();
    const calls: Array<[unknown, number]> = [];

    function step(this: unknown, argument: number): void {
      calls.push([this, argument]);
    }

    const a = {};
    const b = {};

    queue.add(step, a);
    queue.add(step, b);
    queue.add(step, a);
    queue.add(step, undefined);
    queue.add(step, undefined);

    while (queue.waiting) {
      queue.runFirst(1);
    }

    expect(calls).toEqual([
      [a, 1],
      [b, 1],
      [undefined, 1],
    ]);
  });

  it('should drop every pair on clear', () => {
    const queue = new StepQueue<number>();
    let ran = false;

    queue.add(() => {
      ran = true;
    }, undefined);
    queue.clear();
    expect(queue.waiting).toBe(false);
    expect(ran).toBe(false);
  });
});

describe('step-queue model: through the kernel', () => {
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

    // eslint-disable-next-line @typescript-eslint/unbound-method -- passed with its receiver
    panel.requestStep(thrower.step, thrower);
    expect(faultMessages()).toEqual(['from a receiver step']);
  });
});
