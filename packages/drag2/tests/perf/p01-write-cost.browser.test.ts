/**
 * P-01 — the cost of one visual write, and of the gate that would remove it
 * (D-99).
 *
 * **M-6 established the opportunity and deliberately refused to price it.** It
 * counted `lift.write` calls per rendering opportunity and found p95 3–8 on a
 * stream Chromium itself coalesced, so the saving a write gate would make is
 * `(writes per tick − 1) × one write` — with one write never measured. This
 * file measures it, and measures what a gate would cost to collect it.
 *
 * **This is a timing experiment, and it is the inverse of M-6's discipline.**
 * No count decides anything here; every figure is a duration.
 *
 * **No gate is implemented in production.** D-99 forbids starting one before
 * the write cost is known, and the gate below is a harness prototype that lives
 * entirely in this file. It is written to be the *smallest sound* gate — a
 * pending pair, one scheduling flag, one rAF — so its overhead is a floor for
 * any real design rather than an artefact of a clumsy one.
 *
 * ## Why one write cannot be timed one at a time
 *
 * `performance.now()` is clamped in this engine — the probe below reports the
 * granularity it actually resolves — and a single `style.transform` assignment
 * is expected to land far under it. A per-call timer would therefore return a
 * field of zeros and a scattering of one-tick readings, which is a measurement
 * of the clock. So the marginal cost is taken **in batches inside one rAF
 * callback**, which is also the regime a gate removes: the second through
 * eighth write of a frame, with no paint and no layout read between them.
 *
 * **Distinct values on every assignment**, so nothing is measuring a
 * same-value short-circuit.
 *
 * ## Why the subject must be a live lifted visual
 *
 * The deployed write targets an element that is `position: fixed`, in the top
 * layer, with transitions suppressed and a `matrix()` base transform composed
 * into every value (`kernel/presentation.ts`). Style invalidation cost is a
 * property of that state, so every arm runs against a real free drag in
 * progress and composes the same string shape the shipped `compose` produces,
 * suffix included, read back from a write the drag itself performed.
 *
 * ## The instrument is falsified before any result is recorded
 *
 * A batch timer that reports the same number for everything would price the
 * write at whatever its own noise floor is and read as evidence. So the same
 * timer, in the same frames, also prices a `getBoundingClientRect()` — an
 * operation that forces layout and is known to be far more expensive — and the
 * structural row asserts it can tell the two apart.
 *
 * **The flush obligation is asserted rather than described.** D-99 records the
 * gate's contract cost as a flush on every terminal path; the structural rows
 * below show a pending write left behind by a gate that is torn down without
 * one, and caught up by a gate that flushes.
 *
 * **Run this file alone**, as the standard requires of every measurement file.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import {
  freeDrag,
  FreeDragResolution,
  type FreeDragController,
} from '../../src/free-drag.ts';
import '../support/browser-commands.ts';

const ITEM = { x: 0, y: 0, width: 120, height: 60 } as const;
const GRAB = { x: 30, y: 30 } as const;

const cleanup: Array<() => void> = [];

afterEach(async () => {
  try {
    await commands.pointerRelease();
  } catch {
    // Nothing was pressed.
  }

  for (const dispose of cleanup.splice(0).reverse()) {
    dispose();
  }
});

// ---------------------------------------------------------------------------
// The subject: a live free drag, with the writes it performs observable
// ---------------------------------------------------------------------------

type Subject = Readonly<{
  item: HTMLElement;
  controller: FreeDragController;
  /**
   * Installs the recording accessor over `style.transform`.
   *
   * **Off by default, and that is load-bearing.** The accessor costs two
   * `performance.now()` calls and two array pushes per write — which is more
   * than the write it observes. Arm A wants exactly that trade, because it is
   * timing the deployed write where it happens and needs a hook there. Every
   * batch arm must not pay it, or the slope prices the instrument. The first
   * run of the falsifier below caught precisely this.
   */
  arm(): void;
  /** Removes it, restoring the native CSSOM setter. */
  disarm(): void;
  /** Every value the drag itself assigned while armed, in order. */
  written(): readonly string[];
  /**
   * Each write's **ordinal within its rendering opportunity** — 0 for the first
   * write of a tick, 1 for the second, and so on.
   *
   * **This is the quantity P-01 actually turns on.** A gate removes the writes
   * at ordinal ≥ 1 and keeps the one at ordinal 0, so the saving is priced by
   * what ordinal ≥ 1 costs *in situ*, not by what a synthetic batch costs and
   * not by what the average write costs.
   */
  ordinals(): readonly number[];
  /** Wall time spent inside `setProperty` while armed, per write, in ms. */
  spent(): readonly number[];
  /**
   * An **empty** window, measured with the same two clock calls immediately
   * after each write — the null control for the quantized-clock estimator.
   *
   * At a 100 µs granularity a sub-microsecond operation reads zero almost
   * always and one whole quantum occasionally, so the *mean* reading estimates
   * the true cost and the *rate* of non-zero readings estimates it divided by
   * the quantum. That inference is only worth anything if the same estimator
   * returns ~0 for an operation that genuinely costs nothing, which is what
   * this records.
   */
  control(): readonly number[];
  reset(): void;
  /** Releases the pointer and tears this subject down, ahead of `afterEach`. */
  dispose(): Promise<void>;
  /**
   * The base transform the shipped `compose` appends — read back from the
   * inline value a write actually left, so the synthetic arms compose the same
   * string the deployed path does rather than a shorter one.
   */
  suffix(): string;
}>;

function subject(): Subject {
  const stage = document.createElement('div');

  Object.assign(stage.style, {
    position: 'fixed',
    top: '0px',
    left: '0px',
    width: '900px',
    height: '900px',
  });

  const item = document.createElement('div');

  Object.assign(item.style, {
    display: 'block',
    width: `${ITEM.width}px`,
    height: `${ITEM.height}px`,
    background: '#888',
  });
  stage.append(item);
  document.body.append(stage);

  const values: string[] = [];
  const spent: number[] = [];
  const control: number[] = [];
  const ordinals: number[] = [];
  const { style } = item;

  // A chained rAF resets the ordinal at every rendering opportunity, so the
  // tick boundary is the browser's own rather than a wall-clock guess.
  let sinceTick = 0;
  let ticking = false;

  const tick = (): void => {
    sinceTick = 0;

    if (ticking) {
      requestAnimationFrame(tick);
    }
  };

  const controller = freeDrag(item, {
    onDrop: () => FreeDragResolution.accept(),
  });

  const teardown = (): void => {
    ticking = false;
    void controller.destroy();
    stage.remove();
  };

  cleanup.push(teardown);

  return {
    item,
    controller,

    arm(): void {
      ticking = true;
      requestAnimationFrame(tick);

      // Own, configurable, and therefore removable: deleting it falls back to
      // `CSSStyleDeclaration.prototype`'s native accessor.
      Object.defineProperty(style, 'transform', {
        configurable: true,
        get: (): string => style.getPropertyValue('transform'),
        set: (value: string): void => {
          const started = performance.now();

          style.setProperty('transform', value);

          const wrote = performance.now();
          const empty = performance.now();

          spent.push(wrote - started);
          control.push(empty - wrote);
          ordinals.push(sinceTick);
          values.push(value);
          sinceTick += 1;
        },
      });
    },

    disarm(): void {
      ticking = false;
      delete (style as unknown as Record<string, unknown>)['transform'];
    },

    written: () => values,
    spent: () => spent,
    control: () => control,
    ordinals: () => ordinals,

    dispose: async (): Promise<void> => {
      // **Released, not merely destroyed.** A press left down leaks into the
      // next flood: its `pointerPress` issues a second `down` on an already-
      // pressed button, no operation is admitted, and the arm then compares a
      // live drag against a dead one. The first run of arm E did exactly that
      // and reported `requests=0` for the gated side.
      await commands.pointerRelease();
      teardown();
    },

    reset: () => {
      values.length = 0;
      spent.length = 0;
      control.length = 0;
      ordinals.length = 0;
    },

    suffix: () => {
      const current = style.getPropertyValue('transform');

      // `translate(Xpx, Ypx)` is always first, so the first `)` closes it and
      // everything after it is the base transform (empty, or a `matrix(...)`).
      return current ? current.slice(current.indexOf(')') + 1) : '';
    },
  };
}

// ---------------------------------------------------------------------------
// The gate prototype — harness only, never production (D-99)
// ---------------------------------------------------------------------------

/**
 * The smallest coalescing gate that is still sound: the latest position, one
 * scheduling handle, and a flush that a terminal path must call.
 *
 * Its overhead is therefore a **floor** — any shipped design pays at least
 * this, plus whatever the four terminal paths cost to wire.
 */
type WriteGate = Readonly<{
  /** What `moved` would call instead of assigning the transform. */
  request(value: string): void;
  /** What release, cancel, destroy and the landing hand-off would owe. */
  flush(): void;
  dispose(): void;
  /** Writes the gate actually let through. */
  commits(): number;
}>;

/**
 * **The payload is the composed string, not the `(x, y)` pair.** A gate placed
 * at `lift.write` would hold two scalars and compose once per frame, which is
 * strictly cheaper — so pricing this shape charges the gate for a composition
 * it would not perform, and every gate figure below is an **over**-estimate of
 * its cost. The string form is used because it is also the shape arm E can
 * intercept without reaching inside the kernel, and one gate priced in one
 * place is worth more than two gates priced differently.
 */
function createGate(commit: (value: string) => void): WriteGate {
  let pending = '';
  let handle = 0;
  let dirty = false;
  let commits = 0;

  const flushOne = (): void => {
    handle = 0;

    if (dirty) {
      dirty = false;
      commits += 1;
      commit(pending);
    }
  };

  return {
    request(value: string): void {
      pending = value;
      dirty = true;

      if (handle === 0) {
        handle = requestAnimationFrame(flushOne);
      }
    },

    flush(): void {
      if (handle !== 0) {
        cancelAnimationFrame(handle);
      }

      flushOne();
    },

    dispose(): void {
      if (handle !== 0) {
        cancelAnimationFrame(handle);
        handle = 0;
      }
    },

    commits: () => commits,
  };
}

// ---------------------------------------------------------------------------
// Timing helpers
// ---------------------------------------------------------------------------

const frameOf = (): Promise<number> =>
  new Promise((done) => {
    requestAnimationFrame(done);
  });

const median = (values: readonly number[]): number =>
  values.length === 0
    ? 0
    : values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)]!;

/** Warm-up frames discarded before every batch. */
const WARMUP = 4;

/**
 * Runs `batch` once per rAF callback over `frames` frames and returns the
 * per-frame durations in ms.
 *
 * **One batch per rendering opportunity, never a tight loop across frames.**
 * The quantity under test is the cost of repeated work *inside* one frame, so
 * the frame boundary has to stay where the browser puts it.
 */
async function perFrame(
  frames: number,
  batch: (frame: number) => void,
): Promise<readonly number[]> {
  const taken: number[] = [];

  // Warm-up frames, discarded. The first batch of any shape pays for the
  // shape's own compilation and for a cold allocator, and the first run of
  // this file showed it as a non-monotonic n=500 reading above n=4000.
  for (let warm = 0; warm < WARMUP; warm += 1) {
    // oxlint-disable-next-line no-await-in-loop -- the frame is the workload
    await frameOf();
    batch(-1 - warm);
  }

  for (let frame = 0; frame < frames; frame += 1) {
    // oxlint-disable-next-line no-await-in-loop -- the frame is the workload
    await frameOf();

    const started = performance.now();

    batch(frame);
    taken.push(performance.now() - started);
  }

  return taken;
}

/**
 * Per-operation cost, in µs, from a batch of `count` operations per frame.
 *
 * **The minimum, not the mean.** Every source of error here is additive — a
 * GC pause, the drag's own work, a compositor frame landing inside the batch —
 * so the fastest observed run is the closest to the cost of the work itself.
 */
const perOp = (durations: readonly number[], count: number): number =>
  (Math.min(...durations) / count) * 1000;

/** A drag in progress, with the base transform already established. */
async function lifted(): Promise<Subject> {
  const live = subject();

  await commands.pointerPress(GRAB.x, GRAB.y);
  await commands.pointerSweep(GRAB.x + 60, GRAB.y + 60, 4);

  return live;
}

/**
 * One flood of real pointer input, with the library's visual writes either
 * passed straight through or routed into the gate.
 *
 * **This is the arm that decides P-01**, because it needs no model. Arms A and
 * B disagree by a factor of forty — an in-situ write reads far dearer than a
 * synthetic same-frame one — and rather than argue about which regime the
 * deployment is in, this runs the deployment and takes the difference the gate
 * makes to it.
 *
 * **The bracket is the whole `pointermove` dispatch.** The kernel listens on
 * the document in the bubble phase (`kernel/pointer.ts`), so a `window`
 * capture listener opens the window before it and a `window` bubble listener
 * closes it after — the measured span is every listener the sample runs,
 * `constrain.apply` and the visual write included. Whatever a write costs, and
 * wherever that cost is actually charged, it is inside this span.
 *
 * **The two arms differ only in what the setter does.** Both install the same
 * shadowing accessor and pay the same property-lookup overhead; one calls
 * `setProperty`, the other calls `gate.request`. So the difference between them
 * is the write, not the instrument.
 *
 * The clock is coarse — 100 µs — but each dispatch is an independent unbiased
 * sample, so the **sum over a few hundred dispatches** has resolution the
 * individual readings do not.
 */
async function flood(
  wave: number,
  gated: boolean,
): Promise<
  Readonly<{
    handlerMs: number;
    dispatches: number;
    requests: number;
    writes: number;
    committed: string;
  }>
> {
  const live = await lifted();
  const { style } = live.item;

  let requests = 0;
  let writes = 0;
  let handlerMs = 0;
  let dispatches = 0;
  let opened = 0;

  const gate = createGate((value) => {
    writes += 1;
    style.setProperty('transform', value);
  });

  Object.defineProperty(style, 'transform', {
    configurable: true,
    get: (): string => style.getPropertyValue('transform'),
    set: (value: string): void => {
      requests += 1;

      if (gated) {
        gate.request(value);
      } else {
        writes += 1;
        style.setProperty('transform', value);
      }
    },
  });

  const listening = new AbortController();
  const { signal } = listening;

  window.addEventListener(
    'pointermove',
    () => {
      opened = performance.now();
    },
    { capture: true, signal },
  );
  window.addEventListener(
    'pointermove',
    () => {
      handlerMs += performance.now() - opened;
      dispatches += 1;
    },
    { signal },
  );

  await commands.pointerFlood(240, wave);
  await frameOf();

  // The terminal-path obligation, discharged: without it the last requested
  // position never reaches the element, which the structural rows above show.
  gate.flush();
  listening.abort();

  const committed = style.getPropertyValue('transform');

  gate.dispose();
  await live.dispose();

  return { handlerMs, dispatches, requests, writes, committed };
}

// ---------------------------------------------------------------------------
// Structural — the instrument, the gate, and the obligation it creates
// ---------------------------------------------------------------------------

describe('P-01 — the timing instrument', () => {
  it('should resolve a forced layout read apart from a transform write', async () => {
    // **The falsifier.** A batch timer pinned at its own noise floor would
    // price the write at that floor and read as evidence. The same timer, in
    // the same frames, prices an operation that forces layout — and the two
    // must not come back the same, or nothing measured below is a measurement.
    const live = await lifted();
    const suffix = live.suffix();
    const { style } = live.item;
    const BATCH = 500;

    const writes = await perFrame(8, (frame) => {
      for (let i = 0; i < BATCH; i += 1) {
        style.transform = `translate(${frame + i}px, ${i}px)${suffix}`;
      }
    });

    let sink = 0;

    const reads = await perFrame(8, (frame) => {
      for (let i = 0; i < BATCH; i += 1) {
        style.transform = `translate(${frame + i}px, ${i}px)${suffix}`;
        sink += live.item.getBoundingClientRect().width;
      }
    });

    expect(sink).toBeGreaterThan(0);
    expect(perOp(reads, BATCH)).toBeGreaterThan(perOp(writes, BATCH) * 2);
  }, 60_000);

  it('should render the transform the drag writes', async () => {
    const live = await lifted();

    // Read off the element, not off the recorder: the recorder is detached in
    // every arm that measures, so the render check must not depend on it.
    expect(live.item.style.getPropertyValue('transform')).toContain(
      'translate',
    );
    expect(getComputedStyle(live.item).transform).not.toBe('none');
  });

  it('should collapse a same-frame request burst to one write', async () => {
    // The gate has to actually coalesce, or its overhead would be priced
    // against a saving it does not make.
    const live = await lifted();
    const suffix = live.suffix();
    const { style } = live.item;

    const gate = createGate((value) => {
      style.transform = value;
    });

    cleanup.push(() => {
      gate.dispose();
    });

    live.arm();
    live.reset();

    await new Promise<void>((done) => {
      requestAnimationFrame(() => {
        for (let i = 0; i < 8; i += 1) {
          gate.request(`translate(${200 + i}px, ${200 + i}px)${suffix}`);
        }

        done();
      });
    });
    await frameOf();
    await frameOf();

    expect(gate.commits()).toBe(1);
    expect(live.written()).toEqual([`translate(207px, 207px)${suffix}`]);
  });

  it('should remove writes without stranding the visual when gated', async () => {
    // Arm E's own falsification: if the gated arm did not actually remove
    // writes, its handler-time delta would be measuring nothing, and if the
    // flush did not land, it would be measuring a cheaper but broken system.
    const gated = await flood(2, true);

    expect(gated.dispatches).toBeGreaterThan(0);
    expect(gated.requests).toBeGreaterThan(gated.writes);
    expect(gated.committed).toContain('translate');
  }, 120_000);

  it('should leave the visual behind when a gate is torn down unflushed', async () => {
    // **D-99's contract cost, made observable.** A deferred write that never
    // runs leaves the visual behind the operation — this is that failure, in a
    // prototype, before any design pays for it.
    const live = await lifted();
    const suffix = live.suffix();
    const { style } = live.item;

    const gate = createGate((value) => {
      style.transform = value;
    });

    live.arm();
    live.reset();
    gate.request(`translate(300px, 300px)${suffix}`);
    gate.dispose();

    await frameOf();
    await frameOf();

    expect(gate.commits()).toBe(0);
    expect(live.written()).toEqual([]);
  });

  it('should catch the visual up when the terminal path flushes', async () => {
    const live = await lifted();
    const suffix = live.suffix();
    const { style } = live.item;

    const gate = createGate((value) => {
      style.transform = value;
    });

    live.arm();
    live.reset();
    gate.request(`translate(300px, 300px)${suffix}`);
    gate.flush();

    expect(gate.commits()).toBe(1);
    expect(live.written()).toEqual([`translate(300px, 300px)${suffix}`]);

    // And a flush with nothing pending writes nothing — the obligation is
    // idempotent, which every terminal path needs it to be.
    gate.flush();

    expect(gate.commits()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The measurement — opt-in, and it asserts nothing
// ---------------------------------------------------------------------------

describe.runIf(Boolean(import.meta.env['VITE_DRAG_MEASURE']))(
  'P-01 — the cost of one write',
  () => {
    /**
     * Batch sizes the slope is taken over.
     *
     * **The slope, not any single batch, is the per-operation cost.** A batch
     * of `n` operations costs `fixed + n × marginal`, and only the difference
     * between two batch sizes cancels the loop, the two clock calls and the
     * frame's own fixed term. Reporting `min / n` from one batch would fold all
     * of that into the write.
     *
     * They are large because the clock is coarse: at 100 µs granularity a batch
     * has to run for milliseconds before its reading has usable resolution.
     */
    const SIZES = [2000, 4000, 8000, 16_000] as const;
    const FLUSH_SIZES = [100, 200, 400, 800] as const;
    const FRAMES = 24;

    /** µs per operation, from the least-squares slope over `SIZES`. */
    const slopeOf = (samples: ReadonlyMap<number, number>): number => {
      const n = samples.size;
      let sx = 0;
      let sy = 0;
      let sxy = 0;
      let sxx = 0;

      for (const [size, ms] of samples) {
        sx += size;
        sy += ms;
        sxy += size * ms;
        sxx += size * size;
      }

      return ((n * sxy - sx * sy) / (n * sxx - sx * sx)) * 1000;
    };

    const shape = (samples: ReadonlyMap<number, number>): string =>
      [...samples]
        .map(([size, ms]) => `n=${size}:${ms.toFixed(3)}ms`)
        .join(' ');

    const mean = (values: readonly number[]): number =>
      values.length === 0
        ? 0
        : values.reduce((a, b) => a + b, 0) / values.length;

    const report = (line: string): void => {
      // oxlint-disable-next-line no-console -- this suite exists to report
      console.warn(`P-01 ${line}`);
    };

    // -- Input: what the clock can resolve -------------------------------
    it('should report the timer granularity every arm is bounded by', () => {
      const deltas: number[] = [];

      for (let i = 0; i < 2_000_000 && deltas.length < 200; i += 1) {
        const a = performance.now();
        const b = performance.now();

        if (b > a) {
          deltas.push(b - a);
        }
      }

      report(
        `clock granularity min=${(Math.min(...deltas) * 1000).toFixed(2)}us ` +
          `median=${(median(deltas) * 1000).toFixed(2)}us samples=${deltas.length}`,
      );
    }, 60_000);

    // -- Arm A: the deployed write, timed where it happens ---------------
    //
    // Real pointer input through Playwright at the two paces M-6 found valid.
    // The clock cannot resolve one write directly, so each write is read as a
    // Bernoulli sample against the quantum: the mean reading estimates the cost
    // and the non-zero rate estimates cost/quantum. **The empty window beside
    // each write is what makes that inference checkable** — the same estimator
    // over an operation that costs nothing has to come back at ~0.
    for (const wave of [2, 4]) {
      it(`should estimate the in-situ write under pointer traffic at wave ${wave}`, async () => {
        const live = await lifted();

        live.arm();
        live.reset();

        await commands.pointerFlood(240, wave);
        await frameOf();

        const spent = live.spent();
        const control = live.control();
        const ordinals = live.ordinals();
        const first = spent.filter((_, i) => ordinals[i] === 0);
        const extra = spent.filter((_, i) => ordinals[i]! > 0);
        const rate = (values: readonly number[]): string =>
          values.length === 0
            ? 'n/a'
            : `${((values.filter((one) => one > 0).length / values.length) * 100).toFixed(1)}%`;
        const us = (values: readonly number[]): string =>
          `mean=${(mean(values) * 1000).toFixed(2)}us nonzero=${rate(values)} n=${values.length}`;

        report(
          `arm A in-situ wave=${wave} writes=${spent.length} ` +
            `| ALL ${us(spent)} ` +
            `| ORDINAL-0 ${us(first)} ` +
            `| ORDINAL>=1 ${us(extra)} ` +
            `| CONTROL ${us(control)}`,
        );
      }, 60_000);
    }

    // -- Arm E: the gate driven end to end, against real input -----------
    //
    // The deciding arm. Arms A and B disagree by a factor of forty about what a
    // write costs, so this one declines to choose between them and measures the
    // difference the gate makes to the deployment instead.
    // M-6's own census, per pace: wave 2 read p95 = 3 writes per tick over 96
    // ticks and is its **primary** evidence; wave 4 read p95 = 8 over 24 ticks
    // and corroborates the direction rather than establishing it. The surplus
    // a gate removes is `p95 - 1` in the tail and `mean - 1` in the typical
    // frame, so each pace is scored against its own count and never against
    // the other's.
    for (const [wave, p95] of [
      [2, 3],
      [4, 8],
    ] as const) {
      it(`should measure the gate end to end at wave ${wave}`, async () => {
        // Alternated rather than run in blocks, so a machine that drifts warmer
        // or busier over the file cannot show up as a gate effect.
        const open: Array<Awaited<ReturnType<typeof flood>>> = [];
        const shut: Array<Awaited<ReturnType<typeof flood>>> = [];

        for (let round = 0; round < 3; round += 1) {
          // oxlint-disable-next-line no-await-in-loop -- alternation is the design
          open.push(await flood(wave, false));
          // oxlint-disable-next-line no-await-in-loop -- as above
          shut.push(await flood(wave, true));
          // oxlint-disable-next-line no-await-in-loop -- as above
          shut.push(await flood(wave, true));
          // oxlint-disable-next-line no-await-in-loop -- as above
          open.push(await flood(wave, false));
        }

        const total = (
          runs: ReadonlyArray<Awaited<ReturnType<typeof flood>>>,
          pick: (run: Awaited<ReturnType<typeof flood>>) => number,
        ): number => runs.reduce((sum, run) => sum + pick(run), 0);

        const ungated = total(open, (run) => run.handlerMs);
        const gated = total(shut, (run) => run.handlerMs);
        const ungatedWrites = total(open, (run) => run.writes);
        const gatedWrites = total(shut, (run) => run.writes);
        const gatedRequests = total(shut, (run) => run.requests);

        // **Divided by every ungated write, not by the removed ones.** The gate
        // does not delete the writes it keeps — it moves them out of the
        // `pointermove` dispatch and into a rAF callback, which is outside this
        // bracket. So the whole delta is the cost of *all* the writes that left
        // the span, and charging it to the removed subset alone would inflate
        // the per-write figure by the coalescing ratio. The first version of
        // this arm did exactly that and reported 45 µs where the same data
        // says 29.
        const perWrite = ((ungated - gated) * 1000) / ungatedWrites;

        report(
          `arm E wave=${wave} rounds=${open.length}/${shut.length} ` +
            `UNGATED handler=${ungated.toFixed(1)}ms writes=${ungatedWrites} ` +
            `dispatches=${total(open, (run) => run.dispatches)} ` +
            `| GATED handler=${gated.toFixed(1)}ms writes=${gatedWrites} ` +
            `requests=${gatedRequests} ` +
            `ratio=${(gatedRequests / Math.max(1, gatedWrites)).toFixed(2)} ` +
            `requests/commit`,
        );
        // The typical frame's surplus is the measured coalescing ratio less
        // one; the tail frame's is M-6's p95 for **this** pace less one.
        const typical = gatedRequests / Math.max(1, gatedWrites) - 1;

        report(
          `arm E wave=${wave} delta=${(ungated - gated).toFixed(2)}ms over ` +
            `${ungatedWrites} writes = ${perWrite.toFixed(2)}us per write`,
        );
        report(
          `arm E wave=${wave} saving typical frame (surplus=${typical.toFixed(2)}) = ` +
            `${(perWrite * typical).toFixed(1)}us = ` +
            `${((perWrite * typical * 100) / 160).toFixed(1)}% of the 160us bar ` +
            `| tail frame (M-6 p95=${p95}, surplus=${p95 - 1}) = ` +
            `${(perWrite * (p95 - 1)).toFixed(1)}us = ` +
            `${((perWrite * (p95 - 1) * 100) / 160).toFixed(1)}%`,
        );
      }, 300_000);
    }

    // -- Arms B, C and D: measured in one pass ---------------------------
    //
    // **Interleaved deliberately.** The first run of this file measured the
    // write in one arm and re-measured it in another, and the two came back an
    // order of magnitude apart — so the break-even was being computed across a
    // gap wider than the quantity it was deciding. Here every batch size is
    // measured for all three subjects inside the same run of frames, and the
    // break-even is arithmetic over numbers taken seconds apart in one session.
    it('should price the write, the gate and the break-even between them', async () => {
      const live = await lifted();

      // The recorder stays detached: it costs two clock calls and two pushes
      // per write, which is more than the write it would observe.
      const suffix = live.suffix();
      const { item } = live;
      const { style } = item;
      const gate = createGate((value) => {
        style.transform = value;
      });

      cleanup.push(() => {
        gate.dispose();
      });

      const writes = new Map<number, number>();
      const clean = new Map<number, number>();
      const flushes = new Map<number, number>();
      const requests = new Map<number, number>();
      const schedules = new Map<number, number>();
      const handles: number[] = [];

      for (const size of SIZES) {
        // The three subjects share every batch size in the same run of frames.
        // The first version of this file measured the write in one arm and
        // re-measured it in another, and the two came back an order of
        // magnitude apart — so the break-even was arithmetic across a gap
        // wider than the quantity it was deciding.
        //
        // oxlint-disable-next-line no-await-in-loop -- one size at a time: two batches sharing a frame would measure each other
        const wrote = await perFrame(FRAMES, (frame) => {
          for (let i = 0; i < size; i += 1) {
            style.transform = `translate(${frame + i}px, ${i}px)${suffix}`;
          }
        });

        // oxlint-disable-next-line no-await-in-loop -- as above
        const asked = await perFrame(FRAMES, (frame) => {
          for (let i = 0; i < size; i += 1) {
            gate.request(`translate(${frame + i}px, ${i}px)${suffix}`);
          }
        });

        // oxlint-disable-next-line no-await-in-loop -- as above
        const scheduled = await perFrame(FRAMES, () => {
          for (let i = 0; i < size; i += 1) {
            handles.push(requestAnimationFrame(() => {}));
          }
        });

        writes.set(size, Math.min(...wrote));
        requests.set(size, Math.min(...asked));
        schedules.set(size, Math.min(...scheduled));
      }

      for (const handle of handles) {
        cancelAnimationFrame(handle);
      }

      // **The reconciling pair, and it needs its own scale.** A back-to-back
      // batch leaves the style tree dirty after its first write, so every later
      // one is a re-set of an already-invalid property. Deployment never does
      // that: an input dispatch sits between two writes, and hit-testing one
      // requires a clean tree. These two batches price a write onto a *clean*
      // tree — one forces the lifecycle after each write, the other only forces
      // it — and the difference is the write the deployment actually performs.
      //
      // The sizes are two orders smaller because a forced layout costs orders
      // more than a write; sixteen thousand of them would overrun the frame by
      // seconds and measure the overrun.
      // A `const` holder rather than a reassigned `let`: the batch closures are
      // declared inside the loop, and a captured mutable binding is the shape
      // that bites when a loop body outlives its iteration.
      const sink = { read: 0 };

      for (const size of FLUSH_SIZES) {
        // oxlint-disable-next-line no-await-in-loop -- as above
        const wroteClean = await perFrame(FRAMES, (frame) => {
          for (let i = 0; i < size; i += 1) {
            style.transform = `translate(${frame + i}px, ${i}px)${suffix}`;
            sink.read += item.getBoundingClientRect().width;
          }
        });

        // oxlint-disable-next-line no-await-in-loop -- as above
        const flushed = await perFrame(FRAMES, () => {
          for (let i = 0; i < size; i += 1) {
            sink.read += item.getBoundingClientRect().width;
          }
        });

        clean.set(size, Math.min(...wroteClean));
        flushes.set(size, Math.min(...flushed));
      }

      expect(sink.read).toBeGreaterThan(0);

      const marginal = slopeOf(writes);
      const perFlush = slopeOf(flushes);
      const onClean = slopeOf(clean) - perFlush;
      const perRequest = slopeOf(requests);
      const perSchedule = slopeOf(schedules);

      report(
        `arm B dirty   ${shape(writes)} | marginal=${marginal.toFixed(3)}us`,
      );
      report(
        `arm B clean   ${shape(clean)} | write+flush=${slopeOf(clean).toFixed(3)}us ` +
          `flush-only=${perFlush.toFixed(3)}us | ` +
          `write onto a clean tree=${onClean.toFixed(3)}us`,
      );
      report(
        `arm C request ${shape(requests)} | per-request=${perRequest.toFixed(3)}us`,
      );
      report(
        `arm C rAF     ${shape(schedules)} | per-schedule=${perSchedule.toFixed(3)}us ` +
          `(lower bound on the per-frame fixed term)`,
      );

      // saving(w) = (w − 1) × marginal − (w × perRequest + perSchedule)
      const saving = (w: number): number =>
        (w - 1) * marginal - (w * perRequest + perSchedule);
      const breakEven =
        marginal > perRequest
          ? (marginal + perSchedule) / (marginal - perRequest)
          : Number.POSITIVE_INFINITY;

      const savingClean = (w: number): number =>
        (w - 1) * onClean - (w * perRequest + perSchedule);

      report(
        `arm D on a clean tree: saving w=3 -> ${savingClean(3).toFixed(1)}us ` +
          `w=8 -> ${savingClean(8).toFixed(1)}us = ` +
          `${((savingClean(8) / 160) * 100).toFixed(1)}% of the 160us bar`,
      );
      report(
        `arm D saving w=3 -> ${saving(3).toFixed(2)}us  ` +
          `w=8 -> ${saving(8).toFixed(2)}us  ` +
          `w=10 -> ${saving(10).toFixed(2)}us | break-even w=${breakEven.toFixed(1)}`,
      );
      report(
        `arm D against D-99: one write=${marginal.toFixed(3)}us vs the 23-80us ` +
          `a gate would need; best-case saving=${saving(8).toFixed(2)}us vs ` +
          `160us (1% of a 16ms frame) = ${((saving(8) / 160) * 100).toFixed(3)}% of the bar`,
      );
    }, 300_000);
  },
);
