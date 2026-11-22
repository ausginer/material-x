/* oxlint-disable no-console -- a measurement script: it prints its readings */
/**
 * A probe for P8 and C4: whether a run that reads the same edges as the
 * previous run allocates in the runtime. It counts V8's allocated bytes,
 * `v8.getHeapStatistics().total_allocated_bytes`, over many operations after a
 * warm-up, and prints bytes per operation. The values written and read are
 * small integers, which V8 doesn't allocate, and the callbacks take positional
 * parameters, so the callbacks allocate nothing of their own.
 *
 * V8 also allocates a roughly constant amount in each measured window, which
 * the probe cancels by reading the slope between two run lengths.
 *
 * Two witnesses show what the probe can see: an operation that allocates one
 * empty object, and a callback with a rest parameter, which allocates its
 * array on each run.
 *
 * `node bench/allocation.ts`
 */
import { getHeapStatistics } from 'node:v8';
import * as preact from '@preact/signals-core';
import { family } from '../src/family.ts';
import { computed, effect, signal, type Signal } from '../src/index.ts';

const WARMUP = 50_000;
const OPERATIONS = 200_000;

let sink: unknown;

function allocatedBytes(operation: () => void, operations: number): number {
  const before = getHeapStatistics().total_allocated_bytes;

  for (let index = 0; index < operations; index += 1) {
    operation();
  }

  return getHeapStatistics().total_allocated_bytes - before;
}

/**
 * The slope between a run of `OPERATIONS` and one of twice as many: V8
 * allocates about a megabyte in each measured window whatever the operation,
 * as the empty operation shows, and the difference cancels it.
 */
function bytesPerOperation(operation: () => void): number {
  allocatedBytes(operation, WARMUP);
  const single = allocatedBytes(operation, OPERATIONS);
  const double = allocatedBytes(operation, OPERATIONS * 2);

  return (double - single) / OPERATIONS;
}

function diamond(): () => void {
  const a = signal(0);
  const b = computed([a], (a) => a() * 2);
  const c = computed([a], (a) => a() * 3);
  const d = computed([b, c], (b, c) => b() + c());
  effect([d], (d) => {
    sink = d();
  });
  let value = 0;
  return () => {
    value = (value + 1) % 1024;
    a.set(value);
  };
}

function branchSwitch(): () => void {
  const show = signal(true);
  const left = signal(1);
  const right = signal(2);
  const picked = computed([show, left, right], (show, left, right) =>
    show() ? left() : right(),
  );
  effect([picked], (picked) => {
    sink = picked();
  });
  let value = true;
  return () => {
    value = !value;
    show.set(value);
  };
}

function familyScan(): () => void {
  const rows = Array.from({ length: 100 }, (_, index) =>
    signal(index === 50 ? 100 : 0),
  );
  const list = signal<ReadonlyArray<Signal<number>>>(rows);
  const threshold = signal(10);
  const firstMatch = computed([family(list), threshold], (rows, threshold) => {
    const limit = threshold();
    const { length } = rows();

    for (let index = 0; index < length; index += 1) {
      if (rows.at(index) > limit) {
        return index;
      }
    }

    return -1;
  });
  effect([firstMatch], (firstMatch) => {
    sink = firstMatch();
  });
  let value = 10;
  // The threshold moves between 10 and 11: the match stays at row 50, so each
  // run reads the same 51 members.
  return () => {
    value = value === 10 ? 11 : 10;
    threshold.set(value);
  };
}

function restParameter(): () => void {
  const inputs = Array.from({ length: 100 }, (_, index) => signal(index));
  const sum = computed(inputs, (...accessors) => accessors[42]!());
  effect([sum], (sum) => {
    sink = sum();
  });
  let value = 0;
  return () => {
    value = (value + 1) % 1024;
    inputs[42]!.set(value);
  };
}

function preactDiamond(): () => void {
  const a = preact.signal(0);
  const b = preact.computed(() => a.value * 2);
  const c = preact.computed(() => a.value * 3);
  const d = preact.computed(() => b.value + c.value);
  preact.effect(() => {
    sink = d.value;
  });
  let value = 0;
  return () => {
    value = (value + 1) % 1024;
    a.value = value;
  };
}

const PROBES: ReadonlyArray<readonly [string, () => () => void]> = [
  ['witness: an empty operation', () => () => {}],
  ['diamond a → b, c → d and an effect', diamond],
  ['branch switch on every write', branchSwitch],
  ['family scan reading the same 51 members', familyScan],
  [
    'witness: a computed whose callback has a rest parameter, 100 inputs',
    restParameter,
  ],
  [
    'witness: an operation that allocates one empty object',
    () => () => {
      sink = {};
    },
  ],
  ['reference: @preact/signals-core diamond', preactDiamond],
];

console.log(
  `Node ${process.version}, ${OPERATIONS} operations after ${WARMUP} warm-up operations\n`,
);

for (const [name, setup] of PROBES) {
  console.log(`${name}: ${bytesPerOperation(setup()).toFixed(2)} B/operation`);
}

// Keeps the values the callbacks read observable, so no read is dropped.
if (sink === Symbol.for('never')) {
  console.log(sink);
}
