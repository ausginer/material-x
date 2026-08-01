import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { draggable } from '../../src/drag.ts';
import {
  AT_CONSUMER,
  AT_PROPOSAL,
  FAILURE_ACTIVATION,
  FAILURE_ADMISSION,
  FAILURE_LANDING_CREATE,
  FAILURE_LANDING_INTERRUPTED,
  FAILURE_LANDING_TARGET,
  FAILURE_PRESENTATION_READY,
  FAILURE_RELEASE,
  FAILURE_RENDERER_WRITE,
  FAILURE_REORDER_RESOLUTION,
  FAILURE_TERMINAL_CALLBACK,
  type FailureStage,
} from '../../src/kernel/failures.ts';
import type { Frame } from '../../src/kernel/frames.ts';
import {
  ACTIVATING,
  ACTIVE,
  FINALIZING,
  RELEASING,
  SETTLING,
} from '../../src/kernel/phases.ts';
import { LIFT_FLAT } from '../../src/kernel/presentation.ts';
import {
  type ActivationScope,
  type BehaviorSpec,
  brandBehavior,
  type KernelHost,
  type LandingHandle,
  type LandingStart,
  type PreparedSettlement,
  type ResolutionCommand,
  type SeamRejection,
  SETTLED_CANCELED,
  SETTLED_FAILED,
  SETTLED_FULFILLED,
  SETTLED_REJECTED,
  SETTLED_SKIPPED,
  type SettlementInput,
  type SettlementScope,
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
  /**
   * Every classified failure the behavior saw — through the `SETTLED_FAILED`
   * settlement input for an operation, and through `spec.reportFailure` for the
   * admission case, which has no operation to settle.
   */
  failures: Array<Readonly<{ stage: FailureStage; error: unknown }>>;
  /** Every settlement input, in order. */
  settlements: SettlementInput[];
  captures: string[];
}>;

type SpecOverrides = Partial<
  Pick<
    BehaviorSpec<ExamplePart>,
    | 'admit'
    | 'activation'
    | 'release'
    | 'settlement'
    | 'action'
    | 'moved'
    | 'anchorTarget'
    | 'finalized'
    | 'createFramePart'
    // Injectable so the teardown matrix can be expressed through the shared
    // harness: `resetFramePart` is a foreign teardown boundary the contract
    // explicitly permits to throw.
    | 'resetFramePart'
    | 'retire'
  >
> &
  Readonly<{
    threshold?: number;
    readinessTimeout?: number;
    /** Called with the host, so a test can cancel or destroy from a seam. */
    onStart?(host: KernelHost): void;
    capture?(): void;
    /** Requested by the default `settlement.effect`, when present. */
    readiness?: PromiseLike<void>;
    /** Requested by the default `settlement.effect`, when present. */
    startLanding?: LandingStart;
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
  const settlements: SettlementInput[] = [];
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

  const controller = draggable(
    root,
    brandBehavior<
      { cancel(reason?: unknown): void; destroy(): void },
      ExamplePart
    >((kernelHost) => {
      host = kernelHost;

      const spec: BehaviorSpec<ExamplePart> = {
        createFramePart:
          overrides.createFramePart ??
          ((): ExamplePart => ({ item: null, note: '' })),
        resetFramePart:
          overrides.resetFramePart ??
          ((part): void => {
            part.item = null;
            part.note = '';
          }),
        config: {
          threshold: overrides.threshold ?? 8,
          liftMode: LIFT_FLAT,
          readinessTimeout: overrides.readinessTimeout ?? 500,
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
        settlement: overrides.settlement ?? {
          prepare(_draft, input): PreparedSettlement {
            record('settlement.prepare');
            settlements.push(input);

            // The behavior owns terminal classification: a `SETTLED_FAILED`
            // input is how a classified failure reaches the consumer.
            if (input.type === SETTLED_FAILED) {
              failures.push({ stage: input.stage, error: input.error });
            }

            return { ready: overrides.readiness ?? null };
          },
          effect(current, prepared, scope: SettlementScope): void {
            record('settlement.effect', current);

            if (prepared.ready !== null) {
              scope.holdForReadiness(prepared.ready);
            }

            if (overrides.startLanding) {
              scope.holdForLanding(overrides.startLanding);
            }
          },
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
        anchorTarget:
          overrides.anchorTarget ??
          ((_current, authoredReady) => {
            calls.push(`anchorTarget:${String(authoredReady)}`);
            return { x: 0, y: 0 };
          }),
        finalized:
          overrides.finalized ??
          ((): void => {
            calls.push('finalized');
          }),
        reportFailure(stage, error): void {
          failures.push({ stage, error });
        },
        retire:
          overrides.retire ??
          ((): void => {
            calls.push('retire');
          }),
      };

      return {
        spec,
        controller: { cancel: host.cancel, destroy: host.destroy },
      };
    }),
  );

  cleanup.push(() => {
    controller.destroy();
    root.remove();
  });

  return {
    root,
    item,
    host,
    controller,
    calls,
    phases,
    failures,
    settlements,
    captures,
  };
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

/** Lets every queued microtask and a zero-delay timer run. */
const flush = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

const releaseWith = (
  invoke: ResolutionCommand['invoke'],
): BehaviorSpec<ExamplePart>['release'] => ({
  prepare: () => ({ invoke }),
  effect: (): void => {},
});

type Runner = Readonly<{
  start: LandingStart;
  /** `start`, `destroy` and `retarget`, in order. */
  calls: string[];
  targets: Array<Readonly<{ x: number; y: number }>>;
  done(): void;
  fail(error: unknown): void;
}>;

/**
 * A landing runner double. `onStart` runs *inside* `start`, which is where the
 * synchronous-completion cases live.
 */
function createRunner(
  options: Readonly<{
    onStart?(done: () => void, fail: (error: unknown) => void): void;
    onDestroy?(): void;
    retarget?: boolean;
  }> = {},
): Runner {
  const calls: string[] = [];
  const targets: Array<Readonly<{ x: number; y: number }>> = [];
  let complete: (() => void) | null = null;
  let reject: ((error: unknown) => void) | null = null;

  const handle: LandingHandle = {
    destroy(): void {
      calls.push('destroy');
      options.onDestroy?.();
    },
    retarget:
      options.retarget === false
        ? undefined
        : (target): void => {
            calls.push('retarget');
            targets.push(target);
          },
  };

  return {
    calls,
    targets,
    start(_context, done, fail): LandingHandle {
      calls.push('start');
      complete = done;
      reject = fail;
      options.onStart?.(done, fail);
      return handle;
    },
    done(): void {
      complete!();
    },
    fail(error): void {
      reject!(error);
    },
  };
}

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
  draggable(
    root,
    brandBehavior<Record<string, never>, ExamplePart>(() => ({
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
        settlement: {
          prepare: () => ({ ready: null }),
          effect: (): void => {},
        },
        action: { prepare: () => null, effect: (): void => {} },
        moved: (): void => {},
        anchorTarget: () => ({ x: 0, y: 0 }),
        finalized: (): void => {},
        reportFailure: (): void => {},
        retire: (): void => {},
      },
    })),
  );
}

describe('arm', () => {
  it('should unwind and rethrow when a frame factory throws', () => {
    const root = document.createElement('div');

    document.body.append(root);

    const calls: string[] = [];

    expect(() =>
      draggable(
        root,
        brandBehavior(() => ({
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
      ),
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

describe('the resolution round-trip', () => {
  it('should settle a null command as skipped', () => {
    const harness = createHarness();

    activate(harness);
    release(80, 10);

    // `invoke: null` asserts a proven semantic no-op. It is not a rejection and
    // not a failure (F-29).
    expect(harness.settlements).toEqual([{ type: SETTLED_SKIPPED }]);
  });

  it('should settle a synchronously returned value as fulfilled', () => {
    const harness = createHarness({ release: releaseWith(() => 'verdict') });

    activate(harness);
    release(80, 10);

    expect(harness.settlements).toEqual([
      { type: SETTLED_FULFILLED, value: 'verdict' },
    ]);
  });

  it('should settle a thenable when it resolves', async () => {
    const harness = createHarness({
      release: releaseWith(() => Promise.resolve('verdict')),
    });

    activate(harness);
    release(80, 10);

    // A thenable is asynchronous: nothing is settled in the release drain.
    expect(harness.settlements).toEqual([]);
    await flush();
    expect(harness.settlements).toEqual([
      { type: SETTLED_FULFILLED, value: 'verdict' },
    ]);
  });

  it('should settle a rejected thenable as rejected', async () => {
    const error = new Error('resolver');
    const harness = createHarness({
      release: releaseWith(() => Promise.reject(error)),
    });

    activate(harness);
    release(80, 10);
    await flush();

    // A resolver malfunction is a named classified failure, never an inferred
    // `onCancel` (F-29).
    expect(harness.settlements).toEqual([{ type: SETTLED_REJECTED, error }]);
  });

  it('should settle a throwing invoke as rejected', () => {
    const error = new Error('resolver');
    const harness = createHarness({
      release: releaseWith(() => {
        throw error;
      }),
    });

    activate(harness);
    release(80, 10);

    expect(harness.settlements).toEqual([{ type: SETTLED_REJECTED, error }]);
  });

  it('should not execute the command when the release effect failed', () => {
    let invoked = false;
    const harness = createHarness({
      release: {
        prepare: () => ({
          invoke: (): void => {
            invoked = true;
          },
        }),
        effect(): never {
          throw new Error('placeholder');
        },
      },
    });

    activate(harness);
    release(80, 10);

    // The consumer never sees the round-trip for a release whose committed
    // presentation effect threw (F-27).
    expect(invoked).toBe(false);
  });

  it('should abort the resolver signal when the operation is cancelled', () => {
    let signal!: AbortSignal;
    const harness = createHarness({
      release: releaseWith((given) => {
        signal = given;
        return new Promise(() => {});
      }),
    });

    activate(harness);
    release(80, 10);
    expect(signal.aborted).toBe(false);

    harness.controller.cancel('reason');
    expect(signal.aborted).toBe(true);
  });

  it('should not abort the signal of a resolver that already completed', () => {
    let signal!: AbortSignal;
    const harness = createHarness({
      release: releaseWith((given) => {
        signal = given;
        return 'verdict';
      }),
    });

    activate(harness);
    release(80, 10);

    // The guard keys off `completed`, not off the payload: keying it off the
    // payload would abort a finished resolver's own signal.
    expect(signal.aborted).toBe(false);
  });

  it('should let a cancel raised from inside invoke win', () => {
    const harness = createHarness({
      release: releaseWith((): string => {
        harness.host.cancel('from onReorder');
        return 'verdict';
      }),
    });

    activate(harness);
    release(80, 10);

    // `invoke` must run consumer code before it has a value to settle, and a
    // nested dispatch appends in call order — so CANCEL is queued first and the
    // resolution is then stale for a decided operation (F-25).
    expect(harness.settlements).toHaveLength(1);
    expect(harness.settlements[0]!.type).toBe(SETTLED_CANCELED);
  });

  it('should drop a resolution that settles after the controller was destroyed', async () => {
    const harness = createHarness({
      release: releaseWith(() => Promise.resolve('verdict')),
    });

    activate(harness);
    release(80, 10);
    harness.controller.destroy();
    await flush();

    expect(harness.settlements).toEqual([]);
  });
});

describe('the settlement seam', () => {
  it('should commit SETTLING before the effect runs', () => {
    const harness = createHarness();

    activate(harness);
    release(80, 10);

    expect(harness.phases['settlement.effect']).toBe(SETTLING);
  });

  it('should classify a prepare rejection at the stage it names', () => {
    const harness = createHarness({
      settlement: {
        prepare(_draft, input): PreparedSettlement | SeamRejection {
          // The checkpoint the rejection queues drives this same seam, so the
          // failed input is what records the classification.
          if (input.type === SETTLED_FAILED) {
            harness.failures.push({ stage: input.stage, error: input.error });
            return { ready: null };
          }

          return {
            stage: FAILURE_REORDER_RESOLUTION,
            error: new Error('not a resolution'),
          };
        },
        effect(): void {},
      },
    });

    activate(harness);
    release(80, 10);

    // Acceptance is never inferred: a fulfilled value that is not an explicit
    // resolution is classified, and nothing below the rejection runs.
    expect(harness.failures[0]!.stage).toBe(FAILURE_REORDER_RESOLUTION);
    expect(harness.calls).not.toContain('finalized');
  });

  it('should close motion and cancellation before the behavior effect', () => {
    const harness = createHarness({
      settlement: {
        prepare: () => ({ ready: null }),
        effect(): void {
          harness.calls.push('settlement.effect');
        },
      },
    });

    // A cancel at ACTIVE reaches settlement with pointer input still open, so
    // the seam is where both close. Both are latched, so a release that already
    // closed motion pays nothing.
    activate(harness);
    harness.controller.cancel('reason');

    expect(harness.calls.indexOf('motion.released')).toBeLessThan(
      harness.calls.indexOf('settlement.effect'),
    );
  });

  it('should arm nothing when the effect throws after requesting a hold', () => {
    const runner = createRunner();
    const harness = createHarness({
      settlement: {
        prepare: () => ({ ready: null }),
        effect(_current, _prepared, scope: SettlementScope): never {
          scope.holdForLanding(runner.start);
          throw new Error('effect');
        },
      },
    });

    activate(harness);
    release(80, 10);

    // Arming a half-requested plan would start a runner for a settlement that
    // has already failed; the queued checkpoint decides instead (F-27).
    expect(runner.calls).toEqual([]);
    expect(harness.calls).not.toContain('finalized');
  });
});

describe('the settlement gates', () => {
  it('should finalize in the resolution drain when neither gate is held', () => {
    const harness = createHarness();

    activate(harness);
    release(80, 10);

    expect(harness.calls).toContain('finalized');
  });

  it('should not finalize in the resolution drain while readiness is held', () => {
    const harness = createHarness({ readiness: new Promise(() => {}) });

    activate(harness);
    release(80, 10);

    // With no `landing()` feature installed the behavior holds no landing gate
    // — but readiness is independent, and one held gate is enough (I-9).
    expect(harness.calls).not.toContain('finalized');
    expect(harness.calls).not.toContain('presentation.released');
  });

  it('should not finalize while the landing gate is held', () => {
    const runner = createRunner();
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);

    expect(runner.calls).toEqual(['start']);
    expect(harness.calls).not.toContain('finalized');
  });

  it('should ignore and report a duplicate hold', () => {
    const ready = new Promise<void>(() => {});
    const harness = createHarness({
      settlement: {
        prepare: () => ({ ready: null }),
        effect(_current, _prepared, scope: SettlementScope): void {
          scope.holdForReadiness(ready);
          scope.holdForReadiness(ready);
        },
      },
    });

    activate(harness);
    release(80, 10);

    // Ignored, reported through the platform reporter, and — crucially — not
    // double-counted: one release still opens the gate.
    expect(reported).toHaveLength(1);
    expect(harness.calls).not.toContain('finalized');
  });

  it('should ignore and report a hold requested after sealing', () => {
    let escaped!: SettlementScope;
    const harness = createHarness({
      settlement: {
        prepare: () => ({ ready: null }),
        effect(_current, _prepared, scope: SettlementScope): void {
          escaped = scope;
        },
      },
    });

    activate(harness);
    release(80, 10);
    escaped.holdForReadiness(new Promise<void>(() => {}));

    // A bookkeeping error must not destroy a live drop: it never overwrites a
    // watch, never double-increments and never panics.
    expect(reported).toHaveLength(1);
    expect(harness.calls).toContain('finalized');
  });
});

describe('landing', () => {
  it('should measure with authoredReady true when no readiness was supplied', () => {
    const runner = createRunner();
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);

    // An absent promise means the consumer asserted its presentation is ready
    // synchronously, so the arm-time measurement does re-anchor.
    expect(harness.calls).toContain('anchorTarget:true');
  });

  it('should measure with authoredReady false while readiness is pending', () => {
    const runner = createRunner();
    const harness = createHarness({
      startLanding: runner.start,
      readiness: new Promise(() => {}),
    });

    activate(harness);
    release(80, 10);

    // React has not committed yet, so re-anchoring now would drag the
    // placeholder back beside the item's old slot (D-16).
    expect(harness.calls).toContain('anchorTarget:false');
  });

  it('should honour a done() called synchronously inside start', () => {
    const runner = createRunner({
      onStart(done): void {
        done();
      },
    });
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);

    // The hold was reserved before `start` was called, so the completion finds
    // a real hold, and the handle is stored before the queued completion can be
    // applied (F-21).
    expect(harness.calls).toContain('finalized');
    expect(runner.calls).toEqual(['start', 'destroy']);
  });

  it('should destroy the handle and refuse to finalize after a synchronous fail()', () => {
    const runner = createRunner({
      onStart(_done, fail): void {
        fail(new Error('runner'));
      },
    });
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);

    // `attempt.failed` is set before `start` returns, so the post-`start`
    // revalidation destroys the returned handle instead of publishing it.
    expect(runner.calls).toEqual(['start', 'destroy']);
    expect(harness.failures[0]!.stage).toBe(FAILURE_LANDING_INTERRUPTED);
    expect(harness.calls).not.toContain('finalized');
  });

  it('should retain a synchronously completed handle for the join', async () => {
    const runner = createRunner({
      onStart(done): void {
        done();
      },
    });
    let ready!: () => void;
    const harness = createHarness({
      startLanding: runner.start,
      readiness: new Promise<void>((resolve) => {
        ready = resolve;
      }),
    });

    activate(harness);
    release(80, 10);

    // The completion released the landing hold, but readiness still holds one,
    // so the handle must survive: it is deliberately retained past its gate
    // release so the join can relinquish the transform before the pin.
    expect(runner.calls).toEqual(['start']);

    ready();
    await flush();

    expect(runner.calls).toEqual(['start', 'destroy']);
    expect(harness.calls).toContain('finalized');
  });

  it('should not retarget a synchronously completed runner', async () => {
    const runner = createRunner({
      onStart(done): void {
        done();
      },
    });
    let ready!: () => void;
    const harness = createHarness({
      startLanding: runner.start,
      readiness: new Promise<void>((resolve) => {
        ready = resolve;
      }),
    });

    activate(harness);
    release(80, 10);
    ready();
    await flush();

    // `landingHeld` is already false when readiness settles, so the completed
    // runner is never asked to improve a trajectory it has finished.
    expect(runner.targets).toEqual([]);
  });

  it('should destroy a handle whose start completed and then destroyed', () => {
    const calls: string[] = [];
    const harness = createHarness({
      startLanding(_context, done): LandingHandle {
        calls.push('start');
        done();
        harness.host.destroy();
        return {
          destroy(): void {
            calls.push('destroy');
          },
        };
      },
    });

    activate(harness);
    release(80, 10);

    // The completion was queued against a live attempt and the destroy retired
    // that attempt before the drain reached it, so the handle arrives with
    // nothing left to own it. It is closed exactly once and never published.
    expect(calls).toEqual(['start', 'destroy']);
    expect(harness.calls).not.toContain('finalized');
  });

  it('should let the first completion win', () => {
    const runner = createRunner({
      onStart(done, fail): void {
        done();
        fail(new Error('too late'));
      },
    });
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);

    expect(harness.failures).toEqual([]);
    expect(harness.calls).toContain('finalized');
  });

  it('should ignore a duplicate completion', () => {
    const runner = createRunner();
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);
    runner.done();
    runner.done();

    expect(harness.calls.filter((name) => name === 'finalized')).toHaveLength(
      1,
    );
  });

  it('should roll the hold back and classify when start throws', () => {
    const harness = createHarness({
      startLanding(): never {
        throw new Error('animation');
      },
    });

    activate(harness);
    release(80, 10);

    // ARM_FAILED: the original settlement neither advances nor calls its
    // terminal callback, and the queued checkpoint owns recovery (F-35).
    expect(harness.failures[0]!.stage).toBe(FAILURE_LANDING_CREATE);
    expect(harness.calls).not.toContain('finalized');
  });

  it('should classify an arm-time anchorTarget failure and never start', () => {
    const runner = createRunner();
    const harness = createHarness({
      startLanding: runner.start,
      anchorTarget(): never {
        throw new Error('measure');
      },
    });

    activate(harness);
    release(80, 10);

    expect(runner.calls).toEqual([]);
    expect(harness.failures[0]!.stage).toBe(FAILURE_LANDING_CREATE);
    expect(harness.calls).not.toContain('finalized');
  });

  it('should never call start after anchorTarget destroyed the controller', () => {
    const runner = createRunner();
    const harness = createHarness({
      startLanding: runner.start,
      anchorTarget(): { x: number; y: number } {
        harness.host.destroy();
        return { x: 0, y: 0 };
      },
    });

    activate(harness);
    release(80, 10);

    // Revalidation *before* `start`: calling the consumer's runner after a
    // synchronous destroy would violate I-6 (F-38).
    expect(runner.calls).toEqual([]);
    // And it must be the revalidation that stops it, not a crash: without the
    // check the arm path reads the lift session `destroy()` has already
    // cleared, which panics — also reaching zero `start` calls, but by
    // terminalizing the controller on a TypeError.
    expect(reported).toEqual([]);
  });

  it('should destroy a handle returned by a start that destroyed the controller', () => {
    const calls: string[] = [];
    const harness = createHarness({
      startLanding(): LandingHandle {
        calls.push('start');
        harness.host.destroy();
        return {
          destroy(): void {
            calls.push('destroy');
          },
        };
      },
    });

    activate(harness);
    release(80, 10);

    // Reserve-before-call protects resources that already exist; it does
    // nothing for one the callback *returns*. Revalidating after the return is
    // what stops this runner being stored on a stale attempt (F-30).
    expect(calls).toEqual(['start', 'destroy']);
  });

  it('should destroy a live runner when the controller is destroyed', () => {
    const runner = createRunner();
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);
    harness.controller.destroy();

    expect(runner.calls).toEqual(['start', 'destroy']);
    expect(harness.calls).toContain('presentation.released');
  });

  it('should make a completion for a retired attempt inert', () => {
    const runner = createRunner();
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);
    harness.controller.destroy();
    runner.done();

    expect(harness.calls).not.toContain('finalized');
  });
});

describe('readiness', () => {
  it('should re-anchor and retarget when readiness settles first', async () => {
    const runner = createRunner();
    let ready!: () => void;
    const harness = createHarness({
      startLanding: runner.start,
      readiness: new Promise<void>((resolve) => {
        ready = resolve;
      }),
    });

    activate(harness);
    release(80, 10);
    ready();
    await flush();

    expect(harness.calls).toContain('anchorTarget:true');
    expect(runner.calls).toEqual(['start', 'retarget']);
    expect(harness.calls).not.toContain('finalized');
  });

  it('should not retarget a runner that already completed', async () => {
    const runner = createRunner();
    let ready!: () => void;
    const harness = createHarness({
      startLanding: runner.start,
      readiness: new Promise<void>((resolve) => {
        ready = resolve;
      }),
    });

    activate(harness);
    release(80, 10);
    runner.done();
    ready();
    await flush();

    // The guard is on the hold, not the handle: the handle outlives its gate
    // release so the join can destroy it, and a completed trajectory cannot be
    // improved (F-16).
    expect(runner.calls).toEqual(['start', 'destroy']);
  });

  it('should report a readiness-time measurement failure without classifying it', async () => {
    const runner = createRunner();
    let ready!: () => void;
    let measurements = 0;
    const harness = createHarness({
      startLanding: runner.start,
      readiness: new Promise<void>((resolve) => {
        ready = resolve;
      }),
      anchorTarget(): { x: number; y: number } {
        measurements += 1;

        if (measurements === 2) {
          throw new Error('advisory');
        }

        return { x: 0, y: 0 };
      },
    });

    activate(harness);
    release(80, 10);
    ready();
    await flush();
    runner.done();

    // I-29: nothing on the trajectory-quality path may change the outcome, move
    // a hold or destroy the runner. The join measures again and still pins.
    expect(harness.failures).toEqual([]);
    expect(reported).toHaveLength(1);
    expect(harness.calls).toContain('finalized');
  });

  it('should replace the settlement when readiness rejects', async () => {
    const error = new Error('layout effect');
    const harness = createHarness({ readiness: Promise.reject(error) });

    activate(harness);
    release(80, 10);
    await flush();

    // Presentation stays owned, no re-anchor happens, and it reports through
    // `onError` only — no `onFinish`, no `onCancel`.
    expect(harness.failures[0]).toEqual({
      stage: FAILURE_PRESENTATION_READY,
      error,
    });
    expect(harness.calls).not.toContain('finalized');
  });

  it('should replace the settlement when readiness times out', async () => {
    const harness = createHarness({
      readiness: new Promise(() => {}),
      readinessTimeout: 1,
    });

    activate(harness);
    release(80, 10);
    await flush();

    expect(harness.failures[0]!.stage).toBe(FAILURE_PRESENTATION_READY);
    expect(harness.calls).not.toContain('finalized');
  });

  it('should not time out a readiness that already settled', async () => {
    let ready!: () => void;
    const harness = createHarness({
      readiness: new Promise<void>((resolve) => {
        ready = resolve;
      }),
      readinessTimeout: 1,
    });

    activate(harness);
    release(80, 10);
    ready();
    await flush();

    expect(harness.failures).toEqual([]);
    expect(harness.calls).toContain('finalized');
  });
});

describe('the join', () => {
  it('should destroy the runner before pinning and release presentation last', () => {
    const runner = createRunner();
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);
    runner.done();

    // Ordering is normative: measure → relinquish → pin → release → finalize.
    // The runner must relinquish the transform before the pin, or a running
    // animation overrides the inline style.
    expect(harness.calls.indexOf('presentation.released')).toBeLessThan(
      harness.calls.indexOf('finalized'),
    );
    expect(runner.calls).toEqual(['start', 'destroy']);
  });

  it('should commit FINALIZING before measuring', () => {
    let seen = -1;
    const harness = createHarness({
      anchorTarget(current): { x: number; y: number } {
        seen = current.phase;
        return { x: 0, y: 0 };
      },
    });

    activate(harness);
    release(80, 10);

    expect(seen).toBe(FINALIZING);
  });

  it('should release presentation and skip the pin when the measurement throws', () => {
    const harness = createHarness({
      anchorTarget(): never {
        throw new Error('measure');
      },
    });

    activate(harness);
    release(80, 10);

    // A measurement failure must not strand the controller: the placeholder is
    // still removed and the inline styles are still restored (F-22).
    expect(harness.failures[0]!.stage).toBe(FAILURE_LANDING_TARGET);
    expect(harness.calls).toContain('presentation.released');
    expect(harness.calls).not.toContain('finalized');
  });

  it('should report a throwing runner destroy and still pin', () => {
    const runner = createRunner({
      onDestroy(): void {
        throw new Error('cancel');
      },
    });
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);
    runner.done();

    // Best-effort: a custom runner cannot strand presentation. The cost is that
    // I-24 is no longer claimed for this operation, not that the drop fails.
    expect(reported).toHaveLength(1);
    expect(harness.failures).toEqual([]);
    expect(harness.calls).toContain('presentation.released');
    expect(harness.calls).toContain('finalized');
  });

  it('should release presentation and skip the callback when the pin throws', () => {
    const harness = createHarness();

    activate(harness);
    // The pin is the one join step the kernel itself performs. Poisoning the
    // inline transform is the only way to make a CSSOM write fail on demand.
    Object.defineProperty(harness.item.style, 'transform', {
      configurable: true,
      get: (): string => '',
      set(): never {
        throw new Error('cssom');
      },
    });
    release(80, 10);

    expect(harness.failures[0]!.stage).toBe(FAILURE_RENDERER_WRITE);
    expect(harness.calls).toContain('presentation.released');
    // The committed frame still carries the accepted outcome, so calling the
    // terminal callback would fire `onFinish` for a drop the queued checkpoint
    // is about to report through `onError` (F-27).
    expect(harness.calls).not.toContain('finalized');
  });

  it('should retire after a throwing terminal callback', () => {
    const harness = createHarness({
      finalized(): never {
        throw new Error('onFinish');
      },
    });

    activate(harness);
    release(80, 10);

    expect(harness.failures[0]!.stage).toBe(FAILURE_TERMINAL_CALLBACK);
    expect(harness.calls).toContain('retire');

    // Terminal, and usable again.
    press(harness.item);
    expect(harness.calls.filter((name) => name === 'admit')).toHaveLength(2);
  });
});

describe('the failure checkpoint', () => {
  it('should drive the settlement seam with the failed input', () => {
    const error = new Error('cssom');
    const harness = createHarness({
      moved(): never {
        throw error;
      },
    });

    activate(harness);
    move(60, 10);

    expect(harness.settlements).toEqual([
      { type: SETTLED_FAILED, stage: FAILURE_RENDERER_WRITE, error },
    ]);
  });

  it('should hold no gate for a failed settlement', () => {
    const runner = createRunner();
    const harness = createHarness({
      moved(): never {
        throw new Error('cssom');
      },
      settlement: {
        prepare: () => ({ ready: null }),
        effect(_current, _prepared, scope: SettlementScope): void {
          scope.holdForLanding(runner.start);
        },
      },
    });

    activate(harness);
    move(60, 10);

    // Sealed from the start: a failed settlement lands nothing, and the request
    // is ignored and reported exactly like a post-seal one.
    expect(runner.calls).toEqual([]);
    expect(reported).toHaveLength(1);
    expect(harness.calls).toContain('retire');
  });

  it('should retire the operation after reporting', () => {
    const harness = createHarness({
      moved(): never {
        throw new Error('cssom');
      },
    });

    activate(harness);
    move(60, 10);

    expect(harness.calls).toContain('retire');

    press(harness.item);
    expect(harness.calls.filter((name) => name === 'admit')).toHaveLength(2);
  });

  it('should ignore a second checkpoint while a report is in flight', () => {
    let reporting = false;
    const harness = createHarness({
      moved(): never {
        throw new Error('cssom');
      },
      settlement: {
        prepare(_draft, input): PreparedSettlement {
          harness.settlements.push(input);

          if (!reporting) {
            reporting = true;
            harness.host.fail(FAILURE_RENDERER_WRITE, new Error('again'));
          }

          return { ready: null };
        },
        effect: (): void => {},
      },
    });

    activate(harness);
    move(60, 10);

    // An explicit `host.fail` from inside the report reaches the same latch a
    // throw does: one settlement, no second turn at deciding the operation, and
    // the error surfaced rather than queued into a checkpoint that would be
    // dropped.
    expect(harness.settlements).toHaveLength(1);
    expect(reported).toHaveLength(1);
  });

  it('should report rather than requeue when the report seam throws', () => {
    const harness = createHarness({
      moved(): never {
        throw new Error('cssom');
      },
      settlement: {
        prepare(_draft, input): PreparedSettlement {
          harness.settlements.push(input);
          return { ready: null };
        },
        effect(): never {
          throw new Error('onError');
        },
      },
    });

    activate(harness);
    move(60, 10);

    // The failure of a report has nowhere left to go: a second checkpoint would
    // be dropped at REPORTING, which would swallow it. It goes to the platform
    // reporter instead, and never replaces the initiating error.
    expect(harness.settlements).toHaveLength(1);
    expect(reported).toHaveLength(1);
    expect(harness.calls).toContain('retire');
  });

  it('should not swallow a rejection of the failed input', () => {
    const harness = createHarness({
      moved(): never {
        throw new Error('cssom');
      },
      settlement: {
        prepare(_draft, input): SeamRejection {
          harness.settlements.push(input);
          return {
            stage: FAILURE_TERMINAL_CALLBACK,
            error: new Error('cannot map'),
          };
        },
        effect: (): void => {},
      },
    });

    activate(harness);
    move(60, 10);

    // The report transition never published, so nothing will drive
    // `ERROR_REPORTED` — but the operation still may not stay live, and the
    // rejection error still has to surface somewhere.
    expect(reported).toHaveLength(1);
    expect(harness.calls).toContain('retire');
  });

  it('should classify a failure in a later operation just as well', () => {
    const harness = createHarness({
      moved(): never {
        throw new Error('cssom');
      },
    });

    activate(harness);
    move(60, 10);
    activate(harness);
    move(60, 10);

    // The report latch is per-checkpoint, not per-controller: leaving it set
    // would downgrade every later classified failure to a bare platform report
    // for the rest of the controller's life.
    expect(harness.failures).toHaveLength(2);
    expect(harness.failures[1]!.stage).toBe(FAILURE_RENDERER_WRITE);
  });

  it('should replace an open settlement and stop its runner', async () => {
    const runner = createRunner();
    const harness = createHarness({
      startLanding: runner.start,
      readiness: new Promise(() => {}),
      readinessTimeout: 1,
    });

    activate(harness);
    release(80, 10);
    expect(runner.calls).toEqual(['start']);

    await flush();

    // A checkpoint replaces whatever settlement was open, and the runner that
    // settlement started is the kernel's to stop — otherwise it keeps writing
    // the transform through REPORTING and beyond.
    expect(harness.failures[0]!.stage).toBe(FAILURE_PRESENTATION_READY);
    expect(runner.calls).toEqual(['start', 'destroy']);
  });
});

describe('cancellation stages', () => {
  it('should cancel an active drag at the proposal stage', () => {
    const harness = createHarness();

    activate(harness);
    harness.controller.cancel('reason');

    expect(harness.settlements).toEqual([
      { type: SETTLED_CANCELED, reason: 'reason', stage: AT_PROPOSAL },
    ]);
  });

  it('should cancel a releasing drag at the consumer stage', () => {
    const harness = createHarness({
      release: releaseWith(() => new Promise(() => {})),
    });

    activate(harness);
    release(80, 10);
    harness.controller.cancel('reason');

    expect(harness.settlements).toEqual([
      { type: SETTLED_CANCELED, reason: 'reason', stage: AT_CONSUMER },
    ]);
  });

  it('should finalize a cancelled operation through the join', () => {
    const harness = createHarness();

    activate(harness);
    harness.controller.cancel('reason');

    // A cancel is a complete terminal result, not a bare retirement: the
    // behavior maps it, the join releases presentation, and `finalized` runs.
    expect(harness.calls).toContain('presentation.released');
    expect(harness.calls).toContain('finalized');
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

describe('terminal destruction during the join', () => {
  it('should not pin after anchorTarget destroyed the controller', () => {
    // The join captures `lift` in a local before it commits `FINALIZING`, so
    // teardown clearing the kernel's slot does not stop it writing. Without a
    // revalidation the pin stamps a transform back onto an element whose
    // authored styles `destroy()` already restored (I-6).
    let harness: Harness | null = null;

    harness = createHarness({
      anchorTarget: () => {
        harness!.controller.destroy();
        return { x: 300, y: 300 };
      },
    });

    activate(harness);
    release(40, 10);

    expect(harness.item.style.transform).toBe('');
  });

  it('should not call the terminal callback after anchorTarget destroyed the controller', () => {
    let harness: Harness | null = null;

    harness = createHarness({
      anchorTarget: () => {
        harness!.controller.destroy();
        return { x: 300, y: 300 };
      },
    });

    activate(harness);
    release(40, 10);

    expect(harness.calls).not.toContain('finalized');
  });

  it('should not pin after the runner destroyed the controller', async () => {
    let harness: Harness | null = null;
    const runner = createRunner({
      onDestroy: () => {
        harness!.controller.destroy();
      },
    });

    harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(40, 10);
    await flush();
    runner.done();

    expect(harness.item.style.transform).toBe('');
  });

  it('should not call the terminal callback after the runner destroyed the controller', async () => {
    let harness: Harness | null = null;
    const runner = createRunner({
      onDestroy: () => {
        harness!.controller.destroy();
      },
    });

    harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(40, 10);
    await flush();
    runner.done();

    expect(harness.calls).not.toContain('finalized');
  });
});

describe('teardown totality', () => {
  /** Throws *before* clearing, so the dev scrub assertion trips as well. */
  const throwingReset = (counter: { calls: number }) => (): void => {
    counter.calls += 1;
    throw new Error(`reset ${counter.calls}`);
  };

  it('should scrub the draft after the current frame reset throws', () => {
    const counter = { calls: 0 };
    const harness = createHarness({ resetFramePart: throwingReset(counter) });

    activate(harness);
    harness.controller.destroy();

    expect(counter.calls).toBe(2);
  });

  it('should release ingress after a reset throws', () => {
    const counter = { calls: 0 };
    const harness = createHarness({ resetFramePart: throwingReset(counter) });

    activate(harness);
    harness.controller.destroy();
    harness.calls.length = 0;
    press(harness.item);

    expect(harness.calls).toEqual([]);
  });

  it('should not let a throwing reset escape destroy', () => {
    const counter = { calls: 0 };
    const harness = createHarness({ resetFramePart: throwingReset(counter) });

    activate(harness);

    expect(() => harness.controller.destroy()).not.toThrow();
  });

  it('should report a reset failure rather than swallow it', () => {
    const counter = { calls: 0 };
    const harness = createHarness({ resetFramePart: throwingReset(counter) });

    activate(harness);
    reported = [];
    harness.controller.destroy();

    // Two resets, each reporting the thrown error and the scrub assertion it
    // leaves behind.
    expect(reported.length).toBeGreaterThanOrEqual(2);
  });

  it('should complete retirement after a reset throws mid-operation', () => {
    // Ordinary retirement, not terminal destruction: the controller has to stay
    // usable, which it cannot be if the scrub aborted before the draft.
    const counter = { calls: 0 };
    const harness = createHarness({ resetFramePart: throwingReset(counter) });

    activate(harness);
    release(40, 10);
    harness.calls.length = 0;
    activate(harness);

    expect(harness.calls).toContain('activation.effect');
  });
});

describe('arm unwind of a partial frame pair', () => {
  const armWith = (
    root: HTMLElement,
    createFramePart: () => ExamplePart,
    resetFramePart: (part: ExamplePart) => void,
  ): void => {
    draggable(
      root,
      brandBehavior<Record<string, never>, ExamplePart>(() => ({
        controller: {},
        spec: {
          createFramePart,
          resetFramePart,
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
          retire: (): void => {},
        },
      })),
    );
  };

  it('should scrub the first frame when the second factory throws', () => {
    // `armedKeys` is captured from the first frame, so it cannot be the test
    // for "a frame exists" while the *second* factory is still running. A part
    // that already holds a DOM reference would be retained for the controller's
    // whole life.
    const root = document.createElement('div');
    document.body.append(root);
    cleanup.push(() => root.remove());

    let made = 0;
    let resets = 0;

    expect(() => {
      armWith(
        root,
        (): ExamplePart => {
          made += 1;

          if (made === 2) {
            throw new Error('second factory');
          }

          return { item: null, note: '' };
        },
        (part): void => {
          resets += 1;
          part.item = null;
          part.note = '';
        },
      );
    }).toThrow('second factory');

    expect(resets).toBe(1);
  });

  it('should scrub both frames when the shape assertion throws', () => {
    const root = document.createElement('div');
    document.body.append(root);
    cleanup.push(() => root.remove());

    let made = 0;
    let resets = 0;

    expect(() => {
      armWith(
        root,
        (): ExamplePart => {
          made += 1;

          return made === 2
            ? ({ item: null, other: '' } as unknown as ExamplePart)
            : { item: null, note: '' };
        },
        (part): void => {
          resets += 1;
          part.item = null;
        },
      );
    }).toThrow();

    expect(resets).toBe(2);
  });
});

describe('cancellation against a failure checkpoint', () => {
  it('should drop a checkpoint queued while a cancel latch is held', () => {
    // I-22: `DESTROY > CANCEL > FAILURE_CHECKPOINT`. `moved()` cancels and then
    // throws on the same sample, so the queue holds `[CANCEL, FAILED]`; the
    // cancellation finalizes and the checkpoint still ran behind it at
    // `FINALIZING`, giving the consumer both `onCancel` and `onError`.
    let harness: Harness | null = null;

    harness = createHarness({
      moved: (): void => {
        harness!.host.cancel('gone');
        throw new Error('write failed');
      },
    });

    activate(harness);
    move(60, 10);

    expect(harness.failures).toEqual([]);
  });

  it('should still report a checkpoint the cancel latch outranked', () => {
    let harness: Harness | null = null;
    const error = new Error('write failed');

    harness = createHarness({
      moved: (): void => {
        harness!.host.cancel('gone');
        throw error;
      },
    });

    activate(harness);
    reported = [];
    move(60, 10);

    expect(reported).toContain(error);
  });

  it('should drop a checkpoint classified before the cancel latch was set', () => {
    // `host.fail()` classifies *immediately*, inside the open phase, so this
    // ordering queues `[FAILED, CANCEL]` — the latch does not exist when the
    // checkpoint is queued, only when it is applied.
    let harness: Harness | null = null;

    harness = createHarness({
      moved: (): void => {
        harness!.host.fail(FAILURE_RENDERER_WRITE, new Error('write failed'));
        harness!.host.cancel('gone');
      },
    });

    activate(harness);
    move(60, 10);

    expect(harness.failures).toEqual([]);
  });

  it('should let the cancellation produce the single terminal callback', () => {
    let harness: Harness | null = null;

    harness = createHarness({
      moved: (): void => {
        harness!.host.fail(FAILURE_RENDERER_WRITE, new Error('write failed'));
        harness!.host.cancel('gone');
      },
    });

    activate(harness);
    move(60, 10);

    expect(harness.settlements.map((input) => input.type)).toEqual([
      SETTLED_CANCELED,
    ]);
  });
});

describe('arbitrary thenables', () => {
  it('should reject the resolution when the then accessor throws', () => {
    // The SPI accepts any `PromiseLike`, so a broken thenable is ordinary
    // consumer input: a semantic rejection, never a kernel panic.
    const hostile = {
      get then(): never {
        throw new Error('hostile getter');
      },
    };
    const harness = createHarness({
      release: releaseWith(() => hostile),
    });

    activate(harness);
    release(40, 10);

    expect(harness.settlements.map((input) => input.type)).toContain(
      SETTLED_REJECTED,
    );
  });

  it('should reject the resolution when then() throws', () => {
    const hostile = {
      then(): never {
        throw new Error('hostile then');
      },
    };
    const harness = createHarness({
      release: releaseWith(() => hostile),
    });

    activate(harness);
    release(40, 10);

    expect(harness.settlements.map((input) => input.type)).toContain(
      SETTLED_REJECTED,
    );
  });

  it('should keep the controller usable after a hostile thenable', () => {
    const hostile = {
      get then(): never {
        throw new Error('hostile getter');
      },
    };
    const harness = createHarness({
      release: releaseWith(() => hostile),
    });

    activate(harness);
    release(40, 10);
    harness.calls.length = 0;
    activate(harness);

    expect(harness.calls).toContain('activation.effect');
  });

  it('should read the then accessor exactly once', () => {
    // Classifying and subscribing were two separate reads, so a stateful getter
    // could be classified as one value and subscribed to as another.
    let reads = 0;
    const stateful = {
      get then() {
        reads += 1;

        return (resolve: (value: unknown) => void): void => {
          resolve(1);
        };
      },
    };
    const harness = createHarness({
      release: releaseWith(() => stateful),
    });

    activate(harness);
    release(40, 10);

    expect(reads).toBe(1);
  });

  it('should keep the first completion when a thenable resolves and then throws', () => {
    const hostile = {
      then(resolve: (value: unknown) => void): never {
        resolve('first');
        throw new Error('and then throw');
      },
    };
    const harness = createHarness({
      release: releaseWith(() => hostile),
    });

    activate(harness);
    release(40, 10);

    expect(harness.settlements).toEqual([
      { type: SETTLED_FULFILLED, value: 'first' },
    ]);
  });

  it('should classify a hostile readiness gate as a presentation failure', () => {
    const hostile = {
      get then(): never {
        throw new Error('hostile readiness');
      },
    };
    const harness = createHarness({
      readiness: hostile as unknown as PromiseLike<void>,
    });

    activate(harness);
    release(40, 10);

    expect(harness.failures.map((failure) => failure.stage)).toContain(
      FAILURE_PRESENTATION_READY,
    );
  });

  it('should classify a readiness gate that is not thenable at all', () => {
    const harness = createHarness({
      readiness: {} as unknown as PromiseLike<void>,
    });

    activate(harness);
    release(40, 10);

    expect(harness.failures.map((failure) => failure.stage)).toContain(
      FAILURE_PRESENTATION_READY,
    );
  });

  it('should not arm the landing when readiness failed synchronously', () => {
    // The gate plan is armed in one pass, readiness first. A gate that failed
    // *synchronously* has already replaced the settlement, so starting the
    // runner would land a drop the queued checkpoint is about to abandon.
    const hostile = {
      get then(): never {
        throw new Error('hostile readiness');
      },
    };
    const runner = createRunner();
    const harness = createHarness({
      readiness: hostile as unknown as PromiseLike<void>,
      startLanding: runner.start,
    });

    activate(harness);
    release(40, 10);

    expect(runner.calls).toEqual([]);
  });
});
