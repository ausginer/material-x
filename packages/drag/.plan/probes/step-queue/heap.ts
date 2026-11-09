/// <reference types="node" />
/**
 * Retained bytes of the storage each model allocates: a bare array (the base's
 * step and disposer lists, and the inline variant's), a `CallbackList` (this
 * model's three lists), and one closure that forwards to a method on an object
 * it captures (what the base allocates where this model passes a receiver). Run
 * with `node --expose-gc .plan/probes/step-queue/heap.ts` from `packages/drag`.
 *
 * At `72ae8d715` the queue model's `StepQueue` measured as `CallbackList` does
 * here: the class has the same single private field.
 */
import { CallbackList } from '../../../src/kernel/callback-list.ts';

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

/** A target shared by every closure, so only the closure itself is counted. */
const axis = {
  retire(): void {
    // Nothing: only identity matters here.
  },
};

for (let round = 0; round < 3; round += 1) {
  const array = retainedPerItem(() => []);
  const list = retainedPerItem(() => new CallbackList<number>());
  const forwarder = retainedPerItem(() => (): void => {
    axis.retire();
  });

  console.log(
    `round ${round}: array ${array.toFixed(1)} B, CallbackList ${list.toFixed(1)} B, forwarding closure ${forwarder.toFixed(1)} B`,
  );
}
