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
 * **The policy ships (D-104), so every arm drives the shipped cache.** While
 * it was a candidate the file carried its own copy of the sizing rule and
 * checked the two against each other; there is one implementation now, and the
 * only duplicated code is `capacityFor`'s arithmetic, kept deliberately as an
 * independent oracle for a module-private helper.
 *
 * **`byteLength`, never `usedJSHeapSize`.** M-2′ established that a
 * `Float64Array`'s backing store is precisely what the heap counter cannot see,
 * and its own P-02 rows are structural for that reason. This inherits that
 * instrument rather than building one.
 *
 * **But retention and release are not the same reading** (P02-03). M-2′ asked
 * how much a cache *holds*, and `values.byteLength` answers that. This
 * candidate is landed for what a shrink *releases*, and a view — a
 * `subarray` onto the old allocation — reports the small `byteLength` while
 * retaining every byte of the original store. So every arm that claims a
 * reclaim reads `values.buffer.byteLength`, which is the quantity the policy
 * exists to move, and `bytes()` stays for the arms that are about the *view*
 * the scan writes through.
 *
 * **Detached rows for the buffer arms** (M-2′'s `bufferBytes` again): nothing
 * about buffer sizing depends on geometry, only on how many slots the scan
 * produced, and a hundred thousand *attached* rows would be measuring layout.
 * The deployment-bound arm at the foot of this file is the one that wants real
 * layout, and it attaches.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { CollectionSnapshot } from '../../src/sortable/domain.ts';
import { layoutAnimation } from '../../src/sortable/layout-animation.ts';
import {
  type ReadonlyFloat64Array,
  RectIndex,
  STRIDE,
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
  /** The view the scan writes through. */
  bytes(): number;
  /** The backing store, which is what a reclaim has to move (P02-03). */
  retained(): number;
  /** Buffer allocations since construction. */
  allocations(): number;
  /** One scan, with the cache left warm so `count` and contents stay live. */
  scan(n: number): void;
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
  const index = new RectIndex();
  // Seeded with the empty buffer the cache is born holding, so the counter
  // reports **allocations** rather than "the buffer is not null yet": a cache
  // asked only for an empty collection allocates nothing, and a probe that
  // started from `null` would report one.
  let seen: ReadonlyFloat64Array = index.values;
  let allocations = 0;
  // Detached, like the rows this probe scans: `hole` is a fixed `STRIDE`
  // allocated once with the record, so the placeholder is not a slot and moves
  // nothing the buffer arms read.
  const placeholder = document.createElement('div');

  const scan = (n: number): void => {
    const items = n === rows.length ? rows : rows.slice(0, n);
    const snapshot: CollectionSnapshot = { items, version: 1 };

    index.refresh(
      snapshot,
      items[0] ?? rows[0]!,
      null,
      ALIVE,
      placeholder,
      null,
    );

    if (index.values !== seen) {
      seen = index.values;
      allocations += 1;
    }
  };

  return {
    bytes: () => index.values.byteLength,
    // **The one widening, and it is at the instrument rather than in the
    // boundary.** The cache publishes a read view carrying `byteLength` and
    // deliberately not `buffer`, because measuring an allocation is not
    // mutating it — shipping an accessor no consumer path uses so that a probe
    // can read a number would be the worse trade. This probe is not a
    // collaborator, and it writes nothing through either handle.
    retained: () => (index.values as Float64Array).buffer.byteLength,
    allocations: () => allocations,
    values: () => index.values as Float64Array,
    count: () => index.count,
    scan,

    drag(n): void {
      scan(n);
      index.retire();
    },
  };
}

/**
 * **A cache that shrank, against a cache that never grew.**
 *
 * The shrink runs on the dirty path and the scan under it rewrites every slot,
 * so a shrunk cache must be indistinguishable from one that was only ever asked
 * for the small collection: same buffer size, same packed scalars, same count.
 *
 * This is the equivalence that matters now the policy ships. While it was an
 * instrument the check was *the instrument against the shipped cache*; there is
 * one cache now, and what has to be proved is that the shrink left it in the
 * state an ordinary refresh would have produced.
 */
function shrunkMatchesFresh(
  rows: readonly HTMLElement[],
  high: number,
  low: number,
): { bytes: boolean; retained: boolean; slots: boolean; count: boolean } {
  const shrunk = shipped(rows);
  const fresh = shipped(rows);

  shrunk.drag(high);
  // **`scan`, not `drag`** (P02-04). `drag` ends in `retire()`, which zeroes
  // `count` — so comparing after it made `count` a `0 === 0` tautology and
  // reduced the contents comparison to two empty slices. The comparison is
  // taken while the scan's result is still live in both caches.
  shrunk.scan(low);
  fresh.scan(low);

  const count = shrunk.count();

  return {
    bytes: shrunk.bytes() === fresh.bytes(),
    retained: shrunk.retained() === fresh.retained(),
    slots:
      count > 0 &&
      [...shrunk.values()].every((value, i) => value === fresh.values()[i]),
    count: count === fresh.count(),
  };
}

// ---------------------------------------------------------------------------
// Structural — the shrink leaves the cache where an ordinary refresh would
// ---------------------------------------------------------------------------

describe('the shrunk cache', () => {
  it('should be indistinguishable from a cache that never grew', () => {
    // **The contents obligation.** The shrink sits on the dirty path and the
    // scan under it rewrites every slot, so nothing in the old buffer was live
    // — and what the new one holds must be exactly what a refresh at the small
    // size produces, not merely the right number of bytes.
    const rows = pool(4000);

    expect(shrunkMatchesFresh(rows, 4000, 100)).toEqual({
      bytes: true,
      retained: true,
      slots: true,
      count: true,
    });
  });

  it('should be indistinguishable after a shrink the gate refused', () => {
    // 1000 → 300 is a real collection shrink the gate declines: `capacityFor`
    // makes the buffer 1024 and `4 × 300` is 1200, so it stays. The buffer is
    // then larger than a fresh one would be — which is the hysteresis, and the
    // contents still have to match slot for slot as far as the count goes.
    const rows = pool(1000);
    const held = shipped(rows);
    const fresh = shipped(rows);

    held.drag(1000);
    // Live on both sides (P02-04): with `drag` here the count assertion below
    // read `0 === 0` and the contents assertion compared two empty arrays.
    held.scan(300);
    fresh.scan(300);

    const compared = fresh.count() * STRIDE;

    expect(held.bytes()).toBe(capacityFor(1000) * SLOT_BYTES);
    expect(held.retained()).toBe(held.bytes());
    expect(held.bytes()).toBeGreaterThan(fresh.bytes());
    expect(fresh.count()).toBe(299);
    expect(held.count()).toBe(fresh.count());
    expect([...held.values().subarray(0, compared)]).toEqual([
      ...fresh.values().subarray(0, compared),
    ]);
  });

  it('should keep the six-scalar representation', () => {
    // `STRIDE` is not this candidate's to touch: narrowing it is P-02's other
    // sub-candidate, undesigned and unmeasured. A landing that quietly changed
    // the packing would make every byte figure in the record about a different
    // buffer.
    expect(STRIDE).toBe(6);

    const rows = pool(64);
    const cache = shipped(rows);

    cache.drag(64);

    expect(cache.bytes()).toBe(capacityFor(64) * STRIDE * 8);
  });
});

describe('the gate', () => {
  it('should not fire on a stable collection, ever', () => {
    // **The arm that can kill the candidate.** Churn has an exact definition
    // here — a reallocation on a workload whose collection size never changes —
    // and the gate makes it provably impossible, so this is a proof obligation
    // rather than an experiment. One allocation for the first drag, none after.
    const rows = pool(4000);
    const cache = shipped(rows);
    const sizes = new Set<number>();

    for (let i = 0; i < 1000; i += 1) {
      cache.drag(4000);
      sizes.add(cache.retained());
    }

    expect(cache.allocations()).toBe(1);
    expect([...sizes]).toEqual([capacityFor(4000) * SLOT_BYTES]);
  });

  it('should fire exactly once on a real shrink', () => {
    // The payoff arm's mechanism: one drag at the high water, the collection
    // republished small, and one reallocation — never a second on the drags
    // after it.
    const rows = pool(4000);
    const cache = shipped(rows);

    cache.drag(4000);
    expect(cache.allocations()).toBe(1);

    for (let i = 0; i < 100; i += 1) {
      cache.drag(100);
    }

    expect(cache.allocations()).toBe(2);
    expect(cache.retained()).toBe(capacityFor(100) * SLOT_BYTES);
  });

  it('should allocate strictly less than it frees', () => {
    // The property that separates this from a memory-for-allocations trade. It
    // follows from the gate: a buffer that satisfies `capacity > 4 × n` is at
    // least four times the fitted size, and `capacityFor(n) < 2n`.
    //
    // **Read on the backing store** (P02-03): "frees" is a claim about the
    // allocation, and `byteLength` cannot see it.
    const rows = pool(4000);
    const cache = shipped(rows);

    cache.drag(4000);

    const before = cache.retained();

    cache.drag(100);

    expect(cache.retained()).toBeLessThan(before / 4);
  });

  it('should release the old store rather than narrow a view onto it', () => {
    // **The one failure mode that would leave this policy green and useless**
    // (P02-03). A shrink written as `values = values.subarray(0, fitted)`
    // satisfies every other arm in this file: the view reports the fitted
    // `byteLength`, the identity check sees a new object so the allocation
    // counter still reads 1, `capacity` and `values.length` stay consistent,
    // and no consumer misbehaves. What it does not do is give the memory back
    // — `buffer.byteLength` stays at the high water — which is the entire
    // quantity D-104 was landed for.
    //
    // So the two readings are asserted to agree. They agree for any shrink
    // that allocates, and only for those.
    const rows = pool(4000);
    const cache = shipped(rows);

    cache.drag(4000);
    cache.drag(100);

    expect(cache.retained()).toBe(capacityFor(100) * SLOT_BYTES);
    expect(cache.retained()).toBe(cache.bytes());
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
    const cache = shipped(rows);

    cache.drag(1000);
    cache.drag(0);

    expect(cache.retained()).toBe(SLOT_BYTES);
  });

  it('should settle on an emptied collection rather than reallocating', () => {
    // **The `n = 0` correction, found by the measurement and landed with the
    // policy.** The gate reads `capacity > 0`, which the one-slot buffer a
    // previous empty refresh just produced also satisfies — so without the
    // settle guard an empty collection reallocates 48 B on every scan forever.
    // One shrink, then nothing.
    const rows = pool(16);
    const cache = shipped(rows);

    cache.drag(16);

    const before = cache.allocations();

    for (let i = 0; i < 10; i += 1) {
      cache.drag(0);
    }

    expect(cache.allocations() - before).toBe(1);
    expect(cache.bytes()).toBe(SLOT_BYTES);
  });

  it('should allocate nothing at all for a cache that never grew', () => {
    // The other half of the same guard: a fresh cache asked only for an empty
    // collection has `capacity === 0`, and neither half of the branch fires.
    const cache = shipped(pool(1));

    cache.drag(0);

    expect(cache.allocations()).toBe(0);
    expect(cache.bytes()).toBe(0);
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
      const cache = shipped(rows);
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
        const cache = shipped(rows);

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
      const cache = shipped(rows);

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

        const index = new RectIndex();
        const items = rows.slice(0, n);
        const snapshot: CollectionSnapshot = { items, version: 1 };
        // Attached like the rows, because this is the arm that wants real
        // layout: the scan measures it exactly once, so it adds one rect read
        // to a scan of `n` and nothing to the per-row figure.
        const placeholder = document.createElement('div');

        Object.assign(placeholder.style, {
          display: 'block',
          height: '40px',
          width: '100px',
        });
        root.append(placeholder);

        // One warm-up, so the first reading is not paying for the layout the
        // rows just added.
        index.refresh(snapshot, items[0]!, null, ALIVE, placeholder, null);
        index.retire();

        const started = performance.now();

        index.refresh(snapshot, items[0]!, null, ALIVE, placeholder, null);

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

type Drive = Readonly<{
  /** Committed-move count since the last reset. */
  moves(): number;
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

  let moves = 0;

  let current: readonly HTMLElement[] = rows;
  const controller = sortable(
    root,
    {
      items: () => current,
      axis: y(),
      // The committed-move counter, read off the one hook a committed move
      // always reaches. It counts accepted proposals rather than bracketing
      // them: this arm only needs to know that both drags really moved.
      onReorder: () => {
        moves += 1;

        return ReorderResolution.accept();
      },
    },
    ...(animate ? [layoutAnimation()] : []),
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

    reset(): void {
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

    arm.release();
    await sequence(1, () => arm.step(0));

    // Read after the release, because the counter is `onReorder` — the one hook
    // a completed drag always reaches, and it fires when the drop resolves
    // rather than once per committed move.
    const large = arm.moves();

    // The collection shrinks below `capacity / 4`, which is what the gate asks.
    arm.replace(100);
    arm.reset();
    arm.grab();
    await sequence(6, (round) => arm.step(round));
    arm.release();
    await sequence(1, () => arm.step(0));

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
    // clears D-99's ~100 kB by a margin.
    //
    // **The other end is 192 KiB less 48 B, not 186 KiB** (P02-01): a
    // destination of 0 or 1 leaves the one-slot buffer, and 186 KiB is merely
    // the reclaim at the 65–128 destination the earning workload happens to
    // use. Both ends are asserted now — the sweep already produced the
    // counterexample and then discarded it through `Math.min`.
    const rows = pool(4096);
    const reclaims: number[] = [];

    for (const after of [1023, 512, 100, 10, 1]) {
      const cache = shipped(rows);

      cache.drag(2049);

      const before = cache.retained();

      cache.drag(after);
      reclaims.push(before - cache.retained());
    }

    expect(Math.min(...reclaims)).toBeGreaterThan(100 * 1024);
    expect(Math.min(...reclaims)).toBe(196_608 - 49_152);
    expect(Math.max(...reclaims)).toBe(196_608 - SLOT_BYTES);
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
      const cache = shipped(rows);

      cache.drag(2048);

      const before = cache.retained();

      cache.drag(after);
      largest.push(before - cache.retained());
    }

    expect(Math.max(...largest)).toBeLessThan(100 * 1024);
  }, 600_000);
});

describe.runIf(Boolean(import.meta.env['VITE_DRAG_MEASURE']))(
  'P-02 shrink — the capacity-bucket interval',
  () => {
    it('should report the reclaim available across the bucket boundary', () => {
      // Arithmetic on the instrument rather than a new measurement: the
      // bucket is what it is, and what this reports is how much a shrink
      // across each boundary has to give back.
      for (const high of [2000, 2049, 2100, 3000, 4096]) {
        const rows = pool(high);
        const cache = shipped(rows);

        cache.drag(high);

        const before = cache.retained();

        cache.drag(100);

        const reclaimed = before - cache.retained();

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
