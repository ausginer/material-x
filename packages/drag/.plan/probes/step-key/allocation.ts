/// <reference types="node" />
/**
 * What a `requestStep` call allocates on `drag/step-key-model`, before the
 * kernel decides whether to keep it, and what a controller retains. Run with
 * `node --expose-gc .plan/probes/step-key/allocation.ts` from `packages/drag`.
 *
 * "Allocated" is V8's `total_allocated_bytes` over many calls, after a warm-up,
 * divided by the call count, so a collection in between does not hide it. The
 * counter also takes what compilation allocates, so a reading of a few bytes
 * per call is that noise, not the call.
 * "Retained" is the heap kept after a collection, per object.
 */
import { getHeapStatistics } from 'node:v8';
import { Gesture } from '../../../src/kernel/gesture.ts';

const COUNT = 100_000;
/** Calls per allocation reading: enough to dwarf what compilation allocates. */
const CALLS = 2_000_000;
const gc = (globalThis as { gc?: () => void }).gc!;

(globalThis as Record<string, unknown>).__DEV__ = false;

/** Enough of an element for the controller's constructor. */
const root = {
  ownerDocument: { defaultView: globalThis },
  addEventListener() {
    // No input in this probe.
  },
} as unknown as HTMLElement;

const gesture = new Gesture(root, {
  admit: () => null,
  activate: () => null,
});

/** Stands for a behavior: one task, read through the object. */
class Behavior {
  calls = 0;

  invalidate(): void {
    this.calls += 1;
  }
}

const behavior = new Behavior();

/** The base's form: a function created once, its own key. */
const stable = (): void => {
  behavior.invalidate();
};

function allocatedPerCall(call: () => void): number {
  // Warm-up, so the measured calls run optimized code.
  for (let i = 0; i < CALLS; i += 1) {
    call();
  }

  const before = getHeapStatistics().total_allocated_bytes;

  for (let i = 0; i < CALLS; i += 1) {
    call();
  }

  return (getHeapStatistics().total_allocated_bytes - before) / CALLS;
}

/** Measures `request` inside one running pass, where requests are deferred. */
function inPass(request: () => void): number {
  let result = 0;

  gesture.requestStep(() => {
    // The first request holds the key, so every measured one is a duplicate.
    request();
    result = allocatedPerCall(request);
  });

  return result;
}

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

/** A behavior that keeps its step as an arrow field, as the base does. */
class FieldStep {
  readonly root = root;

  readonly invalidate = (): void => {
    this.root.focus();
  };
}

/** The same behavior with a method, as this model does. */
class MethodStep {
  readonly root = root;

  invalidate(): void {
    this.root.focus();
  }
}

/** Two arrow-field steps, as `SortableBehavior` had with `#retireAxis`. */
class TwoFieldSteps {
  readonly root = root;

  readonly invalidate = (): void => {
    this.root.focus();
  };

  readonly retire = (): void => {
    this.root.blur();
  };
}

/** One of them a method, as this model leaves `SortableBehavior`. */
class OneFieldStep {
  readonly root = root;

  readonly retire = (): void => {
    this.root.blur();
  };

  invalidate(): void {
    this.root.focus();
  }
}

const format = (bytes: number): string => `${bytes.toFixed(1)} B`;

for (let round = 0; round < 3; round += 1) {
  const rows: Array<[string, number]> = [
    [
      'deferred duplicate: stable function, default key',
      inPass(() => {
        gesture.requestStep(stable);
      }),
    ],
    [
      'deferred duplicate: closure keyed by its behavior',
      inPass(() => {
        gesture.requestStep(() => {
          behavior.invalidate();
        }, behavior);
      }),
    ],
    [
      'deferred duplicate: bound method keyed by its behavior',
      inPass(() => {
        // eslint-disable-next-line @typescript-eslint/unbound-method -- bound here
        gesture.requestStep(behavior.invalidate.bind(behavior), behavior);
      }),
    ],
    [
      'idle, run at once: stable function',
      allocatedPerCall(() => {
        gesture.requestStep(stable);
      }),
    ],
    [
      'idle, run at once: closure keyed by its behavior',
      allocatedPerCall(() => {
        gesture.requestStep(() => {
          behavior.invalidate();
        }, behavior);
      }),
    ],
    [
      'retained: an empty array (the added key list)',
      retainedPerItem(() => []),
    ],
    [
      'retained: behavior with an arrow-field step',
      retainedPerItem(() => new FieldStep()),
    ],
    [
      'retained: behavior with a method step',
      retainedPerItem(() => new MethodStep()),
    ],
    [
      'retained: behavior with two arrow-field steps',
      retainedPerItem(() => new TwoFieldSteps()),
    ],
    [
      'retained: behavior with one arrow field and one method',
      retainedPerItem(() => new OneFieldStep()),
    ],
  ];

  console.log(`round ${round}`);

  for (const [name, bytes] of rows) {
    console.log(`  ${name.padEnd(58)} ${format(bytes)}`);
  }
}
