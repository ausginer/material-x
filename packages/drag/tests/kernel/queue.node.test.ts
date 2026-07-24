import { describe, expect, it, vi } from 'vitest';
import {
  clearQueue,
  createActionQueue,
  drain,
  enqueue,
  type ActionQueue,
} from '../../src/kernel/queue.ts';

/** Drains `queue` with a handler that records `(action, argument)` pairs. */
function runRecording(
  queue: ActionQueue,
  handler?: (action: number, argument: unknown) => void,
): {
  seen: Array<readonly [number, unknown]>;
  panics: unknown[];
} {
  const seen: Array<readonly [number, unknown]> = [];
  const panics: unknown[] = [];

  drain(
    queue,
    (action, argument) => {
      seen.push([action, argument]);
      handler?.(action, argument);
    },
    (error) => {
      panics.push(error);
    },
  );

  return { seen, panics };
}

describe('action queue', () => {
  it('should drain entries in FIFO order', () => {
    const queue = createActionQueue();
    enqueue(queue, 1, 'a');
    enqueue(queue, 2, 'b');
    enqueue(queue, 3, 'c');

    const { seen } = runRecording(queue);

    expect(seen).toEqual([
      [1, 'a'],
      [2, 'b'],
      [3, 'c'],
    ]);
  });

  it('should process work appended during the drain in the same pass', () => {
    const queue = createActionQueue();
    enqueue(queue, 1, null);

    const { seen } = runRecording(queue, (action) => {
      if (action === 1) {
        enqueue(queue, 2, null);
      }
    });

    expect(seen.map(([action]) => action)).toEqual([1, 2]);
  });

  it('should not start a nested drain while one is already running', () => {
    const queue = createActionQueue();
    const nestedDrains: number[] = [];
    enqueue(queue, 1, null);

    drain(
      queue,
      (action) => {
        if (action === 1) {
          enqueue(queue, 2, null);
          // A re-entrant drain must return immediately; the outer frame owns
          // the pass and will reach the appended entry.
          drain(
            queue,
            () => {
              nestedDrains.push(1);
            },
            () => {},
          );
        }
      },
      () => {},
    );

    expect(nestedDrains).toEqual([]);
  });

  it('should clear the queue and its arguments after draining', () => {
    const queue = createActionQueue();
    enqueue(queue, 1, { retained: true });

    runRecording(queue);

    expect(queue.actions).toHaveLength(0);
    expect(queue.args).toHaveLength(0);
  });

  it('should stop draining once the queue is closed mid-pass', () => {
    const queue = createActionQueue();
    enqueue(queue, 1, null);
    enqueue(queue, 2, null);
    enqueue(queue, 3, null);

    const { seen } = runRecording(queue, (action) => {
      if (action === 2) {
        queue.closed = true;
      }
    });

    expect(seen.map(([action]) => action)).toEqual([1, 2]);
  });

  it('should route a handler throw to panic', () => {
    const queue = createActionQueue();
    const failure = new Error('boom');
    enqueue(queue, 1, null);

    const { panics } = runRecording(queue, () => {
      throw failure;
    });

    expect(panics).toEqual([failure]);
  });

  it('should clear the queue even when the handler throws', () => {
    const queue = createActionQueue();
    enqueue(queue, 1, null);
    enqueue(queue, 2, null);

    runRecording(queue, () => {
      throw new Error('boom');
    });

    expect(queue.actions).toHaveLength(0);
    expect(queue.args).toHaveLength(0);
    expect(queue.running).toBe(false);
  });

  it('should allow a later drain after a panic cleared the queue', () => {
    const queue = createActionQueue();
    enqueue(queue, 1, null);
    runRecording(queue, () => {
      throw new Error('boom');
    });

    enqueue(queue, 9, 'later');
    const { seen } = runRecording(queue);

    expect(seen).toEqual([[9, 'later']]);
  });

  it('should drop retained arguments when cleared explicitly', () => {
    const queue = createActionQueue();
    enqueue(queue, 1, { retained: true });

    clearQueue(queue);

    expect(queue.actions).toHaveLength(0);
    expect(queue.args).toHaveLength(0);
  });

  it('should not invoke the handler for an already closed queue', () => {
    const queue = createActionQueue();
    queue.closed = true;
    enqueue(queue, 1, null);
    const handler = vi.fn<(...args: unknown[]) => void>();

    drain(queue, handler, () => {});

    expect(handler).not.toHaveBeenCalled();
  });
});
