import { describe, expect, it } from 'vitest';
import { ActionQueue } from '../../src/kernel/queue.ts';

describe('ActionQueue', () => {
  it('should drop every pending action and argument on clear', () => {
    const queue = new ActionQueue();
    const seen: unknown[] = [];

    queue.add(1, { retained: true });
    queue.clear();
    queue.apply((action, argument) => {
      seen.push(action, argument);
      return true;
    });

    expect(seen).toEqual([]);
  });

  it('should stop at the entry the callback refuses', () => {
    const queue = new ActionQueue();
    const seen: number[] = [];

    queue.add(1, null);
    queue.add(2, null);
    queue.add(3, null);
    queue.apply((action) => {
      seen.push(action);
      return action !== 2;
    });

    expect(seen).toEqual([1, 2]);
  });

  it('should end an iteration that clears the queue', () => {
    const queue = new ActionQueue();
    const seen: number[] = [];

    queue.add(1, null);
    queue.add(2, null);
    queue.apply((action) => {
      seen.push(action);
      queue.clear();
      return true;
    });

    expect(seen).toEqual([1]);
  });
});
