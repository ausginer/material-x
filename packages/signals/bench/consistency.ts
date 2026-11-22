/* oxlint-disable no-console, no-await-in-loop -- a measurement script: serial, and it prints its readings */
/**
 * Runs the consistency properties of `@ydinjs/signals`'s suite against
 * `@preact/signals-core`, `alien-signals`, `usignal` (its synchronous effects,
 * `usignal/sync`) and `@webreflection/signals`: the diamond with no glitch
 * (P1), single evaluation (P2), the equality cut-off (P3), laziness while
 * unobserved (P4) and batching (P10). Each case is the suite's case written
 * with dynamic reads, through one adapter per library. A last case follows a
 * branch switch, which is these libraries' dynamic dependency tracking and has
 * no declared input to compare with.
 *
 * Whether a source still holds a computed is read by collecting garbage and
 * asking a `WeakRef` to the function the computed was created with, because
 * no library exposes its subscriptions and every computed holds its function.
 * A witness pair checks that the collection runs.
 *
 * `node bench/consistency.ts`
 */
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import * as preact from '@preact/signals-core';
import * as webreflection from '@webreflection/signals';
import * as alien from 'alien-signals';
import * as usignal from 'usignal/sync';

type Box<T> = Readonly<{ get(): T; set(value: T): void }>;
type Reader<T> = Readonly<{ get(): T }>;

type Adapter = Readonly<{
  name: string;
  signal<T>(value: T): Box<T>;
  /** `undefined` when the library has no equality option. */
  signalWithEquals:
    | (<T>(value: T, equals: (previous: T, next: T) => boolean) => Box<T>)
    | undefined;
  computed<T>(fn: () => T): Reader<T>;
  effect(fn: () => void): () => void;
  batch(fn: () => void): void;
}>;

/** A failure's observation, or `undefined` when the property held. */
type Outcome = string | undefined;

/** The outcome of a case that needs an option the library doesn't offer. */
const NO_EQUALITY_OPTION = 'no equality option';

setFlagsFromString('--expose-gc');
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const gc = runInNewContext('gc') as () => void;

function readerOf<T>(source: { readonly value: T }): Reader<T> {
  return { get: () => source.value };
}

function valueBox<T>(source: { value: T }): Box<T> {
  return {
    get: () => source.value,
    set: (value) => {
      source.value = value;
    },
  };
}

const ADAPTERS: readonly Adapter[] = [
  {
    name: '@preact/signals-core',
    signal: (value) => valueBox(preact.signal(value)),
    signalWithEquals: undefined,
    computed: (fn) => readerOf(preact.computed(fn)),
    effect: (fn) => preact.effect(fn),
    batch: (fn) => {
      preact.batch(fn);
    },
  },
  {
    name: 'alien-signals',
    signal: (value) => {
      const source = alien.signal(value);
      return {
        get: () => source(),
        set: (next) => {
          source(next);
        },
      };
    },
    signalWithEquals: undefined,
    computed: (fn) => {
      const source = alien.computed(fn);
      return { get: () => source() };
    },
    effect: (fn) => alien.effect(fn),
    // alien-signals has no batch function: the adapter closes the batch in
    // `finally`, so its throwing case tests the adapter.
    batch: (fn) => {
      alien.startBatch();
      try {
        fn();
      } finally {
        alien.endBatch();
      }
    },
  },
  {
    name: 'usignal',
    signal: (value) => valueBox(usignal.signal(value)),
    signalWithEquals: (value, equals) =>
      valueBox(usignal.signal(value, { equals })),
    // usignal types a computed's value as `T | V` for an initial value `V`; with
    // none given, `V` is `undefined` and the value is `T`.
    computed: <T>(fn: () => T) =>
      readerOf(usignal.computed<T, undefined, T>(fn)),
    effect: (fn) => usignal.effect(fn),
    batch: (fn) => {
      usignal.batch(fn);
    },
  },
  {
    name: '@webreflection/signals',
    signal: (value) => valueBox(webreflection.signal(value)),
    signalWithEquals: undefined,
    computed: (fn) => readerOf(webreflection.computed(fn)),
    effect: (fn) => webreflection.effect(fn),
    batch: (fn) => {
      webreflection.batch(fn);
    },
  },
];

function expectEqual(actual: unknown, expected: unknown): Outcome {
  const seen = JSON.stringify(actual);
  return seen === JSON.stringify(expected)
    ? undefined
    : `${seen}, expected ${JSON.stringify(expected)}`;
}

function createDiamond(lib: Adapter) {
  const a = lib.signal(1);
  const runs = { b: 0, c: 0, d: 0 };
  const b = lib.computed(() => {
    runs.b += 1;
    return a.get() * 2;
  });
  const c = lib.computed(() => {
    runs.c += 1;
    return a.get() * 3;
  });
  const d = lib.computed(() => {
    runs.d += 1;
    return `${a.get()}:${b.get()}+${c.get()}`;
  });
  return { a, d, runs };
}

async function settle(): Promise<void> {
  for (let round = 0; round < 3; round += 1) {
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
    gc();
  }
}

/** Whether the garbage collector freed the object `create` returned. */
async function isCollected(create: () => object): Promise<boolean> {
  const ref = new WeakRef(create());
  await settle();
  return ref.deref() === undefined;
}

const retained: object[] = [];

const CASES: ReadonlyArray<
  readonly [name: string, run: (lib: Adapter) => Outcome | Promise<Outcome>]
> = [
  [
    'P1 the effect sees a consistent d in the diamond',
    (lib) => {
      const { a, d } = createDiamond(lib);
      const seen: string[] = [];
      lib.effect(() => {
        seen.push(d.get());
      });
      a.set(2);
      a.set(3);
      return expectEqual(seen, ['1:2+3', '2:4+6', '3:6+9']);
    },
  ],
  [
    'P2 one write to a runs b, c and d once each',
    (lib) => {
      const { a, d, runs } = createDiamond(lib);
      lib.effect(() => {
        d.get();
      });
      Object.assign(runs, { b: 0, c: 0, d: 0 });
      a.set(2);
      return expectEqual(runs, { b: 1, c: 1, d: 1 });
    },
  ],
  [
    'P2 one write to a runs the effect once',
    (lib) => {
      const { a, d } = createDiamond(lib);
      let runs = 0;
      lib.effect(() => {
        d.get();
        runs += 1;
      });
      runs = 0;
      a.set(2);
      return expectEqual({ effect: runs }, { effect: 1 });
    },
  ],
  [
    'P3 a computed whose value is unchanged does not rerun its consumers',
    (lib) => {
      const n = lib.signal(1);
      const parity = lib.computed(() => n.get() % 2);
      const runs = { consumer: 0, effect: 0 };
      const observed = lib.computed(() => {
        runs.consumer += 1;
        return parity.get();
      });
      lib.effect(() => {
        observed.get();
        runs.effect += 1;
      });
      Object.assign(runs, { consumer: 0, effect: 0 });
      n.set(3);
      return expectEqual(runs, { consumer: 0, effect: 0 });
    },
  ],
  [
    'P3 a write of an equal value runs no effect',
    (lib) => {
      const n = lib.signal(1);
      let runs = 0;
      lib.effect(() => {
        n.get();
        runs += 1;
      });
      runs = 0;
      n.set(1);
      return expectEqual({ effect: runs }, { effect: 0 });
    },
  ],
  [
    'P3 the equality function a signal names',
    (lib) => {
      if (!lib.signalWithEquals) {
        return NO_EQUALITY_OPTION;
      }

      const point = lib.signalWithEquals(
        { x: 1, y: 2 },
        (previous, next) => previous.x === next.x,
      );
      let runs = 0;
      lib.effect(() => {
        point.get();
        runs += 1;
      });
      runs = 0;
      point.set({ x: 1, y: 3 });
      return expectEqual({ effect: runs }, { effect: 0 });
    },
  ],
  [
    'P4 an unobserved computed does not run on a write',
    (lib) => {
      const a = lib.signal(1);
      let runs = 0;
      const c = lib.computed(() => {
        runs += 1;
        return a.get();
      });
      c.get();
      a.set(2);
      a.set(3);
      const atWrites = runs;
      c.get();
      return expectEqual(
        { afterWrites: atWrites, afterRead: runs },
        { afterWrites: 1, afterRead: 2 },
      );
    },
  ],
  [
    'witness: the source holds a computed that an effect observes',
    async (lib) => {
      const a = lib.signal(1);
      retained.push(a);
      const collected = await isCollected(() => {
        const fn = () => a.get();
        const c = lib.computed(fn);
        lib.effect(() => {
          c.get();
        });
        return fn;
      });
      return collected ? 'the computed was collected' : undefined;
    },
  ],
  [
    'P4 the source of a computed that was read does not hold it',
    async (lib) => {
      const a = lib.signal(1);
      retained.push(a);
      const collected = await isCollected(() => {
        const fn = () => a.get();
        lib.computed(fn).get();
        return fn;
      });
      return collected ? undefined : 'the source holds the computed';
    },
  ],
  [
    'P4 a computed whose last observer is disposed does not run on a write',
    (lib) => {
      const a = lib.signal(1);
      let runs = 0;
      const c = lib.computed(() => {
        runs += 1;
        return a.get();
      });
      lib.effect(() => {
        c.get();
      })();
      runs = 0;
      a.set(2);
      return expectEqual({ computed: runs }, { computed: 0 });
    },
  ],
  [
    'P4 the source does not hold a computed whose last observer is disposed',
    async (lib) => {
      const a = lib.signal(1);
      retained.push(a);
      const collected = await isCollected(() => {
        const fn = () => a.get();
        const c = lib.computed(fn);
        lib.effect(() => {
          c.get();
        })();
        return fn;
      });
      return collected ? undefined : 'the source holds the computed';
    },
  ],
  [
    'P4 a computed is current when read after its last observer is disposed',
    (lib) => {
      const a = lib.signal(1);
      const c = lib.computed(() => a.get() * 10);
      lib.effect(() => {
        c.get();
      })();
      a.set(2);
      return expectEqual(c.get(), 20);
    },
  ],
  [
    'P10 the writes in a batch propagate once, at its end',
    (lib) => {
      const a = lib.signal(1);
      const b = lib.signal(1);
      const seen: number[] = [];
      lib.effect(() => {
        seen.push(a.get() + b.get());
      });
      let inside: number[] = [];
      lib.batch(() => {
        a.set(2);
        b.set(3);
        inside = [...seen];
      });
      return expectEqual(
        { inside, after: seen },
        { inside: [2], after: [2, 5] },
      );
    },
  ],
  [
    'P10 nested batches flush at the end of the outermost one',
    (lib) => {
      const a = lib.signal(1);
      const seen: number[] = [];
      lib.effect(() => {
        seen.push(a.get());
      });
      let inside: number[] = [];
      lib.batch(() => {
        lib.batch(() => {
          a.set(2);
        });
        inside = [...seen];
        a.set(3);
      });
      return expectEqual(
        { inside, after: seen },
        { inside: [1], after: [1, 3] },
      );
    },
  ],
  [
    'P10 a batch whose function throws still flushes, and the effect runs on a later write',
    (lib) => {
      const a = lib.signal(1);
      const seen: number[] = [];
      lib.effect(() => {
        seen.push(a.get());
      });

      try {
        lib.batch(() => {
          a.set(2);
          throw new Error('stop');
        });
      } catch {
        // The throw is the case's input.
      }

      // A later write shows whether the effect still runs at all.
      a.set(3);
      return expectEqual(seen, [1, 2, 3]);
    },
  ],
  [
    'tracking: after a branch switch, a write to the input no longer read runs nothing, and one to the newly read input runs the effect',
    (lib) => {
      const show = lib.signal(true);
      const left = lib.signal(1);
      const right = lib.signal(2);
      const runs = { picked: 0, effect: 0 };
      const picked = lib.computed(() => {
        runs.picked += 1;
        return show.get() ? left.get() : right.get();
      });
      const seen: number[] = [];
      lib.effect(() => {
        seen.push(picked.get());
        runs.effect += 1;
      });
      show.set(false);
      Object.assign(runs, { picked: 0, effect: 0 });
      left.set(10);
      const afterOld = { ...runs };
      right.set(20);
      return expectEqual(
        { afterOld, afterNew: runs, seen },
        {
          afterOld: { picked: 0, effect: 0 },
          afterNew: { picked: 1, effect: 1 },
          seen: [1, 2, 20],
        },
      );
    },
  ],
];

const witnessFreed = await isCollected(() => ({}));
const witnessHeld = await isCollected(() => {
  const held = {};
  retained.push(held);
  return held;
});
console.log(
  `Witness: an unreferenced object is ${witnessFreed ? 'collected' : 'NOT collected'}; a referenced one is ${witnessHeld ? 'collected' : 'kept'}.\n`,
);
console.log(`| Property | ${ADAPTERS.map(({ name }) => name).join(' | ')} |`);
console.log(`| --- |${' --- |'.repeat(ADAPTERS.length)}`);

for (const [name, run] of CASES) {
  const cells: string[] = [];

  for (const lib of ADAPTERS) {
    let outcome: Outcome;

    try {
      outcome = await run(lib);
    } catch (error) {
      outcome = `threw ${String(error)}`;
    }

    cells.push(
      outcome === undefined
        ? 'holds'
        : outcome === NO_EQUALITY_OPTION
          ? `n/a: ${outcome}`
          : `**fails**: ${outcome}`,
    );
  }

  console.log(`| ${name} | ${cells.join(' | ')} |`);
}
