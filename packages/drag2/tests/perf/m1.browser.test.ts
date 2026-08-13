/**
 * M-1 — the move path. Does the generic frame copy cost anything a specialized
 * pointer-publication path would save, and what is I-26's honest number?
 *
 * F-24 currently says *"removing the copy would be performance theatre"*, which
 * is an assertion with no measurement behind it. `handleMove` publishes one
 * pointer sample as `beginFrame` (an `Object.assign` over the whole frame) plus
 * two field writes plus a swap; a specialized path would write the two pointer
 * fields into the committed frame and skip the copy entirely.
 *
 * **Three variants, and the specialized one has to be proven equivalent before
 * its timing means anything** (05 §Measurements owed asks for exactly that):
 *
 * - `generic` — what ships: `beginFrame(draft, current)`, two writes, swap.
 * - `specialized` — two writes straight into the committed frame, no copy and
 *   no swap. Legal *only* for a sample that changes nothing else, which is what
 *   makes it a candidate rather than a design.
 * - `shipped` — `@ydinjs/drag`'s move path, end to end, for context.
 *
 * **Frame shapes.** Part sizes 3/8/20 and a fourth *polymorphic* scenario that
 * alternates all three through one call site, because the concern F-24 raises
 * is not the copy in isolation — it is whether one controller's shape stays
 * monomorphic when several controllers share the same code (05 §M-1).
 *
 * As with Q-7: the assertions are structural and run always; the timings are
 * opt-in via `VITE_DRAG_MEASURE=1` and assert nothing, because a ratio between
 * two durations on a shared CI machine is a property of the machine.
 *
 * **Run this file alone.** The browser project runs test files in parallel, and
 * two measurement suites sharing a page inflate every absolute figure by ~2×.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  beginFrame,
  composeFrame,
  type Frame,
  type KernelFrame,
} from '../../src/kernel/frames.ts';
import { callbacks } from '../../src/sortable/callbacks.ts';
import { y } from '../../src/sortable/y.ts';
import { ReorderResolution, sortable } from '../../src/sortable.ts';

const WARMUP = 5;
const SAMPLES = 21;
const TARGET_SAMPLE_MS = 2;
const ITEM_HEIGHT = 40;
const POINTER_ID = 31;

type Memory = Readonly<{ usedJSHeapSize: number }>;
type Gc = Readonly<{ gc?(): void; performance: { memory?: Memory } }>;

const cleanup: Array<() => void> = [];

afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

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
// The publication step, isolated
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

  // Two frames from one factory, exactly as `arm()` builds them.
  return { current: composeFrame(factory), draft: composeFrame(factory) };
}

/** What ships: copy the whole frame, write the sample, swap. */
function publishGeneric(pair: Pair, x: number, y: number): void {
  beginFrame(pair.draft, pair.current);
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

// ---------------------------------------------------------------------------
// The end-to-end path
// ---------------------------------------------------------------------------

type Live = Readonly<{ root: HTMLElement; sample(y: number): void }>;

function liveDrag(count: number): Live {
  const root = document.createElement('div');

  root.style.width = '200px';
  document.body.append(root);

  const items: HTMLElement[] = [];

  for (let i = 0; i < count; i += 1) {
    const item = document.createElement('div');

    Object.assign(item.style, {
      display: 'block',
      width: '100px',
      height: `${ITEM_HEIGHT}px`,
    });
    root.append(item);
    items.push(item);
  }

  const controller = sortable(
    root,
    items,
    y(),
    callbacks({ onReorder: () => ReorderResolution.accept() }),
  );

  root.setPointerCapture = (): void => {};
  root.releasePointerCapture = (): void => {};

  cleanup.push(() => {
    void controller.destroy();
    root.remove();
  });

  items[0]!.dispatchEvent(
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
        clientX: 10,
        clientY: y,
      }),
    );
  };

  // Cross the threshold so every measured sample is an ACTIVE one.
  sample(40);

  return { root, sample };
}

describe('M-1 — the specialized publication path', () => {
  it('should leave the same committed frame as the generic one', () => {
    // The equivalence check the standard requires. Without it a faster variant
    // is only faster at doing something else.
    const generic = createPair(8);
    const specialized = createPair(8);

    for (let i = 0; i < 64; i += 1) {
      publishGeneric(generic, i * 3, i * 7);
      publishSpecialized(specialized, i * 3, i * 7);
    }

    expect({ ...generic.current }).toEqual({ ...specialized.current });
  });

  it('should not be equivalent once a sample changes another field', () => {
    // The bound on the candidate, stated as a test: it publishes *only* the
    // pointer. A move that also writes the part — which `moved()` may do — has
    // no in-place form, so the specialization cannot be the single publication
    // path, only a second one.
    const pair = createPair(8);

    publishSpecialized(pair, 1, 2);
    pair.draft['field0'] = 'stale';

    expect(pair.draft['field0']).not.toBe(pair.current['field0']);
  });
});

describe.runIf(Boolean(import.meta.env['VITE_DRAG_MEASURE']))(
  'M-1 — timing measurement',
  () => {
    const report = (value: number): string => `${(value * 1000).toFixed(4)}µs`;

    for (const size of [3, 8, 12, 16, 20, 28]) {
      it(`should measure both publication paths at a ${size}-field part`, () => {
        const generic = createPair(size);
        const specialized = createPair(size);
        const a = median((round) => {
          publishGeneric(generic, round, round);
        });
        const b = median((round) => {
          publishSpecialized(specialized, round, round);
        });

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.warn(
          `M-1 part=${size} generic=${report(a)} specialized=${report(b)} ratio=${(a / b).toFixed(2)}`,
        );
      });
    }

    it('should measure a call site that sees three frame shapes', () => {
      // The polymorphic case. One call site, three hidden classes — if the
      // generic copy is only cheap while monomorphic, this is where it shows.
      const pairs = [createPair(3), createPair(8), createPair(20)];
      const a = median((round) => {
        publishGeneric(pairs[round % 3]!, round, round);
      });
      const b = median((round) => {
        publishSpecialized(pairs[round % 3]!, round, round);
      });

      // oxlint-disable-next-line no-console -- this suite exists to report
      console.warn(
        `M-1 polymorphic generic=${report(a)} specialized=${report(b)} ratio=${(a / b).toFixed(2)}`,
      );
    });

    for (const n of [50, 200]) {
      it(`should measure one end-to-end pointer sample at ${n} rows`, () => {
        const live = liveDrag(n);
        const cost = median((round) => {
          live.sample(40 + (round % 120));
        });

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.warn(`M-1 end-to-end n=${n} sample=${report(cost)}`);
      });
    }

    it('should measure what one pointer sample allocates', () => {
      // I-26's honest number. Deliberately **without** an intervening `gc()`:
      // the invariant is about allocation, not retention, and a collection
      // between samples would hide exactly the transient wrapper it forbids.
      // Growth over many samples divided by the count is therefore an upper
      // bound that includes whatever else the page did — which is the right
      // direction for an invariant claiming zero.
      const live = liveDrag(50);
      const samples = 20_000;
      const memory = (globalThis as unknown as Gc).performance.memory!;

      (globalThis as unknown as Gc).gc?.();

      const before = memory.usedJSHeapSize;

      for (let i = 0; i < samples; i += 1) {
        live.sample(40 + (i % 120));
      }

      const grew = memory.usedJSHeapSize - before;

      // oxlint-disable-next-line no-console -- this suite exists to report
      console.warn(
        `M-1 allocation samples=${samples} grew=${(grew / 1024).toFixed(1)}kB ` +
          `≈ ${(grew / samples).toFixed(1)}B per sample`,
      );
    });
  },
);
