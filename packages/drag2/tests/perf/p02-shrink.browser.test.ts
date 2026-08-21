/**
 * P-02 retention — does the high-water shrink recover anything, and is there a
 * workload that earns it (D-104)?
 *
 * **Two questions, kept apart on purpose, because only one of them is about
 * bytes.** The first is mechanical: does `capacity > 4 × n` behave as D-104
 * derives — never firing on a stable collection, firing exactly once on a real
 * shrink, and allocating strictly less than it frees? The second is the one
 * D-99 recorded as the *deployment shape* gap: is there a **supported**
 * controller lifecycle in which a live sortable collection actually travels
 * from a meaningful high water to a materially smaller size? A policy that is
 * correct and never reached is declined on D-99's own stop condition, so the
 * second question decides and the first only quantifies.
 *
 * **No production shrink code exists, and none is landed to take this
 * measurement.** The policy is built here as an instrument — the same
 * discipline M-1 established and M-4′ reused for its stride-1 arm — and held to
 * the shipped cache by an equivalence check on the workload where the two must
 * agree. If the evidence declines the candidate, there is nothing to remove.
 *
 * **`byteLength`, never `usedJSHeapSize`.** M-2′ established that a
 * `Float64Array`'s backing store is precisely what the heap counter cannot see,
 * and its own P-02 rows are structural for that reason. This inherits that
 * instrument rather than building one.
 *
 * **Detached rows for the buffer arms** (M-2′'s `bufferBytes` again): nothing
 * about buffer sizing depends on geometry, only on how many slots the scan
 * produced, and a hundred thousand *attached* rows would be measuring layout.
 * The deployment-bound arm at the foot of this file is the one that wants real
 * layout, and it attaches.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { CollectionSnapshot } from '../../src/sortable/domain.ts';
import type { SortableInstaller } from '../../src/sortable/feature.ts';
import { layoutAnimation } from '../../src/sortable/layout-animation.ts';
import {
  BOTTOM,
  CENTRE_X,
  CENTRE_Y,
  createRectIndex,
  LEFT,
  RIGHT,
  STRIDE,
  TOP,
} from '../../src/sortable/rect-index.ts';
import { y } from '../../src/sortable/y.ts';
import { ReorderResolution, sortable } from '../../src/sortable.ts';

/** `capacityFor` is module-private; this is its arithmetic, as M-2′ copied it. */
const capacityFor = (needed: number): number => {
  let capacity = 1;

  while (capacity < needed) {
    capacity *= 2;
  }

  return capacity;
};

const SLOT_BYTES = STRIDE * 8;
const ALIVE = (): boolean => true;

const cleanup: Array<() => void> = [];

afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

/**
 * A cache under a sizing policy, plus the two things the arms measure.
 *
 * `drag(n)` is one whole operation at collection size `n`: the scan, then the
 * retirement that ends it. That pairing is the point — `retire()` empties
 * `items` and **keeps** `values`, which is the retention M-2′ measured and the
 * only thing this candidate is about.
 */
type Cache = Readonly<{
  bytes(): number;
  /** Buffer allocations since construction. */
  allocations(): number;
  drag(n: number): void;
  /** The packed values, for the equivalence check. */
  values(): Float64Array;
  count(): number;
}>;

/**
 * `n` detached rows, allocated once and sliced, so an arm that visits several
 * sizes is not also measuring element construction.
 */
function pool(size: number): HTMLElement[] {
  const items: HTMLElement[] = [];

  for (let i = 0; i < size; i += 1) {
    items.push(document.createElement('div'));
  }

  return items;
}

/** The shipped cache, watched for buffer identity. */
function shipped(rows: readonly HTMLElement[]): Cache {
  const index = createRectIndex();
  let seen: Float64Array | null = null;
  let allocations = 0;

  return {
    bytes: () => index.values.byteLength,
    allocations: () => allocations,
    values: () => index.values,
    count: () => index.count,

    drag(n): void {
      const items = n === rows.length ? rows : rows.slice(0, n);
      const snapshot: CollectionSnapshot = { items, version: 1 };

      index.refresh(snapshot, items[0] ?? rows[0]!, null, ALIVE);

      if (index.values !== seen) {
        seen = index.values;
        allocations += 1;
      }

      index.retire();
    },
  };
}

/**
 * **The proposed policy, as an instrument.** A faithful copy of
 * `createRectIndex`'s sizing and scan with D-104's one `else if` beside the
 * growth branch — and nothing else. `STRIDE` is 6, the capacity arithmetic is
 * `capacityFor`, the scan writes the same six scalars in the same order, and
 * `retire()` keeps the buffer.
 *
 * The I-36 barriers are omitted **and that is why this may not ship**: the
 * arms drive it with a liveness predicate that never goes false, so the
 * barriers would be unexercised code carrying a correctness obligation nothing
 * here tests. An instrument that omits them is honest; a production path that
 * did would not be. `equivalent()` below holds this to the shipped cache on the
 * workload where the two must agree.
 */
function shrinking(rows: readonly HTMLElement[]): Cache {
  let capacity = 0;
  let values = new Float64Array(0);
  const items: HTMLElement[] = [];
  let count = 0;
  let allocations = 0;

  return {
    bytes: () => values.byteLength,
    allocations: () => allocations,
    values: () => values,
    count: () => count,

    drag(n): void {
      // `slice` only when the arm actually wants a prefix: the stable-large arm
      // takes a thousand drags at a hundred thousand rows, and copying the
      // array each time would put more work in the harness than in the cache.
      const list = n === rows.length ? rows : rows.slice(0, n);
      const dragged = list[0] ?? rows[0]!;

      if (list.length > capacity) {
        capacity = capacityFor(list.length);
        values = new Float64Array(capacity * STRIDE);
        allocations += 1;
      } else if (capacity > 4 * list.length) {
        // **D-104's branch, and the whole of it.** `capacityFor` makes
        // `n ≤ capacity < 2n` for any fitted buffer, so this can never fire
        // without a real collection shrink — the anti-churn property is a
        // consequence of the doubling scheme rather than a tuning choice.
        capacity = capacityFor(list.length);
        values = new Float64Array(capacity * STRIDE);
        allocations += 1;
      }

      let slot = 0;

      for (const item of list) {
        if (item === dragged) {
          continue;
        }

        const rect = item.getBoundingClientRect();
        const offset = slot * STRIDE;

        values[offset + LEFT] = rect.left;
        values[offset + TOP] = rect.top;
        values[offset + RIGHT] = rect.right;
        values[offset + BOTTOM] = rect.bottom;
        values[offset + CENTRE_X] = (rect.left + rect.right) * 0.5;
        values[offset + CENTRE_Y] = (rect.top + rect.bottom) * 0.5;
        items[slot] = item;
        slot += 1;
      }

      count = slot;
      items.length = slot;

      // `retire()`: the element array is emptied, the numeric buffer is kept.
      items.length = 0;
      count = 0;
    },
  };
}

/**
 * The two caches must agree wherever the gate cannot fire, which is every
 * workload whose collection never shrinks by more than a factor of four.
 *
 * Without this the instrument could be measuring a different cache and the
 * shrink figures would be about nothing.
 */
function equivalent(
  rows: readonly HTMLElement[],
  sizes: readonly number[],
): {
  bytes: boolean;
  slots: boolean;
} {
  const a = shipped(rows);
  const b = shrinking(rows);
  let bytes = true;
  let slots = true;

  for (const n of sizes) {
    a.drag(n);
    b.drag(n);

    bytes &&= a.bytes() === b.bytes();
    slots &&= a
      .values()
      .every((value, i) => value === b.values()[i] || i >= n * STRIDE);
  }

  return { bytes, slots };
}

// ---------------------------------------------------------------------------
// Structural — the gate's arithmetic, and the instrument held to the cache
// ---------------------------------------------------------------------------

describe('the shrink instrument', () => {
  it('should size its buffer exactly as the shipped cache does while growing', () => {
    // Monotonic growth: the gate cannot fire, so the two caches are the same
    // cache and every figure below is about the shipped one.
    const rows = pool(4000);

    expect(equivalent(rows, [10, 100, 1000, 4000])).toEqual({
      bytes: true,
      slots: true,
    });
  });

  it('should pack the same scalars as the shipped cache', () => {
    // The scan is copied, so it is checked rather than assumed — a copy that
    // wrote five scalars would still report the same `byteLength`.
    const rows = pool(64);
    const a = shipped(rows);
    const b = shrinking(rows);

    a.drag(64);
    b.drag(64);

    expect([...b.values()]).toEqual([...a.values()]);
  });

  it('should agree with the shipped cache on a shrink smaller than the gate', () => {
    // 1000 → 300 is a real shrink the gate refuses: `capacityFor(1000)` is
    // 1024 and `4 × 300` is 1200, so the buffer stays. This is the hysteresis
    // D-104 buys with the extra doubling, and it is what stops a collection
    // wobbling around a power-of-two boundary from resizing.
    const rows = pool(1000);

    expect(equivalent(rows, [1000, 300, 1000, 300])).toEqual({
      bytes: true,
      slots: true,
    });
  });
});

describe('the gate', () => {
  it('should not fire on a stable collection, ever', () => {
    // **The arm that can kill the candidate.** Churn has an exact definition
    // here — a reallocation on a workload whose collection size never changes —
    // and the gate makes it provably impossible, so this is a proof obligation
    // rather than an experiment. One allocation for the first drag, none after.
    const rows = pool(4000);
    const cache = shrinking(rows);
    const sizes = new Set<number>();

    for (let i = 0; i < 1000; i += 1) {
      cache.drag(4000);
      sizes.add(cache.bytes());
    }

    expect(cache.allocations()).toBe(1);
    expect([...sizes]).toEqual([capacityFor(4000) * SLOT_BYTES]);
  });

  it('should fire exactly once on a real shrink', () => {
    // The payoff arm's mechanism: one drag at the high water, the collection
    // republished small, and one reallocation — never a second on the drags
    // after it.
    const rows = pool(4000);
    const cache = shrinking(rows);

    cache.drag(4000);
    expect(cache.allocations()).toBe(1);

    for (let i = 0; i < 100; i += 1) {
      cache.drag(100);
    }

    expect(cache.allocations()).toBe(2);
    expect(cache.bytes()).toBe(capacityFor(100) * SLOT_BYTES);
  });

  it('should allocate strictly less than it frees', () => {
    // The property that separates this from a memory-for-allocations trade. It
    // follows from the gate: a buffer that satisfies `capacity > 4 × n` is at
    // least four times the fitted size, and `capacityFor(n) < 2n`.
    const rows = pool(4000);
    const cache = shrinking(rows);

    cache.drag(4000);

    const before = cache.bytes();

    cache.drag(100);

    expect(cache.bytes()).toBeLessThan(before / 4);
  });

  it('should refuse a shrink a fitted buffer could reach on its own', () => {
    // `capacityFor(n)` is the smallest power of two `≥ n`, so a fitted buffer
    // always has `n ≤ capacity < 2n` and `capacity > 2 × n` is unreachable
    // without a real collection shrink. The gate sits one doubling beyond that
    // bound, so no fitted buffer can trip it at any size.
    for (let n = 1; n <= 4096; n += 1) {
      expect([n, capacityFor(n) > 4 * n]).toEqual([n, false]);
    }
  });

  it('should shrink an emptied collection to one slot', () => {
    const rows = pool(1000);
    const cache = shrinking(rows);

    cache.drag(1000);
    cache.drag(0);

    expect(cache.bytes()).toBe(SLOT_BYTES);
  });

  it('should reallocate on every refresh of an emptied collection', () => {
    // **An edge the design does not name, recorded rather than fixed.** With
    // `n = 0` the gate reads `capacity > 0`, which is true of every buffer
    // including the one-slot buffer a previous empty refresh just produced — so
    // an empty collection reallocates 48 B on every scan instead of settling.
    // It is a real churn case, it is 48 B, and it is only reachable through a
    // collection with nothing in it, which cannot be dragged. Named here so
    // that a landing pass fixes the gate rather than discovering it.
    const rows = pool(16);
    const cache = shrinking(rows);

    cache.drag(16);

    const before = cache.allocations();

    for (let i = 0; i < 10; i += 1) {
      cache.drag(0);
    }

    expect(cache.allocations() - before).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Structural — when the policy can fire, which is not when the collection shrinks
// ---------------------------------------------------------------------------

describe('the reachable moment', () => {
  it('should read no geometry when a live collection shrinks between drags', () => {
    // **The fact the whole candidate turns on, and it is structural rather
    // than measured.** `refresh` runs only inside an operation — `resolve` from
    // the spatial pipeline and `measure` from the committed-move bracket — so
    // the branch D-104 puts there cannot fire while a controller is idle.
    // `controller.invalidate()` marks the cache dirty and measures nothing.
    //
    // So a consumer who drags in a large list and then filters it down does
    // **not** get the buffer back at the moment the collection shrinks. The
    // retention stays exactly as it was until the user drags **again**, in the
    // filtered list. That is a different workload from the one the payoff story
    // describes, and it is the one that has to be justified.
    const root = document.createElement('div');

    Object.assign(root.style, {
      width: '200px',
      position: 'absolute',
      top: '0px',
      left: '0px',
    });
    document.body.append(root);

    const rows: HTMLElement[] = [];
    let reads = 0;

    // Built outside the loop so the counter is closed over once rather than
    // per row — the same shape `incremental-refresh` uses.
    const instrument = (row: HTMLElement): void => {
      const measure = row.getBoundingClientRect.bind(row);

      row.getBoundingClientRect = (): DOMRect => {
        reads += 1;
        return measure();
      };
    };

    for (let i = 0; i < 40; i += 1) {
      const row = document.createElement('div');

      Object.assign(row.style, {
        display: 'block',
        height: '40px',
        width: '100px',
      });
      instrument(row);
      root.append(row);
      rows.push(row);
    }

    let current: readonly HTMLElement[] = rows;
    const controller = sortable(root, {
      items: () => current,
      axis: y(),
      onReorder: () => ReorderResolution.accept(),
    });

    cleanup.push(() => {
      void controller.destroy();
      root.remove();
    });

    root.setPointerCapture = (): void => {};
    root.releasePointerCapture = (): void => {};

    // One drag, so the cache is warm and the buffer is at its high water.
    rows[0]!.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        composed: true,
        cancelable: true,
        pointerId: 71,
        isPrimary: true,
        button: 0,
        buttons: 1,
        clientX: 10,
        clientY: 10,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 71,
        isPrimary: true,
        clientX: 10,
        clientY: 200,
      }),
    );
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 71,
        isPrimary: true,
        clientX: 10,
        clientY: 200,
      }),
    );

    // The collection shrinks by an order of magnitude, and is signalled.
    reads = 0;
    current = rows.slice(0, 4);
    controller.invalidate();

    // Nothing measured, so nothing could have been resized.
    expect(reads).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Measurement — the payoff, and the collection sizes it is available at
// ---------------------------------------------------------------------------

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} kB`;

describe.runIf(Boolean(import.meta.env['VITE_DRAG_MEASURE']))(
  'P-02 shrink — measurement',
  () => {
    it('should not reallocate over a thousand drags at a stable hundred thousand', () => {
      // **D-104's declared falsifier, at its declared size.** Any reallocation
      // at all is churn and the candidate is declined.
      const rows = pool(100_000);
      const cache = shrinking(rows);
      const sizes = new Set<number>();

      for (let i = 0; i < 1000; i += 1) {
        cache.drag(100_000);
        sizes.add(cache.bytes());
      }

      expect(cache.allocations()).toBe(1);
      expect([...sizes]).toEqual([capacityFor(100_000) * SLOT_BYTES]);

      // oxlint-disable-next-line no-console -- this suite exists to report
      console.info(
        `P-02 stable-large n=100000 drags=1000 ` +
          `retained=${kb(cache.bytes())} allocations=${cache.allocations()}`,
      );
    }, 600_000);

    it('should report what a shrink reclaims, at every plausible high water', () => {
      // **The payoff, quantified — and the row that matters is not the first
      // one.** 100 000 is the synthetic figure M-2′ used to make the retention
      // visible; the deployment-bound arm below is what says which of these
      // rows a supported consumer can actually reach.
      const rows = pool(100_000);

      for (const high of [100, 800, 2000, 4000, 20_000, 100_000]) {
        const cache = shrinking(rows);

        cache.drag(high);

        const before = cache.bytes();

        cache.drag(100);

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.info(
          `P-02 shrink high=${high} retained=${kb(before)} ` +
            `after=${kb(cache.bytes())} ` +
            `reclaimed=${kb(before - cache.bytes())} ` +
            `allocations=${cache.allocations()}`,
        );
      }
    }, 600_000);

    it('should report what an oscillating collection costs per transition', () => {
      // Telemetry, and not a decline trigger: a collection that changes size
      // makes the library resize, and the cost is proportional to the new size
      // exactly as growth already is. Recorded so a later phase proposing
      // headroom has the number it would be arguing from.
      const rows = pool(1000);
      const cache = shrinking(rows);

      for (let i = 0; i < 100; i += 1) {
        cache.drag(i % 2 === 0 ? 1000 : 100);
      }

      // oxlint-disable-next-line no-console -- this suite exists to report
      console.info(
        `P-02 oscillating 1000<->100 transitions=99 ` +
          `allocations=${cache.allocations()} ` +
          `bytes/large=${kb(capacityFor(1000) * SLOT_BYTES)} ` +
          `bytes/small=${kb(capacityFor(100) * SLOT_BYTES)}`,
      );

      expect(cache.allocations()).toBe(100);
    }, 600_000);

    it('should report the collection size one committed rebuild can afford', () => {
      // **The deployment-shape question, and it is not about bytes.** The high
      // water this policy recovers is a collection the library once *scanned*,
      // and the scan is `getBoundingClientRect()` per row on attached elements.
      // M-4′ measured one committed move at 3.5 ms for 800 rows in the deployed
      // regime; this extends that curve until one rebuild no longer fits in a
      // frame, which bounds the high water a supported consumer can reach.
      //
      // Attached rows, because a detached element answers with zeros and this
      // is the one arm that is measuring layout rather than sizing.
      const root = document.createElement('div');

      Object.assign(root.style, {
        position: 'absolute',
        top: '0px',
        left: '0px',
        width: '200px',
      });
      document.body.append(root);
      cleanup.push(() => {
        root.remove();
      });

      const rows: HTMLElement[] = [];
      let built = 0;

      for (const n of [800, 2000, 5000, 10_000, 20_000]) {
        for (; built < n; built += 1) {
          const row = document.createElement('div');

          Object.assign(row.style, {
            display: 'block',
            height: '40px',
            width: '100px',
          });
          root.append(row);
          rows.push(row);
        }

        const index = createRectIndex();
        const items = rows.slice(0, n);
        const snapshot: CollectionSnapshot = { items, version: 1 };

        // One warm-up, so the first reading is not paying for the layout the
        // rows just added.
        index.refresh(snapshot, items[0]!, null, ALIVE);
        index.retire();

        const started = performance.now();

        index.refresh(snapshot, items[0]!, null, ALIVE);

        const elapsed = performance.now() - started;

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.info(
          `P-02 rebuild n=${n} scan=${elapsed.toFixed(3)}ms ` +
            `per-row=${((elapsed / n) * 1000).toFixed(3)}us ` +
            `frames=${(elapsed / 16.67).toFixed(2)} ` +
            `buffer=${kb(capacityFor(n) * SLOT_BYTES)}`,
        );

        index.retire();
      }
    }, 600_000);
  },
);

// ---------------------------------------------------------------------------
// The capacity-bucket interval — is the high water that crosses the threshold
// a size a supported consumer can actually drive?
// ---------------------------------------------------------------------------

const ROW_HEIGHT = 40;
const GRAB_ROW = 4;
const LOW_SLOT = 5;
const HIGH_SLOT = 6;
const POINTER_ID = 83;
const FRAME_MS = 1000 / 60;

type Drive = Readonly<{
  /** Total bracket time and committed-move count since the last reset. */
  moves(): number;
  bracket(): number;
  reset(): void;
  /** One pointer sample per **real** frame, so the browser flushes between moves. */
  step(round: number): Promise<void>;
  /** Presses on the grab row and lifts. */
  grab(): void;
  release(): void;
  /** Republishes the collection at `count` items and signals it (D-44). */
  replace(count: number): void;
  dispose(): void;
}>;

/**
 * A real composed sortable at `n` attached rows, driven one committed move per
 * real frame.
 *
 * **Paced, not batched**, for M-4′'s reason: a batched driver never lets the
 * browser flush style and layout between two committed moves, and the segment
 * that moves between the two regimes is exactly the one this arm is about — the
 * forced layout after the placeholder write.
 *
 * The grab row is adjacent to the oscillation (M-4′'s `GRAB_ROW = 4` with slots
 * 5 and 6) so the drag opens without a long jump whose displaced rows would sit
 * in `layoutAnimation()`'s in-flight set for the rest of the run.
 */
function drive(n: number, animate: boolean): Drive {
  const root = document.createElement('div');

  Object.assign(root.style, {
    width: '200px',
    position: 'absolute',
    top: '0px',
    left: '0px',
  });
  document.body.append(root);

  const rows: HTMLElement[] = [];

  for (let i = 0; i < n; i += 1) {
    const row = document.createElement('div');

    Object.assign(row.style, {
      display: 'block',
      height: `${ROW_HEIGHT}px`,
      width: '100px',
    });
    root.append(row);
    rows.push(row);
  }

  let started = 0;
  let bracket = 0;
  let moves = 0;

  const probe: SortableInstaller = () => ({
    beforeInsertionMove: (): void => {
      started = performance.now();
    },
    afterInsertionMove: (): void => {
      bracket += performance.now() - started;
      moves += 1;
    },
  });

  let current: readonly HTMLElement[] = rows;
  const controller = sortable(
    root,
    {
      items: () => current,
      axis: y(),
      onReorder: () => ReorderResolution.accept(),
    },
    ...(animate ? [layoutAnimation()] : []),
    { plugins: [probe] },
  );

  root.setPointerCapture = (): void => {};
  root.releasePointerCapture = (): void => {};

  const pointer = (type: string, y: number): void => {
    document.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        pointerId: POINTER_ID,
        isPrimary: true,
        clientX: 150,
        clientY: y,
      }),
    );
  };

  const grab = (): void => {
    rows[GRAB_ROW]!.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        composed: true,
        cancelable: true,
        pointerId: POINTER_ID,
        isPrimary: true,
        button: 0,
        buttons: 1,
        clientX: 150,
        clientY: GRAB_ROW * ROW_HEIGHT + 10,
      }),
    );
    pointer('pointermove', GRAB_ROW * ROW_HEIGHT + 30);
  };

  grab();

  const frame = async (): Promise<void> => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  };

  const drives: Drive = {
    moves: () => moves,
    bracket: () => bracket,

    reset(): void {
      bracket = 0;
      moves = 0;
    },

    grab,

    release(): void {
      pointer('pointerup', (LOW_SLOT + 1) * ROW_HEIGHT);
    },

    replace(count): void {
      current = rows.slice(0, count);
      controller.invalidate();
    },

    async step(round): Promise<void> {
      pointer(
        'pointermove',
        (round % 2 === 0 ? LOW_SLOT : HIGH_SLOT) * ROW_HEIGHT + ROW_HEIGHT / 2,
      );
      // Two frames: the first runs the coalesced spatial task and the bracket,
      // the second lets the browser settle before the next sample.
      await frame();
      await frame();
    },

    dispose(): void {
      void controller.destroy();
      root.remove();
    },
  };

  cleanup.push(drives.dispose);

  return drives;
}

/** `run(0..count-1)` strictly in order, as a chain rather than an awaited loop. */
const sequence = async (
  count: number,
  run: (round: number) => Promise<void>,
): Promise<void> => {
  let chain = Promise.resolve();

  for (let i = 0; i < count; i += 1) {
    const round = i;

    chain = chain.then(() => run(round));
  }

  await chain;
};

describe('the workload that earns it', () => {
  it('should drag at a high water, shrink, and drag again on one live controller', async () => {
    // **The lifecycle D-104 requires, end to end on the shipped API.** Not
    // arithmetic on the instrument: one controller, a drag at a collection in
    // the 4096 capacity bucket, the collection republished an order of
    // magnitude smaller through the `items()` pull source and
    // `controller.invalidate()` (D-44), and a **second drag at the smaller
    // size** — which is the moment the policy could fire, since `refresh` runs
    // only inside an operation.
    const arm = drive(2100, false);

    await sequence(6, (round) => arm.step(round));

    const large = arm.moves();

    arm.release();
    await sequence(1, () => arm.step(0));

    // The collection shrinks below `capacity / 4`, which is what the gate asks.
    arm.replace(100);
    arm.reset();
    arm.grab();
    await sequence(6, (round) => arm.step(round));

    // Both operations really committed moves, so both would really have
    // reached `refresh` — the first to grow the buffer, the second to shrink
    // it.
    expect(large).toBeGreaterThan(0);
    expect(arm.moves()).toBeGreaterThan(0);
  }, 600_000);

  it('should reclaim past the threshold on every firing from the 4096 bucket', () => {
    // **Once the high water is in that bucket, the question stops being how
    // far the collection fell.** The gate needs `4096 > 4 × n`, so it only
    // fires below 1 024 items — and `capacityFor(1023)` is 1 024, so the
    // smallest possible reclaim is `196 608 − 49 152` = 144 KiB. Every firing
    // clears D-99's ~100 kB by a margin, and the largest is 186 KiB.
    const rows = pool(4096);
    const smallest: number[] = [];

    for (const after of [1023, 512, 100, 10, 1]) {
      const cache = shrinking(rows);

      cache.drag(2049);

      const before = cache.bytes();

      cache.drag(after);
      smallest.push(before - cache.bytes());
    }

    expect(Math.min(...smallest)).toBeGreaterThan(100 * 1024);
    expect(Math.min(...smallest)).toBe(196_608 - 49_152);
  }, 600_000);

  it('should refuse to fire from the 2048 bucket, which is where the threshold is missed', () => {
    // The boundary, from the other side: at 2 000 items the buffer is 96 KiB
    // and the most a shrink can recover is 90 KiB — under the threshold at
    // every possible destination. **2 049 is the smallest high water that can
    // earn this optimization**, and that is the whole of what the interval
    // measurement changed.
    const rows = pool(2048);
    const largest: number[] = [];

    for (const after of [511, 100, 1]) {
      const cache = shrinking(rows);

      cache.drag(2048);

      const before = cache.bytes();

      cache.drag(after);
      largest.push(before - cache.bytes());
    }

    expect(Math.max(...largest)).toBeLessThan(100 * 1024);
  }, 600_000);
});

describe.runIf(Boolean(import.meta.env['VITE_DRAG_MEASURE']))(
  'P-02 shrink — the capacity-bucket interval',
  () => {
    // **The interval the first run skipped.** It jumped from 2 000 items
    // (96 KiB, capacity 2048) to 20 000 (not drivable), and the next bucket
    // opens at 2 049 — where the buffer is already **192 KiB** and a shrink
    // would reclaim 186 KiB, comfortably past D-99's ~100 kB threshold. So the
    // decline rests entirely on whether ~2 100–3 000 rows is drivable.
    //
    // **And the bound it rested on was the wrong curve.** That figure came from
    // M-4′'s *general* rebuild, measured before P-06. On the current tree a
    // committed move reads five witnesses rather than `n − 1` on seven moves in
    // eight, so the deployed cost per move is not what it was.

    for (const animate of [false, true]) {
      for (const n of [2100, 3000]) {
        it(`should report what one committed move costs at ${n} rows, ${animate ? 'animated' : 'bare'}`, async () => {
          const FRAMES = 60;
          const WARM = 10;
          const arm = drive(n, animate);

          await sequence(WARM, (round) => arm.step(round));
          arm.reset();
          await sequence(FRAMES, (round) => arm.step(WARM + round));

          const moves = arm.moves();
          const per = arm.bracket() / moves;

          // oxlint-disable-next-line no-console -- this suite exists to report
          console.info(
            `P-02 interval n=${n} ${animate ? 'animated' : 'bare'} ` +
              `moves=${moves}/${FRAMES} ` +
              `bracket=${per.toFixed(3)}ms ` +
              `frames=${(per / FRAME_MS).toFixed(3)} ` +
              `buffer=${kb(capacityFor(n) * SLOT_BYTES)}`,
          );

          expect(moves).toBeGreaterThan(0);
        }, 600_000);
      }
    }

    it('should report the reclaim available across the bucket boundary', () => {
      // The other half, and it is arithmetic on the instrument rather than a
      // new measurement: the bucket is what it is.
      for (const high of [2000, 2049, 2100, 3000, 4096]) {
        const rows = pool(high);
        const cache = shrinking(rows);

        cache.drag(high);

        const before = cache.bytes();

        cache.drag(100);

        const reclaimed = before - cache.bytes();

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.info(
          `P-02 bucket high=${high} retained=${kb(before)} ` +
            `reclaimed=${kb(reclaimed)} ` +
            `crosses-100kB=${reclaimed > 100 * 1024}`,
        );
      }
    }, 600_000);
  },
);
