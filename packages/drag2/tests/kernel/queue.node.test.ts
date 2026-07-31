import { describe, expect, it, vi } from 'vitest';
import {
  clearQueue,
  createActionQueue,
  drain,
  enqueue,
} from '../../src/kernel/queue.ts';

const NOOP_PANIC = (): void => {};

describe('drain', () => {
  it('should process entries in FIFO order', () => {
    const queue = createActionQueue();
    const seen: number[] = [];

    enqueue(queue, 1, null);
    enqueue(queue, 2, null);
    enqueue(queue, 3, null);
    drain(
      queue,
      (action) => {
        seen.push(action);
      },
      NOOP_PANIC,
    );

    expect(seen).toEqual([1, 2, 3]);
  });

  it('should pair each entry with its own argument', () => {
    const queue = createActionQueue();
    const seen: unknown[] = [];

    enqueue(queue, 1, 'a');
    enqueue(queue, 2, 'b');
    drain(
      queue,
      (_action, argument) => {
        seen.push(argument);
      },
      NOOP_PANIC,
    );

    expect(seen).toEqual(['a', 'b']);
  });

  it('should reach an entry appended during the same drain', () => {
    const queue = createActionQueue();
    const seen: number[] = [];

    enqueue(queue, 1, null);
    drain(
      queue,
      (action) => {
        seen.push(action);

        if (action === 1) {
          enqueue(queue, 2, null);
        }
      },
      NOOP_PANIC,
    );

    expect(seen).toEqual([1, 2]);
  });

  it('should not interrupt the running action when dispatch nests', () => {
    const queue = createActionQueue();
    const seen: string[] = [];

    enqueue(queue, 1, null);
    drain(
      queue,
      (action) => {
        if (action === 1) {
          seen.push('outer:start');
          enqueue(queue, 2, null);
          // A nested drain must return immediately: the outermost frame owns
          // the pass.
          drain(
            queue,
            () => {
              seen.push('nested');
            },
            NOOP_PANIC,
          );
          seen.push('outer:end');
          return;
        }

        seen.push('appended');
      },
      NOOP_PANIC,
    );

    expect(seen).toEqual(['outer:start', 'outer:end', 'appended']);
  });

  it('should stop immediately when the terminal latch is set mid-drain', () => {
    const queue = createActionQueue();
    const seen: number[] = [];

    enqueue(queue, 1, null);
    enqueue(queue, 2, null);
    enqueue(queue, 3, null);
    drain(
      queue,
      (action) => {
        seen.push(action);

        if (action === 1) {
          queue.closed = true;
        }
      },
      NOOP_PANIC,
    );

    expect(seen).toEqual([1]);
  });

  it('should route an escaping throw to panic', () => {
    const queue = createActionQueue();
    const panic = vi.fn();
    const error = new Error('boom');

    enqueue(queue, 1, null);
    drain(
      queue,
      () => {
        throw error;
      },
      (thrown) => {
        panic(thrown);
      },
    );

    expect(panic).toHaveBeenCalledExactlyOnceWith(error);
  });

  it('should drop retained arguments once the drain completes', () => {
    const queue = createActionQueue();

    enqueue(queue, 1, { retained: true });
    drain(queue, () => {}, NOOP_PANIC);

    expect(queue.args).toHaveLength(0);
    expect(queue.actions).toHaveLength(0);
  });

  it('should release the running flag after a panic', () => {
    const queue = createActionQueue();

    enqueue(queue, 1, null);
    drain(
      queue,
      () => {
        throw new Error('boom');
      },
      NOOP_PANIC,
    );

    expect(queue.running).toBe(false);
  });
});

describe('clearQueue', () => {
  it('should drop every pending action and argument', () => {
    const queue = createActionQueue();

    enqueue(queue, 1, { retained: true });
    clearQueue(queue);

    expect(queue.actions).toHaveLength(0);
    expect(queue.args).toHaveLength(0);
  });
});
