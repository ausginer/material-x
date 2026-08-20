/**
 * M-6 — the write census (D-97).
 *
 * **A count experiment, not a timing benchmark.** It counts two things per
 * `requestAnimationFrame` tick — `lift.write` calls and `constrain.apply` calls
 * — and nothing here is a duration. The cost of one write is deliberately not
 * measured: the count is what decides, and a cost taken first would be the
 * convenient number M-1′ refused to substitute for P-01's deciding quantity.
 *
 * **Why the denominator is an rAF tick.** A write gate would itself be built on
 * rAF, so the census counts exactly what such a gate would collapse, and the
 * figure is refresh-rate independent by construction.
 *
 * **Why the injection must be Playwright's and never `dispatchEvent`.** The
 * question is whether the *user agent* delivers more than one `pointermove`
 * inside one rendering opportunity. `element.dispatchEvent` delivers exactly
 * what the caller wrote at exactly the caller's rate — it never reaches the
 * coalescing decision the measurement is about, and reproduces the artificial
 * many-samples-per-frame regime D-96 already ruled out as evidence. These arms
 * drive `page.mouse` through `tests/support/pointer-commands.node.ts`.
 *
 * **The control that makes an inconclusive run visible.** Every dispatched
 * `pointermove` records `getCoalescedEvents().length`. A length above one means
 * the pipeline coalesced a stream genuinely faster than presentation — the
 * regime under test. A run in which the length is never above one **is
 * inconclusive and establishes nothing**: a slow injector returns *one write
 * per frame*, which reads exactly like a bound. That is M-1's batch error
 * inverted, and this file is written so it cannot be made silently.
 *
 * **The two traffic sources are analytically separate.** Pointer traffic is the
 * platform's; `moveTo()` traffic is the consumer's, dispatched synchronously
 * and unbounded per frame by design (D-71). Surplus writes that only a
 * consumer-chosen `moveTo()` rate can produce are documented as such, not
 * turned into a library gating requirement — a library does not gate away a
 * rate its consumer deliberately chose.
 *
 * **The census is falsified before any result is recorded.** A controlled
 * same-frame `moveTo()` burst must produce more than one write in one tick, so
 * a counter stuck at one cannot pass as an instrument. That row asserts and
 * runs on **every** suite run.
 *
 * **Run this file alone**, as the standard requires of every measurement file.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import type {
  ConstraintView,
  FreeDragInstaller,
  MotionDraft,
} from '../../src/free-drag/feature.ts';
import {
  freeDrag,
  FreeDragResolution,
  type FreeDragConfig,
  type FreeDragController,
} from '../../src/free-drag.ts';
import '../support/browser-commands.ts';

/** The item's box in viewport coordinates, which Playwright's mouse takes. */
const ITEM = { x: 0, y: 0, width: 120, height: 60 } as const;
const GRAB = { x: 30, y: 30 } as const;

const cleanup: Array<() => void> = [];

afterEach(async () => {
  // Release first: a press left down leaks into the next test's stream.
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
// The two counters
// ---------------------------------------------------------------------------

type Census = Readonly<{
  item: HTMLElement;
  controller: FreeDragController;
  /** The `ConstraintView` the last `apply` was handed — pins the instrument. */
  view(): ConstraintView | null;
  writes(): number;
  applies(): number;
  reset(): void;
}>;

/**
 * A live free drag with both counters attached.
 *
 * **`lift.write` is counted at the assignment it performs.** `write()` is
 * exactly one `visual.style.transform = compose(x, y)`
 * (`kernel/presentation.ts`), so an accessor installed over that one property
 * of that one element counts the calls and nothing else. The setter forwards to
 * `setProperty`, so the element still renders — verified by the structural row
 * below, which reads the committed transform back.
 *
 * Counting `onMove` instead would have been wrong here rather than merely
 * indirect: the `TAG_POSITION` effect renders through `lift.write` and **does
 * not** call `onMove` (`free-drag/spec.ts` §Behavior actions), so an `onMove`
 * counter would report zero for the entire `moveTo()` arm — the half of the
 * census that has to move.
 */
function census(): Census {
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

  let writes = 0;
  let applies = 0;
  let seen: ConstraintView | null = null;

  const { style } = item;

  Object.defineProperty(style, 'transform', {
    configurable: true,
    get: (): string => style.getPropertyValue('transform'),
    set: (value: string): void => {
      writes += 1;
      style.setProperty('transform', value);
    },
  });

  // A constraint that clamps nothing: the census counts `apply` calls, and a
  // clamp would change where the visual goes without changing the count.
  const counting: FreeDragInstaller = () => ({
    constrain: {
      apply(_motion: MotionDraft, view: ConstraintView): void {
        applies += 1;
        seen = view;
      },
      invalidate(): void {},
      retire(): void {},
    },
  });

  const controller = freeDrag(
    item,
    { onDrop: () => FreeDragResolution.accept() },
    { bounds: counting } satisfies Partial<FreeDragConfig>,
  );

  cleanup.push(() => {
    void controller.destroy();
    stage.remove();
  });

  return {
    item,
    controller,
    view: () => seen,
    writes: () => writes,
    applies: () => applies,
    reset: () => {
      writes = 0;
      applies = 0;
    },
  };
}

type Tick = Readonly<{ writes: number; applies: number }>;

/**
 * Chained `requestAnimationFrame`, so a tick occurs at **every** rendering
 * opportunity for as long as the recorder runs — which is what makes the tick
 * count the census's denominator rather than a sample of one.
 */
function recorder(subject: Census): Readonly<{
  stop(): readonly Tick[];
}> {
  const ticks: Tick[] = [];
  let running = true;

  const tick = (): void => {
    ticks.push({ writes: subject.writes(), applies: subject.applies() });
    subject.reset();

    if (running) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);

  return {
    stop: () => {
      running = false;

      return ticks;
    },
  };
}

/** Every dispatched `pointermove`'s coalesced length — the validity control. */
function coalescing(): Readonly<{
  lengths(): readonly number[];
  stop(): void;
}> {
  const lengths: number[] = [];
  const controller = new AbortController();

  document.addEventListener(
    'pointermove',
    (event) => {
      lengths.push(event.getCoalescedEvents().length);
    },
    { signal: controller.signal, capture: true },
  );

  return {
    lengths: () => lengths,
    stop: () => {
      controller.abort();
    },
  };
}

const quantile = (values: readonly number[], q: number): number =>
  values.length === 0
    ? 0
    : values.toSorted((a, b) => a - b)[
        Math.min(values.length - 1, Math.floor(values.length * q))
      ]!;

const frameOf = (): Promise<void> =>
  new Promise((done) => {
    requestAnimationFrame(() => {
      done();
    });
  });

// ---------------------------------------------------------------------------
// Structural — the falsification, and the instrument's pins
// ---------------------------------------------------------------------------

describe('M-6 — the census instrument', () => {
  it('should count a same-frame moveTo() burst as more than one write', async () => {
    // **The falsifier, and it runs on every suite run.** A counter that is
    // permanently one would pass every arm of this census and read as a bound,
    // so the census is only an instrument if a construction that *must* exceed
    // one is shown to. `moveTo()` dispatches `TAG_POSITION` synchronously and
    // its effect renders through `lift.write`, so eight calls inside one rAF
    // callback are eight writes inside one tick, by construction.
    const subject = census();

    await commands.pointerPress(GRAB.x, GRAB.y);
    await commands.pointerSweep(GRAB.x + 60, GRAB.y + 60, 4);

    const taken = recorder(subject);
    let burst = 0;

    await new Promise<void>((done) => {
      requestAnimationFrame(() => {
        for (let i = 0; i < 8; i += 1) {
          subject.controller.moveTo({ x: 200 + i, y: 200 + i });
          burst += 1;
        }

        done();
      });
    });
    await frameOf();

    const ticks = taken.stop();

    expect(burst).toBe(8);
    expect(Math.max(...ticks.map((one) => one.writes))).toBeGreaterThan(1);
  });

  it('should render the transform it counts', async () => {
    // The counter forwards to `setProperty`, so the accessor must not have
    // turned the write into a count-only no-op — a census over an element that
    // stopped moving would be counting a different system.
    const subject = census();

    await commands.pointerPress(GRAB.x, GRAB.y);
    await commands.pointerSweep(GRAB.x + 80, GRAB.y + 80, 4);

    expect(subject.writes()).toBeGreaterThan(0);
    expect(getComputedStyle(subject.item).transform).not.toBe('none');
  });

  it('should count applies against the lifted visual', async () => {
    // Pins the instrument to the element it instruments: the constraint's view
    // must carry the same node whose `transform` the write counter shadows.
    const subject = census();

    await commands.pointerPress(GRAB.x, GRAB.y);
    await commands.pointerSweep(GRAB.x + 80, GRAB.y + 80, 4);

    expect(subject.view()?.visual).toBe(subject.item);
    expect(subject.applies()).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// The census — opt-in, and it asserts nothing
// ---------------------------------------------------------------------------

describe.runIf(Boolean(import.meta.env['VITE_DRAG_MEASURE']))(
  'M-6 — the write census',
  () => {
    const distribution = (label: string, ticks: readonly Tick[]): string => {
      const writes = ticks.map((one) => one.writes);
      const applies = ticks.map((one) => one.applies);

      return (
        `${label} ticks=${ticks.length} ` +
        `writes p95=${quantile(writes, 0.95)} max=${Math.max(...writes)} ` +
        `mean=${(writes.reduce((a, b) => a + b, 0) / ticks.length).toFixed(2)} ` +
        `applies p95=${quantile(applies, 0.95)} max=${Math.max(...applies)}`
      );
    };

    // -- Arm 1: platform pointer traffic ---------------------------------
    //
    // Two injection paces, and the difference between them is the whole point.
    // `wave = 1` is Playwright awaiting each dispatch before sending the next,
    // which is the driver's natural pacing. Above one, the driver issues a
    // small wave without waiting for each acknowledgement — still every event
    // through `Input.dispatchMouseEvent`, still the browser deciding what to
    // coalesce, but no longer rate-limited by the round trip.
    for (const wave of [1, 2, 4]) {
      it(`should census pointer traffic at wave ${wave}`, async () => {
        const subject = census();

        await commands.pointerPress(GRAB.x, GRAB.y);
        await commands.pointerSweep(GRAB.x + 40, GRAB.y + 40, 4);

        const control = coalescing();
        const taken = recorder(subject);

        await commands.pointerFlood(240, wave);
        await frameOf();

        const ticks = taken.stop();

        control.stop();

        const lengths = control.lengths();
        const above = lengths.filter((length) => length > 1).length;

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.warn(
          `M-6 pointer wave=${wave} ${distribution('|', ticks)} ` +
            `| CONTROL dispatches=${lengths.length} coalesced>1=${above} ` +
            `max=${lengths.length === 0 ? 0 : Math.max(...lengths)} ` +
            `verdict=${above > 0 ? 'VALID' : 'INCONCLUSIVE'}`,
        );
      }, 60_000);
    }

    // -- Arm 2: consumer `moveTo()` traffic ------------------------------
    //
    // Kept analytically separate from arm 1. This is not the platform's rate;
    // it is the consumer's, and the two cannot be added into one verdict.
    it('should census moveTo() driven from the consumer rAF', async () => {
      // One call per rendering opportunity — the disciplined consumer, and the
      // shape a gate could not improve on.
      const subject = census();

      await commands.pointerPress(GRAB.x, GRAB.y);
      await commands.pointerSweep(GRAB.x + 40, GRAB.y + 40, 4);

      const taken = recorder(subject);
      let remaining = 90;

      await new Promise<void>((done) => {
        const step = (): void => {
          subject.controller.moveTo({ x: 200 + (remaining % 60), y: 200 });
          remaining -= 1;

          if (remaining > 0) {
            requestAnimationFrame(step);

            return;
          }

          done();
        };

        requestAnimationFrame(step);
      });
      await frameOf();

      // oxlint-disable-next-line no-console -- this suite exists to report
      console.warn(`M-6 ${distribution('moveTo rAF-driven', taken.stop())}`);
    }, 60_000);

    for (const burst of [2, 8, 32]) {
      it(`should census a same-frame moveTo() burst of ${burst}`, async () => {
        // The explicit burst: `burst` calls inside one rAF callback, repeated
        // over many frames. This is a rate the consumer chose, and what it
        // establishes is the shape of the surplus, not a requirement.
        const subject = census();

        await commands.pointerPress(GRAB.x, GRAB.y);
        await commands.pointerSweep(GRAB.x + 40, GRAB.y + 40, 4);

        const taken = recorder(subject);
        let frames = 30;

        await new Promise<void>((done) => {
          const step = (): void => {
            for (let i = 0; i < burst; i += 1) {
              subject.controller.moveTo({ x: 200 + i, y: 200 + i });
            }

            frames -= 1;

            if (frames > 0) {
              requestAnimationFrame(step);

              return;
            }

            done();
          };

          requestAnimationFrame(step);
        });
        await frameOf();

        // oxlint-disable-next-line no-console -- this suite exists to report
        console.warn(
          `M-6 ${distribution(`moveTo same-frame burst=${burst}`, taken.stop())}`,
        );
      }, 60_000);
    }
  },
);
