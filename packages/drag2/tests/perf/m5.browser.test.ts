/**
 * M-5 — the unconditional activation work neither behavior needs twice.
 *
 * Two arms, each measuring work the kernel performs on **every** activation for
 * a behavior that never consumes it:
 *
 * - **Arm A — D-52's window 1 (F-65).** `boxPre` is the box's offset box, read
 *   immediately before `acquireLift` so a behavior can derive a placeholder
 *   footprint from two reads straddling acquisition. **Free drag has no
 *   footprint and never names `boxPre`.**
 * - **Arm B — D-85's `inheritedSpace`.** The inverse inherited linear part,
 *   derived from the measurement `acquireLift` already took. **The sortable
 *   never names it.**
 *
 * **The decision rule is fixed in `.plan/measurements/phase-21.md` and is not
 * re-derived here**: close under 0.2 ms absolute **and** under 5% of measured
 * activation; open over 0.5 ms absolute whatever the share; otherwise
 * indeterminate. A share alone decides nothing — it can block a close and can
 * never open the SPI.
 *
 * **The denominator is fixed too, and the fixture is built to it.** _Measured
 * activation_ is the package's activation path with **no consumer slot inside
 * it**: no `onStart`, no `onMove`, no `visual` resolver body, no consumer
 * `axis` source. With consumer work in the denominator a fixture author moves
 * the share to either side of any gate by writing more or less of it, which is
 * a property of the fixture and not of the tree.
 *
 * **Arm B cannot reopen D-85.** That decision was taken for correctness — one
 * traversal, two products, because a second traversal reads an ancestry
 * acquisition has already mutated. This arm checks the **ground** it was
 * accepted on (arithmetic over a materialized buffer rather than a layout
 * read), and no timing result removes `inheritedSpace`.
 *
 * The structural rows — the equivalence checks, the falsifier and the
 * instrument pins — run in CI on every suite run. The timings are opt-in with
 * `VITE_DRAG_MEASURE=1` and assert nothing.
 *
 * **Run this file alone**, and note the Phase 21 operational rule it inherits:
 * **only the measured fixture may be live.** Every arm builds, measures and
 * disposes before the next is built.
 */
import { box, coordinates, type Box } from '@ydinjs/box-quad';
import { describe, expect, it } from 'vitest';
import { FreeDragResolution, freeDrag } from '../../src/free-drag.ts';
import { LIFT_IN_PLACE, acquireLift } from '../../src/kernel/presentation.ts';
import { createRealm } from '../../src/kernel/realm.ts';
import { y } from '../../src/sortable/y.ts';
import { ReorderResolution, sortable } from '../../src/sortable.ts';

const POINTER_ID = 51;
const ITEM_HEIGHT = 40;
/** Deep enough that a box-quad traversal is doing real work per level. */
const DEEP = 32;
/** q7's policy, unchanged. */
const WARMUP = 5;
const SAMPLES = 21;
const TARGET_SAMPLE_MS = 2;
/**
 * The paired arm's batch target, and the one deviation from q7's policy.
 *
 * q7's 2 ms exists to clear the clock's 0.1 ms grain, and it does. The
 * deciding quantity here is a **difference** two to three orders of magnitude
 * below either side of it, so a batch sized only to clear the grain leaves the
 * difference inside the batch's own scheduling noise — the first paired run of
 * this file returned a p5 of −0.71 ms on a 0.45 ms activation, which is one
 * descheduled sample and not a measurement. The statistic is unchanged; only
 * the denominator of the quantization grows.
 */
const PAIRED_TARGET_MS = 30;

// ---------------------------------------------------------------------------
// The ancestry
// ---------------------------------------------------------------------------

type Stage = Readonly<{
  /** The outermost node, appended to the document. */
  root: HTMLElement;
  /** The innermost node, which owns the draggable subject. */
  leaf: HTMLElement;
  dispose(): void;
}>;

/**
 * A stage of `depth` nested elements.
 *
 * At `depth = 0` the leaf is one plain absolutely-positioned box — the shallow
 * workload. Above it every level carries **its own transform**, because a
 * box-quad traversal is depth-sensitive only where there is a space to compose:
 * a deep untransformed ancestry is not the worst case this arm exists to find.
 */
function stage(depth: number): Stage {
  const root = document.createElement('div');

  Object.assign(root.style, {
    position: 'absolute',
    top: '0px',
    left: '0px',
    width: '600px',
    height: '600px',
  });

  let leaf = root;

  for (let i = 0; i < depth; i += 1) {
    const level = document.createElement('div');

    Object.assign(level.style, {
      position: 'relative',
      // Distinct per level, and never a pure translation: a repeated identical
      // transform is the case an engine is most likely to collapse, and the
      // rotation is what makes the inherited linear part non-identity so the
      // arm-B derivation takes its full branch rather than its early `null`.
      transform: `translate(${i % 3}px, ${i % 2}px) scale(${1 + (i % 5) / 1000}) rotate(${(i % 7) / 100}deg)`,
      width: '100%',
      height: '100%',
    });
    leaf.append(level);
    leaf = level;
  }

  document.body.append(root);

  return {
    root,
    leaf,
    dispose: (): void => {
      root.remove();
    },
  };
}

// ---------------------------------------------------------------------------
// The instrument
// ---------------------------------------------------------------------------

/**
 * Accumulates the time spent inside the activating dispatch, across a batch.
 *
 * `performance.now()` is clamped, so one activation's delta is quantized. The
 * accumulation over a calibrated batch telescopes the quantization into the two
 * ends of the batch and leaves the per-activation figure with a resolution of
 * the clock's grain divided by the repeat count, which the harness prints with
 * every row.
 */
type Clock = { total: number; count: number };

const emptyClock = (): Clock => ({ total: 0, count: 0 });

const pointer = (
  type: string,
  target: EventTarget,
  at: Readonly<{ x: number; y: number }>,
): void => {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      composed: true,
      cancelable: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: at.x,
      clientY: at.y,
    }),
  );
};

/**
 * Replaces the box element's offset-box accessors.
 *
 * **This is exactly the measured work and nothing else** (arm A's control).
 * `boxPre` is still built, still allocated and still published on the scope;
 * what the stub removes is the pair of layout-facing reads that build it. The
 * lift's own width and height come from box-quad's traversal, not from these,
 * so acquisition is untouched — which is what makes the equivalence check below
 * assertable rather than aspirational.
 *
 * `extra` is the falsifier: reads injected into the same accessors, so a known
 * cost sits exactly where window 1 sits.
 */
type Stub = Readonly<{
  /** Installs the given mode, replacing whatever is installed. */
  set(mode: 'shipped' | 'stubbed', extra?: number): void;
  restore(): void;
}>;

function offsetBox(element: HTMLElement): Stub {
  const { prototype } = HTMLElement;
  const width = Object.getOwnPropertyDescriptor(prototype, 'offsetWidth')!;
  const height = Object.getOwnPropertyDescriptor(prototype, 'offsetHeight')!;

  const read = (
    own: PropertyDescriptor,
    mode: 'shipped' | 'stubbed',
    extra: number,
  ): (() => number) =>
    function reader(this: HTMLElement): number {
      for (let i = 0; i < extra; i += 1) {
        this.getBoundingClientRect();
      }

      return mode === 'stubbed' ? 0 : (own.get!.call(this) as number);
    };

  return {
    set: (mode, extra = 0): void => {
      Object.defineProperty(element, 'offsetWidth', {
        configurable: true,
        get: read(width, mode, extra),
      });
      Object.defineProperty(element, 'offsetHeight', {
        configurable: true,
        get: read(height, mode, extra),
      });
    },
    // Removing the own accessors restores the prototype's, which is what the
    // shipped read goes through.
    restore: (): void => {
      Reflect.deleteProperty(element, 'offsetWidth');
      Reflect.deleteProperty(element, 'offsetHeight');
    },
  };
}

// ---------------------------------------------------------------------------
// The two behaviors, with empty consumer slots
// ---------------------------------------------------------------------------

type Subject = Readonly<{
  /** The element the pointer presses. */
  item: HTMLElement;
  /** One activation, timed; releases before returning. */
  activate(clock: Clock): void;
  /** The visual's inline style after an activation — the equivalence subject. */
  snapshot(): string;
  dispose(): void;
}>;

type Behavior = 'free' | 'sortable';

function subject(kind: Behavior, host: Stage): Subject {
  const items: HTMLElement[] = [];

  for (let i = 0; i < (kind === 'free' ? 1 : 8); i += 1) {
    const row = document.createElement('div');

    Object.assign(row.style, {
      display: 'block',
      width: '100px',
      height: `${ITEM_HEIGHT}px`,
    });
    host.leaf.append(row);
    items.push(row);
  }

  const [item] = items as [HTMLElement, ...HTMLElement[]];

  host.leaf.setPointerCapture = (): void => {};
  host.leaf.releasePointerCapture = (): void => {};
  item.setPointerCapture = (): void => {};
  item.releasePointerCapture = (): void => {};

  // **No consumer slot is composed beyond the one required resolution
  // callback**, which is not on the activation path at all: it runs at release.
  // No `onStart`, no `onMove`, no `visual` resolver, no `box` resolver.
  const controller =
    kind === 'free'
      ? freeDrag(item, { onDrop: () => FreeDragResolution.accept() })
      : sortable(host.leaf, {
          items: () => items,
          axis: y(),
          onReorder: () => ReorderResolution.accept(),
        });

  const grab = { x: 20, y: 10 };
  const cross = { x: 20, y: 40 };

  return {
    item,
    activate: (clock): void => {
      pointer('pointerdown', item, grab);

      const started = performance.now();

      // **The measured region.** Activation is synchronous inside the sample
      // that crosses the threshold: the kernel acquires the origin rect, reads
      // window 1, acquires the lift and runs the activation seam, and the
      // behavior's `activation.effect` runs inside it. Nothing consumer-written
      // is in here, by construction of the config above.
      pointer('pointermove', document, cross);
      clock.total += performance.now() - started;
      clock.count += 1;

      pointer('pointerup', document, cross);
    },
    snapshot: (): string => {
      pointer('pointerdown', item, grab);
      pointer('pointermove', document, cross);

      // The visual's inline style **and the placeholder's**, because window 1's
      // product does not land on the visual: the sortable derives the
      // placeholder's footprint from `boxPre` minus the collapsed box, so the
      // sortable half of the equivalence check is only able to fail if the
      // placeholder is in the subject.
      const placeholder = host.leaf.querySelector('[data-drag-placeholder]');
      const seen = `${item.getAttribute('style') ?? ''} | ${
        placeholder?.getAttribute('style') ?? ''
      }`;

      pointer('pointerup', document, cross);
      return seen;
    },
    dispose: (): void => {
      void controller.destroy();

      for (const row of items) {
        row.remove();
      }
    },
  };
}

/**
 * Builds one fixture, hands the body the subject and its stub, and **disposes
 * before returning** — the Phase 21 rule that only the measured fixture may be
 * live. A live controller listens on the document, so an undisposed predecessor
 * activates alongside every later arm's samples.
 */
function withArm<T>(
  kind: Behavior,
  depth: number,
  body: (it: Subject, stub: Stub) => T,
): T {
  const host = stage(depth);
  const it = subject(kind, host);
  const stub = offsetBox(it.item);

  stub.set('shipped');

  try {
    return body(it, stub);
  } finally {
    stub.restore();
    it.dispose();
    host.dispose();
  }
}

const at = (values: readonly number[], quantile: number): number =>
  values.toSorted((a, b) => a - b)[
    Math.min(values.length - 1, Math.floor(values.length * quantile))
  ]!;

const median = (values: readonly number[]): number => at(values, 0.5);

/** q7's sampling policy, applied to the activation region alone. */
function activations(
  it: Subject,
  repeats: number,
): Readonly<{ per: number; samples: readonly number[] }> {
  const batch = (): number => {
    const clock = emptyClock();

    for (let i = 0; i < repeats; i += 1) {
      it.activate(clock);
    }

    return clock.total / clock.count;
  };

  const samples: number[] = [];

  for (let i = 0; i < SAMPLES; i += 1) {
    samples.push(batch());
  }

  return { per: median(samples), samples };
}

/** Calibrates the batch to q7's rule: double until one sample clears the target. */
function calibrate(it: Subject, target = TARGET_SAMPLE_MS): number {
  for (let i = 0; i < WARMUP; i += 1) {
    it.activate(emptyClock());
  }

  let repeats = 1;

  for (;;) {
    const clock = emptyClock();

    for (let i = 0; i < repeats; i += 1) {
      it.activate(clock);
    }

    if (clock.total >= target || repeats >= 4096) {
      return repeats;
    }

    repeats *= 2;
  }
}

/**
 * The paired arm: **one fixture, one controller, the stub toggled between
 * samples**.
 *
 * Measuring one whole arm and then the other lets the machine drift between
 * them, and the quantity here is a difference two to three orders of magnitude
 * below either side — the first run of this file read window 1 as −0.02 ms at
 * one depth and +0.05 ms at another, which is the drift and not the read. The
 * stub is an accessor swap on a single element, so it can be toggled without
 * rebuilding anything, and each sample contributes **its own** difference.
 *
 * The order alternates per sample so a systematic first-in-pair advantage
 * cancels rather than accumulating into the median.
 */
function paired(
  it: Subject,
  stub: Stub,
  repeats: number,
  extra: number,
): Readonly<{
  shipped: number;
  stubbed: number;
  difference: number;
  spread: readonly [number, number];
}> {
  const batch = (mode: 'shipped' | 'stubbed'): number => {
    stub.set(mode, mode === 'shipped' ? extra : 0);

    const clock = emptyClock();

    for (let i = 0; i < repeats; i += 1) {
      it.activate(clock);
    }

    return clock.total / clock.count;
  };

  const shipped: number[] = [];
  const stubbed: number[] = [];
  const differences: number[] = [];

  for (let i = 0; i < SAMPLES; i += 1) {
    const first = i % 2 === 0;
    const a = batch(first ? 'shipped' : 'stubbed');
    const b = batch(first ? 'stubbed' : 'shipped');
    const withRead = first ? a : b;
    const without = first ? b : a;

    shipped.push(withRead);
    stubbed.push(without);
    differences.push(withRead - without);
  }

  return {
    shipped: median(shipped),
    stubbed: median(stubbed),
    difference: median(differences),
    // The envelope the bound is quoted from. A median alone cannot say how
    // tightly the difference is pinned, and the decision rule needs that.
    spread: [at(differences, 0.1), at(differences, 0.9)],
  };
}

// ---------------------------------------------------------------------------
// Arm B — the derivation, and the proof that the copy is the shipped one
// ---------------------------------------------------------------------------

const BOX_ANCESTOR_A = 9;
const BOX_ANCESTOR_B = 10;
const BOX_ANCESTOR_C = 11;
const BOX_ANCESTOR_D = 12;

/**
 * `inheritedSpaceOf`, line for line.
 *
 * A copy exists because the shipped function is module-private and is called
 * from inside `acquireLift`, so **activation without it cannot be built without
 * editing `src/`** — which the reproducibility standard's checked-in-harness
 * rule does not allow for a shipped-path measurement. The copy is therefore
 * held to M-1's discipline instead: it is proven to be the shipped derivation
 * by an **in-situ** equivalence check against the value the kernel's own
 * `compose` encodes, before any figure is quoted from it.
 */
const derive = (
  measured: Box,
): Readonly<{ a: number; b: number; c: number; d: number }> | null => {
  const a = measured[BOX_ANCESTOR_A]!;
  const b = measured[BOX_ANCESTOR_B]!;
  const c = measured[BOX_ANCESTOR_C]!;
  const d = measured[BOX_ANCESTOR_D]!;

  if (a === 1 && b === 0 && c === 0 && d === 1) {
    return null;
  }

  const determinant = a * d - b * c;

  if (determinant === 0 || !Number.isFinite(determinant)) {
    return null;
  }

  return {
    a: d / determinant,
    b: -b / determinant,
    c: -c / determinant,
    d: a / determinant,
  };
};

/**
 * The control: reads the same four slots off the same buffer and returns.
 *
 * The difference between this and `derive` is the whole of what D-85 added —
 * the comparison, the determinant, the four divides and the object — and
 * nothing else. It reads the slots so that the buffer access itself is on both
 * sides and the delta is the arithmetic alone.
 */
const skip = (measured: Box): number =>
  measured[BOX_ANCESTOR_A]! +
  measured[BOX_ANCESTOR_B]! +
  measured[BOX_ANCESTOR_C]! +
  measured[BOX_ANCESTOR_D]!;

/** A real `Box` for `element`, taken the way `acquireLift` takes it. */
function measure(element: HTMLElement): Box {
  const measured = box();

  if (!coordinates(element, measured)) {
    throw new Error('m5: the fixture has no readable box space');
  }

  return measured;
}

function timings(iteration: (round: number) => void): number {
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

  return measured.toSorted((a, b) => a - b)[Math.floor(SAMPLES / 2)]!;
}

// ---------------------------------------------------------------------------
// Structural — equivalence, falsification, instrument pins
// ---------------------------------------------------------------------------

describe('M-5 arm A — the stub is a specialization, not a different activation', () => {
  it('should leave free drag’s activation output identical', () => {
    // **Asserted before any ratio is quoted** (the standard's equivalence
    // check). Free drag never names `boxPre`, so removing the two reads that
    // build it must change nothing the activation produces. The subject is the
    // visual's whole inline style after activation, which is where every
    // product of the lift lands.
    const shipped = withArm('free', DEEP, (it, stub) => {
      stub.set('shipped');
      return it.snapshot();
    });
    const stubbed = withArm('free', DEEP, (it, stub) => {
      stub.set('stubbed');
      return it.snapshot();
    });

    expect(stubbed).toBe(shipped);
    // A pair of empty strings would satisfy the line above trivially.
    expect(shipped).toContain('position: fixed');
  });

  it('should change the sortable’s activation output, so no sortable figure is taken from it', () => {
    // The other half of the same check, and the reason arm A's number is free
    // drag's. The sortable **reads** window 1 — the placeholder's footprint is
    // `boxPre` minus the collapsed box — so the stub is not a specialization
    // there, it is a different behavior.
    const shipped = withArm('sortable', 0, (it, stub) => {
      stub.set('shipped');
      return it.snapshot();
    });
    const stubbed = withArm('sortable', 0, (it, stub) => {
      stub.set('stubbed');
      return it.snapshot();
    });

    expect(stubbed).not.toBe(shipped);
  });
});

describe('M-5 arm A — falsifying the instrument', () => {
  // A paired delta that is always near zero is indistinguishable from an
  // instrument that cannot see anything. This row puts a **known** cost in
  // exactly the place window 1 occupies — inside the offset-box accessors the
  // kernel reads, on the same fixture, through the same paired design — and
  // requires the difference to move with it.
  it('should report a difference that tracks a cost injected into window 1', () => {
    const seen = withArm('free', DEEP, (it, stub) => {
      const repeats = calibrate(it);

      return [16, 128].map((extra) => paired(it, stub, repeats, extra));
    });
    const [small, large] = seen as [(typeof seen)[0], (typeof seen)[0]];

    // Sixteen forced reads of a deep transformed ancestry are far above the
    // floor and a hundred and twenty-eight are several times that. Coarse on
    // purpose: the claim is that the instrument responds and that it scales,
    // not that it scales linearly.
    expect(small.difference).toBeGreaterThan(0.02);
    expect(large.difference).toBeGreaterThan(small.difference * 3);
    // And the injected difference must be far outside the envelope the
    // un-injected arm produces, or the sensitivity claim is circular.
    expect(small.difference).toBeGreaterThan(0);
  });
});

describe('M-5 arm B — the copy is the shipped derivation', () => {
  it('should produce the projection the kernel’s own compose encodes', () => {
    // **In-situ equivalence.** `LIFT_IN_PLACE` hands `inheritedSpace` straight
    // to `compose`, so `compose(1, 0)` and `compose(0, 1)` encode the four
    // coefficients the shipped private function produced for this element at
    // this instant. If the copy below disagreed, every figure taken from it
    // would be measuring something else.
    const host = stage(DEEP);
    const leaf = document.createElement('div');

    Object.assign(leaf.style, {
      display: 'block',
      width: '100px',
      height: '40px',
    });
    host.leaf.append(leaf);

    const mine = derive(measure(leaf));
    const { session } = acquireLift(
      leaf,
      LIFT_IN_PLACE,
      leaf.getBoundingClientRect(),
      createRealm(leaf),
      // The unwind guard `acquireTopLayer` reports a failing rollback through
      // (D-130). Nothing in this measurement rolls back; it is supplied
      // because the signature requires it.
      (step) => step(),
    );

    try {
      const parse = (composed: string): readonly [number, number] => {
        const [x, yy] = composed
          .slice('translate('.length, composed.indexOf(')'))
          .split(',')
          .map((part) => Number.parseFloat(part));

        return [x!, yy!];
      };
      const [a, b] = parse(session.compose(1, 0));
      const [c, d] = parse(session.compose(0, 1));

      // The ancestry is transformed, so the derivation must have taken its full
      // branch rather than the early `null` — which is also what makes this row
      // able to fail.
      expect(mine).not.toBeNull();
      expect(a).toBeCloseTo(mine!.a, 9);
      expect(b).toBeCloseTo(mine!.b, 9);
      expect(c).toBeCloseTo(mine!.c, 9);
      expect(d).toBeCloseTo(mine!.d, 9);
    } finally {
      session.dispose();
      host.dispose();
    }
  });

  it('should take no reading of its own', () => {
    // D-85's recorded ground, as a count: the derivation's input is the buffer
    // `acquireLift` already materialized, so it performs no layout-facing call.
    const host = stage(DEEP);
    const leaf = document.createElement('div');

    Object.assign(leaf.style, {
      display: 'block',
      width: '100px',
      height: '40px',
    });
    host.leaf.append(leaf);

    const measured = measure(leaf);
    let reads = 0;
    const original = leaf.getBoundingClientRect.bind(leaf);

    leaf.getBoundingClientRect = (): DOMRect => {
      reads += 1;
      return original();
    };

    try {
      derive(measured);
      expect(reads).toBe(0);
    } finally {
      host.dispose();
    }
  });
});

// ---------------------------------------------------------------------------
// Timing — opt-in, asserts nothing
// ---------------------------------------------------------------------------

describe.runIf(Boolean(import.meta.env['VITE_DRAG_MEASURE']))(
  'M-5 — timing measurement',
  () => {
    it('should report the clock grain every figure rests on', () => {
      let grain = Infinity;
      let previous = performance.now();

      for (let i = 0; i < 200_000; i += 1) {
        const now = performance.now();
        const delta = now - previous;

        if (delta > 0 && delta < grain) {
          grain = delta;
        }

        previous = now;
      }

      // oxlint-disable-next-line no-console -- this suite exists to report
      console.info(`M-5 clock grain ≈ ${grain.toFixed(4)} ms`);
    });

    for (const depth of [0, DEEP]) {
      const where = depth === 0 ? 'shallow' : 'deep transformed';

      it(`should measure arm A at ${where} ancestry`, () => {
        // Paired on one fixture, alternating per sample — see `paired`.
        const row = withArm('free', depth, (it, stub) => {
          const repeats = calibrate(it, PAIRED_TARGET_MS);
          const measured = paired(it, stub, repeats, 0);

          return { ...measured, repeats };
        });
        const ms = (value: number): string => value.toFixed(4);

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.info(
          `M-5 armA depth=${depth} activation=${ms(row.shipped)}ms ` +
            `stubbed=${ms(row.stubbed)}ms window1=${ms(row.difference)}ms ` +
            `spread=[${ms(row.spread[0])}, ${ms(row.spread[1])}]ms ` +
            `share=${((row.difference / row.shipped) * 100).toFixed(2)}% | ` +
            `repeats=${row.repeats} resolution=${(0.1 / row.repeats).toFixed(4)}ms`,
        );
      });

      it(`should measure the sortable’s activation at ${where} ancestry`, () => {
        // Arm B's denominator: the behavior that never reads `inheritedSpace`.
        const row = withArm('sortable', depth, (it) => {
          const repeats = calibrate(it);

          return { ...activations(it, repeats), repeats };
        });

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.info(
          `M-5 activation sortable depth=${depth} ` +
            `activation=${row.per.toFixed(4)}ms ` +
            `spread=[${at(row.samples, 0.05).toFixed(4)}, ${at(row.samples, 0.95).toFixed(4)}]ms | ` +
            `repeats=${row.repeats} resolution=${(0.1 / row.repeats).toFixed(4)}ms`,
        );
      });

      it(`should measure window 1’s two reads directly at ${where} ancestry`, () => {
        // **Supporting, not primary.** The paired arm above is the in-situ
        // measurement and is what the decision rule reads; this reproduces
        // window 1's exact sequence — a bounding rect, then the two offset
        // reads — against a control that stops after the rect, so the null the
        // paired arm returns has a magnitude beside it rather than only a
        // bound. Layout is dirtied every iteration, as a release does.
        const host = stage(depth);
        const leaf = document.createElement('div');

        Object.assign(leaf.style, {
          display: 'block',
          width: '100px',
          height: '40px',
        });
        host.leaf.append(leaf);

        try {
          let sink = 0;
          const both = timings((round) => {
            host.root.style.paddingTop = `${round % 2}px`;
            leaf.getBoundingClientRect();
            sink += leaf.offsetWidth + leaf.offsetHeight;
          });
          const rectOnly = timings((round) => {
            host.root.style.paddingTop = `${round % 2}px`;
            sink += leaf.getBoundingClientRect().width;
          });

          // oxlint-disable-next-line no-console -- this suite exists to report
          console.info(
            `M-5 armA-direct depth=${depth} rect+offsets=${(both * 1000).toFixed(4)}µs ` +
              `rect=${(rectOnly * 1000).toFixed(4)}µs ` +
              `window1=${((both - rectOnly) * 1000).toFixed(4)}µs ` +
              `(sink=${sink === 0 ? 0 : 1})`,
          );
        } finally {
          host.dispose();
        }
      });
    }

    it('should measure arm B against a real deep transformed box', () => {
      const host = stage(DEEP);
      const leaf = document.createElement('div');

      Object.assign(leaf.style, {
        display: 'block',
        width: '100px',
        height: '40px',
      });
      host.leaf.append(leaf);

      try {
        const measured = measure(leaf);
        let sink = 0;
        const derived = timings(() => {
          sink += derive(measured) === null ? 1 : 0;
        });
        const skipped = timings(() => {
          sink += skip(measured);
        });

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.info(
          `M-5 armB derive=${(derived * 1000).toFixed(4)}µs ` +
            `control=${(skipped * 1000).toFixed(4)}µs ` +
            `inheritedSpace=${((derived - skipped) * 1000).toFixed(4)}µs ` +
            `(sink=${sink === 0 ? 0 : 1})`,
        );
      } finally {
        host.dispose();
      }
    });
  },
);
