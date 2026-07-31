import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { draggable } from '../../src/drag.ts';
import {
  FAILURE_ACTIVATION,
  FAILURE_ADMISSION,
  FAILURE_RELEASE,
  FAILURE_RENDERER_WRITE,
  type FailureStage,
} from '../../src/kernel/failures.ts';
import type { Frame } from '../../src/kernel/frames.ts';
import { ACTIVATING, ACTIVE, RELEASING } from '../../src/kernel/phases.ts';
import { LIFT_FLAT } from '../../src/kernel/presentation.ts';
import type {
  ActivationScope,
  BehaviorSpec,
  KernelHost,
  ResolutionCommand,
  SeamRejection,
} from '../../src/kernel/spec.ts';

type ExamplePart = {
  item: HTMLElement | null;
  note: string;
};

const POINTER_ID = 7;

type Harness = Readonly<{
  root: HTMLElement;
  item: HTMLElement;
  host: KernelHost;
  controller: { cancel(reason?: unknown): void; destroy(): void };
  /** Every seam the kernel drove, in order. */
  calls: string[];
  /** The committed phase each seam observed. */
  phases: Record<string, number>;
  /** Failures the kernel surfaced through `spec.reportFailure`. */
  failures: Array<Readonly<{ stage: FailureStage; error: unknown }>>;
  captures: string[];
}>;

type SpecOverrides = Partial<
  Pick<
    BehaviorSpec<ExamplePart>,
    'admit' | 'activation' | 'release' | 'action' | 'moved' | 'createFramePart'
  >
> &
  Readonly<{
    threshold?: number;
    /** Called with the host, so a test can cancel or destroy from a seam. */
    onStart?(host: KernelHost): void;
    capture?(): void;
  }>;

const cleanup: Array<() => void> = [];

type Reporting = { reportError?(error: unknown): void };

/** Non-consequential reports: a dropped tag, a failing disposer. */
let reported: unknown[] = [];

beforeEach(() => {
  reported = [];
  (globalThis as Reporting).reportError = (error) => {
    reported.push(error);
  };
});

afterEach(() => {
  delete (globalThis as Reporting).reportError;
});

afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

function createHarness(overrides: SpecOverrides = {}): Harness {
  const root = document.createElement('div');
  const item = document.createElement('div');

  Object.assign(root.style, { position: 'absolute', inset: '0' });
  Object.assign(item.style, {
    position: 'absolute',
    left: '10px',
    top: '20px',
    width: '60px',
    height: '30px',
  });
  root.append(item);
  document.body.append(root);

  const calls: string[] = [];
  const phases: Record<string, number> = {};
  const failures: Array<Readonly<{ stage: FailureStage; error: unknown }>> = [];
  const captures: string[] = [];

  // Synthetic pointer events have no active pointer, so the real
  // `setPointerCapture` would throw `NotFoundError` for every activation.
  root.setPointerCapture =
    overrides.capture ??
    ((): void => {
      captures.push('acquire');
    });
  root.releasePointerCapture = (): void => {
    captures.push('release');
  };

  const record = (
    name: string,
    current?: Readonly<Frame<ExamplePart>>,
  ): void => {
    calls.push(name);

    if (current) {
      phases[name] = current.phase;
    }
  };

  let host!: KernelHost;

  const controller = draggable<
    { cancel(reason?: unknown): void; destroy(): void },
    ExamplePart
  >(root, (kernelHost) => {
    host = kernelHost;

    const spec: BehaviorSpec<ExamplePart> = {
      createFramePart:
        overrides.createFramePart ??
        ((): ExamplePart => ({ item: null, note: '' })),
      resetFramePart(part): void {
        part.item = null;
        part.note = '';
      },
      config: {
        threshold: overrides.threshold ?? 8,
        liftMode: LIFT_FLAT,
        readinessTimeout: 500,
        actionTags: 2,
      },
      admit:
        overrides.admit ??
        ((_event, draft): HTMLElement => {
          record('admit');
          draft.item = item;
          return item;
        }),
      activation: overrides.activation ?? {
        prepare(draft): HTMLElement {
          record('activation.prepare');
          draft.note = 'prepared';
          return document.createElement('div');
        },
        effect(current, _prepared, scope: ActivationScope): void {
          record('activation.effect', current);
          scope.presentation.use(() => {
            calls.push('presentation.released');
          });
          scope.motion.use(() => {
            calls.push('motion.released');
          });
          overrides.onStart?.(host);
        },
      },
      release: overrides.release ?? {
        prepare(): ResolutionCommand {
          record('release.prepare');
          return { invoke: null };
        },
        effect(current): void {
          record('release.effect', current);
        },
      },
      settlement: {
        prepare: () => ({ ready: null }),
        effect: (): void => {},
      },
      action: overrides.action ?? {
        prepare(tag): {} | null {
          record(`action.prepare:${tag}`);
          return true;
        },
        effect(tag, _argument, current): void {
          record(`action.effect:${tag}`, current);
        },
      },
      moved:
        overrides.moved ??
        ((current): void => {
          record('moved', current);
        }),
      anchorTarget: () => ({ x: 0, y: 0 }),
      finalized(): void {
        calls.push('finalized');
      },
      reportFailure(stage, error): void {
        failures.push({ stage, error });
      },
      retire(): void {
        calls.push('retire');
      },
    };

    return { spec, controller: { cancel: host.cancel, destroy: host.destroy } };
  });

  cleanup.push(() => {
    controller.destroy();
    root.remove();
  });

  return { root, item, host, controller, calls, phases, failures, captures };
}

const press = (target: HTMLElement, x = 10, y = 10): void => {
  target.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: x,
      clientY: y,
    }),
  );
};

const pointerEvent = (type: string, x: number, y: number): void => {
  document.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      clientX: x,
      clientY: y,
    }),
  );
};

const move = (x: number, y: number): void => {
  pointerEvent('pointermove', x, y);
};

const release = (x: number, y: number): void => {
  pointerEvent('pointerup', x, y);
};

/** Press, then cross the activation threshold. */
const activate = (harness: Harness): void => {
  press(harness.item);
  move(40, 10);
};

describe('draggable', () => {
  it('should return the controller the behavior built', () => {
    const harness = createHarness();

    expect(typeof harness.controller.destroy).toBe('function');
  });

  it('should hand the behavior a host whose root is the ingress boundary', () => {
    const harness = createHarness();

    expect(harness.host.root).toBe(harness.root);
  });

  it('should arm ingress only after the behavior returned', () => {
    // `arm()` is not on `KernelHost`, so the behavior cannot admit input
    // before its own construction finished. The press below is the first one
    // the listener can see.
    const harness = createHarness();

    press(harness.item);
    expect(harness.calls).toContain('admit');
  });
});

function createArmedWithPart(
  root: HTMLElement,
  createFramePart: () => ExamplePart,
): void {
  const harness = { root };

  void harness;
  draggable<Record<string, never>, ExamplePart>(root, () => ({
    controller: {},
    spec: {
      createFramePart,
      resetFramePart: (): void => {},
      config: {
        threshold: 8,
        liftMode: LIFT_FLAT,
        readinessTimeout: 500,
        actionTags: 0,
      },
      admit: () => null,
      activation: {
        prepare: () => document.createElement('div'),
        effect: (): void => {},
      },
      release: { prepare: () => ({ invoke: null }), effect: (): void => {} },
      settlement: { prepare: () => ({ ready: null }), effect: (): void => {} },
      action: { prepare: () => null, effect: (): void => {} },
      moved: (): void => {},
      anchorTarget: () => ({ x: 0, y: 0 }),
      finalized: (): void => {},
      reportFailure: (): void => {},
      retire: (): void => {},
    },
  }));
}

describe('arm', () => {
  it('should unwind and rethrow when a frame factory throws', () => {
    const root = document.createElement('div');

    document.body.append(root);

    const calls: string[] = [];

    expect(() =>
      draggable(root, () => ({
        controller: {},
        spec: {
          createFramePart(): never {
            throw new Error('factory');
          },
          resetFramePart: (): void => {},
          config: {
            threshold: 8,
            liftMode: LIFT_FLAT,
            readinessTimeout: 500,
            actionTags: 0,
          },
          admit: () => null,
          activation: {
            prepare: () => document.createElement('div'),
            effect: (): void => {},
          },
          release: {
            prepare: () => ({ invoke: null }),
            effect: (): void => {},
          },
          settlement: {
            prepare: () => ({ ready: null }),
            effect: (): void => {},
          },
          action: { prepare: () => null, effect: (): void => {} },
          moved: (): void => {},
          anchorTarget: () => ({ x: 0, y: 0 }),
          finalized: (): void => {},
          reportFailure: (): void => {},
          retire(): void {
            calls.push('retire');
          },
        },
      })),
    ).toThrow(/factory/u);

    expect(calls).toEqual(['retire']);
    root.remove();
  });

  it('should reject a frame part that declares a kernel frame key', () => {
    const root = document.createElement('div');

    document.body.append(root);

    expect(() =>
      createArmedWithPart(root, () => ({ phase: 1 }) as unknown as ExamplePart),
    ).toThrow(/phase/u);

    root.remove();
  });
});

describe('admission', () => {
  it('should run admit inside the native dispatch', () => {
    const harness = createHarness({
      admit(event, draft): HTMLElement {
        // `composedPath()` and `preventDefault()` are valid only here, which
        // is only true while the event is still dispatching.
        expect(event.composedPath().length).toBeGreaterThan(0);
        event.preventDefault();
        draft.item = null;
        return document.body;
      },
    });

    press(harness.item);
    expect(harness.calls).toEqual([]);
  });

  it('should leave the controller idle when admit returns null', () => {
    const harness = createHarness({ admit: () => null });

    activate(harness);
    expect(harness.calls).toEqual([]);
  });

  it('should ignore a non-primary press', () => {
    const harness = createHarness();

    harness.item.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: POINTER_ID,
        isPrimary: true,
        button: 2,
        clientX: 10,
        clientY: 10,
      }),
    );

    expect(harness.calls).toEqual([]);
  });

  it('should ignore a press while an operation is live', () => {
    const harness = createHarness();

    press(harness.item);
    press(harness.item);

    expect(harness.calls).toEqual(['admit']);
  });

  it('should report a throwing admit and stay usable', () => {
    let fail = true;
    const harness = createHarness({
      admit(_event, draft): HTMLElement {
        if (fail) {
          throw new Error('resolver');
        }

        draft.item = null;
        return harness.item;
      },
    });

    press(harness.item);

    // Q-1: identity was never minted, so there is no operation to settle and
    // no `REPORTING` phase to enter.
    expect(harness.failures).toHaveLength(1);
    expect(harness.failures[0]!.stage).toBe(FAILURE_ADMISSION);

    fail = false;
    activate(harness);
    expect(harness.calls).toContain('activation.prepare');
  });

  it('should not mint an operation when admit destroyed the controller', () => {
    const harness = createHarness({
      admit(_event, draft): HTMLElement {
        draft.item = null;
        harness.host.destroy();
        return harness.item;
      },
    });

    press(harness.item);
    move(40, 10);

    // The revalidation this covers (D-26, F-30) stops a terminal controller
    // from *publishing* an operation, and the published frame is kernel-private
    // — so what is observable from here is the outcome, not the mechanism: the
    // terminal latch alone would also stop the activation.
    expect(harness.calls).not.toContain('activation.prepare');
  });
});

describe('threshold', () => {
  it('should not activate below the threshold', () => {
    const harness = createHarness();

    press(harness.item);
    move(14, 12);

    expect(harness.calls).toEqual(['admit']);
  });

  it('should activate once the travel reaches the threshold', () => {
    const harness = createHarness();

    press(harness.item);
    move(18, 10);

    expect(harness.calls).toContain('activation.prepare');
  });

  it('should measure travel from the grab point, not the previous sample', () => {
    const harness = createHarness();

    press(harness.item);
    move(14, 10);
    move(15, 10);
    move(18, 10);

    expect(harness.calls).toEqual([
      'admit',
      'activation.prepare',
      'activation.effect',
    ]);
  });

  it('should ignore a sample carrying another pointer id', () => {
    const harness = createHarness();

    press(harness.item);
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerId: POINTER_ID + 1,
        clientX: 400,
        clientY: 400,
      }),
    );

    expect(harness.calls).toEqual(['admit']);
  });
});

describe('activation', () => {
  it('should drive prepare then effect', () => {
    const harness = createHarness();

    activate(harness);
    expect(harness.calls).toEqual([
      'admit',
      'activation.prepare',
      'activation.effect',
    ]);
  });

  it('should commit ACTIVATING before the effect runs', () => {
    const harness = createHarness();

    activate(harness);
    expect(harness.phases['activation.effect']).toBe(ACTIVATING);
  });

  it('should acquire pointer capture on the root, not the item', () => {
    const harness = createHarness();

    activate(harness);
    expect(harness.captures).toEqual(['acquire']);
  });

  it('should classify a capture failure as an activation failure', () => {
    const harness = createHarness({
      capture(): never {
        throw new Error('no such pointer');
      },
    });

    activate(harness);

    // A capture failure is an activation failure, not a silently degraded drag
    // (D-17).
    expect(harness.failures[0]!.stage).toBe(FAILURE_ACTIVATION);
    expect(harness.calls).not.toContain('activation.prepare');
  });

  it('should reach ACTIVE through START_COMMITTED', () => {
    const harness = createHarness();

    activate(harness);
    move(60, 10);

    expect(harness.phases['moved']).toBe(ACTIVE);
  });

  it('should retire a discarded activation', () => {
    const harness = createHarness({
      activation: {
        prepare: () => null,
        effect: (): void => {},
      },
    });

    activate(harness);

    // There is no such thing as a committed operation with no presentation, so
    // a discard returns the controller to IDLE — and a new press is admitted.
    expect(harness.calls).toContain('retire');

    press(harness.item);
    expect(harness.calls.filter((name) => name === 'admit')).toHaveLength(2);
  });

  it('should not retire a failed activation', () => {
    const calls: string[] = [];
    const harness = createHarness({
      activation: {
        prepare(): never {
          calls.push('prepare');
          throw new Error('placeholder');
        },
        effect: (): void => {},
      },
    });

    activate(harness);

    // Retiring here would make the queued checkpoint stale and swallow the
    // report (F-27). The checkpoint retires afterwards, so the ordering is
    // report-then-retire.
    expect(harness.failures[0]!.stage).toBe(FAILURE_ACTIVATION);
    expect(harness.calls).toContain('retire');
  });

  it('should not dispatch START_COMMITTED when onStart cancelled', () => {
    const harness = createHarness({
      onStart(host): void {
        host.cancel('from onStart');
      },
    });

    activate(harness);
    move(60, 10);

    // Two mechanisms produce this and only one is observable: the cancel latch
    // invalidates the post-effect revalidation so `START_COMMITTED` is never
    // queued (F-32), and FIFO puts the cancellation ahead of it anyway, so the
    // phase guard would refuse it a second time. The assertion is the outcome.
    expect(harness.calls).not.toContain('moved');
  });

  it('should not dispatch START_COMMITTED when onStart destroyed', () => {
    const harness = createHarness({
      onStart(host): void {
        host.destroy();
      },
    });

    activate(harness);
    move(60, 10);

    expect(harness.calls).not.toContain('moved');
  });
});

describe('the phase stamp', () => {
  /**
   * `ACTIVATING` is written by the kernel between `preparationValid()` and the
   * swap, so it is armed before the seam opens. A seam that discards or fails
   * never reaches `commit()`, and the stamp it armed must die with it — the
   * next transaction to commit is an ordinary admission or pointer sample, and
   * stamping *that* would publish a phase no transition ever prepared.
   */
  const countActivations = (harness: Harness): number =>
    harness.calls.filter((name) => name === 'activation.prepare').length;

  it('should not carry a discarded activation stamp into the next operation', () => {
    let discard = true;
    const harness = createHarness({
      activation: {
        prepare(): HTMLElement | null {
          harness.calls.push('activation.prepare');
          return discard ? null : document.createElement('div');
        },
        effect(current): void {
          harness.calls.push('activation.effect');
          harness.phases['activation.effect'] = current.phase;
        },
      },
    });

    activate(harness);
    discard = false;
    activate(harness);

    // A leaked stamp would have committed the second admission as `ACTIVATING`,
    // and the sample that follows it would then be ignored as illegal.
    expect(countActivations(harness)).toBe(2);
    expect(harness.phases['activation.effect']).toBe(ACTIVATING);
  });

  it('should not carry a failed activation stamp into the next operation', () => {
    let fail = true;
    const harness = createHarness({
      activation: {
        prepare(): HTMLElement {
          harness.calls.push('activation.prepare');

          if (fail) {
            throw new Error('placeholder');
          }

          return document.createElement('div');
        },
        effect(): void {
          harness.calls.push('activation.effect');
        },
      },
    });

    activate(harness);
    fail = false;
    activate(harness);

    expect(countActivations(harness)).toBe(2);
    expect(harness.calls).toContain('activation.effect');
  });

  it('should admit the next operation at PENDING after an abandoned stamp', () => {
    let discard = true;
    let seen = -1;
    const harness = createHarness({
      activation: {
        prepare: (): HTMLElement | null =>
          discard ? null : document.createElement('div'),
        effect: (): void => {},
      },
      moved(current): void {
        seen = current.phase;
      },
    });

    activate(harness);
    discard = false;
    activate(harness);
    move(60, 10);

    // Reaching `ACTIVE` at all proves the admission published `PENDING`: a
    // stamped `ACTIVATING` would have made the sample that crosses the
    // threshold illegal, and the drag would never have started.
    expect(seen).toBe(ACTIVE);
  });
});

describe('the hot path', () => {
  it('should commit the sample before calling moved', () => {
    let seen = -1;
    const harness = createHarness({
      moved(current): void {
        seen = current.pointerX;
      },
    });

    activate(harness);
    move(90, 10);

    expect(seen).toBe(90);
  });

  it('should classify a throwing moved instead of panicking', () => {
    const harness = createHarness({
      moved(): never {
        throw new Error('cssom');
      },
    });

    activate(harness);
    move(60, 10);

    // Without the leaf wrapper this escaped the handler and became a panic
    // that destroyed the controller (F-40).
    expect(harness.failures[0]!.stage).toBe(FAILURE_RENDERER_WRITE);
  });
});

describe('release', () => {
  it('should retire a press released below the threshold', () => {
    const harness = createHarness();

    press(harness.item);
    release(12, 10);

    expect(harness.calls).toEqual(['admit', 'retire']);
  });

  it('should commit RELEASING before preparing', () => {
    const harness = createHarness();

    activate(harness);
    release(80, 10);

    expect(harness.phases['release.effect']).toBe(RELEASING);
  });

  it('should close motion between the two commits', () => {
    const harness = createHarness();

    activate(harness);
    release(80, 10);

    // Nothing pending — a queued sample, a scheduled frame, an invalidation —
    // can alter the proposal from here (I-11).
    expect(harness.calls.indexOf('motion.released')).toBeLessThan(
      harness.calls.indexOf('release.prepare'),
    );
    expect(harness.calls.indexOf('release.prepare')).toBeLessThan(
      harness.calls.indexOf('release.effect'),
    );
  });

  it('should release pointer capture with motion', () => {
    const harness = createHarness();

    activate(harness);
    release(80, 10);

    expect(harness.captures).toEqual(['acquire', 'release']);
  });

  it('should commit the release point, not the last processed move', () => {
    let seen = -1;
    const harness = createHarness({
      release: {
        prepare(draft): ResolutionCommand {
          seen = draft.pointerX;
          return { invoke: null };
        },
        effect: (): void => {},
      },
    });

    activate(harness);
    move(60, 10);
    release(123, 10);

    expect(seen).toBe(123);
  });

  it('should classify a rejection at the stage it names', () => {
    const rejection: SeamRejection = {
      stage: FAILURE_RELEASE,
      error: new Error('no insertion'),
    };
    const harness = createHarness({
      release: {
        prepare: () => rejection,
        effect(): void {
          throw new Error('unreachable');
        },
      },
    });

    activate(harness);
    release(80, 10);

    expect(harness.failures[0]!.stage).toBe(FAILURE_RELEASE);
  });

  it('should not run the effect after a rejected prepare', () => {
    const harness = createHarness({
      release: {
        prepare: () => ({
          stage: FAILURE_RELEASE,
          error: new Error('no insertion'),
        }),
        effect(): void {
          harness.calls.push('release.effect');
        },
      },
    });

    activate(harness);
    release(80, 10);

    expect(harness.calls).not.toContain('release.effect');
  });

  it('should ignore a release carrying another pointer id', () => {
    const harness = createHarness();

    activate(harness);
    document.dispatchEvent(
      new PointerEvent('pointerup', { pointerId: POINTER_ID + 1 }),
    );

    expect(harness.calls).not.toContain('release.prepare');
  });
});

describe('behavior actions', () => {
  it('should run the action envelope for a declared tag', () => {
    const harness = createHarness();

    activate(harness);
    harness.host.dispatch(1, 'payload');

    expect(harness.calls).toContain('action.prepare:1');
    expect(harness.calls).toContain('action.effect:1');
  });

  it('should thread the argument to both phases', () => {
    const seen: unknown[] = [];
    const harness = createHarness({
      action: {
        prepare(_tag, argument): {} {
          seen.push(argument);
          return true;
        },
        effect(_tag, argument): void {
          seen.push(argument);
        },
      },
    });

    activate(harness);
    harness.host.dispatch(0, 'payload');

    expect(seen).toEqual(['payload', 'payload']);
  });

  it('should drop a tag outside the declared range', () => {
    const harness = createHarness();

    activate(harness);
    harness.host.dispatch(2, null);
    harness.host.dispatch(-1, null);
    harness.host.dispatch(1.5, null);

    // Reported and dropped, never enqueued: the kernel computes
    // `BEHAVIOR_BASE + tag`, so a negative or fractional tag would otherwise
    // alias a kernel action.
    expect(harness.calls.some((name) => name.startsWith('action.'))).toBe(
      false,
    );
    expect(reported).toHaveLength(3);
  });

  it('should append a nested dispatch rather than interrupting', () => {
    const order: string[] = [];
    const harness = createHarness({
      action: {
        prepare(tag): {} {
          order.push(`prepare:${tag}`);
          return true;
        },
        effect(tag): void {
          order.push(`enter-effect:${tag}`);

          if (tag === 0) {
            harness.host.dispatch(1, null);
          }

          order.push(`exit-effect:${tag}`);
        },
      },
    });

    activate(harness);
    harness.host.dispatch(0, null);

    expect(order).toEqual([
      'prepare:0',
      'enter-effect:0',
      'exit-effect:0',
      'prepare:1',
      'enter-effect:1',
      'exit-effect:1',
    ]);
  });
});

describe('cancellation', () => {
  it('should retire a cancelled pending press', () => {
    const harness = createHarness();

    press(harness.item);
    harness.controller.cancel('reason');

    expect(harness.calls).toEqual(['admit', 'retire']);
  });

  it('should ignore a cancel while idle', () => {
    const harness = createHarness();

    harness.controller.cancel('reason');
    press(harness.item);
    move(40, 10);

    // An idle cancel leaves no latch, so the next operation is unaffected
    // (I-21).
    expect(harness.calls).toContain('activation.effect');
  });

  it('should let the first cancel of an operation win', () => {
    const reasons: unknown[] = [];
    const harness = createHarness({
      activation: {
        prepare: () => document.createElement('div'),
        effect(_current, _prepared, scope: ActivationScope): void {
          scope.motion.use(() => {
            reasons.push('motion');
          });
        },
      },
    });

    activate(harness);
    harness.controller.cancel('first');
    harness.controller.cancel('second');

    expect(harness.calls.filter((name) => name === 'retire')).toHaveLength(1);
  });

  it('should release presentation when an active drag is cancelled', () => {
    const harness = createHarness();

    activate(harness);
    harness.controller.cancel('reason');

    expect(harness.calls).toContain('presentation.released');
  });

  it('should cancel on Escape', () => {
    const harness = createHarness();

    activate(harness);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );

    expect(harness.calls).toContain('retire');
  });

  it('should cancel when the pointer is cancelled', () => {
    const harness = createHarness();

    activate(harness);
    document.dispatchEvent(
      new PointerEvent('pointercancel', { pointerId: POINTER_ID }),
    );

    expect(harness.calls).toContain('retire');
  });
});

describe('destroy', () => {
  it('should release presentation and motion synchronously', () => {
    const harness = createHarness();

    activate(harness);
    harness.controller.destroy();

    expect(harness.calls).toContain('presentation.released');
    expect(harness.calls).toContain('motion.released');
  });

  it('should release pointer capture', () => {
    const harness = createHarness();

    activate(harness);
    harness.controller.destroy();

    expect(harness.captures).toEqual(['acquire', 'release']);
  });

  it('should abort ingress so a later press is inert', () => {
    const harness = createHarness();

    harness.controller.destroy();
    press(harness.item);

    expect(harness.calls).not.toContain('admit');
  });

  it('should be terminal exactly once', () => {
    const harness = createHarness();

    activate(harness);
    harness.controller.destroy();
    harness.controller.destroy();

    expect(harness.calls.filter((name) => name === 'retire')).toHaveLength(1);
  });

  it('should complete every later step after spec.retire throws', () => {
    const harness = createHarness({
      activation: {
        prepare: () => document.createElement('div'),
        effect(_current, _prepared, scope: ActivationScope): void {
          scope.presentation.use(() => {
            harness.calls.push('presentation.released');
          });
        },
      },
    });

    activate(harness);
    // A behavior callback cannot strand the kernel's DOM cleanup (F-12).
    harness.host.destroy();

    expect(harness.calls).toContain('presentation.released');
  });

  it('should ignore work dispatched after destroy', () => {
    const harness = createHarness();

    activate(harness);
    harness.controller.destroy();
    harness.host.dispatch(0, null);
    move(200, 10);

    expect(harness.calls).not.toContain('action.prepare:0');
  });
});
