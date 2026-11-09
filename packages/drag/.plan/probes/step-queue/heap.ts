/// <reference types="node" />
/**
 * Retained bytes per controller for the deferred-step storage: the queue model's
 * `StepQueue` against the bare array the base and the inline variant hold. Run
 * with `node --expose-gc .plan/probes/step-queue/heap.ts` from `packages/drag`.
 */
import { StepQueue } from '../../../src/kernel/step-queue.ts';

const COUNT = 200_000;
const gc = (globalThis as { gc?: () => void }).gc!;

function retainedPerItem(make: () => unknown): number {
  const held: unknown[] = new Array(COUNT);

  gc();
  const before = process.memoryUsage().heapUsed;

  for (let i = 0; i < COUNT; i += 1) {
    held[i] = make();
  }

  gc();
  const after = process.memoryUsage().heapUsed;

  // Keeps `held` alive past the second reading.
  if (held.length !== COUNT) {
    throw new Error('unreachable');
  }

  return (after - before) / COUNT;
}

for (let round = 0; round < 3; round += 1) {
  const array = retainedPerItem(() => []);
  const queue = retainedPerItem(() => new StepQueue<number>());

  console.log(
    `round ${round}: array ${array.toFixed(1)} B, StepQueue ${queue.toFixed(1)} B, difference ${(queue - array).toFixed(1)} B`,
  );
}
