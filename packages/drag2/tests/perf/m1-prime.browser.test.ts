/**
 * M-1′ — the shared publication site, and free drag's sample.
 *
 * The Phase 21 re-run of M-1 against the complete package, under the corrected
 * measurement contract: [`phase-21.md`](../../.plan/measurements/phase-21.md)
 * §M-1′ as amended by **D-96**, which is authoritative wherever it and D-95
 * differ. M-1's policy and equivalence discipline are reused unchanged — 5
 * discarded warm-ups, a calibrated batch, 21 samples, the median, and an
 * equivalence assertion before any ratio is quoted — and only the *arms*
 * change.
 *
 * **Arm A — the publication cliff, relocated.** One line of configuration
 * rather than a new measurement: the 12-to-16-field jump is Chromium's, not a
 * portable constant, and the engine has moved since 2026-08-02.
 *
 * **Arm B — the polymorphic call site, with an alternation-matched control**
 * (D-96 (2)). M-1 quoted its polymorphic figure against a *monomorphic* run, so
 * the 6× carried the alternation and a different mean field count alongside the
 * shape count it was attributed to. The control here alternates **two distinct
 * objects of one 8-field shape** through the same site, so the only difference
 * between the arms is how many shapes the site sees. The shapes are the real
 * ones: `SortableFramePart` is 8 fields, `FreeDragFramePart` is 5.
 *
 * **Arm C — one free-drag pointer sample, four compositions.** Bare, `+ axis`,
 * `+ bounds(element)`, `+ bounds(() => rect)`. **No consumer slot is installed
 * on any of them** beyond the required `onDrop`, which no sample reaches: a
 * per-sample `onMove` would put the consumer's work inside a number attributed
 * to the package. The one exception is the thunk source, which *is* consumer
 * code by construction and returns a hoisted rect so that it contributes a call
 * and not a rect construction.
 *
 * **Arm D — staleness.** The burst shape is a **structural assertion and not a
 * timing** (D-96 (1)): `k` invalidations between two samples must still produce
 * exactly one resolve per `apply`, for every `k`. It runs on every suite run.
 * The continuous shape is **telemetry**, and the frame gate is not among the
 * outcomes of either — D-96 withdrew it on arithmetic, because a gate can only
 * collapse resolves where more than one `apply` runs inside one frame and free
 * drag installs no frame task.
 *
 * **Arm E — allocation** (D-96 (3)). That `buildGeometry` allocates is settled
 * by reading it, and no workload returns *no*. What is measured is whether the
 * churn is observable as cost: **retention** across a *collected* pair — M-2's
 * discipline, not M-1's uncollected reading, which cannot separate retention
 * from churn — and **GC pressure** as the tail of the sample-time distribution
 * against the null-slot control.
 *
 * As in M-1 and Q-7 the structural assertions run always and the timings are
 * opt-in via `VITE_DRAG_MEASURE=1` and assert nothing.
 *
 * **Run this file alone.** The browser project runs test files in parallel, and
 * two measurement suites sharing a page inflate every absolute figure by ~2×.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { bounds } from '../../src/free-drag/bounds.ts';
import {
  freeDrag,
  FreeDragResolution,
  type FreeDragConfig,
} from '../../src/free-drag.ts';
import {
  frame,
  type Frame,
  type KernelFrame,
} from '../../src/kernel/frames.ts';

const WARMUP = 5;
const SAMPLES = 21;
const TARGET_SAMPLE_MS = 2;
const POINTER_ID = 31;
/** M-2's heap policy, reused verbatim for arm E's retention half. */
const HEAP_WARMUP = 3;
const HEAP_RUNS = 5;
const HEAP_SAMPLES = 20_000;

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
 * M-1's sampling policy, with the **whole distribution** returned rather than
 * only its median — arm E needs the tail, and a median-only helper would have
 * forced a second copy of the policy.
 *
 * Each returned value is the mean of one calibrated batch, which is what
 * `performance.now()`'s 100 µs clamp makes the smallest honest unit. A GC pause
 * therefore lands inside one batch and shows up as **tail across the 21
 * samples**, which is the resolution at which arm E's churn question can be
 * asked at all.
 */
function timings(iteration: (round: number) => void): readonly number[] {
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

  const measured: number[] = [];

  for (let i = 0; i < SAMPLES; i += 1) {
    measured.push(batch(repeats) / repeats);
  }

  return measured;
}

const at = (measured: readonly number[], quantile: number): number =>
  measured.toSorted((a, b) => a - b)[
    Math.min(measured.length - 1, Math.floor(measured.length * quantile))
  ]!;

const median = (measured: readonly number[]): number => at(measured, 0.5);

// ---------------------------------------------------------------------------
// The publication step, isolated — arms A and B
// ---------------------------------------------------------------------------

type Part = Record<string, unknown>;

/** A behavior part of `size` reference-bearing fields, the shape a real one has. */
function createPart(size: number): () => Part {
  const keys = Array.from({ length: size }, (_, i) => `field${i}`);

  return () => {
    const part: Part = {};

    for (const key of keys) {
      part[key] = null;
    }

    return part;
  };
}

type Pair = { current: Frame<Part>; draft: Frame<Part> };

function createPair(size: number): Pair {
  const factory = createPart(size);

  return {
    current: Object.assign(frame(), factory()),
    draft: Object.assign(frame(), factory()),
  };
}

/** What ships: copy the whole frame, write the sample, swap. */
function publishGeneric(pair: Pair, x: number, y: number): void {
  Object.assign(pair.draft, pair.current);
  pair.draft.pointerX = x;
  pair.draft.pointerY = y;

  const committed = pair.draft;

  pair.draft = pair.current;
  pair.current = committed;
}

/** The candidate: two writes into the committed frame, no copy and no swap. */
function publishSpecialized(pair: Pair, x: number, y: number): void {
  const frame = pair.current as KernelFrame;

  frame.pointerX = x;
  frame.pointerY = y;
}

const keysOf = (pair: Pair): readonly string[] =>
  Object.keys(pair.current).toSorted();

// ---------------------------------------------------------------------------
// A live free drag — arms C, D and E
// ---------------------------------------------------------------------------

type Live = Readonly<{
  item: HTMLElement;
  stage: HTMLElement;
  sample(y: number): void;
  rendered(): readonly [number, number];
  /**
   * **Every arm of a paired comparison must dispose before the next is built.**
   * A free-drag controller listens for `pointermove` on the document, so a
   * fixture left alive receives every later arm's samples too and each arm
   * measures the sum of itself and its predecessors. The first run of this file
   * did exactly that: `axis` read 8.0 µs against a 3.5 µs bare arm because two
   * controllers were handling one dispatch.
   */
  dispose(): void;
}>;

/**
 * One free-drag operation, active and ready to be sampled, composed from
 * exactly the fragments handed in. `onDrop` is the only consumer slot the bare
 * form carries, and no sample reaches it.
 */
function liveFreeDrag(
  fragments: ReadonlyArray<Partial<FreeDragConfig>> = [],
  config: Partial<FreeDragConfig> = {},
): Live {
  const stage = document.createElement('div');

  Object.assign(stage.style, {
    position: 'fixed',
    top: '0px',
    left: '0px',
    width: '600px',
    height: '600px',
  });

  const item = document.createElement('div');

  Object.assign(item.style, {
    display: 'block',
    width: '100px',
    height: '40px',
  });
  stage.append(item);
  document.body.append(stage);

  const controller = freeDrag(
    item,
    { onDrop: () => FreeDragResolution.accept(), ...config },
    ...fragments,
  );

  item.setPointerCapture = (): void => {};
  item.releasePointerCapture = (): void => {};

  let disposed = false;
  const dispose = (): void => {
    if (disposed) {
      return;
    }

    disposed = true;
    void controller.destroy();
    stage.remove();
  };

  cleanup.push(dispose);

  item.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      cancelable: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: 10,
      clientY: 10,
    }),
  );

  const sample = (y: number): void => {
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: POINTER_ID,
        isPrimary: true,
        clientX: 30,
        clientY: y,
      }),
    );
  };

  // Cross the 8px threshold so every measured sample is an ACTIVE one.
  sample(10);

  return {
    item,
    stage,
    sample,
    dispose,
    rendered: () => {
      const match = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/u.exec(
        item.style.transform,
      );

      return match === null
        ? ([0, 0] as const)
        : ([Number(match[1]), Number(match[2])] as const);
    },
  };
}

/**
 * A `scroll` that reaches the kernel's invalidator. The listener is registered
 * on `window` **with capture**, so a document-targeted scroll is on its
 * propagation path — which is what a nested scroller produces in a real page.
 */
const scrolled = (): void => {
  document.dispatchEvent(new Event('scroll'));
};

/** A bounds source too large to clamp, counting the resolves it is asked for. */
function countingSource(): Readonly<{
  fragment: Partial<FreeDragConfig>;
  resolves: number;
}> {
  // Hoisted, not constructed per call: the thunk contributes one call to the
  // measurement and not one rect allocation.
  const rect = new DOMRectReadOnly(-5000, -5000, 10_000, 10_000);
  const record = {
    resolves: 0,
    fragment: bounds((): DOMRectReadOnly => {
      record.resolves += 1;

      return rect;
    }),
  };

  return record;
}

// ---------------------------------------------------------------------------
// Structural — runs on every suite run
// ---------------------------------------------------------------------------

describe("M-1' arm A — the specialized publication path", () => {
  it('should leave the same committed frame as the generic one', () => {
    // The equivalence check the standard requires, reused unchanged. Without it
    // a faster variant is only faster at doing something else.
    const generic = createPair(8);
    const specialized = createPair(8);

    for (let i = 0; i < 64; i += 1) {
      publishGeneric(generic, i * 3, i * 7);
      publishSpecialized(specialized, i * 3, i * 7);
    }

    expect({ ...generic.current }).toEqual({ ...specialized.current });
  });
});

describe("M-1' arm B — the alternation-matched control", () => {
  it('should alternate two objects of one shape in the control', () => {
    // **What makes the control a control** (D-96 (2)), asserted rather than
    // described: both frames the control drives must carry the same field set,
    // so the site sees one hidden class across an alternation of two objects.
    const first = createPair(8);
    const second = createPair(8);

    expect(keysOf(first)).toEqual(keysOf(second));
  });

  it('should alternate two different shapes in the measured arm', () => {
    // And what makes the measured arm the measured arm: the two parts differ,
    // and differ in the way the real behaviors do — 8 fields against 5.
    const sortableShaped = createPair(8);
    const freeDragShaped = createPair(5);

    expect(keysOf(sortableShaped)).not.toEqual(keysOf(freeDragShaped));
  });
});

describe("M-1' arm C — the constrained compositions", () => {
  it('should render what the bare composition renders when nothing clamps', () => {
    // The compositions are only comparable while they compute the same result.
    // A bounds rect too large to clamp makes the delta the *cost of the
    // mechanism* rather than the cost of a different outcome — which is the
    // same discipline arm A's equivalence check applies to a specialized path.
    const bare = liveFreeDrag();
    const constrained = liveFreeDrag([countingSource().fragment]);

    bare.sample(90);
    constrained.sample(90);

    expect(constrained.rendered()).toEqual(bare.rendered());
  });
});

describe("M-1' arm D — the staleness burst", () => {
  // **The structural half of the staleness arm** (D-96 (1)). `invalidate()` is
  // a flag and the resolve is deferred to the next `apply`, so `k` marks
  // between two samples must still cost exactly one resolve. This is the one
  // place a read *count* is evidence, and it is evidence of a **regression**:
  // a result above one means the rect is resolved somewhere the contract says
  // it is not, and the number is the same for every `k` precisely because the
  // flag is set once and read once.
  for (const k of [1, 4, 16]) {
    it(`should resolve once per apply after ${k} invalidations`, () => {
      const source = countingSource();
      const live = liveFreeDrag([source.fragment]);
      // The first resolve of every operation is at `activation.effect`, which
      // is already spent by the time the fixture returns.
      const before = source.resolves;

      for (let i = 0; i < k; i += 1) {
        scrolled();
      }

      live.sample(90);

      expect(source.resolves - before).toBe(1);
    });
  }

  it('should resolve nothing at all for a sample with no invalidation', () => {
    // The other side of the same claim: a resolve is owed to a staleness mark
    // and to nothing else, so an unmarked sample re-uses the cached rect.
    const source = countingSource();
    const live = liveFreeDrag([source.fragment]);
    const before = source.resolves;

    live.sample(90);
    live.sample(120);

    expect(source.resolves - before).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Timings — opt-in, and they assert nothing
// ---------------------------------------------------------------------------

describe.runIf(Boolean(import.meta.env['VITE_DRAG_MEASURE']))(
  "M-1' — timing measurement",
  () => {
    const report = (value: number): string => `${(value * 1000).toFixed(4)}µs`;

    // -- Arm A ------------------------------------------------------------
    for (const size of [3, 8, 12, 16, 20, 28]) {
      it(`should relocate the cliff at a ${size}-field part`, () => {
        const generic = createPair(size);
        const specialized = createPair(size);
        const a = median(
          timings((round) => {
            publishGeneric(generic, round, round);
          }),
        );
        const b = median(
          timings((round) => {
            publishSpecialized(specialized, round, round);
          }),
        );

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.warn(
          `M-1' A part=${size} generic=${report(a)} specialized=${report(b)} ratio=${(a / b).toFixed(2)}`,
        );
      });
    }

    // -- Arm B ------------------------------------------------------------
    it('should measure the shared site against an alternation-matched control', () => {
      // **The decision-driving figure is `mixed / matched`**, and it is named
      // as such wherever it is quoted. The two monomorphic figures are
      // telemetry: they are what make the residual bias computable. That bias
      // runs **toward 1** — the mixed arm's mean field count is 6.5 against the
      // control's 8 — so a ratio above 1 is conservative and a ratio near 1 is
      // not.
      const sortableShaped = createPair(8);
      const freeDragShaped = createPair(5);
      const mixed = [sortableShaped, freeDragShaped];
      const matched = [createPair(8), createPair(8)];

      const mixedCost = median(
        timings((round) => {
          publishGeneric(mixed[round % 2]!, round, round);
        }),
      );
      const matchedCost = median(
        timings((round) => {
          publishGeneric(matched[round % 2]!, round, round);
        }),
      );
      const monomorphic8 = median(
        timings((round) => {
          publishGeneric(sortableShaped, round, round);
        }),
      );
      const monomorphic5 = median(
        timings((round) => {
          publishGeneric(freeDragShaped, round, round);
        }),
      );
      // **M-1's own scenario, re-run beside the corrected one** — three shapes
      // at 3, 8 and 20 fields through one site. It is telemetry, and it is here
      // so that the correction to M-1's 6× is a measurement rather than an
      // argument: the 20-field frame is on the far side of arm A's cliff, so
      // that figure carries the cliff as well as the alternation.
      const legacy = [createPair(3), createPair(8), createPair(20)];
      const legacyCost = median(
        timings((round) => {
          publishGeneric(legacy[round % 3]!, round, round);
        }),
      );

      // oxlint-disable-next-line no-console -- this suite exists to report
      console.warn(
        `M-1' B mixed=${report(mixedCost)} matched-control=${report(matchedCost)} ` +
          `ratio=${(mixedCost / matchedCost).toFixed(2)} ` +
          `[telemetry mono8=${report(monomorphic8)} mono5=${report(monomorphic5)} ` +
          `M-1-3/8/20=${report(legacyCost)}]`,
      );
    });

    // -- Arm C ------------------------------------------------------------
    it('should measure one pointer sample across the four compositions', () => {
      // The decision-driving quantity is the **delta between bare and each
      // constrained form** — what `applyConstraint?.()` and the clamp actually
      // cost against a design that pays one property read and one predictable
      // branch when no one filled the slot.
      const element = document.createElement('div');

      Object.assign(element.style, {
        position: 'fixed',
        top: '-2000px',
        left: '-2000px',
        width: '6000px',
        height: '6000px',
      });
      document.body.append(element);
      cleanup.push(() => {
        element.remove();
      });

      const arms: ReadonlyArray<
        readonly [
          string,
          ReadonlyArray<Partial<FreeDragConfig>>,
          Partial<FreeDragConfig>,
        ]
      > = [
        ['bare', [], {}],
        ['axis', [], { axis: 'y' }],
        ['bounds(element)', [bounds(element)], {}],
        ['bounds(thunk)', [countingSource().fragment], {}],
      ];
      const costs = arms.map(([name, fragments, config]) => {
        const live = liveFreeDrag(fragments, config);
        const cost = median(
          timings((round) => {
            live.sample(20 + (round % 120));
          }),
        );

        // One live controller at a time — see `Live.dispose`.
        live.dispose();

        return [name, cost] as const;
      });
      const [, bare] = costs[0]!;

      for (const [name, cost] of costs) {
        // oxlint-disable-next-line no-console -- this suite exists to report
        console.warn(
          `M-1' C ${name}=${report(cost)} delta-vs-bare=${report(cost - bare)}`,
        );
      }
    });

    // -- Arm D, the continuous half --------------------------------------
    it('should measure the continuous-scroll cost against a no-scroll control', () => {
      // **Telemetry, and labelled as such.** No decision in this phase turns on
      // it: the frame gate was withdrawn on arithmetic (D-96 (1)), and holding
      // a rect across frames would serve the previous frame's rect to this
      // frame's clamp — a correctness change wearing an optimization's clothes.
      const element = document.createElement('div');

      Object.assign(element.style, {
        position: 'fixed',
        top: '-2000px',
        left: '-2000px',
        width: '6000px',
        height: '6000px',
      });
      document.body.append(element);
      cleanup.push(() => {
        element.remove();
      });

      const arms: ReadonlyArray<
        readonly [string, ReadonlyArray<Partial<FreeDragConfig>>]
      > = [
        // **The third arm is the one that makes the other two readable.** The
        // delta the contract names is against a no-scroll control, so it
        // carries the harness's own `dispatchEvent` as well as the resolve. A
        // composition with no `bounds()` subscribes no invalidator, so the same
        // scroll pacing over it is the dispatch alone, and the difference
        // between the two scrolled columns is the resolve by itself.
        ['no bounds', []],
        ['element', [bounds(element)]],
        ['thunk', [countingSource().fragment]],
      ];

      for (const [name, fragments] of arms) {
        const quiet = liveFreeDrag(fragments);
        const still = median(
          timings((round) => {
            quiet.sample(20 + (round % 120));
          }),
        );

        quiet.dispose();

        const active = liveFreeDrag(fragments);
        const scrolling = median(
          timings((round) => {
            scrolled();
            active.sample(20 + (round % 120));
          }),
        );

        active.dispose();

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.warn(
          `M-1' D ${name} no-scroll=${report(still)} per-sample-invalidated=${report(scrolling)} ` +
            `delta=${report(scrolling - still)}`,
        );
      }
    });

    // -- Arm E ------------------------------------------------------------
    it('should measure retention across a collected pair', () => {
      // **M-2's discipline, not M-1's** (D-96 (3)). M-1 read `usedJSHeapSize`
      // with no intervening `gc()` and correctly called the result a bound on
      // *allocation*; growth under that method is uncollected churn or
      // retention indistinguishably, so it cannot be borrowed for a retention
      // claim. `gc()` before the baseline **and** before the final reading
      // makes the delta retention. The minimum of several runs, because heap
      // noise is one-sided.
      const arms: ReadonlyArray<readonly [string, Partial<FreeDragConfig>]> = [
        ['onMove installed', { onMove: (): void => {} }],
        ['slot null', {}],
      ];

      for (const [name, config] of arms) {
        const run = (): number => {
          const live = liveFreeDrag([], config);

          runtime.gc?.();

          const before = runtime.performance.memory!.usedJSHeapSize;

          for (let i = 0; i < HEAP_SAMPLES; i += 1) {
            live.sample(20 + (i % 120));
          }

          runtime.gc?.();

          const grew = runtime.performance.memory!.usedJSHeapSize - before;

          // **The reading is taken before the fixture is torn down**, so the
          // delta is what 20 000 samples left behind and not what disposal
          // released. Disposal follows, so the next run starts from one
          // controller rather than from a growing pile of them.
          live.dispose();

          return grew;
        };

        for (let i = 0; i < HEAP_WARMUP; i += 1) {
          run();
        }

        let retained = Number.POSITIVE_INFINITY;

        for (let i = 0; i < HEAP_RUNS; i += 1) {
          retained = Math.min(retained, run());
        }

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.warn(
          `M-1' E retention ${name} samples=${HEAP_SAMPLES} ` +
            `retained=${(retained / 1024).toFixed(1)}kB ` +
            `≈ ${(retained / HEAP_SAMPLES).toFixed(2)}B per sample`,
        );
      }
    });

    it('should measure the sample-time tail against the null-slot control', () => {
      // **Where churn becomes visible if it matters.** A generational collector
      // absorbs per-sample allocation into the tail rather than the mean, so
      // the median is the wrong statistic here and the p95 and the max are the
      // right ones. A tail indistinguishable from the control is the honest
      // form of *this costs nothing observable* — and it does **not** say the
      // allocation is absent, which is settled by reading the code.
      const arms: ReadonlyArray<readonly [string, Partial<FreeDragConfig>]> = [
        ['onMove installed', { onMove: (): void => {} }],
        ['slot null', {}],
      ];

      for (const [name, config] of arms) {
        const live = liveFreeDrag([], config);
        const measured = timings((round) => {
          live.sample(20 + (round % 120));
        });

        live.dispose();

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.warn(
          `M-1' E churn ${name} median=${report(median(measured))} ` +
            `p95=${report(at(measured, 0.95))} max=${report(Math.max(...measured))}`,
        );
      }
    });
  },
);
