/**
 * D-208 — M-1's per-sample timing at a resolution finer than the effect it
 * has to rule out.
 *
 * M-1 and M-1′ report the median of 21 calibrated batches, each the mean of
 * one batch long enough to reach 2 ms. `performance.now()` is clamped, so a
 * batch's duration is a multiple of the clamp quantum and the per-sample
 * figure is a multiple of `quantum / repeats`. At ~5 µs a sample that is about
 * 0.195 µs, which is the size of the difference in question. This file keeps
 * the policy — five discarded warm-ups, a calibrated batch, 21 batches, the
 * median — and lengthens the batch until `quantum / repeats` is at or below
 * {@link RESOLUTION}. The quantum is measured rather than assumed, and every
 * reported figure carries it, the repeat count and the resolution reached.
 *
 * **Arms.** Free drag bare, `axis: 'y'`, `bounds(element)` and
 * `bounds(() => rect)`, built as M-1′ arm C builds them, and the sortable end
 * to end at 50 and 200 rows, built as M-1 builds it. One controller is alive
 * at a time.
 *
 * **CPU profile.** A second opt-in row takes a V8 CPU profile of the free-drag
 * bare and `bounds(thunk)` arms through the DevTools Protocol and reports self
 * time per sample by function, with frames served from `src/` reported as the
 * library's.
 *
 * The structural row runs on every suite run. The figures are opt-in —
 * `VITE_DRAG_MEASURE=1` for the timing, `VITE_DRAG_PROFILE=1` for the profile —
 * and assert nothing. **Run this file alone**: test files share one renderer.
 */
/* oxlint-disable no-await-in-loop -- each profiled arm must finish before the
   next is built, because one controller is alive at a time */
import { afterEach, describe, expect, it } from 'vitest';
import { cdp } from 'vitest/browser';
import { bounds } from '../../src/free-drag/bounds.ts';
import {
  freeDrag,
  FreeDragResolution,
  type FreeDragConfig,
} from '../../src/free-drag.ts';
import { y } from '../../src/sortable/y.ts';
import { ReorderResolution, sortable } from '../../src/sortable.ts';

const WARMUP = 5;
const SAMPLES = 21;
const TARGET_SAMPLE_MS = 2;
/** The per-sample resolution required, in milliseconds: 0.05 µs. */
const RESOLUTION = 0.05e-3;
const POINTER_ID = 31;
const ITEM_HEIGHT = 40;
/** Samples dispatched inside one CPU profile window. */
const PROFILE_SAMPLES = 200_000;
/** Samples dispatched before a profile window opens. */
const PROFILE_WARMUP = 20_000;
/** The CPU profiler's sampling interval, in microseconds. */
const PROFILE_INTERVAL = 25;

const cleanup: Array<() => void> = [];

afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

/**
 * The smallest nonzero step `performance.now()` takes, in milliseconds. The
 * clamp is coarsened with jitter, so the minimum over many steps is the
 * quantum and a single step is not.
 */
function timerQuantum(): number {
  let quantum = Number.POSITIVE_INFINITY;

  for (let i = 0; i < 200; i += 1) {
    const start = performance.now();
    let next = performance.now();

    while (next === start) {
      next = performance.now();
    }

    quantum = Math.min(quantum, next - start);
  }

  return quantum;
}

type Timing = Readonly<{ sample: number; repeats: number }>;

/**
 * M-1's policy, with the batch lengthened until one clamp quantum spread over
 * the batch is at or below {@link RESOLUTION}.
 */
function timing(quantum: number, iteration: (round: number) => void): Timing {
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

  while (quantum / repeats > RESOLUTION) {
    repeats *= 2;
  }

  const measured: number[] = [];

  for (let i = 0; i < SAMPLES; i += 1) {
    measured.push(batch(repeats) / repeats);
  }

  return {
    sample: measured.toSorted((a, b) => a - b)[Math.floor(SAMPLES / 2)]!,
    repeats,
  };
}

// ---------------------------------------------------------------------------
// Fixtures — M-1′ arm C's free drag and M-1's sortable, unchanged
// ---------------------------------------------------------------------------

type Live = Readonly<{
  sample(y: number): void;
  rendered(): string;
  dispose(): void;
}>;

function pointerDown(target: HTMLElement): void {
  target.dispatchEvent(
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
}

function sampler(x: number): (y: number) => void {
  return (y: number): void => {
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: POINTER_ID,
        isPrimary: true,
        clientX: x,
        clientY: y,
      }),
    );
  };
}

/** One active free-drag operation, composed from exactly `fragments`. */
function liveFreeDrag(
  fragments: ReadonlyArray<Partial<FreeDragConfig>>,
  config: Partial<FreeDragConfig>,
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
    void controller.requestDestroy();
    stage.remove();
  };

  cleanup.push(dispose);
  pointerDown(item);

  const sample = sampler(30);

  // Cross the 8px threshold so every measured sample is an active one.
  sample(10);

  return { sample, dispose, rendered: () => item.style.transform };
}

/** One active sortable operation over `count` rows, as M-1 builds it. */
function liveSortable(count: number): Live {
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
  pointerDown(items[0]!);

  const sample = sampler(10);

  sample(40);

  return { sample, dispose, rendered: () => items[0]!.style.transform };
}

/** A bounds element too large to clamp, removed after the test. */
function boundsElement(): HTMLElement {
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

  return element;
}

/** A bounds thunk too large to clamp, returning a hoisted rect. */
function boundsThunk(): Partial<FreeDragConfig> {
  const rect = new DOMRectReadOnly(-5000, -5000, 10_000, 10_000);

  return bounds((): DOMRectReadOnly => rect);
}

type Arm = Readonly<{
  name: string;
  build(): Live;
  /** The `y` the round-th sample moves to. */
  at(round: number): number;
}>;

const freeDragAt = (round: number): number => 20 + (round % 120);
const sortableAt = (round: number): number => 40 + (round % 120);

function arms(): readonly Arm[] {
  return [
    {
      name: 'free drag bare',
      build: () => liveFreeDrag([], {}),
      at: freeDragAt,
    },
    {
      name: 'free drag axis',
      build: () => liveFreeDrag([], { axis: 'y' }),
      at: freeDragAt,
    },
    {
      name: 'free drag bounds(element)',
      build: () => liveFreeDrag([bounds(boundsElement())], {}),
      at: freeDragAt,
    },
    {
      name: 'free drag bounds(thunk)',
      build: () => liveFreeDrag([boundsThunk()], {}),
      at: freeDragAt,
    },
    { name: 'sortable 50', build: () => liveSortable(50), at: sortableAt },
    { name: 'sortable 200', build: () => liveSortable(200), at: sortableAt },
  ];
}

const PROFILED = new Set(['free drag bare', 'free drag bounds(thunk)']);

// ---------------------------------------------------------------------------
// Structural — runs on every suite run
// ---------------------------------------------------------------------------

describe('D-208 M-1 — the arms', () => {
  it('should put every arm in an active operation that renders each sample', () => {
    // Every arm is only measuring a pointer sample while the sample moves
    // something, so each fixture must render a different transform for two
    // different samples.
    const rendered = arms().map((arm) => {
      const live = arm.build();

      live.sample(arm.at(30));

      const first = live.rendered();

      live.sample(arm.at(90));

      const second = live.rendered();

      live.dispose();

      return first !== '' && first !== second;
    });

    expect(rendered).toEqual(arms().map(() => true));
  });
});

// ---------------------------------------------------------------------------
// Timings and profiles — opt-in, and they assert nothing
// ---------------------------------------------------------------------------

const report = (ms: number): string => `${(ms * 1000).toFixed(4)}µs`;

describe.runIf(Boolean(import.meta.env['VITE_DRAG_MEASURE']))(
  'D-208 M-1 — timing',
  () => {
    it('should measure one pointer sample on every arm', () => {
      const quantum = timerQuantum();

      for (const arm of arms()) {
        const live = arm.build();
        const { sample, repeats } = timing(quantum, (round) => {
          live.sample(arm.at(round));
        });

        live.dispose();

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.warn(
          `D208-M1 arm=${arm.name} sample=${report(sample)} repeats=${repeats} ` +
            `quantum=${report(quantum)} resolution=${report(quantum / repeats)}`,
        );
      }
    }, 300_000);
  },
);

type CpuNode = Readonly<{
  id: number;
  callFrame: Readonly<{ functionName: string; url: string }>;
}>;
type CpuProfile = Readonly<{
  nodes: readonly CpuNode[];
  samples: readonly number[];
  timeDeltas: readonly number[];
}>;
type Session = Readonly<{
  send(method: string, params?: object): Promise<unknown>;
}>;

const SOURCE = '/src/';

/** Self time by function, in microseconds, over one profile. */
function selfTime(profile: CpuProfile): ReadonlyMap<string, number> {
  const names = new Map<number, string>();

  for (const { id, callFrame } of profile.nodes) {
    const { url, functionName } = callFrame;
    const name = functionName || '(anonymous)';

    names.set(
      id,
      url.includes(SOURCE)
        ? `src/${new URL(url).pathname.split(SOURCE).at(-1)}:${name}`
        : `${name}${url === '' ? '' : ` [${new URL(url).pathname.split('/').at(-1)}]`}`,
    );
  }

  const time = new Map<string, number>();

  // `timeDeltas[i]` is the time between sample `i - 1` and sample `i`, so it
  // is charged to the node that sample `i` landed in.
  for (let i = 0; i < profile.samples.length; i += 1) {
    const name = names.get(profile.samples[i]!)!;

    time.set(name, (time.get(name) ?? 0) + profile.timeDeltas[i]!);
  }

  return time;
}

describe.runIf(Boolean(import.meta.env['VITE_DRAG_PROFILE']))(
  'D-208 M-1 — CPU profile',
  () => {
    it('should report self time per sample by function on the primary arms', async () => {
      const session = cdp() as Session;

      await session.send('Profiler.enable');
      await session.send('Profiler.setSamplingInterval', {
        interval: PROFILE_INTERVAL,
      });

      for (const arm of arms().filter(({ name }) => PROFILED.has(name))) {
        const live = arm.build();

        for (let i = 0; i < PROFILE_WARMUP; i += 1) {
          live.sample(arm.at(i));
        }

        await session.send('Profiler.start');

        for (let i = 0; i < PROFILE_SAMPLES; i += 1) {
          live.sample(arm.at(i));
        }

        const { profile } = (await session.send('Profiler.stop')) as {
          profile: CpuProfile;
        };

        live.dispose();

        const time = selfTime(profile);
        let total = 0;
        let library = 0;

        for (const [name, us] of time) {
          total += us;
          library += name.startsWith('src/') ? us : 0;
        }

        const rows = [...time]
          .filter(([, us]) => us / PROFILE_SAMPLES >= 0.005)
          .toSorted(([, a], [, b]) => b - a)
          .map(
            ([name, us]) => `  ${(us / PROFILE_SAMPLES).toFixed(4)}µs ${name}`,
          );

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.warn(
          `D208-M1-PROFILE arm=${arm.name} samples=${PROFILE_SAMPLES} ` +
            `interval=${PROFILE_INTERVAL}µs ` +
            `total=${(total / PROFILE_SAMPLES).toFixed(4)}µs ` +
            `library=${(library / PROFILE_SAMPLES).toFixed(4)}µs per sample\n${rows.join(
              '\n',
            )}`,
        );
      }

      await session.send('Profiler.disable');
    }, 300_000);
  },
);
