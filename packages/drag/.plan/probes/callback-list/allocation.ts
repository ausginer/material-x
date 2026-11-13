/**
 * Retained bytes per list that `queue()` and `stack()` in
 * `src/kernel/callbacks.ts` make, against a bare array, which is what the base
 * holds for each of the three lists. Under drag:DRD-36 and drag:DRD-53 a list is
 * its object and its array, and holds the shared array method it adds with. Each figure is the heap growth across
 * `COUNT` retained instances, read after a full collection, divided by `COUNT`.
 *
 * "Empty" is the list as made: the `DRO-12` figure. "Used" is the list after one
 * entry was added and run, so its array holds a backing store. Those rows are an
 * observation. A bare array is used with one `push` and one `pop`, as the base's
 * lists are.
 *
 * The package's tsconfig includes this file, so typecheck and lint cover it.
 *
 * Run from `packages/drag`: `node --expose-gc .plan/probes/callback-list/allocation.ts`.
 */
import * as Callbacks from '../../../src/kernel/callbacks.ts';

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

function noop(): void {
  // Only the entry's slots matter here.
}

const receiver = {};

function used(list: Callbacks.List<null>): Callbacks.List<null> {
  list.add(noop, receiver);
  list._run(null);
  return list;
}

const rows: Array<[string, () => unknown]> = [
  ['bare array, empty', () => []],
  [
    'bare array, used',
    () => {
      const array: unknown[] = [];
      array.push(noop);
      array.pop();
      return array;
    },
  ],
  ['queue(), empty', () => Callbacks.queue<null>()],
  ['stack(), empty', () => Callbacks.stack<null>()],
  ['queue(), used', () => used(Callbacks.queue<null>())],
  ['stack(), used', () => used(Callbacks.stack<null>())],
];

process.stdout.write(`node ${process.version}, ${COUNT} instances per row\n`);

for (const [name, make] of rows) {
  process.stdout.write(
    `${name.padEnd(18)} ${retainedPerItem(make).toFixed(1)} B\n`,
  );
}
