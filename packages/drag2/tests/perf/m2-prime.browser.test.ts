/**
 * M-2′ — controller cost at mixed populations, with real controllers of both
 * behaviors.
 *
 * M-2 measured one behavior and two construction **stand-ins**. D-95 dropped
 * the stand-in comparison — re-running two models that do not ship measures the
 * models — and replaced it with the question Phase 22 actually needs answered:
 * **what does one controller retain, and how much of that is the kernel's
 * rather than the behavior's.**
 *
 * **The frame-task policy question is withdrawn and is not re-opened here**
 * (D-96). The frame task is **sortable-owned and per-controller**:
 * `createFrameTask` has one caller, `src/sortable/runtime.ts`, and free drag
 * installs none. Replacing sortable controllers with free-drag ones therefore
 * *removes* frame tasks rather than stressing them, so every mixed population
 * is strictly cheaper on that axis than the all-sortable case M-2 already
 * measured. **No figure in this file may be quoted against the 148 B margin.**
 *
 * **Heap policy, reused from M-2 unchanged**, because it took two attempts to
 * get right:
 *
 * - `gc()` before **every** reading (`--js-flags=--expose-gc`);
 * - `--enable-precise-memory-info`, without which Chrome quantizes
 *   `usedJSHeapSize` to 100 kB and every figure here is a rounding artifact;
 * - the **minimum of 5 runs after 3 warm-ups**, because heap noise is
 *   one-sided: other allocation can only inflate a reading;
 * - the module-level sink **cleared, and its graph disposed, before the
 *   baseline** — without which each run frees one population while allocating
 *   the next and every figure reads ≈ 0, which looks exactly like *costs
 *   nothing*. A controller is not freed by dropping the reference: it holds
 *   document listeners, so the sink is `destroy()`ed rather than nulled.
 *
 * **Every near-zero result in this file is guarded by a falsifier** that
 * reproduces the M-2 defect and a known retention; see §falsifying the sink.
 *
 * The structural rows run in CI on every suite run; heap figures are opt-in
 * with `VITE_DRAG_MEASURE=1` and assert nothing. **Run this file alone.**
 */
import { afterEach, describe, expect, it } from 'vitest';
import { FreeDragResolution, freeDrag } from '../../src/free-drag.ts';
import type { CollectionSnapshot } from '../../src/sortable/domain.ts';
import { createRectIndex } from '../../src/sortable/rect-index.ts';
import { y } from '../../src/sortable/y.ts';
import { ReorderResolution, sortable } from '../../src/sortable.ts';

const WARMUP = 3;
const HEAP_RUNS = 5;
const ROW_HEIGHT = 40;
/** Rows per controller, identical for both behaviors so the DOM is constant. */
const ROWS = 4;
/**
 * Per-test budget for the heap arms.
 *
 * Each is eight readings — three warm-ups and five measured — and the retention
 * arms drive two thousand real drags per reading. Vitest's 15 s default is a
 * unit-test budget and this is a measurement.
 */
const TIMEOUT = 600_000;
/** Objects the retention falsifier deliberately keeps per drag. */
const RETAINED_PER_DRAG = 8;

type Memory = Readonly<{ usedJSHeapSize: number }>;
type Gc = Readonly<{ gc?(): void; performance: { memory?: Memory } }>;

const runtime = globalThis as unknown as Gc;

const available = (): boolean =>
  typeof runtime.gc === 'function' && runtime.performance.memory !== undefined;

// ---------------------------------------------------------------------------
// The sink
// ---------------------------------------------------------------------------

/** Anything the sink may hold: it must be able to release itself completely. */
type Graph = Readonly<{ dispose(): void }>;

/**
 * The module-level sink.
 *
 * It exists so the graph under measurement survives the `gc()` that precedes
 * the reading — and, just as importantly, so the **previous** graph is gone
 * before the next baseline is taken.
 */
let sink: Graph | null = null;

/** Reads the sink so nothing above can be optimized away as write-only. */
export const retained = (): unknown => sink;

const clear = (): void => {
  sink?.dispose();
  sink = null;
};

const used = (): number => runtime.performance.memory!.usedJSHeapSize;

/**
 * Drains the task and microtask queues before a reading.
 *
 * **Without this every figure in this file is negative**, and the reason is
 * `destroy(): Promise<void>` (D-36). Disposing a thousand controllers queues a
 * thousand promise reaction jobs, and a synchronous measurement loop never
 * lets the queue drain — so the previous population stays reachable across the
 * `gc()` that precedes the next baseline. The baseline then never returns to
 * its floor, and building the next population reads as *freeing* memory: the
 * first run of this file measured 1000 free-drag controllers at **−636 kB**,
 * stable to four digits, which is a defect and not a number.
 *
 * M-2 could not have met this: its graphs were construction stand-ins with no
 * asynchronous teardown at all.
 */
const settle = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
};

/**
 * Bytes `build` leaves retained, as the **minimum** of `HEAP_RUNS` runs after
 * `WARMUP` discarded ones.
 *
 * The minimum rather than the median or the mean: heap noise is one-sided, so
 * every source of error inflates a reading and none deflates it.
 */
/**
 * Runs `run(0..count-1)` strictly in order, as a promise chain.
 *
 * Every reading has to be separated from the next by a drained queue, so the
 * runs are inherently sequential; a chain says that in a shape the lint rules
 * against awaiting in a loop and declaring a closure in one have no quarrel
 * with.
 */
async function sequence(
  count: number,
  run: (round: number) => Promise<void>,
): Promise<void> {
  let chain = Promise.resolve();

  for (let i = 0; i < count; i += 1) {
    const round = i;

    chain = chain.then(() => run(round));
  }

  await chain;
}

async function heap(build: () => Graph): Promise<number> {
  let best = Number.POSITIVE_INFINITY;

  const once = async (): Promise<number> => {
    // **Disposed, drained and dropped before the baseline**, never after it.
    clear();
    await settle();
    runtime.gc?.();

    const before = used();

    sink = build();
    await settle();
    runtime.gc?.();

    return used() - before;
  };

  await sequence(WARMUP, async () => {
    await once();
  });
  await sequence(HEAP_RUNS, async () => {
    best = Math.min(best, await once());
  });
  clear();
  await settle();
  runtime.gc?.();

  return best;
}

/**
 * Bytes retained by running `work` on a graph that is **already built and
 * already measured**.
 *
 * The baseline is taken with the graph live, so the reading is the delta the
 * work leaves behind rather than the graph's own cost. This is the retention
 * arm's shape, and it is the one property M-2 found actually mattered.
 */
async function retention(
  build: () => Graph,
  work: (graph: Graph) => void,
): Promise<number> {
  let best = Number.POSITIVE_INFINITY;

  const once = async (): Promise<number> => {
    clear();
    await settle();
    runtime.gc?.();
    sink = build();
    await settle();
    runtime.gc?.();

    const before = used();

    work(sink);
    await settle();
    runtime.gc?.();

    return used() - before;
  };

  await sequence(WARMUP, async () => {
    await once();
  });
  await sequence(HEAP_RUNS, async () => {
    best = Math.min(best, await once());
  });
  clear();
  await settle();
  runtime.gc?.();

  return best;
}

const cleanup: Array<() => void> = [];

afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }

  clear();
});

// ---------------------------------------------------------------------------
// The populations
// ---------------------------------------------------------------------------

type Kind = 'sortable' | 'mixed' | 'free';

/**
 * One controller's DOM: a root and `ROWS` rows, **identical for both
 * behaviors** so that a population's DOM is a function of the count alone and
 * cancels out of every per-controller figure.
 */
function root(): HTMLElement {
  const element = document.createElement('div');

  Object.assign(element.style, {
    position: 'absolute',
    top: '0px',
    left: '0px',
    width: '120px',
  });

  for (let i = 0; i < ROWS; i += 1) {
    const row = document.createElement('div');

    Object.assign(row.style, {
      display: 'block',
      width: '100px',
      height: `${ROW_HEIGHT}px`,
    });
    element.append(row);
  }

  element.setPointerCapture = (): void => {};
  element.releasePointerCapture = (): void => {};
  document.body.append(element);
  return element;
}

type Population = Graph &
  Readonly<{
    roots: readonly HTMLElement[];
    /** `true` where that index holds a sortable controller. */
    isSortable: readonly boolean[];
    /**
     * Constructs `roots.length` controllers over the DOM already built.
     *
     * **Attaching is the measured work, and the DOM is the baseline.** An
     * earlier shape measured DOM-plus-controllers and subtracted a separate
     * DOM-only reading, and the subtrahend was the noisiest term in the file —
     * the same 500-element DOM read 6 B and 241 B per root in two runs of one
     * session, because a child element's JS wrapper is collectable while its
     * node is not. Building the DOM inside the baseline removes the term
     * instead of estimating it.
     */
    attach(kind: Kind): void;
  }>;

/**
 * `count` roots and their rows, with no controllers yet.
 *
 * **No consumer slot beyond the required resolution callback**, which runs at
 * release and never at construction: the figures are the library's, not the
 * fixture's.
 */
function stage(count: number): Population {
  const roots: HTMLElement[] = [];
  const rowsOf: HTMLElement[][] = [];
  const isSortable: boolean[] = [];
  const controllers: Array<{ destroy(): unknown }> = [];

  for (let i = 0; i < count; i += 1) {
    const element = root();

    roots.push(element);
    rowsOf.push([...element.children] as HTMLElement[]);
    isSortable.push(false);
  }

  return {
    roots,
    isSortable,
    attach: (kind): void => {
      for (let i = 0; i < count; i += 1) {
        const rows = rowsOf[i]!;
        const asSortable =
          kind === 'sortable' || (kind === 'mixed' && i % 2 === 0);

        isSortable[i] = asSortable;
        controllers.push(
          asSortable
            ? sortable(roots[i]!, {
                items: () => rows,
                axis: y(),
                onReorder: () => ReorderResolution.accept(),
              })
            : freeDrag(rows[0]!, {
                onDrop: () => FreeDragResolution.accept(),
              }),
        );
      }
    },
    dispose: (): void => {
      // **Destroyed, not dropped.** A live controller holds document
      // listeners, so releasing the array alone leaves the whole population
      // reachable and the next baseline reads it as already-allocated.
      for (const controller of controllers.splice(0)) {
        void controller.destroy();
      }

      for (const element of roots) {
        element.remove();
      }
    },
  };
}

/** A stage with its controllers already attached. */
function population(kind: Kind, count: number): Population {
  const built = stage(count);

  built.attach(kind);
  return built;
}

// ---------------------------------------------------------------------------
// Driving real drags
// ---------------------------------------------------------------------------

const POINTER_ID = 61;

const pointer = (type: string, target: EventTarget, clientY: number): void => {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      composed: true,
      cancelable: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: 40,
      clientY,
    }),
  );
};

/**
 * One whole drag on one controller: press, cross the threshold, move again,
 * release.
 *
 * Every controller in the population sees the two `pointermove`s — that is the
 * population under test, not contamination — but only the pressed one has an
 * open operation, so only it activates, lifts, renders and retires.
 */
function drag(target: HTMLElement): void {
  pointer('pointerdown', target, 10);
  pointer('pointermove', document, 45);
  pointer('pointermove', document, 90);
  pointer('pointerup', document, 90);
}

// ---------------------------------------------------------------------------
// P-02's retention half
// ---------------------------------------------------------------------------

/** `RectIndex` packs `[left, top, right, bottom, centreX, centreY]`. */
const STRIDE = 6;

const capacityFor = (needed: number): number => {
  let capacity = 1;

  while (capacity < needed) {
    capacity *= 2;
  }

  return capacity;
};

/**
 * One sortable controller over a `HIGH`-row DOM, whose **collection** is either
 * the whole list or four rows, with one full drag driven so the axis feature
 * has rebuilt its index at that size.
 *
 * The DOM is identical in both arms; only the snapshot the axis rule scans
 * differs, so the difference between the two readings is the `RectIndex`
 * buffer and nothing else. `release.prepare` re-resolves synchronously at
 * `pointerup`, so a plain press-move-release is enough to reach `refresh` —
 * no frame task has to be driven.
 */
/**
 * The rect index's retained buffer, measured **from the buffer** rather than
 * from the heap sampler.
 *
 * **`usedJSHeapSize` cannot see a `Float64Array`'s backing store**, and this
 * file has the evidence: an early falsifier here held sixty-four 8 kB
 * `Float64Array`s — 512 kB — and after the first run every later reading
 * returned **7.4 kB**, because V8 keeps large backing stores in a cache and the
 * next allocation reuses it. A heap-sampled figure for this buffer would
 * therefore be a number about the allocator and not about the library; the
 * first shape of this arm produced 158 kB, 191 kB, 208 kB and 477 kB across
 * four runs of an identical workload, against an arithmetic 192 kB.
 *
 * The observable that **is** exact is the buffer's own `byteLength`, and the
 * retention question — does the high water survive `retire()` — is a structural
 * property with an exact answer at every collection size.
 */
function bufferBytes(count: number, thenRetire: boolean): number {
  const index = createRectIndex();
  const items: HTMLElement[] = [];

  // Detached: the rebuild reads geometry and a detached element answers with
  // zeros, which is all this needs — nothing here depends on the values, only
  // on how many slots the scan produced. A hundred thousand *attached* rows
  // would be measuring layout.
  for (let i = 0; i < count; i += 1) {
    items.push(document.createElement('div'));
  }

  const snapshot: CollectionSnapshot = { items, version: 1 };

  index.refresh(snapshot, items[0]!, null, () => true);

  if (thenRetire) {
    index.retire();
  }

  return index.values.byteLength;
}

// ---------------------------------------------------------------------------
// Structural — the sink discipline, falsified before any near-zero is trusted
// ---------------------------------------------------------------------------

/**
 * A graph retaining `count` small closure-bearing objects — the shape a
 * controller population is, and deliberately **not** a large typed array.
 *
 * The first version of this falsifier held 8 kB `Float64Array`s and produced a
 * flatly wrong reading: V8 keeps large backing stores in a cache, so
 * `usedJSHeapSize` never returned to its baseline after the first run and every
 * later run measured the **reuse** of that cache — 7.4 kB where 512 kB had been
 * allocated. Small objects are collected and returned to the reading, which is
 * what makes `usedJSHeapSize` mean live bytes here.
 */
const record = (i: number): unknown => ({
  a: i,
  b: i,
  c: i,
  d: i,
  e: i,
  f: i,
  g: i,
  h: i,
  fn: (): number => i,
});

const ballast = (count: number): Graph => {
  let held: unknown[] | null = Array.from({ length: count }, (_, i) =>
    record(i),
  );

  const graph: Graph & Readonly<{ size(): number }> = {
    dispose: (): void => {
      held = null;
    },
    // Read so the array cannot be treated as write-only.
    size: (): number => held?.length ?? 0,
  };

  return graph;
};

describe.runIf(available())('M-2′ — falsifying the sink', () => {
  const SMALL = 10_000;

  it('should scale the reading with the retained count', async () => {
    // The positive control. Without it a near-zero reading anywhere below is
    // indistinguishable from an instrument that cannot see allocation at all.
    // A **ratio**, not a byte constant: the claim is that the instrument
    // responds proportionally, which is engine-independent.
    const one = await heap(() => ballast(SMALL));
    const two = await heap(() => ballast(SMALL * 2));

    expect(one).toBeGreaterThan(0);
    expect(two / one).toBeGreaterThan(1.7);
    expect(two / one).toBeLessThan(2.4);
  });

  it('should read the same retention as ≈0 when the sink is not cleared first', async () => {
    // **The M-2 defect, reproduced deliberately.** Holding the graph in a
    // variable the builder overwrites means each run frees one while allocating
    // the next; the net is zero and it reads exactly like *costs nothing*. This
    // row is why the discipline above is a discipline and not a decoration.
    const correct = await heap(() => ballast(SMALL));
    let broken: Graph | null = null;
    let best = Number.POSITIVE_INFINITY;

    for (let i = 0; i < WARMUP + HEAP_RUNS; i += 1) {
      // Deliberately **not** cleared before the baseline.
      runtime.gc?.();

      const before = used();

      broken = ballast(SMALL);
      runtime.gc?.();

      if (i >= WARMUP) {
        best = Math.min(best, used() - before);
      }
    }

    broken?.dispose();
    runtime.gc?.();

    expect(best).toBeLessThan(correct * 0.1);
  });
});

describe('M-2′ — the population is what it says it is', () => {
  it('should build the declared behavior mix', () => {
    const built = population('mixed', 10);

    try {
      expect(built.isSortable.filter(Boolean)).toHaveLength(5);
      expect(population('sortable', 4).isSortable).toEqual([
        true,
        true,
        true,
        true,
      ]);
    } finally {
      built.dispose();

      for (const element of [...document.body.children]) {
        element.remove();
      }
    }
  });

  it('should give both behaviors the identical DOM', () => {
    // Every per-controller figure below is taken over an already-built stage,
    // so the two behaviors must differ in controllers and in nothing else.
    const dom = stage(3);
    const shape = (element: Element): string => element.outerHTML;
    const baseline = dom.roots.map(shape);
    const built = population('mixed', 3);

    try {
      expect(built.roots.map(shape)).toEqual(baseline);
    } finally {
      built.dispose();
      dom.dispose();
    }
  });

  it('should size the rect index buffer to the collection’s high water', () => {
    // P-02's retention half, as an exact byte count. The buffer is
    // `capacityFor(n) × STRIDE × 8`, and `capacityFor` rounds up to a power of
    // two — so the retained size is a step function of the largest collection
    // the controller ever scanned.
    expect(bufferBytes(4000, false)).toBe(capacityFor(4000) * STRIDE * 8);
    expect(bufferBytes(4000, false)).toBe(4096 * 6 * 8);
  });

  it('should keep the high-water buffer across retirement', () => {
    // The retention claim itself. `retire()` empties the element array — that
    // is what pins DOM between operations — and **keeps the numeric buffer**,
    // so a controller that once scanned a large collection holds that buffer
    // for its own lifetime.
    expect(bufferBytes(4000, true)).toBe(bufferBytes(4000, false));
    // And a controller that never saw a large collection does not.
    expect(bufferBytes(4, true)).toBeLessThan(bufferBytes(4000, true) / 100);
  });

  it('should leave a driven drag with nothing lifted', () => {
    // The retention arm counts what 1000 of these leave behind, so a "drag"
    // that never activated would make its answer meaningless. This pins that
    // one drag both lifts and puts the visual back.
    const built = population('mixed', 2);

    try {
      const row = built.roots[0]!.firstElementChild as HTMLElement;

      pointer('pointerdown', row, 10);
      pointer('pointermove', document, 45);

      expect(row.getAttribute('style') ?? '').toContain('position: fixed');

      pointer('pointerup', document, 45);

      expect(row.getAttribute('style') ?? '').not.toContain('position: fixed');
    } finally {
      built.dispose();
    }
  });
});

// ---------------------------------------------------------------------------
// Heap — opt-in, asserts nothing
// ---------------------------------------------------------------------------

const kB = (bytes: number): string => `${(bytes / 1024).toFixed(1)}kB`;

describe.runIf(Boolean(import.meta.env['VITE_DRAG_MEASURE']) && available())(
  'M-2′ — heap measurement',
  () => {
    for (const count of [100, 1000]) {
      it(
        `should measure per-controller retained heap at ${count} controllers`,
        async () => {
          // **One population live at a time**: `heap` disposes and drops the
          // previous graph before it takes the next baseline, so no arm is ever
          // measured on top of its predecessor.
          const kinds = [
            'sortable',
            'mixed',
            'free',
          ] as const satisfies readonly Kind[];
          const each: number[] = [];

          await sequence(kinds.length, async (round) => {
            // **The DOM is the baseline and attaching is the work**, so no
            // DOM figure is subtracted and none has to be estimated.
            const bytes = await retention(
              () => stage(count),
              (graph) => {
                (graph as Population).attach(kinds[round]!);
              },
            );

            each.push(bytes / count);
          });

          const report = kinds
            .map((kind, i) => `${kind}=${each[i]!.toFixed(0)}B`)
            .join(' ');
          const [asSortable, asMixed, asFree] = each as [
            number,
            number,
            number,
          ];
          // **The additivity check.** A mixed population must cost the mean of
          // the two pure ones; a mixed figure that is not the mean would mean
          // something is shared between controllers, or that the reading is
          // measuring something other than the population.
          const additive = (asSortable + asFree) / 2;

          // oxlint-disable-next-line no-console -- this suite exists to report
          console.info(
            `M-2′ per-controller n=${count} ${report} | ` +
              `mixed-predicted=${additive.toFixed(0)}B ` +
              `mixed-measured=${asMixed.toFixed(0)}B ` +
              `sortable-specific=${(asSortable - asFree).toFixed(0)}B ` +
              `common=${Math.min(asSortable, asFree).toFixed(0)}B`,
          );
        },
        TIMEOUT,
      );
    }

    it(
      'should measure retention after 1000 drags over a 1000-controller mixed population',
      async () => {
        // The declared workload, and the property M-2 found actually mattered.
        //
        // **Every controller is dragged once inside `build`, before the
        // baseline.** A controller retains its first drag's steady state — a
        // committed frame, a rect index sized to its collection — and counting
        // that as retention would report a per-controller constant as a leak.
        // What is measured here is the **second** pass and beyond.
        //
        // **One pass, two and four**, because the shape of the answer is the
        // question: retention that scales with the number of drags is a leak,
        // and retention that saturates is a per-controller steady state that a
        // longer run does not grow.
        const COUNT = 1000;
        const passes =
          (n: number) =>
          (graph: Graph): void => {
            const { roots } = graph as Population;

            for (let pass = 0; pass < n; pass += 1) {
              for (let i = 0; i < COUNT; i += 1) {
                drag(roots[i]!.firstElementChild as HTMLElement);
              }
            }
          };
        const warmed = (): Graph => {
          const built = population('mixed', COUNT);

          passes(1)(built);
          return built;
        };
        const measured: number[] = [];

        await sequence(3, async (round) => {
          measured.push(await retention(warmed, passes([1, 2, 4][round]!)));
        });

        // The first pass over a **fresh** population, taken in the same shape
        // rather than as a difference of two five-megabyte readings — which is
        // what an earlier version did, and it produced +134 kB, +377 kB and
        // −172 kB for one quantity across three runs.
        const first = await retention(
          () => population('mixed', COUNT),
          passes(1),
        );
        const report = [1, 2, 4]
          .map(
            (n, i) =>
              `${n * COUNT}drags=${kB(measured[i]!)}(${(measured[i]! / (n * COUNT)).toFixed(1)}B each)`,
          )
          .join(' ');

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.info(
          `M-2′ retention population=${COUNT} mixed ${report} | ` +
            `first-pass=${kB(first)} (${(first / COUNT).toFixed(0)}B per controller)`,
        );
      },
      TIMEOUT,
    );

    it('should report the rect index’s high-water retention (P-02)', () => {
      // **Not named by the Phase 21 §M-2′ decision list**; M-4′'s record
      // deferred P-02's retention half here, and it is recorded under P-02's
      // own row rather than under M-2′'s decisions. It is **not** a heap
      // sample — see `bufferBytes` for why one would be a number about V8's
      // backing-store cache rather than about the library.
      const table = [100, 1000, 4000, 100_000]
        .map((n) => `${n}→${kB(bufferBytes(n, true))} (cap ${capacityFor(n)})`)
        .join(' ');

      // oxlint-disable-next-line no-console -- this suite exists to report
      console.info(
        `M-2′ stride-retention ${table} | stride=${STRIDE} ` +
          `scalars-y()-reads=1 ` +
          `stride-1-at-100000=${kB(capacityFor(100_000) * 8)}`,
      );
    });

    it(
      'should measure that a deliberately retained per-drag object is visible',
      async () => {
        // The retention arm's own falsifier: the same warmed shape, with a known
        // object kept per drag, so a near-zero above is a measurement rather than
        // a blind spot. One `DOMRect` per drag, held.
        const COUNT = 1000;
        const held: unknown[] = [];
        const all = (graph: Graph): void => {
          const { roots } = graph as Population;

          for (let i = 0; i < COUNT; i += 1) {
            drag(roots[i]!.firstElementChild as HTMLElement);
          }
        };
        const measured = await retention(
          () => {
            held.length = 0;

            const built = population('mixed', COUNT);

            all(built);
            const wrapped: Population = {
              roots: built.roots,
              isSortable: built.isSortable,
              attach: built.attach,
              dispose: (): void => {
                held.length = 0;
                built.dispose();
              },
            };

            return wrapped;
          },
          (graph) => {
            const { roots } = graph as Population;

            for (let i = 0; i < COUNT; i += 1) {
              const row = roots[i]!.firstElementChild as HTMLElement;

              drag(row);
              held.push(row.getBoundingClientRect());
            }
          },
        );

        // **The same objects, measured in a quiet arm**, so the falsifier
        // reports its own sensitivity rather than only its verdict. The
        // difference between the two is what the drag workload's own churn
        // costs the instrument, and it is the number the bound in the write-up
        // is divided by.
        const injected = await heap(() => ballast(RETAINED_PER_DRAG * COUNT));

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.info(
          `M-2′ retention-falsifier drags=${COUNT} held=${RETAINED_PER_DRAG}/drag ` +
            `reported=${kB(measured)} (${(measured / COUNT).toFixed(1)}B per drag) ` +
            `injected=${kB(injected)} (${(injected / COUNT).toFixed(1)}B per drag) ` +
            `sensitivity=${(measured / injected).toFixed(2)}`,
        );
      },
      TIMEOUT,
    );
  },
);
