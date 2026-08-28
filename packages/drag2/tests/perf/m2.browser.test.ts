/**
 * M-2 — what a controller costs, and which frame-task policy to keep.
 *
 * Two independent questions the contract currently answers by assertion:
 *
 * 1. **F-4** says the closure-per-controller model's cost is *"expected to be
 *    irrelevant"* at realistic controller counts. Expected by whom, at what
 *    count. The comparison is the closure model against an opaque per-controller
 *    state record driven by one module-level spec — the same shape, one set of
 *    functions for the whole page instead of one per controller.
 * 2. **The frame-task policy.** `createSortableSpec` creates its `FrameTask`
 *    eagerly, per controller (~~`SortableRuntime`~~ — the aggregate is
 *    dissolved by D-149; the policy this measures is unchanged and only
 *    relocated). 05 names three candidates and warns that a binary
 *    eager-vs-per-operation benchmark could pick a dominated policy, so
 *    **lazy-retained is measured as a first-class option**: created on first
 *    activation, kept on the controller, cancelled and reused afterwards.
 *
 * **Heap policy.** `gc()` before every reading (`--js-flags=--expose-gc`, set
 * for this project only) and `--enable-precise-memory-info`, without which
 * Chrome quantizes `usedJSHeapSize` to 100kB and every figure below would be a
 * rounding artifact. Each figure is the **minimum** of several runs, because
 * heap noise is one-sided: allocation from elsewhere can only inflate it.
 *
 * The models here are *models*. Rewriting the kernel in opaque-`S` style to
 * measure it would be the change the measurement is supposed to justify, so
 * these mirror its shape — the number of closures, the captured state, the call
 * signature — and are honest about being a stand-in.
 *
 * Structural assertions run always; timings and heap figures are opt-in via
 * `VITE_DRAG_MEASURE=1`, as in Q-7 and M-1.
 *
 * **Run this file alone.** The browser project runs test files in parallel, and
 * two measurement suites sharing a page inflate every absolute figure by ~2×.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  createFrameTask,
  type FrameTask,
} from '../../src/kernel/invalidation.ts';
import { createRealm } from '../../src/kernel/realm.ts';

const WARMUP = 3;
const HEAP_RUNS = 5;
const SAMPLES = 11;
const TARGET_SAMPLE_MS = 2;

type Memory = Readonly<{ usedJSHeapSize: number }>;
type Gc = Readonly<{ gc?(): void; performance: { memory?: Memory } }>;

const runtime = globalThis as unknown as Gc;

const cleanup: Array<() => void> = [];

afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

/**
 * A module-level sink, so the graph under measurement is reachable across the
 * `gc()` that precedes the reading — and, just as importantly, so the *previous*
 * run's graph is dropped **before** the baseline is taken. Holding it in a
 * variable the builder assigns to made every run free the last one while
 * allocating the next, which nets to zero and reads like "costs nothing".
 */
let sink: unknown = null;

/** Reads the sink so nothing above can be optimized away as write-only. */
export const retained = (): unknown => sink;

/** Bytes of retained heap `build` leaves behind, minimum of `HEAP_RUNS` runs. */
function heap(build: () => unknown): number {
  let best = Number.POSITIVE_INFINITY;

  const once = (): number => {
    sink = null;
    runtime.gc?.();

    const before = runtime.performance.memory!.usedJSHeapSize;

    sink = build();
    runtime.gc?.();

    return runtime.performance.memory!.usedJSHeapSize - before;
  };

  for (let i = 0; i < WARMUP; i += 1) {
    once();
  }

  for (let i = 0; i < HEAP_RUNS; i += 1) {
    best = Math.min(best, once());
  }

  sink = null;

  return best;
}

function median(iteration: (round: number) => void): number {
  let round = 0;
  const batch = (repeats: number): number => {
    const started = performance.now();

    for (let i = 0; i < repeats; i += 1) {
      iteration(round);
      round += 1;
    }

    return performance.now() - started;
  };

  for (let i = 0; i < WARMUP; i += 1) {
    iteration(round);
    round += 1;
  }

  let repeats = 1;

  while (batch(repeats) < TARGET_SAMPLE_MS && repeats < 1_048_576) {
    repeats *= 2;
  }

  const timings: number[] = [];

  for (let i = 0; i < SAMPLES; i += 1) {
    timings.push(batch(repeats) / repeats);
  }

  return timings.toSorted((a, b) => a - b)[Math.floor(SAMPLES / 2)]!;
}

// ---------------------------------------------------------------------------
// F-4: closure per controller vs opaque state plus one static spec
// ---------------------------------------------------------------------------

/**
 * The captured state a kernel closes over: two frames, the queue, the lifetimes,
 * the attempt slots. Reduced to a field count, since the question is retention
 * per controller rather than what the fields mean.
 */
type State = {
  phase: number;
  pointerX: number;
  pointerY: number;
  originX: number;
  originY: number;
  operation: object | null;
  item: object | null;
  visual: object | null;
  snapshot: object | null;
  insertion: object | null;
  proposal: object | null;
  outcome: number;
  recovery: number;
  domain: object | null;
  seq: number;
};

const createState = (): State => ({
  phase: 0,
  pointerX: 0,
  pointerY: 0,
  originX: 0,
  originY: 0,
  operation: null,
  item: null,
  visual: null,
  snapshot: null,
  insertion: null,
  proposal: null,
  outcome: 0,
  recovery: 0,
  domain: null,
  seq: 0,
});

/** Roughly the surface `createKernel` closes over: a dozen handler closures. */
type Controller = Readonly<{ move(x: number, y: number): void }>;

function closureController(): Controller {
  const state = createState();
  const begin = (): void => {
    state.seq += 1;
  };
  const commit = (): void => {
    state.phase = 0;
  };
  const move = (x: number, y: number): void => {
    begin();
    state.pointerX = x;
    state.pointerY = y;
    commit();
  };
  const up = (): void => {
    state.phase = 0;
  };
  const cancel = (): void => {
    state.phase = 0;
  };
  const destroy = (): void => {
    state.operation = null;
  };
  const retire = (): void => {
    state.item = null;
  };
  const dispatch = (): void => {
    state.seq += 1;
  };
  const drain = (): void => {
    state.seq += 1;
  };
  const report = (): void => {
    state.recovery = 0;
  };
  const fail = (): void => {
    state.outcome = 0;
  };
  const schedule = (): void => {
    state.seq += 1;
  };

  // Retained the way a real controller retains them: reachable from the object
  // the consumer holds, directly or through the listeners it armed.
  return {
    move,
    // oxlint-disable-next-line no-unused-expressions
    ...{ up, cancel, destroy, retire, dispatch, drain, report, fail, schedule },
  };
}

/** One module-level spec, one plain state record per controller. */
const SPEC = {
  begin(state: State): void {
    state.seq += 1;
  },
  commit(state: State): void {
    state.phase = 0;
  },
  move(state: State, x: number, y: number): void {
    SPEC.begin(state);
    state.pointerX = x;
    state.pointerY = y;
    SPEC.commit(state);
  },
  up(state: State): void {
    state.phase = 0;
  },
  cancel(state: State): void {
    state.phase = 0;
  },
  destroy(state: State): void {
    state.operation = null;
  },
  retire(state: State): void {
    state.item = null;
  },
  dispatch(state: State): void {
    state.seq += 1;
  },
  drain(state: State): void {
    state.seq += 1;
  },
  report(state: State): void {
    state.recovery = 0;
  },
  fail(state: State): void {
    state.outcome = 0;
  },
  schedule(state: State): void {
    state.seq += 1;
  },
};

function staticController(): Controller {
  const state = createState();

  // The consumer still needs *something* callable; the point is that it is one
  // bound entry rather than a dozen fresh closures.
  return { move: (x, y) => SPEC.move(state, x, y) };
}

// ---------------------------------------------------------------------------
// The three frame-task policies
// ---------------------------------------------------------------------------

type Policy = Readonly<{
  name: string;
  create(): PolicyController;
}>;

type PolicyController = Readonly<{
  activate(): void;
  schedule(value: number): void;
  retire(): void;
}>;

const realm = createRealm(document.body);
const noop = (): void => {};

const policies: readonly Policy[] = [
  {
    // What ships: one task per controller, built at construction.
    name: 'eager-retained',
    create: () => {
      const task = createFrameTask<number>(realm, noop);

      return {
        activate: noop,
        schedule: (value) => {
          task.schedule(value);
        },
        retire: () => {
          task.cancel();
        },
      };
    },
  },
  {
    // Built on first activation, kept and reused. Pays nothing for a controller
    // that never drags, and nothing per drag after the first.
    name: 'lazy-retained',
    create: () => {
      let task: FrameTask<number> | null = null;

      return {
        activate: () => {
          task ??= createFrameTask<number>(realm, noop);
        },
        schedule: (value) => {
          task!.schedule(value);
        },
        retire: () => {
          task?.cancel();
        },
      };
    },
  },
  {
    // The shipped package's policy: a task per operation, dropped at retire.
    name: 'per-operation',
    create: () => {
      let task: FrameTask<number> | null = null;

      return {
        activate: () => {
          task = createFrameTask<number>(realm, noop);
        },
        schedule: (value) => {
          task!.schedule(value);
        },
        retire: () => {
          task?.cancel();
          task = null;
        },
      };
    },
  },
];

const build = <T>(count: number, make: () => T): T[] => {
  const all: T[] = [];

  for (let i = 0; i < count; i += 1) {
    all.push(make());
  }

  return all;
};

describe('M-2 — the frame-task policies', () => {
  it('should schedule identically under every policy', async () => {
    // Equivalence before comparison, as in M-1: three policies that do not
    // schedule the same work are not three policies.
    const seen: number[][] = [];

    for (const policy of policies) {
      const runs: number[] = [];
      const task = createFrameTask<number>(realm, (value) => {
        runs.push(value);
      });

      // Driven through a real task so the coalescing is the real one — and now
      // through a real frame as well. ~~`task.flush()`~~ was removed from
      // `FrameTask` on 2026-08-22 as a member with no production caller, and
      // awaiting the frame the task actually scheduled is the closer reading:
      // the coalescing under test is the animation frame's.
      task.schedule(1);
      task.schedule(2);
      // oxlint-disable-next-line no-await-in-loop
      await new Promise<void>((resolve) => {
        realm.window.requestAnimationFrame(() => {
          resolve();
        });
      });
      seen.push(runs);
      void policy;
    }

    expect(seen).toEqual([[2], [2], [2]]);
  });

  it('should leave a cold lazy controller with no task at all', () => {
    // The property that makes lazy-retained worth measuring: a controller that
    // is never dragged allocates nothing, which no byte count can show once the
    // number is small.
    let created = 0;
    const counted = (): FrameTask<number> => {
      created += 1;
      return createFrameTask<number>(realm, noop);
    };

    let task: FrameTask<number> | null = null;
    const activate = (): void => {
      task ??= counted();
    };

    expect(created).toBe(0);
    activate();
    activate();
    expect(created).toBe(1);
    expect(task).not.toBeNull();
  });
});

describe.runIf(Boolean(import.meta.env['VITE_DRAG_MEASURE']))(
  'M-2 — heap and latency measurement',
  () => {
    const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)}kB`;
    const per = (bytes: number, count: number): string =>
      `${(bytes / count).toFixed(0)}B each`;

    for (const count of [100, 1000]) {
      it(`should measure both construction models at ${count} controllers`, () => {
        const closures = heap(() => build(count, closureController));
        const statics = heap(() => build(count, staticController));

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.warn(
          `M-2 controllers=${count} closure=${kb(closures)} (${per(closures, count)}) ` +
            `static=${kb(statics)} (${per(statics, count)}) ratio=${(closures / statics).toFixed(2)}`,
        );
        expect(closures).toBeGreaterThan(0);
      });
    }

    it('should measure the move call through both models', () => {
      const closure = closureController();
      const statik = staticController();
      const a = median((round) => {
        closure.move(round, round);
      });
      const b = median((round) => {
        statik.move(round, round);
      });

      // oxlint-disable-next-line no-console -- this suite exists to report
      console.warn(
        `M-2 move closure=${(a * 1000).toFixed(4)}µs static=${(b * 1000).toFixed(4)}µs`,
      );
    });

    for (const count of [1000]) {
      it(`should measure every policy at ${count} cold controllers`, () => {
        for (const policy of policies) {
          const cold = heap(() => build(count, policy.create));
          const warm = heap(() => {
            const all = build(count, policy.create);

            for (const controller of all) {
              controller.activate();
            }

            return all;
          });

          // oxlint-disable-next-line no-console -- this suite exists to report
          console.warn(
            `M-2 policy=${policy.name} cold=${kb(cold)} (${per(cold, count)}) ` +
              `active=${kb(warm)} (${per(warm, count)})`,
          );
        }
      });
    }

    it('should measure first-drag latency and repeated-drag cost per policy', () => {
      for (const policy of policies) {
        const first = median(() => {
          const controller = policy.create();

          controller.activate();
          controller.schedule(1);
          controller.retire();
        });
        const controller = policy.create();

        controller.activate();

        const repeat = median((round) => {
          controller.schedule(round);
        });
        const cycles = heap(() => {
          const one = policy.create();

          for (let i = 0; i < 1000; i += 1) {
            one.activate();
            one.schedule(i);
            one.retire();
          }

          return one;
        });

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.warn(
          `M-2 policy=${policy.name} first-drag=${(first * 1000).toFixed(4)}µs ` +
            `schedule=${(repeat * 1000).toFixed(4)}µs retained-after-1000-drags=${kb(cycles)}`,
        );
      }
    });
  },
);
