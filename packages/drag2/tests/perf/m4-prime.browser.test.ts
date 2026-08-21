/**
 * M-4′ — the committed-move bracket, in its eager position.
 *
 * q7 answered _no shared read phase_ against four **synthetic** layout shapes,
 * on a tree where the axis index rebuilt lazily on the next spatial frame.
 * Phase 11's own answer 1 then made the rebuild eager and interior to the
 * bracket, and C4-03 recorded that the measurements were not re-run. This file
 * measures the **real** bracket, driven through the public composition:
 *
 * ```
 * beforeMove  span read + offset release
 *   ↓ placeholder write
 * rebuild     full-candidate index rebuild
 *   ↓
 * afterMove   second span read + animate
 * ```
 *
 * **The observable is a read count placed relative to the write, and it is not
 * a forced-layout count** (D-96). A forced layout is a read that follows a
 * write, and an in-page harness cannot see one: the two numbers differ by
 * exactly the interleaving this measurement exists to characterise. What is
 * recorded instead is the counter's value at each of the bracket's boundaries,
 * which puts every read on one side or the other of the placeholder write.
 *
 * **Reads are counted per element, never on `Element.prototype`.** The
 * prototype is shared with every other browser-mode file in the same page, so
 * a prototype patch would count the suite instead of the bracket. Only the
 * fixture's own rows and its placeholder are instrumented, which is the whole
 * set the bracket touches.
 *
 * The structural rows — the read placement, its falsification and the
 * instrument pins — run in CI on every suite run. The timings are opt-in with
 * `VITE_DRAG_MEASURE=1` and assert nothing.
 *
 * **P-06 landed under this harness, and the harness is the instrument for it**
 * (D-100 §6). Two things follow. The structural rows below now state the *new*
 * read placement — four witnesses where there were `n − 1` candidates — with
 * the general path pinned beside each one, so the before and the after are both
 * in the file rather than one of them in a record. And the whole file runs with
 * the equivalence instrument switched off: it performs the very full scan these
 * counts exist to detect, it is `DEV`-only, and it exists in no build a consumer
 * can install — measuring it would report a number that describes nothing that
 * ships.
 *
 * **Run this file alone.** The browser project runs files in parallel and a
 * neighbour inflates every absolute figure; and per the Phase 21 operational
 * rule, **every arm disposes before the next is built** — a live controller
 * listens on the document, so an undisposed predecessor commits a second
 * bracket per sample and each arm measures the sum of itself and everything
 * before it.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SortableConfig } from '../../src/sortable/config.ts';
import type {
  AxisInstaller,
  SortableInstaller,
} from '../../src/sortable/feature.ts';
import { layoutAnimation } from '../../src/sortable/layout-animation.ts';
import {
  RESYNC_INTERVAL,
  setRefreshVerification,
} from '../../src/sortable/rect-index.ts';
import type { InsertionRuntimeView } from '../../src/sortable/slots.ts';
import { xy } from '../../src/sortable/xy.ts';
import { y } from '../../src/sortable/y.ts';
import { ReorderResolution, sortable } from '../../src/sortable.ts';

const ITEM_HEIGHT = 40;
const POINTER_ID = 41;
/** q7's policy, unchanged. */
const WARMUP = 5;
const SAMPLES = 21;
const TARGET_SAMPLE_MS = 2;
/**
 * The grabbed row and the two slots the placeholder oscillates between.
 *
 * They are **adjacent** on purpose. The placeholder starts in the grabbed
 * row's slot, so a distant oscillation would open with one long move whose
 * displaced rows stay in `layoutAnimation()`'s in-flight set for the rest of
 * the run — the whole batch runs inside one frame, so no animation ever
 * progresses and the span set never drains back to the move's own width. A
 * one-slot oscillation next to the grab is q7's workload and keeps the
 * displacement arm honest.
 */
const GRAB_ROW = 4;
const LOW_SLOT = 5;
const HIGH_SLOT = 6;

// ---------------------------------------------------------------------------
// The probe
// ---------------------------------------------------------------------------

/**
 * One accumulator per bracket segment, in bracket order.
 *
 * `resolve` is outside the bracket and is carried because P-03 lives there: the
 * placeholder read `y()`/`xy()` take on every resolve, including a resolve that
 * finds the index clean.
 */
type Tally = {
  resolve: number;
  span: number;
  write: number;
  rebuild: number;
  after: number;
  bracket: number;
};

const emptyTally = (): Tally => ({
  resolve: 0,
  span: 0,
  write: 0,
  rebuild: 0,
  after: 0,
  bracket: 0,
});

type Probe = Readonly<{
  time: Tally;
  reads: Tally;
  /** Committed moves seen — the denominator for every per-move figure. */
  brackets(): number;
  /** Live read counter, incremented by the patched elements. */
  bump(): void;
  reset(): void;
  /** Marks, in the order the bracket calls them. */
  resolveIn(): void;
  resolveOut(): void;
  enter(): void;
  afterSpan(): void;
  afterWrite(): void;
  afterRebuild(): void;
  exit(): void;
  inBracket(): boolean;
}>;

function createProbe(): Probe {
  const time = emptyTally();
  const reads = emptyTally();
  let counter = 0;
  let moves = 0;
  let inside = false;
  let mark = 0;
  let markReads = 0;
  let bracketStart = 0;
  let bracketReads = 0;

  const take = (field: keyof Tally): void => {
    const now = performance.now();

    time[field] += now - mark;
    reads[field] += counter - markReads;
    mark = now;
    markReads = counter;
  };

  return {
    time,
    reads,
    brackets: () => moves,
    bump: (): void => {
      counter += 1;
    },
    reset: (): void => {
      for (const field of Object.keys(time) as Array<keyof Tally>) {
        time[field] = 0;
        reads[field] = 0;
      }

      moves = 0;
    },
    resolveIn: (): void => {
      mark = performance.now();
      markReads = counter;
    },
    resolveOut: (): void => {
      take('resolve');
    },
    enter: (): void => {
      moves += 1;
      inside = true;
      mark = performance.now();
      markReads = counter;
      bracketStart = mark;
      bracketReads = counter;
    },
    afterSpan: (): void => {
      take('span');
    },
    afterWrite: (): void => {
      take('write');
    },
    afterRebuild: (): void => {
      take('rebuild');
    },
    exit: (): void => {
      take('after');
      inside = false;
      time.bracket += performance.now() - bracketStart;
      reads.bracket += counter - bracketReads;
    },
    inBracket: () => inside,
  };
}

/**
 * The axis installer, wrapped so the bracket's interior boundaries are
 * observable without a hook of their own.
 *
 * `invalidate()` is the mark for **after the placeholder write**: the bracket
 * calls it on the statement immediately following `movePlaceholder`, and it is
 * the only call between the write and the rebuild. It is also called by scroll,
 * resize and collection publication, so the mark is gated on being inside a
 * bracket — otherwise a scroll during a measured run would credit the write
 * segment with time that is not the write's.
 *
 * **`general` is P-06's control arm, and it is deliberately not a second copy
 * of the rule** (D-100 §6). `y()`'s entire opt-in is the destination gap it
 * reads off the per-operation view and hands to `refresh`; withholding it here
 * puts the *shipped* `y()`, the shipped cache and the shipped resolve loop on
 * the general path, so the two arms differ by one argument rather than by a
 * transcription. The spread allocates one small object per committed move,
 * which lands in the rebuild segment of the arm that is already the expensive
 * one.
 */
const instrument =
  (inner: AxisInstaller, probe: Probe, general = false): AxisInstaller =>
  (context) => {
    const contribution = inner(context);
    const geometry = contribution.insertion;

    return {
      insertion: {
        resolve(frame, runtime) {
          probe.resolveIn();

          try {
            return geometry.resolve(frame, runtime);
          } finally {
            probe.resolveOut();
          }
        },

        invalidate(): void {
          if (probe.inBracket()) {
            probe.afterWrite();
          }

          geometry.invalidate();
        },

        measure(frame, runtime): void {
          geometry.measure?.(
            frame,
            general ? { ...runtime, insertion: null } : runtime,
          );

          if (probe.inBracket()) {
            probe.afterRebuild();
          }
        },

        retire: geometry.retire,
      },
    };
  };

/**
 * The two bracket-boundary hooks, as ordinary plugins.
 *
 * Plugins install in fragment order (`config.ts` — `plugins` concatenates), so
 * composing `head` before `layoutAnimation()` and `tail` after it puts one hook
 * on each side of the displacement feature's pair. `extra` exists for the
 * falsifier: it reads that many rects inside the hook, so a read the harness
 * did not write must land in the segment that ran it.
 */
const boundary = (
  probe: Probe,
  side: 'head' | 'tail',
  extra?: Readonly<{ before: number; after: number; rows: HTMLElement[] }>,
): Pick<SortableConfig, 'plugins'> => {
  const install: SortableInstaller = () => ({
    beforeInsertionMove: (): void => {
      // The mark comes first on the head hook: it *is* the bracket entry, so a
      // read injected before it would be attributed to nothing. On the tail
      // hook the mark closes the span segment, so an injected read belongs
      // before it.
      if (side === 'head') {
        probe.enter();
      }

      if (extra) {
        for (let i = 0; i < extra.before; i += 1) {
          extra.rows[i]!.getBoundingClientRect();
        }
      }

      if (side === 'tail') {
        probe.afterSpan();
      }
    },
    afterInsertionMove: (): void => {
      if (extra) {
        for (let i = 0; i < extra.after; i += 1) {
          extra.rows[i]!.getBoundingClientRect();
        }
      }

      if (side === 'tail') {
        probe.exit();
      }
    },
  });

  return { plugins: [install] };
};

// ---------------------------------------------------------------------------
// The fixture
// ---------------------------------------------------------------------------

type Arm = Readonly<{
  probe: Probe;
  rows: readonly HTMLElement[];
  /** One committed move; throws if the composition did not commit one. */
  step(round: number): void;
  /** Paced arms only: dispatches the sample and lets a real frame run it. */
  paced(round: number): Promise<void>;
  /**
   * A paced sample that **cannot** commit: the pointer jitters by a pixel
   * inside the slot the placeholder already holds, so the axis rule resolves
   * and proposes nothing. This is P-03's case — a clean resolve — and it is the
   * frame a drag spends most of its life in.
   */
  idle(round: number): Promise<void>;
  dispose(): void;
}>;

type ArmOptions = Readonly<{
  n: number;
  axis: AxisInstaller;
  animate: boolean;
  /** Falsifier reads injected into the two displacement hooks. */
  extra?: Readonly<{ before: number; after: number }>;
  /**
   * Leave the frame task on the real `requestAnimationFrame`, so one committed
   * move costs one **real** frame and the browser flushes style and layout
   * between them. The batched driver cannot do that, and the difference shows
   * up in exactly one segment; see the paced arm in the timing section.
   */
  paced?: boolean;
  /**
   * Withhold the committed gap from `measure`, so `y()` takes the full rebuild
   * it took before P-06. The "before" arm of the paired comparison.
   */
  general?: boolean;
}>;

const cleanup: Array<() => void> = [];

// See the file header: the P-06 equivalence instrument is a full scan, and a
// full scan is exactly what these counts are trying to tell apart. Restored
// after every row, so nothing this file does can leave it off for a suite that
// depends on it.
beforeEach(() => {
  setRefreshVerification(false);
});

afterEach(() => {
  setRefreshVerification(true);

  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

/** Counts `getBoundingClientRect` on one element, per element (never on the prototype). */
const count = (element: HTMLElement, probe: Probe): (() => void) => {
  const original = element.getBoundingClientRect.bind(element);

  element.getBoundingClientRect = (): DOMRect => {
    probe.bump();
    return original();
  };

  return (): void => {
    delete (element as Partial<HTMLElement>).getBoundingClientRect;
  };
};

const pointer = (type: string, clientY: number): void => {
  document.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      clientX: 150,
      clientY,
    }),
  );
};

function build(options: ArmOptions): Arm {
  const { n, axis, animate, extra } = options;
  const probe = createProbe();

  const root = document.createElement('div');

  Object.assign(root.style, {
    width: '300px',
    height: '400px',
    overflow: 'auto',
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
      height: `${ITEM_HEIGHT}px`,
      contain: 'none',
    });
    row.textContent = `row ${i}`;
    root.append(row);
    rows.push(row);
  }

  root.setPointerCapture = (): void => {};
  root.releasePointerCapture = (): void => {};

  const injected = extra ? { ...extra, rows } : undefined;
  const fragments: Array<Pick<SortableConfig, 'plugins'>> = [
    boundary(probe, 'head', injected),
  ];

  if (animate) {
    fragments.push(layoutAnimation());
  }

  fragments.push(boundary(probe, 'tail'));

  const controller = sortable(
    root,
    {
      items: () => rows,
      axis: instrument(axis, probe, options.general ?? false),
      onReorder: () => ReorderResolution.accept(),
    },
    ...fragments,
  );

  /**
   * The spatial frame, driven on demand.
   *
   * The behavior coalesces the spatial search into one `requestAnimationFrame`
   * task, so a committed move per iteration would otherwise cost a real frame
   * and the calibrated batch q7's policy requires could not exist. The captured
   * callback is the **same** callback the browser would run, invoked from the
   * harness instead of from the frame — the bracket, its hooks and its reads
   * are untouched.
   */
  const queued: FrameRequestCallback[] = [];
  const realRequest = window.requestAnimationFrame.bind(window);
  const realCancel = window.cancelAnimationFrame.bind(window);
  const paced = options.paced === true;

  if (!paced) {
    window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      queued.push(callback);
      return queued.length;
    };
    window.cancelAnimationFrame = (): void => {};
  }

  const drain = (): void => {
    for (let guard = 0; guard < 8 && queued.length > 0; guard += 1) {
      for (const callback of queued.splice(0)) {
        callback(performance.now());
      }
    }
  };

  /** One real animation frame — the paced arm's clock. */
  const frame = async (): Promise<void> => {
    await new Promise<void>((settle) => {
      realRequest(() => {
        settle();
      });
    });
  };

  // Activation on a middle row: the dragged row keeps its DOM position for the
  // whole drag, so a span that reaches it exists only when the destination gap
  // is above it — which cannot happen when row 0 is the one being dragged.
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
      clientY: GRAB_ROW * ITEM_HEIGHT + 10,
    }),
  );
  pointer('pointermove', GRAB_ROW * ITEM_HEIGHT + 30);
  drain();

  const placeholder = root.querySelector<HTMLElement>(
    '[data-drag-placeholder]',
  );

  if (placeholder === null) {
    throw new Error('m4-prime: the fixture did not activate');
  }

  const restore = [
    ...rows.map((row) => count(row, probe)),
    count(placeholder, probe),
  ];

  const arm: Arm = {
    probe,
    rows,
    step: (round): void => {
      const slot = round % 2 === 0 ? LOW_SLOT : HIGH_SLOT;
      const seen = probe.brackets();

      pointer('pointermove', slot * ITEM_HEIGHT + ITEM_HEIGHT / 2);
      drain();

      if (probe.brackets() !== seen + 1) {
        throw new Error(
          `m4-prime: the sample committed ${probe.brackets() - seen} moves, not one`,
        );
      }
    },
    paced: async (round): Promise<void> => {
      pointer(
        'pointermove',
        (round % 2 === 0 ? LOW_SLOT : HIGH_SLOT) * ITEM_HEIGHT +
          ITEM_HEIGHT / 2,
      );
      // Two frames: the first runs the coalesced spatial task and the bracket,
      // the second is the presentation the batched driver never gives it.
      await frame();
      await frame();
    },
    idle: async (round): Promise<void> => {
      pointer(
        'pointermove',
        LOW_SLOT * ITEM_HEIGHT + ITEM_HEIGHT / 2 + (round % 2),
      );
      await frame();
      await frame();
    },
    dispose: (): void => {
      for (const undo of restore) {
        undo();
      }

      if (!paced) {
        window.requestAnimationFrame = realRequest;
        window.cancelAnimationFrame = realCancel;
      }
      void controller.destroy();
      root.remove();
    },
  };

  cleanup.push(arm.dispose);
  return arm;
}

/** Builds an arm, runs `body`, and disposes before returning — the paired-arm rule. */
function withArm<T>(options: ArmOptions, body: (arm: Arm) => T): T {
  const arm = build(options);

  try {
    return body(arm);
  } finally {
    arm.dispose();
    cleanup.splice(cleanup.indexOf(arm.dispose), 1);
  }
}

/**
 * The read tally of the **first** committed move of an operation.
 *
 * P-06's fast path has no previous gap to propose a span from on the first
 * move, so this is the general path — the rebuild exactly as M-4′ measured it,
 * still reachable and still asserted, beside every row that now states the
 * verified path's count.
 */
const readsOfFirstMove = (options: ArmOptions): Tally =>
  withArm(options, (arm) => {
    arm.probe.reset();
    arm.step(0);
    return { ...arm.probe.reads };
  });

/** The read tally of exactly one committed move. */
const readsOfOneMove = (options: ArmOptions): Tally =>
  withArm(options, (arm) => {
    // Settled, not first. The first committed move of an operation jumps from
    // the grabbed row's slot to wherever the pointer is, and the rows it
    // displaces are still in flight on the move after it —
    // `layoutAnimation()`'s affected set is the crossed span **plus** anything
    // still carrying an offset, by design. Four steps put the oscillation in
    // the steady state a drag spends its life in.
    for (let i = 0; i < 4; i += 1) {
      arm.step(i);
    }

    arm.probe.reset();
    arm.step(4);
    return { ...arm.probe.reads };
  });

/**
 * Runs `run(0..count-1)` **strictly in order**, as a promise chain rather than
 * as an awaited loop.
 *
 * The paced arms need one sample per real frame, so concurrency would collapse
 * the whole run into one frame — the exact regime those arms exist to be the
 * alternative to. A chain says that in a shape the lint rule against awaiting
 * in a loop has no quarrel with.
 */
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

// ---------------------------------------------------------------------------
// P-02 — the rebuild's contents, as a real alternative composition
// ---------------------------------------------------------------------------

/**
 * `y()`'s rule against a **stride-1** cache: one centre per destination slot
 * instead of `[left, top, right, bottom, centreX, centreY]`.
 *
 * This is P-02's proposal built as a composition rather than as a synthetic
 * loop, for M-1's reason: a specialization is only evidence if the general path
 * and the specialized one commit the same thing, and that is checkable here —
 * both are axis features, both are driven by the same script, and the sequence
 * of slots they commit must be identical. It is a **measurement instrument, not
 * a proposal**; nothing in `src/` changes in this handoff.
 *
 * Everything else is `y()` line for line, including the I-36 barriers, so the
 * difference between the two arms is the stride and nothing else.
 */
function narrow(): AxisInstaller {
  return () => {
    let centres = new Float64Array(0);
    const items: HTMLElement[] = [];
    let count = 0;
    let dirty = true;
    let measured = -1;

    const retire = (): void => {
      items.length = 0;
      count = 0;
      dirty = true;
      measured = -1;
    };

    const refresh = (
      snapshot: InsertionRuntimeView['snapshot'],
      dragged: HTMLElement,
      getBox: InsertionRuntimeView['getBox'],
      live: () => boolean,
    ): boolean => {
      if (!dirty && measured === snapshot.version) {
        return true;
      }

      if (!live()) {
        retire();
        return false;
      }

      const list = snapshot.items;

      if (list.length > centres.length) {
        centres = new Float64Array(list.length);
      }

      let n = 0;

      for (const item of list) {
        if (item === dragged) {
          continue;
        }

        let box = item;

        if (getBox !== null) {
          box = getBox(item);

          if (!live()) {
            retire();
            return false;
          }
        }

        const rect = box.getBoundingClientRect();

        if (!live()) {
          retire();
          return false;
        }

        centres[n] = (rect.top + rect.bottom) * 0.5;
        items[n] = item;
        n += 1;
      }

      count = n;
      items.length = n;
      measured = snapshot.version;
      dirty = false;
      return true;
    };

    return {
      insertion: {
        resolve(frame, runtime) {
          const dragged = frame.item;

          if (dragged === null) {
            return null;
          }

          const { snapshot, placeholder } = runtime;

          if (!refresh(snapshot, dragged, runtime.getBox, runtime.live)) {
            return null;
          }

          const box = placeholder.getBoundingClientRect();
          const anchor = (box.top + box.bottom) * 0.5;
          const { pointerY } = frame;
          let best = Math.abs(pointerY - anchor);
          let nearest = -1;

          for (let i = 0; i < count; i += 1) {
            const distance = Math.abs(pointerY - centres[i]!);

            if (distance < best) {
              best = distance;
              nearest = i;
            }
          }

          if (nearest === -1) {
            return null;
          }

          const gap = centres[nearest]! > anchor ? nearest + 1 : nearest;

          return {
            version: snapshot.version,
            index: gap,
            before: items[gap - 1] ?? null,
            after: items[gap] ?? null,
          };
        },

        invalidate(): void {
          dirty = true;
        },

        measure(frame, runtime): void {
          const dragged = frame.item;

          if (dragged !== null) {
            refresh(runtime.snapshot, dragged, runtime.getBox, runtime.live);
          }
        },

        retire,
      },
    };
  };
}

/** The slot the placeholder occupies after each step — the equivalence subject. */
const slotTrace = (options: ArmOptions, steps: number): readonly number[] =>
  withArm(options, (arm) => {
    const root = arm.rows[0]!.parentElement!;
    const trace: number[] = [];

    for (let i = 0; i < steps; i += 1) {
      arm.step(i);
      trace.push(
        [...root.children].findIndex((child) =>
          child.hasAttribute('data-drag-placeholder'),
        ),
      );
    }

    return trace;
  });

// ---------------------------------------------------------------------------
// Structural — the read placement, and the instrument that produced it
// ---------------------------------------------------------------------------

const N = 200;

describe('M-4′ — where the committed move reads, relative to the write', () => {
  it('should read every remaining candidate on the first move of an operation', () => {
    // The eager rebuild, as a count: the destination view is the collection
    // minus the dragged item, and every one of those is measured — on the far
    // side of the write, which is the placement the eager position exists for.
    // **This is the number M-4′ measured**, and P-06 did not remove it: it is
    // still what the first move of every operation pays.
    const reads = readsOfFirstMove({ n: N, axis: y(), animate: true });

    expect(reads.rebuild).toBe(N - 1);
  });

  it('should read four witnesses after the placeholder write in the steady state', () => {
    // P-06, as a count, in the same segment and the same window. The rebuild
    // did not move, get deferred or get skipped — it got smaller, and the
    // permanent equivalence instrument (switched off here, and only here) is
    // what holds the smaller one to the larger one's answer.
    const reads = readsOfOneMove({ n: N, axis: y(), animate: true });

    expect(reads.rebuild).toBe(4);
  });

  it('should read only the span before the placeholder write', () => {
    // M-4's answer, still holding on the real bracket: `layoutAnimation()`
    // measures the rows the move crosses, not the destination view.
    //
    // **Held against the general rebuild, and that is now the only way to state
    // it.** Before P-06 the span was under a tenth of the rebuild in the same
    // bracket; after it, the rebuild in the steady state is four reads and the
    // span is two, so the ratio the claim was written as would now be asserting
    // the opposite of what it means. The quantity it is about — the span is a
    // property of the *move* and not of the list — is unchanged, and the
    // collection-sized rebuild is what it has to be compared against.
    const first = readsOfFirstMove({ n: N, axis: y(), animate: true });
    const reads = readsOfOneMove({ n: N, axis: y(), animate: true });

    expect(reads.span).toBeLessThan(first.rebuild / 10);
    expect(reads.span).toBeGreaterThan(0);
  });

  it('should read nothing while the placeholder is written', () => {
    const reads = readsOfOneMove({ n: N, axis: y(), animate: true });

    expect(reads.write).toBe(0);
  });

  it('should read the same span again after the rebuild', () => {
    // The FLIP bracket's second pass, and the reason the rebuild sits between
    // them rather than after them.
    const reads = readsOfOneMove({ n: N, axis: y(), animate: true });

    expect(reads.after).toBe(reads.span);
  });

  it('should leave only the rebuild when the displacement feature is absent', () => {
    // The control the contract asks for: without `layoutAnimation()` the span
    // read and the offset release are gone, and what is left in the bracket is
    // the rebuild alone.
    const first = readsOfFirstMove({ n: N, axis: y(), animate: false });
    const reads = readsOfOneMove({ n: N, axis: y(), animate: false });

    expect(reads.span).toBe(0);
    expect(reads.after).toBe(0);
    expect(first.rebuild).toBe(N - 1);
    expect(reads.rebuild).toBe(4);
  });

  it('should rebuild the same candidate set under the two-dimensional rule', () => {
    // `xy()` as a separate composition, never as a combined axis configuration
    // — exactly one axis feature installs, which is what withdrew M-4's
    // original "two axis features" obligation.
    const reads = readsOfOneMove({ n: N, axis: xy(), animate: true });

    expect(reads.rebuild).toBe(N - 1);
  });

  it('should scale the general rebuild with the collection rather than with the move', () => {
    // A constant would pass every row above; this one cannot be satisfied by a
    // counter that reports a fixed shape.
    const small = readsOfFirstMove({ n: 50, axis: y(), animate: true });
    const large = readsOfFirstMove({ n: N, axis: y(), animate: true });

    expect(small.rebuild).toBe(49);
    expect(large.rebuild).toBe(N - 1);
    // The other half of the same claim, and the one M-4 answered: the span the
    // displacement feature reads is a property of the **move**, so a list four
    // times as long does not widen it.
    expect(large.span).toBe(small.span);
    expect(large.after).toBe(small.after);
  });

  it('should not scale the verified rebuild with the collection at all', () => {
    // **The P-06 result, stated as the negation of the row above it.** The
    // witness count is a property of the span's endpoints, so a list four times
    // as long costs the same four reads — which is the claim the paired timing
    // arms then put a number on.
    const small = readsOfOneMove({ n: 50, axis: y(), animate: true });
    const large = readsOfOneMove({ n: N, axis: y(), animate: true });

    expect(small.rebuild).toBe(4);
    expect(large.rebuild).toBe(small.rebuild);
  });

  it('should read the placeholder once per resolve on a clean index', () => {
    // P-03, as a count. The eager rebuild leaves the index clean, so the next
    // resolve measures nothing but the incumbent — one read, and it is the
    // whole of the clean-resolve cost.
    const reads = readsOfOneMove({ n: N, axis: y(), animate: true });

    expect(reads.resolve).toBe(1);
  });
});

describe('M-4′ — the stride-1 rebuild is the same rule', () => {
  // **Asserted before any ratio is quoted** (the standard's equivalence check).
  // A cheaper rebuild is only a cheaper rebuild if it commits the same moves;
  // a stride that changed the answer would be a different feature, and its
  // timing would be measuring that difference.
  const STEPS = 12;

  it('should commit the slots the six-scalar rebuild commits', () => {
    const packed = slotTrace({ n: N, axis: y(), animate: false }, STEPS);
    const single = slotTrace({ n: N, axis: narrow(), animate: false }, STEPS);

    expect(single).toEqual(packed);
    // A trace that never moved would satisfy the line above trivially.
    expect(new Set(packed).size).toBe(2);
  });

  it('should commit the same slots with the displacement feature composed', () => {
    const packed = slotTrace({ n: N, axis: y(), animate: true }, STEPS);
    const single = slotTrace({ n: N, axis: narrow(), animate: true }, STEPS);

    expect(single).toEqual(packed);
  });

  it('should read exactly the candidates the six-scalar rebuild reads', () => {
    // The stride is the only difference: the same reads, in the same segment.
    //
    // **Compared on the first move**, because P-06 opted `y()` into the
    // verified path and `narrow()` — a measurement instrument, not a shipped
    // rule — never passes a gap. On the steady-state move the two would differ
    // by the optimization rather than by the stride, which is the one thing
    // this row must not be measuring.
    const packed = readsOfFirstMove({ n: N, axis: y(), animate: true });
    const single = readsOfFirstMove({ n: N, axis: narrow(), animate: true });

    expect(single.rebuild).toBe(packed.rebuild);
    expect(single.resolve).toBe(packed.resolve);
  });
});

describe('M-4′ — the verified refresh is the same rule', () => {
  // **The same requirement, for the same reason** (D-100 §6). A cheaper
  // rebuild is only a cheaper rebuild if it commits the same moves, and the
  // run is twice the re-synchronisation interval so it crosses a forced full
  // scan rather than measuring only verified moves.
  const STEPS = 24;

  it('should commit the slots the general rebuild commits', () => {
    // **P-06's equivalence check at the rule level**, and the standard's
    // requirement before any ratio is quoted. The buffer instrument in
    // `rect-index.ts` holds the packed values to a full scan on every fast
    // path; this holds the *gaps the rule proposes* to what the same rule
    // proposes with the fast path withheld, over a run long enough to cross the
    // re-synchronisation interval twice.
    const verified = slotTrace({ n: N, axis: y(), animate: false }, STEPS);
    const general = slotTrace(
      { n: N, axis: y(), animate: false, general: true },
      STEPS,
    );

    expect(verified).toEqual(general);
    expect(new Set(general).size).toBe(2);
  });

  it('should commit the same slots with the displacement feature composed', () => {
    const verified = slotTrace({ n: N, axis: y(), animate: true }, STEPS);
    const general = slotTrace(
      { n: N, axis: y(), animate: true, general: true },
      STEPS,
    );

    expect(verified).toEqual(general);
  });

  it('should read four rows where the general rebuild reads the list', () => {
    const verified = readsOfOneMove({ n: N, axis: y(), animate: true });
    const general = readsOfOneMove({
      n: N,
      axis: y(),
      animate: true,
      general: true,
    });

    expect(general.rebuild).toBe(N - 1);
    expect(verified.rebuild).toBe(4);
    // Everything outside the rebuild is untouched: P-06 is a smaller rebuild in
    // the same window, not a re-timing and not a removal.
    expect(verified.span).toBe(general.span);
    expect(verified.write).toBe(general.write);
    expect(verified.after).toBe(general.after);
    expect(verified.resolve).toBe(general.resolve);
  });
});

describe('M-4′ — falsifying the read placement', () => {
  // The boundary pattern above is only evidence if a read placed somewhere else
  // shows up somewhere else. These two rows inject reads the library does not
  // make, into the two hooks that bracket the write, and require the counter to
  // attribute each to the segment that ran it — and to leave the others alone.
  const EXTRA = 7;

  it('should attribute an injected pre-write read to the span segment', () => {
    const plain = readsOfOneMove({ n: N, axis: y(), animate: true });
    const injected = readsOfOneMove({
      n: N,
      axis: y(),
      animate: true,
      extra: { before: EXTRA, after: 0 },
    });

    expect(injected.span).toBe(plain.span + EXTRA);
    expect(injected.rebuild).toBe(plain.rebuild);
    expect(injected.after).toBe(plain.after);
  });

  it('should attribute an injected post-rebuild read to the after segment', () => {
    const plain = readsOfOneMove({ n: N, axis: y(), animate: true });
    const injected = readsOfOneMove({
      n: N,
      axis: y(),
      animate: true,
      extra: { before: 0, after: EXTRA },
    });

    expect(injected.after).toBe(plain.after + EXTRA);
    expect(injected.span).toBe(plain.span);
    expect(injected.rebuild).toBe(plain.rebuild);
  });
});

describe('M-4′ — the instrument', () => {
  it('should drive one real committed move per sample', () => {
    // `step()` throws unless exactly one bracket ran, so this pins that the
    // driver is producing committed moves rather than inert frames — the case
    // `placeholderAt` returns early on, which reads nothing and would make
    // every count above trivially zero.
    withArm({ n: N, axis: y(), animate: true }, (arm) => {
      arm.probe.reset();

      for (let i = 0; i < 4; i += 1) {
        arm.step(i);
      }

      expect(arm.probe.brackets()).toBe(4);
    });
  });

  it('should actually move the placeholder between two slots', () => {
    // The counted brackets are real DOM moves, not hook calls: the placeholder
    // sits in a different slot after an odd step than after an even one.
    withArm({ n: N, axis: y(), animate: true }, (arm) => {
      const root = arm.rows[0]!.parentElement!;
      const slotOf = (): number =>
        [...root.children].findIndex((child) =>
          child.hasAttribute('data-drag-placeholder'),
        );

      arm.step(0);

      const low = slotOf();

      arm.step(1);

      expect(slotOf()).not.toBe(low);
    });
  });
});

// ---------------------------------------------------------------------------
// Timing — opt-in, asserts nothing
// ---------------------------------------------------------------------------

/**
 * q7's sampling policy over the real bracket.
 *
 * The per-segment figures are **accumulated across the batch and divided**,
 * not read off one bracket. `performance.now()` is clamped, so a single
 * segment's delta is quantized; summing over a calibrated batch telescopes the
 * quantization into the two ends of the batch and leaves each segment's share
 * with a resolution of the clock's grain divided by the repeat count.
 */
function sample(
  arm: Arm,
): Readonly<{ rows: readonly Tally[]; repeats: number }> {
  let round = 0;
  const batch = (repeats: number): number => {
    const started = performance.now();

    for (let i = 0; i < repeats; i += 1) {
      arm.step(round);
      round += 1;
    }

    return performance.now() - started;
  };

  for (let i = 0; i < WARMUP; i += 1) {
    arm.step(round);
    round += 1;
  }

  let repeats = 1;

  while (batch(repeats) < TARGET_SAMPLE_MS && repeats < 4096) {
    repeats *= 2;
  }

  const measured: Tally[] = [];

  for (let i = 0; i < SAMPLES; i += 1) {
    arm.probe.reset();
    batch(repeats);

    const { time } = arm.probe;
    const moves = arm.probe.brackets();

    measured.push({
      resolve: time.resolve / moves,
      span: time.span / moves,
      write: time.write / moves,
      rebuild: time.rebuild / moves,
      after: time.after / moves,
      bracket: time.bracket / moves,
    });
  }

  return { rows: measured, repeats };
}

const median = (values: readonly number[]): number =>
  values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)]!;

const medians = (measured: readonly Tally[]): Tally => ({
  resolve: median(measured.map((row) => row.resolve)),
  span: median(measured.map((row) => row.span)),
  write: median(measured.map((row) => row.write)),
  rebuild: median(measured.map((row) => row.rebuild)),
  after: median(measured.map((row) => row.after)),
  bracket: median(measured.map((row) => row.bracket)),
});

describe.runIf(Boolean(import.meta.env['VITE_DRAG_MEASURE']))(
  'M-4′ — timing measurement',
  () => {
    it('should report the clock grain the segment shares rest on', () => {
      // Every share below is a ratio of quantized deltas, so the grain is part
      // of the record rather than an assumption about the engine.
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
      console.info(`M-4′ clock grain ≈ ${grain.toFixed(4)} ms`);
    });

    for (const general of [false, true]) {
      for (const animate of [true, false]) {
        for (const n of [50, 200, 800]) {
          it(`should measure one committed move per real frame, ${general ? 'general' : 'verified'}, ${animate ? 'animated' : 'bare'}, at ${n} rows`, async () => {
            // **The regime check, and it is decision-driving for P-03 and for
            // P-06.** The verified/general pair is repeated here rather than
            // taken only from the batched arms above, because the two regimes
            // charge the rebuild for different things: batched, it pays for `n`
            // reads against a layout nothing flushed; paced, the first read of
            // the bracket is a forced layout after a real frame and the other
            // `n − 1` are nearly free. A saving that is a read count in one
            // regime is a flush count in the other, and only the paced pair says
            // what a deployed drag actually gets.** The
            // batched driver above runs a whole calibrated batch inside one
            // frame, so the browser never flushes style and layout between two
            // committed moves and every read after the first is charged for
            // everything the batch dirtied. Here one committed move costs one
            // real frame, which is what a drag actually does — and the segment
            // that moves between the two regimes is the one whose reading has to
            // be qualified.
            const FRAMES = 160;
            const WARM = 20;
            const arm = build({ n, axis: y(), animate, paced: true, general });

            try {
              await sequence(WARM, (round) => arm.paced(round));

              arm.probe.reset();

              await sequence(FRAMES, (round) => arm.paced(WARM + round));

              const moves = arm.probe.brackets();
              const { time } = arm.probe;
              const report = (value: number): string =>
                (value / moves).toFixed(4);

              // oxlint-disable-next-line no-console -- this suite exists to report
              console.info(
                `M-4′ paced ${general ? 'general' : 'verified'} ` +
                  `${animate ? 'animated' : 'bare'} n=${n} ` +
                  `moves=${moves}/${FRAMES} ` +
                  `bracket=${report(time.bracket)}ms ` +
                  `span=${report(time.span)}ms ` +
                  `rebuild=${report(time.rebuild)}ms ` +
                  `after=${report(time.after)}ms ` +
                  `resolve=${report(time.resolve)}ms | ` +
                  `resolution=${(0.1 / moves).toFixed(4)}ms`,
              );
            } finally {
              arm.dispose();
              cleanup.splice(cleanup.indexOf(arm.dispose), 1);
            }
          });
        }
      }
    }

    for (const animate of [true, false]) {
      for (const n of [50, 800]) {
        it(`should measure a frame that commits nothing, ${animate ? 'animated' : 'bare'}, at ${n} rows`, async () => {
          // **P-03's own case.** Most frames of a drag propose no new gap: the
          // index is clean, the scan runs over cached centres, and the only
          // geometry the axis rule touches is the incumbent placeholder's — one
          // read, on every frame, whether or not anything moves.
          const FRAMES = 160;
          const WARM = 20;
          const arm = build({ n, axis: y(), animate, paced: true });

          try {
            await sequence(WARM, (round) => arm.paced(round));

            // Settle onto the slot the idle sample sits in, then stop moving.
            await sequence(4, () => arm.idle(0));

            arm.probe.reset();

            await sequence(FRAMES, (round) => arm.idle(round));

            const { time } = arm.probe;

            // The whole point of the arm: nothing committed, so every
            // millisecond below is the cost of a frame that changed nothing.
            expect(arm.probe.brackets()).toBe(0);

            // oxlint-disable-next-line no-console -- this suite exists to report
            console.info(
              `M-4′ idle ${animate ? 'animated' : 'bare'} n=${n} ` +
                `frames=${FRAMES} ` +
                `resolve=${(time.resolve / FRAMES).toFixed(4)}ms | ` +
                `resolution=${(0.1 / FRAMES).toFixed(4)}ms`,
            );
          } finally {
            arm.dispose();
            cleanup.splice(cleanup.indexOf(arm.dispose), 1);
          }
        });
      }
    }

    for (const n of [50, 200, 800]) {
      it(`should measure the rebuild's contents at ${n} rows`, () => {
        // P-02's time half, as a paired comparison in one session: the same
        // rule, the same reads, six stores per candidate against one. The
        // arms are built and disposed one at a time.
        const packed = withArm({ n, axis: y(), animate: false }, (arm) =>
          sample(arm),
        );
        const single = withArm({ n, axis: narrow(), animate: false }, (arm) =>
          sample(arm),
        );
        const six = medians(packed.rows);
        const one = medians(single.rows);
        const report = (value: number): string => value.toFixed(3);

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.info(
          `M-4′ stride n=${n} ` +
            `rebuild six=${report(six.rebuild)}ms one=${report(one.rebuild)}ms ` +
            `ratio=${(one.rebuild / six.rebuild).toFixed(3)} | ` +
            `bracket six=${report(six.bracket)}ms one=${report(one.bracket)}ms | ` +
            `repeats=${packed.repeats}/${single.repeats} ` +
            `resolution=${(0.1 / packed.repeats).toFixed(4)}ms`,
        );
      });
    }

    for (const animate of [true, false]) {
      for (const n of [50, 200, 800]) {
        it(`should measure the verified refresh against the general one, ${animate ? 'animated' : 'bare'}, at ${n} rows`, () => {
          // **P-06's paired before/after** (D-100 §6), in one session, one arm
          // live at a time, and differing by exactly the one argument `y()`
          // hands to `refresh`.
          //
          // The verified arm's figure is the *average over the sampled moves*
          // and therefore already carries the re-synchronisation policy: one
          // move in `k` is a full rebuild, so the ceiling on the saving is
          // `k×`, and a ratio far above that would mean the sample never
          // crossed a forced scan.
          const verified = withArm({ n, axis: y(), animate }, (arm) =>
            sample(arm),
          );
          const general = withArm(
            { n, axis: y(), animate, general: true },
            (arm) => sample(arm),
          );
          const fast = medians(verified.rows);
          const full = medians(general.rows);
          const report = (value: number): string => value.toFixed(3);

          // oxlint-disable-next-line no-console -- this suite exists to report
          console.info(
            `M-4′/P-06 ${animate ? 'animated' : 'bare'} n=${n} ` +
              `rebuild general=${report(full.rebuild)}ms verified=${report(fast.rebuild)}ms ` +
              `ratio=${(full.rebuild / fast.rebuild).toFixed(2)}x | ` +
              `bracket general=${report(full.bracket)}ms verified=${report(fast.bracket)}ms ` +
              `ratio=${(full.bracket / fast.bracket).toFixed(2)}x | ` +
              `move general=${report(full.bracket + full.resolve)}ms ` +
              `verified=${report(fast.bracket + fast.resolve)}ms | ` +
              `k=${RESYNC_INTERVAL} repeats=${verified.repeats}/${general.repeats} ` +
              `resolution=${(0.1 / verified.repeats).toFixed(4)}ms`,
          );
        });
      }
    }

    for (const axis of ['y', 'xy'] as const) {
      for (const animate of [true, false]) {
        for (const n of [50, 200, 800]) {
          it(`should measure the ${axis}() bracket ${animate ? 'with' : 'without'} layoutAnimation() at ${n} rows`, () => {
            const measured = withArm(
              { n, axis: axis === 'y' ? y() : xy(), animate },
              (arm) => sample(arm),
            );
            const row = medians(measured.rows);
            const report = (value: number): string => value.toFixed(3);
            // **Two denominators, both stated.** `bracket` is what the
            // contract names; `move` adds the resolve that produced the
            // insertion, which is the whole of what one committed move costs
            // the frame. The rebuild's share is different under the two and
            // the difference is the answer's own nuance, not a rounding.
            const move = row.bracket + row.resolve;
            const share = (value: number, whole: number): string =>
              `${((value / whole) * 100).toFixed(1)}%`;

            // oxlint-disable-next-line no-console -- this suite exists to report
            console.info(
              `M-4′ ${axis}() ${animate ? 'animated' : 'bare'} n=${n} ` +
                `move=${report(move)}ms bracket=${report(row.bracket)}ms ` +
                `span=${report(row.span)}ms(${share(row.span, row.bracket)}) ` +
                `write=${report(row.write)}ms(${share(row.write, row.bracket)}) ` +
                `rebuild=${report(row.rebuild)}ms(${share(row.rebuild, row.bracket)} of bracket, ` +
                `${share(row.rebuild, move)} of move) ` +
                `after=${report(row.after)}ms(${share(row.after, row.bracket)}) ` +
                `resolve=${report(row.resolve)}ms | ` +
                `repeats=${measured.repeats} ` +
                `resolution=${(0.1 / measured.repeats).toFixed(4)}ms`,
            );
          });
        }
      }
    }
  },
);
