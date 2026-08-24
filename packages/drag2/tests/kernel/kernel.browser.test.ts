import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AT_CONSUMER,
  AT_PROPOSAL,
  FAILURE_ACTIVATION,
  FAILURE_ADMISSION,
  FAILURE_LANDING_TARGET,
  FAILURE_RELEASE,
  FAILURE_RENDERER_WRITE,
  FAILURE_RESOLUTION,
  FAILURE_TERMINAL_CALLBACK,
  type FailureStage,
} from '../../src/kernel/failures.ts';
import type { Frame } from '../../src/kernel/frames.ts';
import {
  ACTIVATING,
  ACTIVE,
  RELEASING,
  SETTLING,
} from '../../src/kernel/phases.ts';
import {
  LIFT_FLAT,
  type BehaviorLiftSession,
} from '../../src/kernel/presentation.ts';
import {
  type ActivationScope,
  type BehaviorSpec,
  type CommandAdmission,
  type KernelHost,
  type LandingContext,
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
import { draggable } from '../../src/kernel.ts';

type ExamplePart = {
  item: HTMLElement | null;
  note: string;
};

const POINTER_ID = 7;

type Harness = Readonly<{
  root: HTMLElement;
  item: HTMLElement;
  host: KernelHost;
  controller: { cancel(reason?: unknown): void; destroy(): Promise<void> };
  /** Every seam the kernel drove, in order. */
  calls: string[];
  /** The committed phase each seam observed. */
  phases: Record<string, number>;
  /**
   * Every **classified** failure the behavior saw, through the
   * `SETTLED_FAILED` settlement input.
   */
  failures: Array<Readonly<{ stage: FailureStage; error: unknown }>>;
  /**
   * Everything that reached `spec.reportFailure` — the channel that carries no
   * consequence. A stage here settles nothing (D-49, D-60).
   */
  reports: Array<Readonly<{ stage: FailureStage; error: unknown }>>;
  /** Every settlement input, in order. */
  settlements: SettlementInput[];
  captures: string[];
}>;

type SpecOverrides = Partial<
  Pick<
    BehaviorSpec<ExamplePart, HTMLElement>,
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
    | 'command'
  >
> &
  Readonly<{
    threshold?: number;
    /** Called with the host, so a test can cancel or destroy from a seam. */
    onStart?(host: KernelHost): void;
    capture?(): void;
    /** Declared by the default `settlement.prepare`, when set. */
    presentation?: boolean;
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
  const reports: Array<Readonly<{ stage: FailureStage; error: unknown }>> = [];
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

  const controller = draggable<
    { cancel(reason?: unknown): void; destroy(): Promise<void> },
    ExamplePart,
    HTMLElement
  >(root, (kernelHost) => {
    host = kernelHost;

    // **The harness stages an `HTMLElement`, and now says so** (D-34, K-1).
    // The parameter defaults to `true`; a behavior that stages a real resource
    // declares it, exactly as the sortable does.
    const spec: BehaviorSpec<ExamplePart, HTMLElement> = {
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
        actionTags: 2,
      },
      ...(overrides.command === undefined
        ? null
        : { command: overrides.command }),
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

          return true;
        },
        effect(current, _prepared, scope: SettlementScope): void {
          record('settlement.effect', current);

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
        (() => {
          calls.push('anchorTarget');
          return { x: 0, y: 0 };
        }),
      finalized:
        overrides.finalized ??
        ((): void => {
          calls.push('finalized');
        }),
      // **Its own array since D-60**, because the two channels are orthogonal
      // and a harness that merges them cannot express the difference. This one
      // is the un-classified channel: an admission throw with no operation to
      // settle (Q-1), and a quality failure on the landing measurement (D-49).
      reportFailure(stage, error): void {
        reports.push({ stage, error });
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
  });

  cleanup.push(() => {
    void controller.destroy();
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
    reports,
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

const pointerEvent = (type: string, x: number, y: number): PointerEvent => {
  const event = new PointerEvent(type, {
    bubbles: true,
    // Real `pointermove` is cancelable, and since D-54 it is the event the
    // kernel prevents.
    cancelable: true,
    pointerId: POINTER_ID,
    isPrimary: true,
    clientX: x,
    clientY: y,
  });

  document.dispatchEvent(event);
  return event;
};

const move = (x: number, y: number): PointerEvent =>
  pointerEvent('pointermove', x, y);

const release = (x: number, y: number): PointerEvent =>
  pointerEvent('pointerup', x, y);

/**
 * The trailing activation (D-54), dispatched on `document.body` so it passes
 * through the capture-phase suppressor exactly as a real one would.
 */
const click = (): MouseEvent => {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true });

  document.body.dispatchEvent(event);
  return event;
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
): BehaviorSpec<ExamplePart, HTMLElement>['release'] => ({
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
  draggable(root, () => ({
    controller: {},
    spec: {
      createFramePart,
      resetFramePart: (): void => {},
      config: {
        threshold: 8,
        liftMode: LIFT_FLAT,
        actionTags: 0,
      },
      admit: () => null,
      activation: {
        prepare: () => document.createElement('div'),
        effect: (): void => {},
      },
      release: { prepare: () => ({ invoke: null }), effect: (): void => {} },
      settlement: {
        prepare: () => true,
        effect: (): void => {},
      },
      action: { prepare: () => null, effect: (): void => {} },
      moved: (): void => {},
      anchorTarget: () => ({ x: 0, y: 0 }),
      finalized: (): void => {},
      reportFailure: (): void => {},
      retire: (): void => {},
    },
  }));
}

/** A minimal armed controller, for the cases where `arm()` itself must throw. */
function createArmedWithCommand(
  root: HTMLElement,
  command: CommandAdmission<ExamplePart>,
): void {
  draggable(root, () => ({
    controller: {},
    spec: {
      createFramePart: (): ExamplePart => ({ item: null, note: '' }),
      resetFramePart: (): void => {},
      config: {
        threshold: 8,
        liftMode: LIFT_FLAT,
        actionTags: 0,
      },
      admit: () => null,
      command,
      activation: {
        prepare: () => document.createElement('div'),
        effect: (): void => {},
      },
      release: { prepare: () => ({ invoke: null }), effect: (): void => {} },
      settlement: {
        prepare: () => true,
        effect: (): void => {},
      },
      action: { prepare: () => null, effect: (): void => {} },
      moved: (): void => {},
      anchorTarget: () => ({ x: 0, y: 0 }),
      finalized: (): void => {},
      reportFailure: (): void => {},
      retire: (): void => {},
    },
  }));
}

describe('discrete admission', () => {
  it('should bind no discrete listener when the spec declares no command', () => {
    // The listeners are the whole of the opt-in: a behavior with no `command`
    // member gets `pointerdown` and nothing else, so a `keydown` on the root
    // reaches no admission path at all rather than reaching one that declines.
    const harness = createHarness();

    harness.root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );

    expect(harness.calls).toEqual([]);
    expect(harness.phases['admit']).toBeUndefined();
  });

  it('should mint a pointerless operation and queue ACTIVATE', () => {
    const harness = createHarness({
      command: {
        types: ['keydown'],
        admit: (_event, draft): HTMLElement => {
          draft.item = harness.item;
          return harness.item;
        },
      },
    });

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });

    harness.root.dispatchEvent(event);

    // `PENDING` with `pointerId === -1`, then `ACTIVE` on the same drain — no
    // pointer travel, and no threshold to cross, because the threshold is a
    // property of the pointer path and not of the phase.
    expect(event.defaultPrevented).toBe(true);
    expect(harness.calls).toContain('activation.prepare');
    expect(harness.phases['activation.effect']).toBe(ACTIVATING);
    // And it releases itself: a command has no other producer of a release.
    expect(harness.calls).toContain('release.prepare');
    expect(harness.calls).toContain('retire');
  });

  it('should not prevent the default when the command declines', () => {
    const harness = createHarness({
      command: { types: ['keydown'], admit: () => null },
    });

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });

    harness.root.dispatchEvent(event);

    // Declining is total: no operation, no phase change, and the key keeps its
    // native meaning (I-32).
    expect(event.defaultPrevented).toBe(false);
    expect(harness.calls).toEqual([]);
  });

  it('should leave an admitted press unprevented', () => {
    // The rule is the kernel's in **both** modes (C-03) — the ownership half of
    // that sentence is what makes I-32 enforceable rather than aspirational.
    // What D-54 moves is the *timing* on the pointer path: `pointerdown` cannot
    // know whether the press will become a drag, and probe E measured six of
    // ten cases where it did not and the interaction was consumed anyway.
    const declining = createHarness({ admit: () => null });
    const refused = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      button: 0,
      buttons: 1,
    });

    declining.root.dispatchEvent(refused);

    expect(refused.defaultPrevented).toBe(false);

    const harness = createHarness();
    const admitted = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      button: 0,
      buttons: 1,
    });

    harness.root.dispatchEvent(admitted);

    expect(admitted.defaultPrevented).toBe(false);
  });

  it('should prevent the move that crosses the activation threshold', () => {
    const harness = createHarness();

    press(harness.item);

    const crossing = move(40, 10);

    expect(crossing.defaultPrevented).toBe(true);
    expect(harness.calls).toContain('activation.prepare');
  });

  it('should not prevent a move for an operation that never activates', () => {
    // A press that stays put keeps every native meaning it had, which is the
    // whole of what the relocation buys. The command path is unaffected and
    // still prevents inside its own listener — asserted by *should mint a
    // pointerless operation and queue ACTIVATE* above, because a `keydown`
    // default cannot be prevented after its listener has returned.
    const harness = createHarness();

    press(harness.item);

    expect(move(12, 10).defaultPrevented).toBe(false);
    expect(harness.calls).not.toContain('activation.prepare');
  });

  it('should suppress exactly one trailing click after an activated drag', () => {
    // **The third consequence of moving the call** (D-54). `click` is generated
    // from an un-prevented `pointerup`, which is why link activation survived
    // the old policy — and why a drop that lands on an `<a href>` would now
    // navigate. One click, capture-phase, one-shot.
    const harness = createHarness();

    activate(harness);
    release(40, 10);

    expect(click().defaultPrevented).toBe(true);
    expect(click().defaultPrevented).toBe(false);
  });

  it('should not arm the suppressor for a press that never activated', () => {
    // The case probe E R-2 shows the library was already getting right by
    // accident: a press that never became a drag must keep its click.
    const harness = createHarness();

    press(harness.item);
    release(12, 10);

    expect(click().defaultPrevented).toBe(false);
  });

  it('should suppress the trailing click after a cancelled drag too', () => {
    // The row a reader will want to argue with. The browser synthesizes the
    // `click` regardless, and a cancellation is a library verdict, not evidence
    // the user meant to click — suppressing only on the happy path would make
    // an Escape-cancelled drag over a link navigate.
    const harness = createHarness();

    activate(harness);
    harness.controller.cancel('test');
    release(40, 10);

    expect(click().defaultPrevented).toBe(true);
  });

  it('should disarm the suppressor on the next pointerdown', () => {
    // A one-shot that never fires must not survive to eat an unrelated click:
    // a press that begins a *new* interaction is as good a signal that the old
    // one is over as the click itself.
    const harness = createHarness();

    activate(harness);
    release(40, 10);
    press(harness.item);

    expect(click().defaultPrevented).toBe(false);
  });

  it('should disarm the suppressor at teardown', () => {
    // Ingress-scoped, not operation-scoped: the click arrives *after* the
    // operation ends, so an operation lifetime would dispose the listener
    // before the event it exists to catch. What must still hold is that it dies
    // with the controller.
    const harness = createHarness();

    activate(harness);
    release(40, 10);
    void harness.controller.destroy();

    expect(click().defaultPrevented).toBe(false);
  });

  it('should report a throwing command.admit with no operation', () => {
    // Q-1, and it is the same shape a throwing `admit` has: identity was never
    // minted, so there is no operation for a checkpoint to settle and no
    // `REPORTING` phase to enter.
    const harness = createHarness({
      command: {
        types: ['keydown'],
        admit: (): never => {
          throw new Error('command');
        },
      },
    });

    harness.root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );

    expect(harness.reports).toEqual([
      { stage: FAILURE_ADMISSION, error: new Error('command') },
    ]);
    expect(harness.calls).toEqual([]);

    // Still usable: a press admits normally afterwards.
    activate(harness);

    expect(harness.calls).toContain('activation.effect');
  });

  it('should reject an invalid command.types at arm', () => {
    // Static spec data, validated once at construction, exactly as
    // `config.actionTags` is — the same `TypeError` policy every public option
    // domain uses. The `pointerdown` collision is refused rather than tolerated:
    // two listeners for one type would run two admission members for one event,
    // and the second would find the first's operation already committed —
    // silently, and only sometimes.
    const cases: Array<readonly [readonly string[], RegExp]> = [
      [[], /spec\/command-types-empty/u],
      [[''], /spec\/command-entry-empty/u],
      [['pointerdown'], /spec\/command-type-pointerdown/u],
    ];

    for (const [types, message] of cases) {
      const root = document.createElement('div');

      document.body.append(root);
      cleanup.push(() => {
        root.remove();
      });

      // Built directly rather than through the harness, because `arm()`
      // throwing means `draggable()` never returns a controller to register for
      // teardown — a half-armed controller is exactly what it refuses to hand
      // back.
      expect(() =>
        createArmedWithCommand(root, { types, admit: () => null }),
      ).toThrow(message);
    }
  });

  it('should arm a command.types carrying a duplicate entry', () => {
    // **The duplicate check was removed 2026-08-22**, because the platform
    // already answers it: `addEventListener` dedups on (type, callback,
    // capture) and all three are identical for every entry in this list, so
    // the second binding was a no-op before it was a `TypeError`. The
    // `pointerdown` collision above is a different claim — two *different*
    // callbacks for one type — and is still refused.
    const root = document.createElement('div');

    document.body.append(root);
    cleanup.push(() => {
      root.remove();
    });

    expect(() =>
      createArmedWithCommand(root, {
        types: ['keydown', 'keydown'],
        admit: () => null,
      }),
    ).not.toThrow();
  });

  it('should release the discrete listeners on destroy', () => {
    let admitted = 0;
    const harness = createHarness({
      command: {
        types: ['keydown'],
        admit: (): null => {
          admitted += 1;
          return null;
        },
      },
    });

    harness.root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );

    expect(admitted).toBe(1);

    void harness.controller.destroy();
    harness.root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );

    // The discrete listeners live inside the same ingress abort that owns
    // `pointerdown`, so one `destroy()` releases all of them.
    expect(admitted).toBe(1);
  });
});

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
            prepare: () => true,
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

  it('should refuse a nested press before it can touch either frame', () => {
    // The SPI permits `admit` to write the draft *before* it reaches consumer
    // code, and the sortable behavior happens not to — which is why this lives
    // here rather than in the behavior suite. A nested press that gets as far
    // as `begin()` rebuilds the draft from the committed frame, discarding
    // whatever the outer `admit` had already staged in it, and then commits its
    // own pointer origin.
    let nested = false;
    let admits = 0;
    let observed: Readonly<{ note: string; originY: number }> | null = null;

    const harness = createHarness({
      admit(_event, draft): HTMLElement {
        admits += 1;
        // Staged **before** the reentrancy point, which is the whole test.
        draft.note = 'outer';

        if (!nested) {
          nested = true;
          // A second eligible press, at different coordinates, from inside the
          // outer one — exactly what a handle or visual resolver can do.
          press(harness.item, 10, 200);
        }

        draft.item = harness.item;
        return harness.item;
      },
      activation: {
        prepare(draft): HTMLElement {
          observed = { note: draft.note, originY: draft.originY };
          return document.createElement('div');
        },
        effect(): void {},
      },
    });

    press(harness.item, 10, 10);
    move(10, 40);

    expect(nested).toBe(true);
    // The nested press never reached `spec.admit`...
    expect(admits).toBe(1);
    // ...never rebuilt the draft over what the outer one staged...
    expect(observed!.note).toBe('outer');
    // ...and never became the grab point every later sample is measured from.
    expect(observed!.originY).toBe(10);
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
    expect(harness.failures).toEqual([]);
    expect(harness.reports).toHaveLength(1);
    expect(harness.reports[0]!.stage).toBe(FAILURE_ADMISSION);

    fail = false;
    activate(harness);
    expect(harness.calls).toContain('activation.prepare');
  });

  it('should not mint an operation when admit destroyed the controller', () => {
    const harness = createHarness({
      admit(_event, draft): HTMLElement {
        draft.item = null;
        void harness.host.destroy();
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
        void host.destroy();
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

  it('should not surface an abandoned resolver’s late rejection to the page', async () => {
    // **The observable, not the mechanism** (probe A). Every other row here
    // asserts the slot comparison `resolution !== attempt`, which is how the
    // library ignores a stale settlement. What a consumer actually *sees* if
    // that ignoring is done by dropping the subscription is an
    // `unhandledrejection` in their console, from a promise they handed the
    // library and the library abandoned.
    //
    // The guarantee holds because the kernel subscribes with two handlers and
    // ignores the *result* — it never declines to subscribe. This is the row
    // that would fail if a future change made the ignoring earlier.
    let reject!: (error: unknown) => void;
    const harness = createHarness({
      release: releaseWith(
        () =>
          new Promise((_resolve, fail) => {
            reject = fail;
          }),
      ),
    });

    const escaped: unknown[] = [];
    const aborter = new AbortController();

    globalThis.addEventListener(
      'unhandledrejection',
      (event: PromiseRejectionEvent) => {
        escaped.push(event.reason);
        // Otherwise the browser logs it and Vitest fails the run on the noise
        // rather than on this assertion.
        event.preventDefault();
      },
      { signal: aborter.signal },
    );

    activate(harness);
    release(80, 10);

    // Abandon it, then let a **newer** operation own the controller — the
    // exact shape probe A named, because a stale settlement arriving with no
    // successor is the easy case.
    harness.controller.cancel('abandoned');
    activate(harness);

    reject(new Error('late'));
    await flush();

    expect(escaped).toEqual([]);
    // And it stayed ignored. The cancel that abandoned it settled the
    // operation; the late rejection added nothing after it, which is the other
    // half of "consumed, not dropped".
    expect(harness.settlements).toEqual([
      { type: SETTLED_CANCELED, reason: 'abandoned', stage: AT_CONSUMER },
    ]);

    aborter.abort();
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
    void harness.controller.destroy();
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
            return true;
          }

          return {
            stage: FAILURE_RESOLUTION,
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
    expect(harness.failures[0]!.stage).toBe(FAILURE_RESOLUTION);
    // **And the operation is still disposed of** (D-66). "Nothing below the
    // rejection runs" is about *continuation* — no gate arming, no consumer
    // invocation, no retirement past the failure. The terminal is disposition,
    // not continuation, and this assertion read `not.toContain` until D-66
    // retracted exactly that clause of D-23.
    expect(harness.calls).toContain('finalized');
  });

  it('should close motion and cancellation before the behavior effect', () => {
    const harness = createHarness({
      settlement: {
        prepare: () => true,
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
        prepare: () => true,
        effect(_current, _prepared, scope: SettlementScope): never {
          scope.holdForLanding(runner.start);
          throw new Error('effect');
        },
      },
    });

    activate(harness);
    release(80, 10);

    // Arming a half-requested plan would start a runner for a settlement that
    // has already failed; the queued checkpoint decides instead (F-27). What
    // the checkpoint decides now includes the terminal (D-66) — the runner is
    // still never started, which is the half F-27 is about.
    expect(runner.calls).toEqual([]);
    expect(harness.calls).toContain('finalized');
  });
});

describe('the settlement gates', () => {
  it('should finalize in the resolution drain when neither gate is held', () => {
    const harness = createHarness();

    activate(harness);
    release(80, 10);

    expect(harness.calls).toContain('finalized');
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
    // Re-pointed at the surviving gate by D-41. The bookkeeping rule was never
    // readiness's: a duplicate or post-seal request is ignored and reported,
    // and it holds for one gate exactly as it held for two.
    const runner = createRunner();
    const harness = createHarness({
      settlement: {
        prepare: () => true,
        effect(_current, _prepared, scope: SettlementScope): void {
          scope.holdForLanding(runner.start);
          scope.holdForLanding(runner.start);
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
        prepare: () => true,
        effect(_current, _prepared, scope: SettlementScope): void {
          escaped = scope;
        },
      },
    });

    activate(harness);
    release(80, 10);
    escaped.holdForLanding(createRunner().start);

    // A bookkeeping error must not destroy a live drop: it never overwrites a
    // watch, never double-increments and never panics.
    expect(reported).toHaveLength(1);
    expect(harness.calls).toContain('finalized');
  });
});

/**
 * The landing completion protocol: reserve-before-call (F-21), the once-only
 * latch (D-28, I-24) and revalidate-after-return (F-30).
 *
 * **These rows are new, and their absence is the finding that produced them.**
 * `tests/COVERAGE.md` §Landing completion cited six tests here — the
 * synchronous `done()`, the synchronous `fail()`, the duplicate completion,
 * `done()` followed by a throw, `start` throwing, and `start` destroying while
 * returning a live handle — and none of them existed under any name (review 2,
 * B-2). The ledger was read as coverage for the whole of `completeLanding` and
 * `armSettlement`, which is the reason a dangling citation is worse than a
 * missing one: it answers the question a reviewer came to ask.
 *
 * The one that is not a restoration is *`done()` then a throw*: the row
 * predicted the completion survives for the join, and the landed kernel
 * classifies the throw instead. The test below asserts what the kernel does and
 * says why that is the coherent answer, rather than restoring a row that
 * described a system that never shipped.
 */
describe('landing completion', () => {
  it('should honour a done() called synchronously inside start', () => {
    // **F-21, reserve-before-call.** The hold is taken before `start` runs, so
    // a runner that completes inside `start` — `landing({ duration: 0 })`, or
    // any synchronous one — always finds its hold to release. Were the hold
    // reserved after `start` returned, this completion would apply to a gate
    // that did not yet exist and the operation would hang open.
    const runner = createRunner({
      onStart: (done) => {
        done();
      },
    });
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);

    expect(harness.calls).toContain('finalized');
    expect(runner.calls).toEqual(['start', 'destroy']);
  });

  it('should destroy the handle and refuse to finalize after a synchronous fail()', () => {
    // **F-30.** A runner may fail *and still return a handle*. The failure
    // latches on the open phase, so the arm returns `ARM_FAILED` and the handle
    // it is holding is destroyed rather than published — publishing it would
    // leave a runner owned by a settlement that has already been replaced.
    const failure = new Error('runner');
    const runner = createRunner({
      onStart: (_done, fail) => {
        fail(failure);
      },
    });
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);

    expect(runner.calls).toEqual(['start', 'destroy']);
    expect(harness.failures.map(({ error }) => error)).toEqual([failure]);
  });

  it('should ignore a duplicate completion', () => {
    // **I-24.** The second `done()` is not merely harmless — it must not open a
    // second join, which would pin and call the terminal callback twice.
    //
    // **Both calls are inside `start`, and that is what makes this about the
    // latch.** Two asynchronous `done()`s are stopped by the *staleness* check
    // instead — the first one finalizes and retires the attempt, so the second
    // finds `settlement !== attempt` — and a test written that way passes with
    // the latch deleted. Inside `start` the attempt is still the live one for
    // both calls, so `attempt.completed` is the only thing standing between
    // them.
    const runner = createRunner({
      onStart: (done) => {
        done();
        done();
      },
    });
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);

    expect(harness.calls.filter((call) => call === 'finalized')).toHaveLength(
      1,
    );
  });

  it('should classify a start that throws after completing rather than joining', () => {
    // **The row the ledger got wrong, kept as the correction.** COVERAGE cited
    // a test called _should retain a synchronously completed handle for the
    // join_ — the completion standing and the throw being tolerated. The landed
    // kernel does the opposite, and it is right to: `start` threw, so the
    // runner is in an unknown state and never returned a handle to destroy. The
    // completion it queued is applied to an attempt the classification then
    // retires, which is exactly what the once-only latch's staleness check is
    // for (I-4).
    const failure = new Error('start');
    const runner = createRunner({
      onStart: (done) => {
        done();
        throw failure;
      },
    });
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);

    expect(harness.failures.map(({ error }) => error)).toEqual([failure]);
    // One terminal, from the failure path (D-66) — not one from each.
    expect(harness.calls.filter((call) => call === 'finalized')).toHaveLength(
      1,
    );
  });

  it('should roll the hold back and classify when start throws', () => {
    // **F-27.** The hold was reserved before the call; a throw has to give it
    // back, or the settlement waits on a gate no runner will ever release.
    const failure = new Error('start');
    const runner = createRunner({
      onStart: () => {
        throw failure;
      },
    });
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);

    // Never published, so there is nothing to destroy — `start` did not return.
    expect(runner.calls).toEqual(['start']);
    expect(harness.failures.map(({ error }) => error)).toEqual([failure]);
  });

  it('should destroy a handle returned by a start that destroyed the controller', () => {
    // **F-30's other half, revalidate-after-return.** Teardown ran inside
    // `start`, saw no published handle and retired the attempt; publishing the
    // handle now would leave a runner nothing owns and nothing will ever
    // destroy. The kernel destroys it on the spot instead.
    //
    // **What this row pins is the outcome, not that mechanism.** Neutralising
    // the post-return revalidation leaves this row — and the whole browser
    // suite — green, because the destroy raised inside `start` is inside a
    // transaction and D-36's bracket defers physical teardown to the boundary
    // *after* arm published the handle; teardown then destroys it anyway. The
    // revalidation is defence in depth against a teardown that is not deferred,
    // which is the same hedge `armSettlement`'s own comment makes about
    // `started` and `attempt.failed`. Recorded rather than dressed up: a
    // falsification that does not falsify is worth stating.
    let harness: Harness | null = null;
    const runner = createRunner({
      onStart: () => {
        void harness!.controller.destroy();
      },
    });

    harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);

    expect(runner.calls).toEqual(['start', 'destroy']);
  });

  it('should let a done() win over a later fail()', () => {
    // Inside `start` for the same reason as the duplicate above: this is the
    // window in which both calls reach a live attempt, so the *order* is what
    // decides rather than the retirement the first one caused.
    const runner = createRunner({
      onStart: (done, fail) => {
        done();
        fail(new Error('late'));
      },
    });
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);

    expect(harness.calls).toContain('finalized');
    expect(harness.failures).toEqual([]);
  });

  it('should let a fail() win over a later done()', () => {
    // The mirror, and the one that would pass vacuously if the latch were
    // written as "a failure wins": the order decides, not the kind.
    const failure = new Error('runner');
    const runner = createRunner({
      onStart: (done, fail) => {
        fail(failure);
        done();
      },
    });
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);

    // One terminal, and it is the failure's: D-66 makes the terminal total over
    // started operations, so `finalized` is not evidence the *landing* joined.
    expect(harness.failures.map(({ error }) => error)).toEqual([failure]);
    expect(harness.calls.filter((call) => call === 'finalized')).toHaveLength(
      1,
    );
  });

  it('should make a completion for a retired attempt inert', () => {
    // **I-24, and the staleness check rather than the latch.** `destroy()`
    // retires the attempt with the animation still running and the runner's
    // `done()` uncompleted, so nothing has latched: only
    // `settlement !== attempt || queue.closed` stops this completion opening a
    // join on a controller that no longer exists.
    //
    // Not driven by a cancel, which is the obvious reading and the wrong one: a
    // cancel arriving at `SETTLING` is late by definition and `handleCancel`
    // ignores it, so the settlement it was meant to retire is still live and
    // `done()` would legitimately finalize it.
    const runner = createRunner();
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);
    void harness.controller.destroy();

    const before = harness.calls.length;

    runner.done();

    expect(harness.calls.slice(before)).toEqual([]);
  });

  it('should destroy a live runner when the controller is destroyed', () => {
    // **I-6.** `destroy()` is a synchronous terminal barrier, and a landing
    // animation is exactly the kind of work that would otherwise keep running
    // against a controller that no longer exists.
    const runner = createRunner();
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);

    expect(runner.calls).toEqual(['start']);

    void harness.controller.destroy();

    expect(runner.calls).toEqual(['start', 'destroy']);
  });

  it('should never call start after anchorTarget destroyed the controller', () => {
    // **F-38.** `anchorTarget` is behavior code and runs before `start`; the
    // measurement it returns is unusable once it has torn the controller down,
    // and calling a consumer's runner afterwards violates I-6. Distinct from
    // the join's own revalidation, which is a later checkpoint on the same
    // path — this one is why there is nothing for that checkpoint to undo.
    let harness: Harness | null = null;
    const runner = createRunner();

    harness = createHarness({
      startLanding: runner.start,
      anchorTarget: () => {
        void harness!.controller.destroy();
        return { x: 300, y: 300 };
      },
    });

    activate(harness);
    release(80, 10);

    expect(runner.calls).toEqual([]);
  });
});

/**
 * **The landing origin (D-35, K-3).**
 *
 * `LandingContext.from` was `pointerX - originX`, documented as *where the
 * visual is now*. Those are the same number for exactly one behavior — one
 * whose `moved` writes the raw pointer delta on both axes, which is what the
 * sortable does and what this harness's default `moved` deliberately does not.
 * For a behavior that constrains, clamps, snaps or externally drives its visual
 * they differ, and a pointerless operation has no pointer to subtract at all.
 *
 * **Why the whole suite could stay green through it** is the part worth
 * repeating: the landing opens with a jump and still *ends* correctly, because
 * the target is behavior-supplied and the kernel re-pins at the join. Phase 11
 * met the same shape in the lift geometry and only a demo exposed it. So every
 * row here reads `from` at the one instant it exists — inside `start` — rather
 * than inferring it from where the drop ended, which is the assertion that
 * cannot tell the defect from the fix.
 */
describe('the landing origin', () => {
  /**
   * Presses, moves through `path`, releases, and returns what the runner was
   * handed. The release coordinate is the last point of `path` unless
   * `releaseAt` names another — the two differ where the point is to show that
   * `from` follows the *write*, not the pointer.
   */
  const sample = (
    overrides: SpecOverrides,
    path: ReadonlyArray<readonly [x: number, y: number]>,
  ): Readonly<{
    harness: Harness;
    context: LandingContext | null;
    /**
     * The visual's inline transform **at the instant `from` was sampled**.
     * Read here rather than after the drop, because teardown restores the
     * inline-style lease: an assertion against the element afterwards compares
     * the composition to an empty string and passes for the wrong reason.
     */
    transform: string;
  }> => {
    let context: LandingContext | null = null;
    let transform = '';
    const harness = createHarness({
      ...overrides,
      startLanding: (received, done): LandingHandle => {
        const {
          visual: {
            style: { transform: written },
          },
        } = received;

        context = received;
        transform = written;
        done();
        return { destroy(): void {} };
      },
    });

    press(harness.item);

    for (const [x, y] of path) {
      move(x, y);
    }

    const last = path.at(-1) ?? [10, 10];

    release(last[0], last[1]);

    return { harness, context, transform };
  };

  /** A `moved` that renders the raw pointer delta — the sortable's shape. */
  const followsPointer = (
    current: Readonly<Frame<ExamplePart>>,
    lift: BehaviorLiftSession,
  ): void => {
    lift.write(
      current.pointerX - current.originX,
      current.pointerY - current.originY,
    );
  };

  it('should reproduce the transform the drag last wrote', () => {
    const { context, transform } = sample({ moved: followsPointer }, [
      // **Two moves, and the first one is not decoration.** The
      // threshold-crossing move is the activation; `moved` runs from the next
      // committed sample onwards. A one-move fixture here renders nothing and
      // would pass every row below with `(0, 0)` for the wrong reason.
      [40, 60],
      [70, 90],
    ]);

    // **The agreement case, by construction**: this `moved` writes the raw
    // pointer delta, which is the one shape for which the old computation was
    // right, so the row below is not the falsifier — the five that follow are.
    // What it does add is the composition identity a runner depends on.
    //
    // **Non-zero on both axes, and that is the whole design of the fixture.** A
    // delta and a viewport point agree at the origin and nowhere else, so a
    // fixture that drags along one axis from a grab at `(0, 0)` cannot tell the
    // recorded delta from the pointer position or from either mistake in
    // between. Grab is `(10, 10)`, so this is `(60, 80)`.
    expect(context).not.toBeNull();
    expect(context!.from).toEqual({ x: 60, y: 80 });
    // The end-to-end form of the same claim, and the one a runner depends on:
    // `from` and `compose` are the same coordinate space, so composing the
    // origin the runner is handed reproduces the transform already on the
    // element. A runner that starts by writing `compose(from.x, from.y)`
    // therefore writes exactly what is already there — no first-frame jump.
    expect(context!.compose(context!.from.x, context!.from.y)).toBe(transform);
  });

  it('should report the constrained delta rather than the pointer delta', () => {
    // The cheapest constraining behavior there is: an axis lock. It is also the
    // one free drag ships, which is why this row is K-3's and L-4's shared
    // half — the difference is that free drag reaches it on three paths.
    const { context } = sample(
      {
        moved(current, lift): void {
          lift.write(current.pointerX - current.originX, 0);
        },
      },
      [
        [40, 10],
        [40, 60],
      ],
    );

    // The pointer travelled 50px down. The visual did not, so neither does the
    // landing origin. Under the pointer form this read `{ x: 30, y: 50 }` and
    // the drop opened 50px below the visual.
    expect(context!.from).toEqual({ x: 30, y: 0 });
  });

  it('should track a write issued from an action effect', () => {
    // 13c N-4's case: a controlled position, written from a seam that is not
    // `moved` at all. This is what the rejected `renderedDelta(current)` seam
    // would have got wrong without the behavior mirroring every write into its
    // own frame part — the duplication that produced the defect in the first
    // place. The kernel records its own writes, so the route does not matter.
    let retained: BehaviorLiftSession | null = null;
    let context: LandingContext | null = null;
    const harness = createHarness({
      activation: {
        prepare: (): HTMLElement => document.createElement('div'),
        effect(_current, _prepared, scope: ActivationScope): void {
          retained = scope.lift;
        },
      },
      moved: followsPointer,
      action: {
        prepare: (): {} => true,
        effect(): void {
          retained!.write(-5, 7);
        },
      },
      startLanding: (received, done): LandingHandle => {
        context = received;
        done();
        return { destroy(): void {} };
      },
    });

    press(harness.item);
    move(40, 60);
    harness.host.dispatch(0, null);
    release(40, 60);

    expect(context!.from).toEqual({ x: -5, y: 7 });
  });

  it('should report the origin for an operation that never rendered', () => {
    // The harness default `moved` records the call and writes nothing, so the
    // visual is still where acquisition left it. `(0, 0)` is not a fallback
    // here — it is the true answer, and it is the initial value of the record
    // rather than a special case anyone had to write.
    const { context } = sample({}, [[40, 60]]);

    expect(context!.from).toEqual({ x: 0, y: 0 });
  });

  it('should report the origin for a pointerless operation', () => {
    let context: LandingContext | null = null;
    const harness = createHarness({
      command: {
        types: ['keydown'],
        admit: (_event, draft): HTMLElement => {
          draft.item = harness.item;
          return harness.item;
        },
      },
      startLanding: (received, done): LandingHandle => {
        context = received;
        done();
        return { destroy(): void {} };
      },
    });

    harness.root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );

    // **`(0, 0)`, and never `-originX`.**
    //
    // **This row does not discriminate today, and saying so is the point.** A
    // command mints at `(0, 0)` with `pointerId === -1`, so `originX` is zero
    // and the subtracted form arrives at the same answer by coincidence — this
    // test passes against the pre-D-35 kernel. It is kept because the
    // coincidence is one line wide: any pointerless mint seeded from a real
    // coordinate — the item's rect, a caret, a focus point — makes the
    // subtracted form return the *negated* origin and teleport the visual
    // across the viewport at the start of its landing. The recorded delta has
    // no such failure mode: nothing wrote, so nothing moved.
    expect(context).not.toBeNull();
    expect(context!.from).toEqual({ x: 0, y: 0 });
  });

  it('should record nothing for a compose without a write', () => {
    // Composing is not rendering — a landing runner composes on every frame and
    // must not move the origin under itself.
    const { context } = sample(
      {
        moved(current, lift): void {
          void lift.compose(
            current.pointerX - current.originX,
            current.pointerY - current.originY,
          );
        },
      },
      [
        [40, 10],
        [40, 60],
      ],
    );

    expect(context!.from).toEqual({ x: 0, y: 0 });
  });

  it('should leave the recorded delta stale when a behavior writes behind it', () => {
    // **The adversarial case, and it documents a limit rather than a
    // guarantee** (C4-02, C4-07). A behavior holds the real element through
    // `ActivationScope.visual` and through the session, so it can always write
    // the transform itself. Doing so leaves the record describing the last
    // `write` — here, no write at all — and the landing opens from there.
    //
    // **This is unsupported tier-C discipline, not a defect**, and the row
    // exists so that the limit of I-34 is executable instead of only asserted.
    // The enforced half is narrower and is the half that matters: the behavior
    // supplies no origin, so it cannot make `from` and the record disagree — it
    // can only render behind the session's back.
    const { context, transform } = sample(
      {
        moved(current, lift): void {
          lift.visual.style.transform = `translate(${
            current.pointerX - current.originX
          }px, 0px)`;
        },
      },
      [
        [40, 10],
        [40, 60],
      ],
    );

    expect(transform).toBe('translate(30px, 0px)');
    expect(context!.from).toEqual({ x: 0, y: 0 });
  });

  /**
   * **The temporal limit is documented, not asserted** (C6-01, and this comment
   * is the row).
   *
   * A retained `lift.write` called after `from` is sampled still renders, and
   * fights the landing runner for the same property; called after `retire()` it
   * writes onto an element no live operation owns. Both are outside the
   * contract and **neither is refused**. No test pins the current behavior,
   * because a test here would read as a promise: the kernel deliberately adds
   * no phase guard — a branch on the one path M-1 measures, defending against a
   * bug no reference behavior has, converting a contract violation into a
   * *silent* no-op, which is the harder of the two defects to find.
   */
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

  it('should measure once, at arm, under SETTLING', () => {
    // **Rewritten by D-41, and the change of phase is the point.** The join
    // used to measure a second time, authoritatively, after committing
    // `FINALIZING` — with a provisional measurement at arm before it. There is
    // one measurement now and it is arm's, so it runs under `SETTLING`; the
    // join pins to the value it recorded rather than taking its own.
    const phases: number[] = [];
    const harness = createHarness({
      anchorTarget(current): { x: number; y: number } {
        phases.push(current.phase);
        return { x: 0, y: 0 };
      },
    });

    activate(harness);
    release(80, 10);

    expect(phases).toEqual([SETTLING]);
  });

  it('should skip the landing and still terminate when the measurement throws', () => {
    // **D-49, and the assertion that used to read the other way.** This case
    // classified `FAILURE_LANDING_TARGET`, replaced the settlement and skipped
    // the terminal callback. That told a consumer whose reorder was already
    // committed and accepted that the drop had failed, over a fault that is
    // entirely presentational — so the measurement moved to the quality track.
    const harness = createHarness({
      anchorTarget(): never {
        throw new Error('measure');
      },
    });

    activate(harness);
    release(80, 10);

    // Reported, never classified: no checkpoint, no `OUTCOME_FAILED`.
    expect(harness.failures).toEqual([]);
    expect(harness.reports[0]!.stage).toBe(FAILURE_LANDING_TARGET);
    // And it must not strand the controller: the placeholder is still removed
    // and the inline styles are still restored (F-22).
    expect(harness.calls).toContain('presentation.released');
    // **The terminal now runs** (D-60): the settlement was not failed, so the
    // operation joins immediately and terminates normally.
    expect(harness.calls).toContain('finalized');
  });

  it('should skip the runner entirely when the measurement throws', () => {
    // Not merely "no target to pin to". A measurement that failed is not a
    // target to animate toward, so `start` is never called — there is no
    // animation to `(0,0)` and no runner to relinquish.
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
    expect(harness.calls).toContain('finalized');
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

  it('should release presentation and still publish a terminal when the pin throws', () => {
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
    // **The join still skips it, and the checkpoint still pays it** (D-66). The
    // old assertion was `not.toContain`, reasoning that the committed frame
    // still carried the accepted outcome so publishing would announce a
    // successful drop. It would — and that is now the *point*: the pin failed,
    // but the reorder is real and the consumer's data is committed, so what the
    // consumer needs is one `onError` **and** the domain result. The publish
    // moved one action later, from the join to `ERROR_REPORTED`, rather than
    // being reinstated in the join.
    expect(harness.calls).toContain('finalized');
    // Ordering is not incidental: the terminal sees presentation released, as
    // it does on the success path.
    expect(harness.calls.indexOf('presentation.released')).toBeLessThan(
      harness.calls.indexOf('finalized'),
    );
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
        prepare: () => true,
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

          return true;
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
          return true;
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
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(80, 10);
    expect(runner.calls).toEqual(['start']);

    // The gate the readiness deadline used to hold open is gone (D-41), so the
    // failure arrives through the runner instead — what this pins is the
    // replacement rule, not which stage reached it.
    runner.fail(new Error('boom'));
    await flush();

    // A checkpoint replaces whatever settlement was open, and the runner that
    // settlement started is the kernel's to stop — otherwise it keeps writing
    // the transform through REPORTING and beyond.
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

  it('should cancel an activating drag at the proposal stage', () => {
    // `ACTIVATING` is committed *before* `activation.effect` runs, so by the
    // time a cancellation raised from inside that effect is applied, the
    // presentation exists and the behavior has notified its consumer. Retiring
    // instead would leave that notification with no terminal callback.
    const harness = createHarness({
      onStart: (host) => {
        host.cancel('from the effect');
      },
    });

    activate(harness);

    expect(harness.settlements).toEqual([
      { type: SETTLED_CANCELED, reason: 'from the effect', stage: AT_PROPOSAL },
    ]);
    expect(harness.calls).toContain('finalized');
  });
});

describe('the activation checkpoint against a held cancel', () => {
  /**
   * The ordering the latch check exists for. FIFO alone does not give it: an
   * action whose *effect* cancels — a collection replacement that invalidates
   * the gap, dispatched from `onStart` — queues its `CANCEL` **behind**
   * `START_COMMITTED`, so the checkpoint is applied first and would activate an
   * operation that is already decided.
   */
  const cancelFromAnActionEffect = (): Readonly<{
    harness: Harness;
    /** The committed phase each action preparation observed. */
    seen: number[];
  }> => {
    const seen: number[] = [];
    let host!: KernelHost;
    const harness = createHarness({
      onStart: (kernelHost) => {
        host = kernelHost;
        host.dispatch(0, null);
      },
      action: {
        prepare(_tag, _argument, draft): {} | null {
          seen.push(draft.phase);
          return true;
        },
        effect(tag): void {
          if (tag !== 0) {
            return;
          }

          // Queued first, so it sits between `START_COMMITTED` and the
          // cancellation and can observe which phase won.
          host.dispatch(1, null);
          host.cancel('invalidated');
        },
      },
    });

    activate(harness);
    return { harness, seen };
  };

  it('should not reach ACTIVE when a cancel is latched during activation', () => {
    const { seen } = cancelFromAnActionEffect();

    expect(seen).toEqual([ACTIVATING, ACTIVATING]);
  });

  it('should settle the cancellation the checkpoint refused to overtake', () => {
    const { harness } = cancelFromAnActionEffect();

    expect(harness.settlements).toEqual([
      { type: SETTLED_CANCELED, reason: 'invalidated', stage: AT_PROPOSAL },
    ]);
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
    void harness.controller.destroy();

    expect(harness.calls).toContain('presentation.released');
    expect(harness.calls).toContain('motion.released');
  });

  it('should release pointer capture', () => {
    const harness = createHarness();

    activate(harness);
    void harness.controller.destroy();

    expect(harness.captures).toEqual(['acquire', 'release']);
  });

  it('should abort ingress so a later press is inert', () => {
    const harness = createHarness();

    void harness.controller.destroy();
    press(harness.item);

    expect(harness.calls).not.toContain('admit');
  });

  it('should be terminal exactly once', () => {
    const harness = createHarness();

    activate(harness);
    void harness.controller.destroy();
    void harness.controller.destroy();

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
    void harness.host.destroy();

    expect(harness.calls).toContain('presentation.released');
  });

  it('should ignore work dispatched after destroy', () => {
    const harness = createHarness();

    activate(harness);
    void harness.controller.destroy();
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
        void harness!.controller.destroy();
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
        void harness!.controller.destroy();
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
        void harness!.controller.destroy();
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
        void harness!.controller.destroy();
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
    void harness.controller.destroy();

    expect(counter.calls).toBe(2);
  });

  it('should release ingress after a reset throws', () => {
    const counter = { calls: 0 };
    const harness = createHarness({ resetFramePart: throwingReset(counter) });

    activate(harness);
    void harness.controller.destroy();
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
    void harness.controller.destroy();

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
    draggable(root, () => ({
      controller: {},
      spec: {
        createFramePart,
        resetFramePart,
        config: {
          threshold: 8,
          liftMode: LIFT_FLAT,
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
          prepare: () => true,
          effect: (): void => {},
        },
        action: { prepare: () => null, effect: (): void => {} },
        moved: (): void => {},
        anchorTarget: () => ({ x: 0, y: 0 }),
        finalized: (): void => {},
        reportFailure: (): void => {},
        retire: (): void => {},
      },
    }));
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
});

/**
 * **The transaction bracket** (D-36, D-38, D-53; probe A).
 *
 * Logical closure and physical teardown were one event until Revision 2, and
 * separating them is the change every other liveness rule in the contract now
 * depends on. What these pin is the separation itself: that the latch moves on
 * the closing statement, that the resources do not move until the outermost
 * library transaction ends, and that the two are observably different from
 * inside a reentrant destroy — which is the only place the difference exists.
 */
describe('the transaction bracket', () => {
  it('should run physical teardown immediately outside a transaction', () => {
    const harness = createHarness();

    activate(harness);
    harness.calls.length = 0;
    void harness.controller.destroy();

    // Nothing is on the stack, so the two events still coincide. This is the
    // shipped behavior as the common case rather than as the definition.
    expect(harness.calls).toContain('retire');
  });

  it('should close, report and only then tear down on a panic', () => {
    // **The ordering D-36 reversed** (probe A: `['retire','report']` became
    // `['report','retire']`), and the only test that reaches the kernel's
    // `panic()` rather than the seam driver's in isolation.
    //
    // It is worth pinning because the ordering is **non-local**: `panic` is
    // `void destroy(); report(error);`, and that produces this order only
    // because the drain sits inside a transaction, so the physical steps defer
    // to `leaveTransaction`. A drain that lost its bracket would still pass
    // every other test in this file and silently tear down before reporting.
    //
    // The route in is the threshold crossing's selection clear: it is one of
    // the few statements the handler runs **unguarded**, on purpose — a
    // platform method that throws is an invariant break, not a drag failure —
    // and `MOVE` is a queued action, so the throw escapes `handle` into
    // `drain`'s catch, which is the one path to `panic`.
    const order: string[] = [];
    const broken = new Error('platform');
    const harness = createHarness({
      retire: (): void => {
        order.push('retire');
      },
    });

    (globalThis as Reporting).reportError = (error): void => {
      order.push(`report:${(error as Error).message}`);
      // Read from *inside* the report, which is the assertion the ordering
      // exists for: a reporter that calls back into the controller must find
      // it already closed.
      order.push(`closed:${String(harness.host.closed)}`);
    };

    const selection = window.getSelection;

    window.getSelection = (): never => {
      throw broken;
    };

    try {
      press(harness.item);
      move(40, 10);
    } finally {
      window.getSelection = selection;
    }

    expect(order).toEqual(['report:platform', 'closed:true', 'retire']);
  });

  it('should settle the returned promise after physical teardown', async () => {
    const harness = createHarness();

    activate(harness);
    harness.calls.length = 0;

    await harness.controller.destroy();

    expect(harness.calls).toContain('retire');
  });

  it('should return one promise from every destroy call', async () => {
    const harness = createHarness();
    const first = harness.controller.destroy();

    expect(harness.controller.destroy()).toBe(first);

    // Idempotent: repeated destruction closes nothing further, and every
    // returned promise still settles exactly once.
    await expect(first).resolves.toBeUndefined();
    await expect(harness.controller.destroy()).resolves.toBeUndefined();
  });

  it('should close logically on the calling statement', () => {
    let closedInside: boolean | null = null;
    const harness = createHarness({
      onStart(host): void {
        void host.destroy();
        // The latch is set by the closing statement itself, not at the end of a
        // seven-step sequence.
        closedInside = host.closed;
      },
    });

    activate(harness);

    expect(closedInside).toBe(true);
  });

  it('should defer physical teardown to the outermost transaction boundary', () => {
    let calledInside: readonly string[] = [];
    const harness = createHarness({
      onStart(host): void {
        void host.destroy();
        calledInside = [...harness.calls];
      },
    });

    activate(harness);

    // `activation.effect` runs inside a drain, so the destroy is reentrant and
    // its physical steps are owed to the boundary below it.
    expect(calledInside).not.toContain('retire');
    expect(harness.calls).toContain('retire');
  });

  it('should settle the deferred promise only after the boundary runs teardown', async () => {
    let pending!: Promise<void>;
    let settled = false;
    const harness = createHarness({
      onStart(host): void {
        pending = host.destroy();
        void pending.then(() => {
          settled = true;
        });
      },
    });

    activate(harness);

    expect(settled).toBe(false);
    await pending;
    expect(harness.calls).toContain('retire');
  });

  it('should tear down once when destroy is called twice inside one transaction', () => {
    const harness = createHarness({
      onStart(host): void {
        void host.destroy();
        void host.destroy();
      },
    });

    activate(harness);

    expect(harness.calls.filter((call) => call === 'retire')).toHaveLength(1);
  });

  /**
   * **The disagreement I-37 exists to adjudicate, made real.**
   *
   * Both readings agreed before D-36, and `signal.aborted` was preferred
   * because it is strictly *stronger* — it also fires for a kernel-internal
   * `panic()`. Deferral inverts that: the signal now lags the close, so the
   * fixture below is one where the two genuinely disagree, and the rule is that
   * the latch wins.
   */
  it('should resolve a liveness disagreement by the latch', () => {
    let latch: boolean | null = null;
    let aborted: boolean | null = null;
    const harness = createHarness({
      activation: {
        prepare: (): HTMLElement => document.createElement('div'),
        effect(_current, _prepared, scope: ActivationScope): void {
          void harness.host.destroy();

          // Both read at this instant, on purpose: the point of the row is
          // that the logical latch is already set here while the physical
          // signal is not (D-36, D-38).
          const { closed } = harness.host;
          const { aborted: signalAborted } = scope.presentation.signal;

          latch = closed;
          aborted = signalAborted;
        },
      },
    });

    activate(harness);

    expect(latch).toBe(true);
    // The physical observation has not happened yet, which is exactly why it
    // may not answer a liveness question (D-38).
    expect(aborted).toBe(false);
  });

  it('should keep the ingress released once the boundary runs', () => {
    const harness = createHarness({
      onStart(host): void {
        void host.destroy();
      },
    });

    activate(harness);
    harness.calls.length = 0;
    press(harness.item);

    expect(harness.calls).toEqual([]);
  });
});
