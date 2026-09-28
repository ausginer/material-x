import { describe, expect, it } from 'vitest';
import {
  clearQueue,
  createActionQueue,
  enqueue,
} from '../../src/kernel/queue.ts';

describe('clearQueue', () => {
  it('should drop every pending action and argument', () => {
    const queue = createActionQueue();

    enqueue(queue, 1, { retained: true });
    clearQueue(queue);

    expect(queue.actions).toHaveLength(0);
    expect(queue.args).toHaveLength(0);
  });
});
