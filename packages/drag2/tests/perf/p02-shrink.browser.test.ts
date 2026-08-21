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
