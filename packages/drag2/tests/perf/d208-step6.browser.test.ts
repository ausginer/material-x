/**
 * D-208 step 6 — what the move path allocates, attributed rather than inferred.
 *
 * M-1 read allocation as `usedJSHeapSize` growth over 20,000 samples with no
 * `gc()` in between. That reading cannot tell the library's allocation from
 * the harness's own `PointerEvent`, and a scavenge inside the loop lowers it,
 * so it bounds retention and says little about allocation. This file takes the
 * figure from **V8's sampling heap profiler** instead, through the Chrome
 * DevTools Protocol, with objects collected by either collector included and a
 * sampling interval small enough that every allocation of the sizes involved
 * is sampled. Each sampled allocation carries the stack that made it, so the
 * bytes are attributed to the function that allocated them: a frame served
 * from `src/` is the library's, a frame in this file is the harness's, and
 * anything else — the runner, the platform's own frames — is reported apart.
 *
 * **Arms.**
 *
 * - **Sample** — one active pointer sample, for the sortable and for free drag
 *   in four compositions. The events are constructed before the profiler
 *   starts, so the harness's `PointerEvent` is outside the window, and a
 *   control arm dispatches the same events with no controller listening.
 * - **Committed move** — the sortable's spatial frame, reached by waiting for
 *   real animation frames. The moving arm crosses a row boundary on every
 *   frame, so every frame commits a placeholder move; the still arm samples
 *   inside one row, so the frame runs and commits nothing.
 * - **Per drop and per call** — whole drops and `moveTo` calls, with call
 *   counts from V8's precise coverage, so _once per drop_ and _once per call_
 *   are counted rather than read.
 *
 * Structural rows run on every suite run and check only that the fixtures
 * reach the state each arm claims. The figures are opt-in with
 * `VITE_DRAG_MEASURE=1` and assert nothing. **Run this file alone**: test files
 * share one renderer, so a second file's work lands in the same profile.
 */
/* oxlint-disable no-await-in-loop -- every awaited step is a frame, a drop or
   an arm that must finish before the next begins; none may run concurrently */
import { afterEach, describe, expect, it } from 'vitest';
import { cdp } from 'vitest/browser';
import { bounds } from '../../src/free-drag/bounds.ts';
import {
  freeDrag,
  FreeDragResolution,
  type FreeDragConfig,
} from '../../src/free-drag.ts';
import { ActionQueue } from '../../src/kernel/queue.ts';
import { y } from '../../src/sortable/y.ts';
import { ReorderResolution, sortable } from '../../src/sortable.ts';

const POINTER_ID = 31;
const ITEM_HEIGHT = 40;
const SAMPLES = 2000;
/**
 * Samples dispatched before a window opens, so the path is optimized when the
 * profiler starts and the figure is the optimized code's allocation.
 */
const WARMUP = 5000;
const FRAMES = 200;
const DROPS = 50;
const CALLS = 2000;
const CONTROLLERS = 100;
/**
 * Mean bytes between samples. Every allocation this file attributes is far
 * larger, so each is sampled with a probability indistinguishable from one and
 * the profiler's scaling leaves its size unchanged.
 */
const SAMPLING_INTERVAL = 8;

type CallFrame = Readonly<{ functionName: string; url: string }>;
type ProfileNode = Readonly<{
  callFrame: CallFrame;
  selfSize: number;
  children: readonly ProfileNode[];
}>;
type FunctionCoverage = Readonly<{
  functionName: string;
  ranges: ReadonlyArray<Readonly<{ count: number }>>;
}>;
type ScriptCoverage = Readonly<{
  url: string;
  functions: readonly FunctionCoverage[];
}>;
type Session = Readonly<{
  send(method: string, params?: object): Promise<unknown>;
}>;

/** Bytes by owner: `library` keyed by `file:function`, the rest in totals. */
type Attribution = Readonly<{
  library: ReadonlyMap<string, number>;
  libraryTotal: number;
  harness: number;
  other: number;
  /** `other`, keyed by the allocating frame's function name. */
  otherBy: ReadonlyMap<string, number>;
}>;

const session = (): Session => cdp();

const cleanup: Array<() => void> = [];

afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

const SOURCE = '/src/';
const HARNESS = 'd208-step6.browser.test.ts';

function sourceName(url: string): string {
  const path = new URL(url).pathname;

  return path.slice(path.indexOf(SOURCE) + SOURCE.length);
}

function attribute(head: ProfileNode): Attribution {
  const library = new Map<string, number>();
  const otherBy = new Map<string, number>();
  let libraryTotal = 0;
  let harness = 0;
  let other = 0;
  const visit = (node: ProfileNode): void => {
    const { url, functionName } = node.callFrame;

    if (node.selfSize > 0) {
      if (url.includes(SOURCE)) {
        const key = `${sourceName(url)}:${functionName || '(anonymous)'}`;

        library.set(key, (library.get(key) ?? 0) + node.selfSize);
        libraryTotal += node.selfSize;
      } else if (url.includes(HARNESS)) {
        harness += node.selfSize;
      } else {
        const key = functionName || '(anonymous)';

        otherBy.set(key, (otherBy.get(key) ?? 0) + node.selfSize);
        other += node.selfSize;
      }
    }

    for (const child of node.children) {
      visit(child);
    }
  };

  visit(head);

  return { library, libraryTotal, harness, other, otherBy };
}

/**
 * Every allocation `work` makes, by owner. The profiler is started after the
 * fixture is built and stopped as soon as `work` settles, so construction and
 * teardown are outside the window.
 */
async function allocations(
  work: () => void | Promise<void>,
  collected = true,
): Promise<Attribution> {
  const cdpSession = session();

  await cdpSession.send('HeapProfiler.enable');
  await cdpSession.send('HeapProfiler.startSampling', {
    samplingInterval: SAMPLING_INTERVAL,
    includeObjectsCollectedByMajorGC: collected,
    includeObjectsCollectedByMinorGC: collected,
  });
  await work();

  const { profile } = (await cdpSession.send('HeapProfiler.stopSampling')) as {
    profile: { head: ProfileNode };
  };

  await cdpSession.send('HeapProfiler.disable');

  return attribute(profile.head);
}

/**
 * How many times each library function ran during `work`, from V8's precise
 * coverage. Taking coverage resets the counters, so the first take discards
 * whatever ran before the window.
 */
async function callCounts(
  work: () => void | Promise<void>,
): Promise<ReadonlyMap<string, number>> {
  const cdpSession = session();

  await cdpSession.send('Profiler.enable');
  await cdpSession.send('Profiler.startPreciseCoverage', {
    callCount: true,
    detailed: false,
  });
  await cdpSession.send('Profiler.takePreciseCoverage');
  await work();

  const { result } = (await cdpSession.send(
    'Profiler.takePreciseCoverage',
  )) as { result: readonly ScriptCoverage[] };

  await cdpSession.send('Profiler.stopPreciseCoverage');
  await cdpSession.send('Profiler.disable');

  const counts = new Map<string, number>();

  for (const script of result) {
    if (!script.url.includes(SOURCE)) {
      continue;
    }

    for (const fn of script.functions) {
      const count = fn.ranges[0]?.count ?? 0;

      if (count > 0) {
        const key = `${sourceName(script.url)}:${fn.functionName || '(anonymous)'}`;

        counts.set(key, (counts.get(key) ?? 0) + count);
      }
    }
  }

  return counts;
}

function report(label: string, result: Attribution, per: number): void {
  const rows = [...result.library]
    .toSorted(([, a], [, b]) => b - a)
    .filter(([, bytes]) => bytes / per >= 0.5)
    .map(([key, bytes]) => `    ${key} ${(bytes / per).toFixed(1)}B`);
  const others = [...result.otherBy]
    .toSorted(([, a], [, b]) => b - a)
    .filter(([, bytes]) => bytes / per >= 0.5)
    .map(([key, bytes]) => `    other ${key} ${(bytes / per).toFixed(1)}B`);

  // oxlint-disable-next-line no-console -- this suite exists to report
  console.warn(
    [
      `D208-6 ${label} per=${per} library=${(result.libraryTotal / per).toFixed(1)}B ` +
        `harness=${(result.harness / per).toFixed(1)}B other=${(result.other / per).toFixed(1)}B`,
      ...rows,
      ...others,
    ].join('\n'),
  );
}

function reportCounts(
  label: string,
  counts: ReadonlyMap<string, number>,
  names: readonly string[],
): void {
  // oxlint-disable-next-line no-console -- this suite exists to report
  console.warn(
    `D208-6 ${label} ${names
      .map((name) => `${name}=${counts.get(name) ?? 0}`)
      .join(' ')}`,
  );
}

function pointer(type: string, x: number, y: number): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    composed: true,
    cancelable: true,
    pointerId: POINTER_ID,
    isPrimary: true,
    button: 0,
    buttons: type === 'pointerup' ? 0 : 1,
    clientX: x,
    clientY: y,
  });
}

/** `count` move events, built before any measurement window opens. */
function moves(count: number, x: number, at: (i: number) => number) {
  return Array.from({ length: count }, (_, i) =>
    pointer('pointermove', x, at(i)),
  );
}

function dispatchAll(events: readonly PointerEvent[]): void {
  for (const event of events) {
    document.dispatchEvent(event);
  }
}

/** Dispatches `events` until `WARMUP` samples have run. */
function warm(events: readonly PointerEvent[]): void {
  for (let done = 0; done < WARMUP; done += events.length) {
    dispatchAll(events);
  }
}

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const settled = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type SortableFixture = Readonly<{
  root: HTMLElement;
  items: readonly HTMLElement[];
  press(): void;
  release(y: number): void;
  /** The element in the list that is not one of the rows. */
  placeholder(): Element | undefined;
  dispose(): void;
}>;

function sortableFixture(count: number): SortableFixture {
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

  const controller = sortable(root, {
    items: () => items,
    axis: y(),
    onReorder: () => ReorderResolution.accept(),
  });

  root.setPointerCapture = (): void => {};
  root.releasePointerCapture = (): void => {};

  let disposed = false;
  const dispose = (): void => {
    if (disposed) {
      return;
    }

    disposed = true;
    void controller.requestDestroy();
    root.remove();
  };

  cleanup.push(dispose);

  const { top } = root.getBoundingClientRect();

  return {
    root,
    items,
    press: () => {
      items[0]!.dispatchEvent(pointer('pointerdown', 10, top + 10));
      // Cross the threshold so every later sample is an ACTIVE one.
      document.dispatchEvent(pointer('pointermove', 10, top + 40));
    },
    release: (at) => {
      document.dispatchEvent(pointer('pointerup', 10, top + at));
    },
    placeholder: () =>
      [...root.children].find((child) => !items.includes(child as HTMLElement)),
    dispose,
  };
}

type FreeFixture = Readonly<{
  item: HTMLElement;
  moveTo(point: Readonly<{ x: number; y: number }>): void;
  dispose(): void;
}>;

/**
 * One free-drag controller, composed from exactly the fragments handed in.
 * `onDrop` is the only consumer slot the bare form carries.
 */
function freeFixture(
  fragments: ReadonlyArray<Partial<FreeDragConfig>> = [],
  config: Partial<FreeDragConfig> = {},
): FreeFixture {
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
    void controller.requestDestroy();
    stage.remove();
  };

  cleanup.push(dispose);

  return {
    item,
    moveTo: (point) => {
      controller.moveTo(point);
    },
    dispose,
  };
}

function pressFree(item: HTMLElement): void {
  item.dispatchEvent(pointer('pointerdown', 10, 10));
  // Cross the 8px threshold so every later sample is an ACTIVE one.
  document.dispatchEvent(pointer('pointermove', 30, 10));
}

/** A rect that never clamps, hoisted so the thunk constructs nothing. */
const UNBOUNDED = new DOMRectReadOnly(-5000, -5000, 10_000, 10_000);

function freeArms(): ReadonlyArray<
  readonly [
    string,
    ReadonlyArray<Partial<FreeDragConfig>>,
    Partial<FreeDragConfig>,
  ]
> {
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

  return [
    ['bare', [], {}],
    ['bounds(element)', [bounds(element)], {}],
    ['bounds(thunk)', [bounds(() => UNBOUNDED)], {}],
    ['onMove', [], { onMove: () => {} }],
  ];
}

// ---------------------------------------------------------------------------
// Structural — runs on every suite run
// ---------------------------------------------------------------------------

describe('D-208 step 6 — the fixtures', () => {
  it('should commit a placeholder move on every frame of the moving arm', async () => {
    const fixture = sortableFixture(10);
    const { top } = fixture.root.getBoundingClientRect();
    const events = moves(4, 10, (i) => top + (i % 2 === 0 ? 100 : 220));

    fixture.press();
    await nextFrame();

    const seen: number[] = [];

    for (const event of events) {
      document.dispatchEvent(event);
      await nextFrame();
      seen.push([...fixture.root.children].indexOf(fixture.placeholder()!));
    }

    expect(seen.every((index, i) => i === 0 || index !== seen[i - 1])).toBe(
      true,
    );
  });

  it('should commit no placeholder move on the frames of the still arm', async () => {
    const fixture = sortableFixture(10);
    const { top } = fixture.root.getBoundingClientRect();
    const events = moves(4, 10, (i) => top + 100 + (i % 2));

    fixture.press();
    document.dispatchEvent(events[0]!);
    await nextFrame();

    const before = [...fixture.root.children].indexOf(fixture.placeholder()!);

    for (const event of events) {
      document.dispatchEvent(event);
      await nextFrame();
    }

    expect([...fixture.root.children].indexOf(fixture.placeholder()!)).toBe(
      before,
    );
  });

  it('should leave the free-drag visual where moveTo put it', () => {
    const fixture = freeFixture();

    pressFree(fixture.item);
    fixture.moveTo({ x: 70, y: 90 });

    expect(fixture.item.style.transform).toContain('70px');
  });
});

// ---------------------------------------------------------------------------
// Measurement — opt-in
// ---------------------------------------------------------------------------

describe.runIf(Boolean(import.meta.env['VITE_DRAG_MEASURE']))(
  'D-208 step 6 — measurement',
  () => {
    it('should measure what one add-and-clear cycle of the action queue allocates', async () => {
      // A calibration for the sample arms: one sample adds one entry to the
      // kernel's queue and clears it when the unit drains.
      const queue = new ActionQueue();
      const cycle = (): void => {
        queue.add(1, queue);
        queue.clear();
      };

      for (let i = 0; i < WARMUP; i += 1) {
        cycle();
      }

      const measured = await allocations(() => {
        for (let i = 0; i < SAMPLES; i += 1) {
          cycle();
        }
      });

      report('queue cycle', measured, SAMPLES);

      // The discriminator: the same push, truncated to a non-zero length, so
      // the array never returns to empty between cycles.
      const kept: unknown[] = [0, queue];
      const keptCycle = (): void => {
        kept.push(1, queue);
        kept.length = 2;
      };

      for (let i = 0; i < WARMUP; i += 1) {
        keptCycle();
      }

      const truncated = await allocations(() => {
        for (let i = 0; i < SAMPLES; i += 1) {
          keptCycle();
        }
      });

      report('array cycle, truncated to non-empty', truncated, SAMPLES);
    });

    it('should measure what one sortable sample allocates', async () => {
      const fixture = sortableFixture(50);
      const { top } = fixture.root.getBoundingClientRect();
      const events = moves(SAMPLES, 10, (i) => top + 40 + (i % 120));

      fixture.press();
      warm(events);

      const measured = await allocations(() => {
        dispatchAll(events);
      });

      fixture.dispose();
      warm(events);

      const control = await allocations(() => {
        dispatchAll(events);
      });

      report('sortable sample', measured, SAMPLES);
      report('sortable sample control', control, SAMPLES);
    });

    it('should measure what one free-drag sample allocates in each composition', async () => {
      for (const [name, fragments, config] of freeArms()) {
        const fixture = freeFixture(fragments, config);
        const events = moves(SAMPLES, 30, (i) => 20 + (i % 120));

        pressFree(fixture.item);
        warm(events);

        const measured = await allocations(() => {
          dispatchAll(events);
        });

        // One live controller at a time: a free-drag controller listens on the
        // document, so a fixture left alive would receive the next arm's
        // samples too.
        fixture.dispose();
        warm(events);

        const control = await allocations(() => {
          dispatchAll(events);
        });

        report(`free sample ${name}`, measured, SAMPLES);
        report(`free sample ${name} control`, control, SAMPLES);
      }
    });

    it('should measure what one committed move allocates per frame', async () => {
      for (const arm of ['moving', 'still'] as const) {
        const fixture = sortableFixture(10);
        const { top } = fixture.root.getBoundingClientRect();
        const events = moves(FRAMES, 10, (i) =>
          arm === 'moving'
            ? top + (i % 2 === 0 ? 100 : 220)
            : top + 100 + (i % 2),
        );

        fixture.press();
        await nextFrame();

        const measured = await allocations(async () => {
          for (const event of events) {
            document.dispatchEvent(event);
            await nextFrame();
          }
        });

        fixture.dispose();
        report(`committed move ${arm}`, measured, FRAMES);
      }
    });

    it('should attribute what a constructed controller retains, by function', async () => {
      // Retained only: objects collected inside the window are left out, and
      // `gc()` runs before the profile is taken, so what remains is what the
      // live controllers hold. Each arm's controllers are disposed after it.
      const runtime = globalThis as unknown as { gc?(): void };

      for (const kind of ['sortable', 'free'] as const) {
        const built: Array<{ dispose(): void }> = [];
        const measured = await allocations(() => {
          for (let i = 0; i < CONTROLLERS; i += 1) {
            built.push(
              kind === 'sortable' ? sortableFixture(3) : freeFixture(),
            );
          }

          runtime.gc?.();
        }, false);

        report(`retained ${kind} controller`, measured, CONTROLLERS);

        for (const fixture of built) {
          fixture.dispose();
        }
      }
    });

    it('should count the move path per sample, per drop and per call', async () => {
      const fixture = sortableFixture(10);
      const { top } = fixture.root.getBoundingClientRect();
      const events = moves(SAMPLES, 10, (i) => top + 40 + (i % 120));

      const samples = await callCounts(() => {
        fixture.press();

        for (const event of events) {
          document.dispatchEvent(event);
        }
      });

      reportCounts('sortable samples', samples, [
        'kernel/kernel.ts:#handleMove',
        'kernel/kernel.ts:#handleOpenResolution',
      ]);

      fixture.release(100);
      await settled();

      const drops = await callCounts(async () => {
        for (let i = 0; i < DROPS; i += 1) {
          fixture.press();
          document.dispatchEvent(pointer('pointermove', 10, top + 100));
          fixture.release(100);
          await settled();
        }
      });

      reportCounts('sortable drops', drops, [
        'kernel/kernel.ts:#handleMove',
        'kernel/kernel.ts:#handleOpenResolution',
        'kernel/kernel.ts:#handleUp',
      ]);
      fixture.dispose();

      const free = freeFixture();

      pressFree(free.item);

      // Built before any window opens, so the harness allocates nothing per
      // call and whatever a call allocates is the library's.
      const points = Array.from({ length: CALLS }, (_, i) => ({
        x: i % 100,
        y: 7,
      }));
      const callAll = (): void => {
        for (const point of points) {
          free.moveTo(point);
        }
      };

      callAll();
      callAll();

      const calls = await callCounts(callAll);

      reportCounts('free moveTo', calls, [
        'free-drag/controller.ts:moveTo',
        'kernel/kernel.ts:#handleOpenResolution',
      ]);

      const perCall = await allocations(callAll);

      report('free moveTo', perCall, CALLS);
      free.dispose();

      const free2 = freeFixture();
      const perDrop = await allocations(async () => {
        for (let i = 0; i < DROPS; i += 1) {
          pressFree(free2.item);
          document.dispatchEvent(pointer('pointerup', 40, 40));
          await settled();
        }
      });

      report('free drop', perDrop, DROPS);
      free2.dispose();

      const fixture2 = sortableFixture(10);
      const top2 = fixture2.root.getBoundingClientRect().top;
      const perSortDrop = await allocations(async () => {
        for (let i = 0; i < DROPS; i += 1) {
          fixture2.press();
          document.dispatchEvent(pointer('pointermove', 10, top2 + 100));
          fixture2.release(100);
          await settled();
        }
      });

      report('sortable drop', perSortDrop, DROPS);
    });
  },
);
