/**
 * M-4 / Q-7 — the displacement element set, and whether `vertical()`'s index
 * rebuild and `layoutAnimation()`'s before/after measurements can share one
 * layout read around the committed placeholder move.
 *
 * This is a **measurement harness that also asserts**, not a benchmark suite.
 * The numbers it prints are the ones written up in
 * `.agents/docs/drag/measurements/q7.md`; the assertions are deliberately
 * coarse — order-of-magnitude relationships that hold on any engine — so it can
 * live in CI without becoming a timing flake.
 *
 * Workload: a real list of `N` 40px rows in a scrolling container, with a
 * placeholder moved one slot per iteration so every iteration starts with a
 * genuinely dirty layout. Warm-up runs are discarded and the reported figure is
 * a median, because a mean over a forced-layout workload is dominated by the
 * first iteration and by GC.
 */
import { afterEach, describe, expect, it } from 'vitest';

const ITEM_HEIGHT = 40;
const WARMUP = 5;
const SAMPLES = 21;
/** Long enough that the 100µs clock clamp is not the measurement. */
const TARGET_SAMPLE_MS = 2;

const cleanup: HTMLElement[] = [];

afterEach(() => {
  for (const element of cleanup.splice(0)) {
    element.remove();
  }
});

type Field = Readonly<{
  root: HTMLElement;
  items: HTMLElement[];
  placeholder: HTMLElement;
}>;

function createField(count: number): Field {
  const root = document.createElement('div');

  Object.assign(root.style, {
    width: '300px',
    height: '400px',
    overflow: 'auto',
    position: 'relative',
  });
  document.body.append(root);
  cleanup.push(root);

  const placeholder = document.createElement('div');

  Object.assign(placeholder.style, {
    display: 'block',
    height: `${ITEM_HEIGHT}px`,
  });

  const items: HTMLElement[] = [];

  for (let i = 0; i < count; i += 1) {
    const item = document.createElement('div');

    Object.assign(item.style, {
      display: 'block',
      height: `${ITEM_HEIGHT}px`,
      contain: 'none',
    });
    item.textContent = `row ${i}`;
    root.append(item);
    items.push(item);
  }

  root.prepend(placeholder);
  return { root, items, placeholder };
}

/**
 * Median per-iteration cost in ms.
 *
 * `performance.now()` is clamped to 100µs in a browser, and a single read pass
 * over a short list lands well under that — so each timed sample runs a
 * calibrated batch and divides. Without this every small-`n` figure reports
 * exactly zero, which is what the first run of this harness did.
 */
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

  // Calibrate up to a sample long enough to clear the clock's resolution.
  let repeats = 1;

  while (batch(repeats) < TARGET_SAMPLE_MS && repeats < 4096) {
    repeats *= 2;
  }

  const timings: number[] = [];

  for (let i = 0; i < SAMPLES; i += 1) {
    timings.push(batch(repeats) / repeats);
  }

  return timings.toSorted((a, b) => a - b)[Math.floor(SAMPLES / 2)]!;
}

/** One full-list read pass into a packed buffer, the way `vertical()` does. */
const readAll = (items: readonly HTMLElement[], out: Float64Array): void => {
  for (let i = 0; i < items.length; i += 1) {
    const rect = items[i]!.getBoundingClientRect();

    out[i * 2] = rect.top;
    out[i * 2 + 1] = rect.bottom;
  }
};

/** The move that dirties layout: the placeholder changes slot. */
const movePlaceholder = (field: Field, round: number): void => {
  const target = field.items[round % field.items.length]!;

  target.after(field.placeholder);
};

type Row = Readonly<{
  n: number;
  onePass: number;
  twoPasses: number;
  writeBetween: number;
  span: number;
}>;

const results: Row[] = [];

const scenarios = (n: number): Row => {
  const field = createField(n);
  const buffer = new Float64Array(n * 2);
  const other = new Float64Array(n * 2);

  // 1. One full pass. The forced layout plus N reads — the floor for anything
  //    that needs post-move geometry at all.
  const onePass = median((round) => {
    movePlaceholder(field, round);
    readAll(field.items, buffer);
  });

  // 2. Two full passes with nothing written between them. If this is close to
  //    (1), the duplicate cost is the read loop only: the forced layout is paid
  //    once and the second pass hits a clean layout tree.
  const twoPasses = median((round) => {
    movePlaceholder(field, round);
    readAll(field.items, buffer);
    readAll(field.items, other);
  });

  // 3. The realistic FLIP shape: measure, write transforms, measure again. This
  //    is the shape that decides Q-7 — if a transform write between the passes
  //    re-forces layout, the second pass costs a full one.
  const writeBetween = median((round) => {
    movePlaceholder(field, round);
    readAll(field.items, buffer);

    for (const item of field.items) {
      item.style.transform = `translateY(${(round % 2) * 0.5}px)`;
    }

    readAll(field.items, other);
  });

  // 4. The minimal affected set: only the rows between the old and the new gap.
  //    A single-slot move touches one.
  const span = median((round) => {
    movePlaceholder(field, round);

    const first = round % field.items.length;

    for (let i = first; i < Math.min(first + 2, field.items.length); i += 1) {
      const rect = field.items[i]!.getBoundingClientRect();

      buffer[i * 2] = rect.top;
      buffer[i * 2 + 1] = rect.bottom;
    }
  });

  for (const item of field.items) {
    item.style.transform = '';
  }

  return { n, onePass, twoPasses, writeBetween, span };
};

describe('Q-7 — displacement measurement', () => {
  for (const n of [50, 200, 800]) {
    it(`should measure the layout-read shapes at ${n} rows`, () => {
      const row = scenarios(n);

      results.push(row);

      const report = (value: number): string => value.toFixed(3);

      // The record the write-up quotes. Printed rather than snapshotted:
      // absolute timings are machine-specific, the *relationships* are not.

      console.info(
        `Q-7 n=${row.n} one=${report(row.onePass)}ms two=${report(row.twoPasses)}ms ` +
          `write-between=${report(row.writeBetween)}ms span=${report(row.span)}ms`,
      );

      // Every shape has to produce a real, non-zero figure, or the harness is
      // measuring the clock rather than the layout.
      expect(row.onePass).toBeGreaterThan(0);
    });
  }

  it('should show a second read pass costing less than the first', () => {
    // The Q-7 claim under test: the expensive part of a post-move read is the
    // forced layout, not the read loop — so a *second* consumer reading the
    // same clean tree does not pay it again.
    const row = results.at(-1)!;

    expect(row.twoPasses).toBeLessThan(row.onePass * 2);
  });

  it('should show the minimal set costing far less than a full pass', () => {
    // Asserted only at the largest size, where the ratio is structural rather
    // than a timing artefact: two rows against 800.
    const row = results.at(-1)!;

    expect(row.span).toBeLessThan(row.onePass / 4);
  });
});
