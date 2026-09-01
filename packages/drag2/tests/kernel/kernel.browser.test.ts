import { afterEach, describe, expect, it } from 'vitest';
import { DraggableError, DraggableWarning } from '../../src/kernel/errors.ts';
import {
  AT_CONSUMER,
  AT_PROPOSAL,
  CANCEL_ABORTED,
  CANCEL_INTERRUPTED,
  CANCEL_SUPPLIED,
  FAILURE_ACTIVATION,
  FAILURE_ADMISSION,
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
  type LandingTail,
  type PreparedSettlement,
  type ResolutionCommand,
  SETTLED_CANCELED,
  SETTLED_FAILED,
  SETTLED_FULFILLED,
  SETTLED_REJECTED,
  SETTLED_SKIPPED,
  type SettlementInput,
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
   * **Everything that reached `spec.reportError`** — the one channel (D-130).
   * ~~`reportFailure`, and a `globalThis.reportError` stub beside it.~~ Both
   * populations arrive here, and `error instanceof DraggableError` is what
   * separates *the operation was affected* from *it was not*.
   */
  reports: Array<DraggableError | DraggableWarning>;
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
    | 'landingTail'
    | 'finalized'
    | 'createFramePart'
    // Injectable so the teardown matrix can be expressed through the shared
    // harness: `resetFramePart` is a foreign teardown boundary the contract
    // explicitly permits to throw.
    | 'resetFramePart'
    | 'retire'
    | 'command'
    | 'reportError'
  >
> &
  Readonly<{
    threshold?: number;
    /** Called with the host, so a test can cancel or destroy from a seam. */
    onStart?(host: KernelHost): void;
    capture?(): void;
    /** Declared by the default `settlement.prepare`, when set. */
    presentation?: boolean;
  }>;

const cleanup: Array<() => void> = [];

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
  const reports: Array<DraggableError | DraggableWarning> = [];
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
        effect(current, _prepared): void {
          record('settlement.effect', current);
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
      landingTail: overrides.landingTail,
      finalized:
        overrides.finalized ??
        ((): void => {
          calls.push('finalized');
        }),
      // **Forward, and nothing else** (D-130). A behavior that did anything
      // else here would be re-deciding what the kernel already decided; the
      // harness is deliberately the minimal conforming implementation.
      reportError:
        overrides.reportError ??
        ((error): void => {
          reports.push(error);
        }),
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

/** A tail policy that always answers, so a test can read the animation. */
const tailOf =
  (duration = 200): NonNullable<SpecOverrides['landingTail']> =>
  (): LandingTail => ({ duration, easing: 'linear' });

/**
 * One keyframe's `translate`, as a pair. A single component is a whole
 * declaration — `translate: 50px` is fifty across and none down — which is how
 * the platform serializes both a horizontal contribution and a zero one.
 */
const vectorOf = (frame: Keyframe): Readonly<{ x: number; y: number }> => {
  const [x, y] = String(frame['translate']).split(' ');

  return {
    x: Number.parseFloat(x!),
    y: y === undefined ? 0 : Number.parseFloat(y),
  };
};

/**
 * The tail's own contribution, as the two viewport-space numbers it was issued
 * for. `null` when nothing is animating the element.
 */
const tailVector = (
  element: HTMLElement,
): Readonly<{ x: number; y: number }> | null => {
  const [animation] = element.getAnimations();

  if (!animation) {
    return null;
  }

  return vectorOf((animation.effect as KeyframeEffect).getKeyframes()[0]!);
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
      reportError: (): void => {},
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
      reportError: (): void => {},
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

    // **Consequential, so a `DraggableError`** (D-130): the consumer's drag
    // will not start and no `onEnd` will follow. The kernel built it from the
    // stage it owns, so the behavior chose nothing.
    expect(harness.reports).toHaveLength(1);
    expect(harness.reports[0]).toBeInstanceOf(DraggableError);
    expect((harness.reports[0] as DraggableError).stage).toBe(
      FAILURE_ADMISSION,
    );
    expect(String(harness.reports[0]?.cause)).toBe('Error: command');
    expect(harness.calls).toEqual([]);

    // Still usable: a press admits normally afterwards.
    activate(harness);

    expect(harness.calls).toContain('activation.effect');
  });

  it('should reject a command.types entry colliding with the pointer ingress', () => {
    // Static spec data, validated once at construction, exactly as
    // `config.actionTags` is — the same `TypeError` policy every public option
    // domain uses. The `pointerdown` collision is refused rather than tolerated:
    // two listeners for one type would run two admission members for one event,
    // and the second would find the first's operation already committed —
    // silently, and only sometimes. **This is the only check left in the loop**
    // (D-118), and the one that guards the kernel's own state rather than the
    // author's feature.
    //
    // The second case carries an empty entry beside the colliding one, which is
    // the assertion that this check stands on its own: the empty string is
    // accepted below, and accepting it must not swallow the collision sharing
    // its array.
    const cases: ReadonlyArray<readonly string[]> = [
      ['pointerdown'],
      ['', 'pointerdown'],
    ];

    for (const types of cases) {
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
      ).toThrow(/spec\/command-type-pointerdown/u);
    }
  });

  it('should arm an empty command.types as the no-command configuration', () => {
    // **The empty-array check was removed 2026-08-24** (D-118), because the
    // configuration it rejected is one the contract already supports under a
    // different spelling: 02 §Discrete admission says a behavior omitting the
    // member binds no discrete listener, and an empty `types` reaches exactly
    // that state — the binding loop below simply never runs. So the assertion
    // is not *it does not throw*, it is that the two spellings are
    // indistinguishable from outside.
    let admitted = 0;

    const drive = (harness: Harness): readonly string[] => {
      harness.root.dispatchEvent(new Event('', { bubbles: true }));
      harness.root.dispatchEvent(new CustomEvent('command', { bubbles: true }));
      activate(harness);

      return [...harness.calls];
    };

    const declared = createHarness({
      command: {
        types: [],
        admit: (): null => {
          admitted += 1;

          return null;
        },
      },
    });
    const declaredCalls = drive(declared);

    // Destroyed before the second harness is driven: `move()` dispatches on
    // `document`, so a live operation here would keep advancing while the
    // omitted-member harness takes its own press.
    void declared.controller.destroy();

    const omitted = createHarness();
    const omittedCalls = drive(omitted);

    // No discrete listener exists to reach, so `admit` is unreachable rather
    // than declining.
    expect(admitted).toBe(0);
    expect(declaredCalls).toEqual(omittedCalls);
    // And the pointer ingress is untouched by either spelling.
    expect(declaredCalls).toContain('activation.effect');
  });

  it('should arm a command.types carrying an empty-string entry', () => {
    // **The empty-string check was removed 2026-08-24** (D-118). The empty
    // string is an ordinary, distinct event type to the platform:
    // `addEventListener('')` binds, `dispatchEvent(new Event(''))` fires it,
    // and nothing else reaches it. So the author gets a live listener for a
    // type nothing dispatches — their own discrete ingress is inert, while the
    // kernel's state is untouched and its own collision rule still fires
    // (above). That is the author's invariant, not the library's.
    const admitted: string[] = [];
    const harness = createHarness({
      command: {
        types: [''],
        admit: (event): null => {
          admitted.push(event.type);

          return null;
        },
      },
    });

    harness.root.dispatchEvent(new Event('', { bubbles: true }));

    expect(admitted).toEqual(['']);

    // It intercepts nothing else: the empty type is not a wildcard.
    harness.root.dispatchEvent(new CustomEvent('command', { bubbles: true }));
    harness.root.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(admitted).toEqual(['']);

    // And the pointer ingress is intact beside it.
    activate(harness);

    expect(harness.calls).toContain('activation.effect');
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
          reportError: (): void => {},
          retire(): void {
            calls.push('retire');
          },
        },
      })),
    ).toThrow(/factory/u);

    expect(calls).toEqual(['retire']);
    root.remove();
  });

  it('should arm with a frame part that declares a kernel frame key', () => {
    // **D-124.** The rejection went with the reachability gate: `FramePartOf`
    // makes such a part uninhabitable at compile time, so reaching this state
    // needs the cast below. `arm()` no longer refuses it — asserted here so a
    // returning check has to argue with a test rather than with a silence.
    const root = document.createElement('div');

    document.body.append(root);

    expect(() =>
      createArmedWithPart(root, () => ({ phase: 1 }) as unknown as ExamplePart),
    ).not.toThrow();

    root.remove();
  });

  it('should arm with a symbol-keyed frame part', () => {
    // **D-122.** `FramePartOf` publishes that part keys are strings, and
    // `validateFramePart` — the last arm of which refused this — is deleted.
    const root = document.createElement('div');

    document.body.append(root);

    expect(() =>
      createArmedWithPart(
        root,
        () => ({ [Symbol('leak')]: null }) as unknown as ExamplePart,
      ),
    ).not.toThrow();

    root.remove();
  });

  it('should arm with a non-deterministic frame part factory', () => {
    // **D-128.** `assertFrameShapesMatch` compared the two factory results at
    // `arm()` and threw `drag: frame/shape-mismatch` on a disagreement (F-2);
    // it went with the frame assertion family. The two frames are still
    // composed by the same code path, so they still share a hidden class when
    // the factory is honest — what is gone is the diagnostic for one that is
    // not, and the frames simply differ.
    const root = document.createElement('div');
    let calls = 0;

    document.body.append(root);

    expect(() =>
      createArmedWithPart(root, () => {
        calls += 1;
        return (
          calls === 1 ? { item: null, insertion: null } : { item: null }
        ) as ExamplePart;
      }),
    ).not.toThrow();
    expect(calls).toBe(2);

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
    expect(harness.reports[0]).toBeInstanceOf(DraggableError);
    expect((harness.reports[0] as DraggableError).stage).toBe(
      FAILURE_ADMISSION,
    );

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

  it('should classify a throwing release prepare at the seam’s own stage', () => {
    // **The seam owns the stage** (D-152). ~~`should classify a rejection at
    // the stage it names`~~ handed the stage back through a `SeamRejection`,
    // and every one of the six sites that did handed back exactly the stage the
    // seam was already running at. The behavior raises a **cause**; the phase is
    // open at `FAILURE_RELEASE`, so that is what the failure carries.
    const cause = new Error('no insertion');
    const harness = createHarness({
      release: {
        prepare: (): ResolutionCommand => {
          throw cause;
        },
        effect(): void {
          throw new Error('unreachable');
        },
      },
    });

    activate(harness);
    release(80, 10);

    expect(harness.failures[0]!.stage).toBe(FAILURE_RELEASE);
    // And the cause travels verbatim: what reaches the settlement input is the
    // object the behavior raised, not a wrapper minted at the failing branch.
    expect(harness.failures[0]!.error).toBe(cause);
  });

  it('should not run the effect after a throwing prepare', () => {
    const harness = createHarness({
      release: {
        prepare: (): ResolutionCommand => {
          throw new Error('no insertion');
        },
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
      {
        type: SETTLED_CANCELED,
        reason: 'abandoned',
        origin: CANCEL_SUPPLIED,
        stage: AT_CONSUMER,
      },
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

  it('should classify a throwing prepare at the seam’s own stage', () => {
    const harness = createHarness({
      settlement: {
        prepare(_draft, input): PreparedSettlement {
          // The checkpoint the failure queues drives this same seam, so the
          // failed input is what records the classification.
          if (input.type === SETTLED_FAILED) {
            harness.failures.push({ stage: input.stage, error: input.error });
            return true;
          }

          throw new Error('not a resolution');
        },
        effect(): void {},
      },
    });

    activate(harness);
    release(80, 10);

    // Acceptance is never inferred: a fulfilled value that is not an explicit
    // resolution is classified at the settlement seam's own stage, which the
    // behavior no longer names because it never had to (D-152), and nothing
    // below the throw runs.
    expect(harness.failures[0]!.stage).toBe(FAILURE_RESOLUTION);
    // **And the operation is still disposed of** (D-66). "Nothing below the
    // throw runs" is about *continuation* — no gate arming, no consumer
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

  it('should measure nothing when the effect throws', () => {
    const measured: string[] = [];
    const harness = createHarness({
      settlement: {
        prepare: () => true,
        effect(): never {
          throw new Error('effect');
        },
      },
      anchorTarget(): { x: number; y: number } {
        measured.push('anchorTarget');
        return { x: 0, y: 0 };
      },
    });

    activate(harness);
    release(80, 10);

    // A settlement that never committed does not land: measuring for a join
    // that will never happen would call behavior code for nothing, and the
    // queued checkpoint decides the operation instead. What the checkpoint
    // decides includes the terminal.
    expect(measured).toEqual([]);
    expect(harness.calls).toContain('finalized');
  });
});

describe('the settlement drain', () => {
  it('should finalize in the resolution drain', () => {
    // **Nothing suspends a settlement.** The seam commits, the target is
    // measured, the join releases, and the terminal publishes — one
    // synchronous sequence with no gate in it and nothing to wait for.
    const harness = createHarness();

    activate(harness);
    release(80, 10);

    expect(harness.calls).toContain('finalized');
  });

  it('should finalize in the same drain with a tail installed', () => {
    // The tail is an interpolation, not a gate: it holds no lease, so there is
    // nothing for the terminal to wait on and the operation ends while the
    // element is still moving.
    const harness = createHarness({ landingTail: tailOf() });

    activate(harness);
    release(80, 10);

    expect(harness.calls).toContain('finalized');
    expect(tailVector(harness.item)).not.toBeNull();
  });
});

/**
 * **The landing tail.**
 *
 * Presentation is released *completely* at the join — inline styles restored,
 * top layer exited, the behavior's own presentation disposed — and only then
 * does anything interpolate. What is left travelling is an additive
 * contribution to the released element's `translate`, decaying to zero: it
 * writes no inline style, reverts by itself, cancels to a settled state in one
 * call and dies with the element. That is why it may outlive the operation, and
 * it is the whole of the argument.
 */
describe('the landing tail', () => {
  it('should start nothing without a landing policy', () => {
    // A behavior that declares no policy pays for no capability: there is no
    // animation, and the visual is simply where flow puts it once the release
    // restores its inline styles. Nothing wrote it there.
    const harness = createHarness();

    activate(harness);
    release(80, 10);

    expect(harness.item.getAnimations()).toEqual([]);
  });

  it('should travel the delta the release removed', () => {
    // The visual was rendered at `(70, 0)` and the drop decided the anchor's
    // origin-relative `(20, 0)`, so releasing it into flow moves it 50px left
    // in one frame. The tail contributes exactly that back and decays it away.
    //
    // **The anchor is built from the grab rect the kernel published**, which is
    // the basis it converts against: by settle time the visual is out of flow
    // and carrying the drag's transform, so its live rect is a different
    // number.
    let grab: DOMRectReadOnly | null = null;
    const harness = createHarness({
      moved(current, lift): void {
        lift.write(current.pointerX - current.originX, 0);
      },
      activation: {
        prepare: (): HTMLElement => document.createElement('div'),
        effect(_current, _prepared, scope: ActivationScope): void {
          grab = scope.originRect;
        },
      },
      anchorTarget: (): { x: number; y: number } => ({
        x: grab!.x + 20,
        y: grab!.y,
      }),
      landingTail: tailOf(),
    });

    activate(harness);
    move(80, 10);
    release(80, 10);

    expect(tailVector(harness.item)).toEqual({ x: 50, y: 0 });
  });

  it('should decay to a zero contribution', () => {
    // **This is what makes cancellation safe at any moment.** The tail ends at
    // nothing, so whether it finishes or is cancelled, the element is left
    // exactly where flow puts it — there is no final position to write and no
    // cleanup owner to appoint.
    const harness = createHarness({
      moved(current, lift): void {
        lift.write(current.pointerX - current.originX, 0);
      },
      landingTail: tailOf(),
    });

    activate(harness);
    move(80, 10);
    release(80, 10);

    const [animation] = harness.item.getAnimations();
    const frames = (animation!.effect as KeyframeEffect).getKeyframes();

    expect(vectorOf(frames.at(-1)!)).toEqual({ x: 0, y: 0 });
  });

  it('should add to the element rather than claim its transform', () => {
    // `transform` would be wrong twice over — it replaces an authored
    // `rotate()` and overrides a consumer's own transform animation — and
    // additive `transform` concatenates, so the offset would land inside the
    // element's own `scale()`. `translate` applies before `transform` in the
    // used-value chain, so an additive contribution to it sits outside
    // everything the consumer wrote.
    const harness = createHarness({
      moved(current, lift): void {
        lift.write(current.pointerX - current.originX, 0);
      },
      landingTail: tailOf(),
    });

    activate(harness);
    move(80, 10);
    release(80, 10);

    const [animation] = harness.item.getAnimations();

    expect((animation!.effect as KeyframeEffect).composite).toBe('add');
    // No fill, so nothing of it is written to `style` and a consumer reading
    // the element's inline styles sees only what it authored itself.
    expect(harness.item.style.translate).toBe('');
  });

  it('should start only after presentation is released', () => {
    // The order is normative and it is what makes the tail sound: a tail
    // installed while the visual is still `fixed` in the top layer would be
    // interpolating a lease, which is exactly the shape this design refuses.
    let animatingAtRelease: number | null = null;
    const harness = createHarness({
      moved(current, lift): void {
        lift.write(current.pointerX - current.originX, 0);
      },
      landingTail: tailOf(),
      activation: {
        prepare: (): HTMLElement => document.createElement('div'),
        effect(_current, _prepared, scope: ActivationScope): void {
          scope.presentation.use(() => {
            animatingAtRelease = scope.visual.getAnimations().length;
          });
        },
      },
    });

    activate(harness);
    release(80, 10);

    expect(animatingAtRelease).toBe(0);
    expect(tailVector(harness.item)).not.toBeNull();
  });

  it('should start nothing when the visual is already where it lands', () => {
    // A drop with no journey is not interpolated. The default `moved` writes
    // nothing and the default anchor is the grab point, so the release removes
    // a delta of zero and there is nothing to travel.
    const harness = createHarness({
      anchorTarget: (): { x: number; y: number } => {
        const rect = harness.item.getBoundingClientRect();

        return { x: rect.x, y: rect.y };
      },
      landingTail: tailOf(),
    });

    activate(harness);
    release(80, 10);

    expect(harness.item.getAnimations()).toEqual([]);
  });

  it('should cancel the tail when the controller is destroyed', async () => {
    const harness = createHarness({
      moved(current, lift): void {
        lift.write(current.pointerX - current.originX, 0);
      },
      landingTail: tailOf(),
    });

    activate(harness);
    move(80, 10);
    release(80, 10);

    const [animation] = harness.item.getAnimations();

    await harness.controller.destroy();

    // Cancelled, not finished: the contribution decays to zero, so the element
    // settles instantly and there is nothing left for anyone to release.
    expect(animation!.playState).toBe('idle');
    expect(harness.item.getAnimations()).toEqual([]);
  });

  it('should cancel the tail when the next drag acquires the visual', () => {
    // Measuring a visual mid-tail is right — the drag should start from where
    // the element *looks*. Cancelling is about the cascade: a running animation
    // outranks inline styles, so the new lift's own writes would compose with a
    // contribution that is still decaying.
    const harness = createHarness({
      moved(current, lift): void {
        lift.write(current.pointerX - current.originX, 0);
      },
      landingTail: tailOf(),
    });

    activate(harness);
    move(80, 10);
    release(80, 10);
    expect(harness.item.getAnimations()).toHaveLength(1);

    activate(harness);

    expect(harness.item.getAnimations()).toEqual([]);
  });

  it('should keep the tail through a press that never activates', () => {
    // A press is not a drag. Cancelling at admission would kill a live
    // interpolation for a tap that goes on to do nothing at all.
    const harness = createHarness({
      moved(current, lift): void {
        lift.write(current.pointerX - current.originX, 0);
      },
      landingTail: tailOf(),
    });

    activate(harness);
    move(80, 10);
    release(80, 10);

    press(harness.item);

    expect(harness.item.getAnimations()).toHaveLength(1);
  });

  it('should start no tail when the policy destroyed the controller', () => {
    let harness: Harness | null = null;

    harness = createHarness({
      moved(current, lift): void {
        lift.write(current.pointerX - current.originX, 0);
      },
      landingTail: (): LandingTail => {
        void harness!.controller.destroy();
        return { duration: 200, easing: 'linear' };
      },
    });

    activate(harness);
    release(80, 10);

    // `destroy()` is a synchronous terminal barrier: a destroyed controller
    // writes nothing, including an animation nothing would be left to cancel.
    expect(harness.item.getAnimations()).toEqual([]);
    expect(harness.calls).not.toContain('finalized');
  });

  it('should report a policy that throws and still terminate', () => {
    const harness = createHarness({
      moved(current, lift): void {
        lift.write(current.pointerX - current.originX, 0);
      },
      landingTail: (): never => {
        throw new Error('policy');
      },
    });

    activate(harness);
    release(80, 10);

    // A cosmetic fault may not touch a semantic result: the drop is already
    // decided, committed and released by the time anything interpolates.
    expect(harness.failures).toEqual([]);
    expect(harness.reports).toHaveLength(1);
    expect(harness.reports[0]).toBeInstanceOf(DraggableWarning);
    expect(harness.calls).toContain('finalized');
  });

  it('should report a duration the platform refuses and still terminate', () => {
    const harness = createHarness({
      moved(current, lift): void {
        lift.write(current.pointerX - current.originX, 0);
      },
      landingTail: (): LandingTail => ({
        duration: Number.NaN,
        easing: 'ease',
      }),
    });

    activate(harness);
    release(80, 10);

    // The duration domain is `animate()`'s, and the refusal is where it lands:
    // no library check, no classified failure, and a drop that ended normally.
    expect(harness.failures).toEqual([]);
    expect(harness.reports).toHaveLength(1);
    expect(harness.item.getAnimations()).toEqual([]);
    expect(harness.calls).toContain('finalized');
  });
});

/**
 * **The landing origin (D-35, K-3).**
 *
 * Where the drop travels *from* was `pointerX - originX`, documented as *where
 * the visual is now*. Those are the same number for exactly one behavior — one
 * whose `moved` writes the raw pointer delta on both axes, which is what the
 * sortable does and what this harness's default `moved` deliberately does not.
 * For a behavior that constrains, clamps, snaps or externally drives its visual
 * they differ, and a pointerless operation has no pointer to subtract at all.
 *
 * **Why the whole suite could stay green through it** is the part worth
 * repeating: the drop travels with a jump and still *ends* correctly, because
 * the release is what puts the visual in its place and the tail only decays a
 * contribution to zero. Phase 11 met the same shape in the lift geometry and
 * only a demo exposed it. So every row here reads the origin at the one instant
 * it is published — the tail policy — and checks it against the transform
 * standing on the element while it is still lifted, rather than inferring it
 * from where the drop ended, which is the assertion that cannot tell the defect
 * from the fix.
 */
describe('the landing origin', () => {
  type Sampled = Readonly<{ x: number; y: number }>;

  /**
   * Presses, moves through `path`, releases, and returns the origin the tail
   * policy was handed. The release coordinate is the last point of `path`
   * unless `releaseAt` names another — the two differ where the point is to
   * show that the origin follows the *write*, not the pointer.
   */
  const sample = (
    overrides: SpecOverrides,
    path: ReadonlyArray<readonly [x: number, y: number]>,
  ): Readonly<{
    harness: Harness;
    origin: Sampled | null;
    /**
     * The visual's inline transform **while it is still lifted**, read from
     * inside `anchorTarget`. Read there rather than after the drop, because
     * teardown restores the inline-style lease: an assertion against the
     * element afterwards compares the composition to an empty string and passes
     * for the wrong reason.
     */
    transform: string;
    /** The lift session, so a row can compose against it. */
    lift: BehaviorLiftSession | null;
  }> => {
    let origin: Sampled | null = null;
    let transform = '';
    let lift: BehaviorLiftSession | null = null;
    const harness = createHarness({
      ...overrides,
      activation: {
        prepare: (): HTMLElement => document.createElement('div'),
        effect(_current, _prepared, scope: ActivationScope): void {
          lift = scope.lift;
        },
      },
      anchorTarget(): { x: number; y: number } {
        const rect = harness.item.getBoundingClientRect();

        transform = harness.item.style.transform;

        // **A hundred pixels below the visual's own box**, so that every row
        // travels — including the three whose visual never moved at all, whose
        // origin is the answer under test.
        return { x: rect.x, y: rect.y + 100 };
      },
      landingTail(_current, fromX, fromY): LandingTail {
        origin = { x: fromX, y: fromY };
        return { duration: 200, easing: 'linear' };
      },
    });

    press(harness.item);

    for (const [x, y] of path) {
      move(x, y);
    }

    const last = path.at(-1) ?? [10, 10];

    release(last[0], last[1]);

    return { harness, origin, transform, lift };
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
    const { origin, transform, lift } = sample({ moved: followsPointer }, [
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
    // What it does add is the composition identity the tail depends on.
    //
    // **Non-zero on both axes, and that is the whole design of the fixture.** A
    // delta and a viewport point agree at the origin and nowhere else, so a
    // fixture that drags along one axis from a grab at `(0, 0)` cannot tell the
    // recorded delta from the pointer position or from either mistake in
    // between. Grab is `(10, 10)`, so this is `(60, 80)`.
    expect(origin).toEqual({ x: 60, y: 80 });
    // The end-to-end form of the same claim, and the one the tail depends on:
    // the origin and `compose` are the same coordinate space, so composing the
    // published origin reproduces the transform that was standing on the
    // element. A tail issued for `origin - target` therefore starts exactly
    // where the drag left the visual — no first-frame jump.
    expect(lift!.compose(origin!.x, origin!.y)).toBe(transform);
  });

  it('should report the constrained delta rather than the pointer delta', () => {
    // The cheapest constraining behavior there is: an axis lock. It is also the
    // one free drag ships, which is why this row is K-3's and L-4's shared
    // half — the difference is that free drag reaches it on three paths.
    const { origin } = sample(
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
    // the drop travelled from 50px below the visual.
    expect(origin).toEqual({ x: 30, y: 0 });
  });

  it('should track a write issued from an action effect', () => {
    // 13c N-4's case: a controlled position, written from a seam that is not
    // `moved` at all. This is what the rejected `renderedDelta(current)` seam
    // would have got wrong without the behavior mirroring every write into its
    // own frame part — the duplication that produced the defect in the first
    // place. The kernel records its own writes, so the route does not matter.
    let retained: BehaviorLiftSession | null = null;
    let origin: Sampled | null = null;
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
      landingTail(_current, fromX, fromY): LandingTail {
        origin = { x: fromX, y: fromY };
        return { duration: 200, easing: 'linear' };
      },
    });

    press(harness.item);
    move(40, 60);
    harness.host.dispatch(0, null);
    release(40, 60);

    expect(origin).toEqual({ x: -5, y: 7 });
  });

  it('should report the origin for an operation that never rendered', () => {
    // The harness default `moved` records the call and writes nothing, so the
    // visual is still where acquisition left it. `(0, 0)` is not a fallback
    // here — it is the true answer, and it is the initial value of the record
    // rather than a special case anyone had to write.
    //
    // **The anchor is `(10, 10)`, the grab point**, so the release removes
    // nothing and no tail is issued: the origin is read from the policy call, which
    // happens whether or not anything travels.
    const { origin } = sample({}, [[40, 60]]);

    expect(origin).toEqual({ x: 0, y: 0 });
  });

  it('should report the origin for a pointerless operation', () => {
    let origin: Sampled | null = null;
    const harness = createHarness({
      command: {
        types: ['keydown'],
        admit: (_event, draft): HTMLElement => {
          draft.item = harness.item;
          return harness.item;
        },
      },
      anchorTarget: () => ({ x: 40, y: 40 }),
      landingTail(_current, fromX, fromY): LandingTail {
        origin = { x: fromX, y: fromY };
        return { duration: 200, easing: 'linear' };
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
    // subtracted form return the *negated* origin and send the visual across
    // the viewport at the start of its tail. The recorded delta has no such
    // failure mode: nothing wrote, so nothing moved.
    expect(origin).toEqual({ x: 0, y: 0 });
  });

  it('should record nothing for a compose without a write', () => {
    // Composing is not rendering, so it must not move the origin.
    const { origin } = sample(
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

    expect(origin).toEqual({ x: 0, y: 0 });
  });

  it('should leave the recorded delta stale when a behavior writes behind it', () => {
    // **The adversarial case, and it documents a limit rather than a
    // guarantee** (C4-02, C4-07). A behavior holds the real element through
    // `ActivationScope.visual` and through the session, so it can always write
    // the transform itself. Doing so leaves the record describing the last
    // `write` — here, no write at all — and the drop travels from there.
    //
    // **This is unsupported tier-C discipline, not a defect**, and the row
    // exists so that the limit of I-34 is executable instead of only asserted.
    // The enforced half is narrower and is the half that matters: the behavior
    // supplies no origin, so it cannot make the published one and the record
    // disagree — it can only render behind the session's back.
    const { origin, transform } = sample(
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
    expect(origin).toEqual({ x: 0, y: 0 });
  });

  /**
   * **The temporal limit is documented, not asserted** (C6-01, and this comment
   * is the row).
   *
   * A retained `lift.write` called after the origin is sampled still renders,
   * and moves a visual the settlement has already read; called after `retire()`
   * it writes onto an element no live operation owns. Both are outside the
   * contract and **neither is refused**. No test pins the current behavior,
   * because a test here would read as a promise: the kernel deliberately adds
   * no phase guard — a branch on the one path M-1 measures, defending against a
   * bug no reference behavior has, converting a contract violation into a
   * *silent* no-op, which is the harder of the two defects to find.
   */
});

describe('the join', () => {
  it('should release presentation before finalizing, and tail between', () => {
    // Ordering is normative: measure → release → tail → finalize. The kernel
    // writes nothing here — the release hands the element back to the consumer
    // and flow puts it where the drop decided — and the terminal callback runs
    // in a world the library holds no claim on.
    const harness = createHarness({
      moved(current, lift): void {
        lift.write(current.pointerX - current.originX, 0);
      },
      landingTail: tailOf(),
    });

    activate(harness);
    move(80, 10);
    release(80, 10);

    expect(harness.calls.indexOf('presentation.released')).toBeLessThan(
      harness.calls.indexOf('finalized'),
    );
    // And the terminal did not wait for the interpolation: it published while
    // the element was still moving.
    expect(tailVector(harness.item)).not.toBeNull();
  });

  it('should measure once, under SETTLING', () => {
    // **The measurement is the settlement's, not the join's.** There is one
    // measurement and it runs under `SETTLING`; the join reads the value it
    // recorded, and the tail travels the inverse of the delta between where the
    // visual was and that value. A second, advisory reading would give the tail
    // an endpoint nothing else agrees with.
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

  it('should read the anchor before any code can rewrite it', () => {
    // **F-123, and it is D-144's precondition rather than its consequence.**
    // The seam's contract says the returned point is *borrowed*: both fields
    // are read on return and the object is never retained, which is what lets
    // an implementation hand back one reusable buffer per controller — as both
    // first-party behaviors now do. Nothing asserted it. A kernel that stored
    // the object on the settlement attempt and read it later would break every
    // caching implementation silently and pass the whole suite.
    //
    // **The window is narrow and the poison sits at the front of it.** Nothing
    // foreign runs between the read and the release, so the earliest a caching
    // behavior could be betrayed is the presentation disposers — which run
    // before the tail is issued, and the tail's endpoint is the only thing the
    // borrowed point still reaches. The two coordinates are deliberately
    // unequal and non-zero: a transposed axis is the way a flattening fails.
    const buffer = { x: 0, y: 0 };
    // Published by the activation scope and read at settle time. The seam needs
    // the visual's rect **at grab** — the basis the kernel converts against —
    // and the frame's `originX`/`originY` are the *grab pointer*, which is a
    // different origin.
    let grab: DOMRectReadOnly | null = null;
    const harness = createHarness({
      activation: {
        prepare: (): HTMLElement => document.createElement('div'),
        effect(_current, _prepared, scope: ActivationScope): void {
          grab = scope.originRect;
          scope.presentation.use(() => {
            buffer.x = -999;
            buffer.y = -777;
          });
        },
      },
      moved(current, lift): void {
        lift.write(current.pointerX - current.originX, 0);
      },
      anchorTarget(): { x: number; y: number } {
        buffer.x = grab!.x + 60;
        buffer.y = grab!.y + 25;

        return buffer;
      },
      landingTail: tailOf(),
    });

    activate(harness);
    move(80, 10);
    release(80, 10);

    // **The tail's contribution is the whole assertion, because it is the only
    // thing downstream of the borrow.** The drag rendered `(70, 0)` and the
    // measurement converted the anchor to `(60, 25)`, so the residual is
    // `(10, -25)`. A kernel that stored the object and converted it later would
    // read `(-999, -777)` — poisoned by a disposer that has already run — and
    // no arithmetic over that pair produces this one.
    expect(tailVector(harness.item)).toEqual({ x: 10, y: -25 });
  });

  it('should skip the tail and still terminate when the measurement throws', () => {
    // **D-49, and the assertion that used to read the other way.** This case
    // classified a landing-target failure, replaced the settlement and skipped
    // the terminal callback. That told a consumer whose reorder was already
    // committed and accepted that the drop had failed, over a fault that is
    // entirely presentational — so the measurement moved to the quality track.
    const harness = createHarness({
      moved(current, lift): void {
        lift.write(current.pointerX - current.originX, 0);
      },
      landingTail: tailOf(),
      anchorTarget(): never {
        throw new Error('measure');
      },
    });

    activate(harness);
    release(80, 10);

    // Reported, never classified: no checkpoint, no `OUTCOME_FAILED`.
    //
    // **And a warning, which is the whole of what the stage used to say**
    // (D-130). The retired landing-target stage existed to be *classified,
    // non-consequential and recovery-less* — a shape D-49 had to invent because
    // reaching `onError` required a classification. The class says it directly.
    expect(harness.failures).toEqual([]);
    expect(harness.reports).toHaveLength(1);
    expect(harness.reports[0]).toBeInstanceOf(DraggableWarning);
    expect(harness.reports[0]).not.toBeInstanceOf(DraggableError);
    expect(harness.reports[0]?.message).toBe(
      'drag: landing/target-unavailable',
    );
    // And it must not strand the controller: the placeholder is still removed
    // and the inline styles are still restored (F-22).
    expect(harness.calls).toContain('presentation.released');
    // **The terminal now runs** (D-60): the settlement was not failed, so the
    // operation joins immediately and terminates normally.
    expect(harness.calls).toContain('finalized');
    // **Nothing travels, and not merely "no target to travel to".** A measurement
    // that failed is not a target to interpolate toward, so there is no
    // animation to `(0, 0)` and no policy call at all — the visual is released
    // from where it stands, which is an honest jump cut.
    expect(harness.item.getAnimations()).toEqual([]);
  });

  it('should raise no classified failure of its own', () => {
    // **The join is infallible, and that is a property rather than an
    // accident.** It reads a recorded pair, releases presentation and asks a
    // policy; the release reports through the warning channel, the policy is
    // unwound, and the one classified call it makes is the terminal callback
    // itself. So no fault of the join's can reach a consumer whose drop is
    // already decided and committed — the whole reason the kernel writes
    // nothing here.
    //
    // Poisoning the visual's inline `transform` is what used to fail it: the
    // setter throws on every write, and the drag has already made several.
    const harness = createHarness({
      moved(current, lift): void {
        lift.write(current.pointerX - current.originX, 0);
      },
      landingTail: tailOf(),
    });

    activate(harness);
    move(80, 10);

    Object.defineProperty(harness.item.style, 'transform', {
      configurable: true,
      get: (): string => '',
      set(): never {
        throw new Error('cssom');
      },
    });

    release(80, 10);

    // The restore is a `removeProperty`, not a write, so the poisoned setter is
    // never called again after the last `moved`.
    expect(harness.failures).toEqual([]);
    expect(harness.calls).toContain('presentation.released');
    expect(harness.calls).toContain('finalized');
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

    // **`report` rides beside `stage`** (D-130 §5). The behavior maps the stage
    // to a recovery, which is its own; the finished error is what it forwards
    // to `onError`, and the kernel building it is what makes `toDraggableError`
    // kernel-private.
    expect(harness.settlements).toEqual([
      {
        type: SETTLED_FAILED,
        stage: FAILURE_RENDERER_WRITE,
        error,
        report: expect.any(DraggableError) as DraggableError,
      },
    ]);
    expect(
      (harness.settlements[0] as { report: DraggableError }).report.cause,
    ).toBe(error);
  });

  it('should start no tail for a failed settlement', () => {
    const harness = createHarness({
      moved(): never {
        throw new Error('cssom');
      },
      landingTail: tailOf(),
    });

    activate(harness);
    move(60, 10);

    // A failed settlement measures nothing and never joins, so there is no
    // delta to interpolate and the policy is never consulted.
    expect(harness.item.getAnimations()).toEqual([]);
    expect(harness.calls).toContain('retire');
  });

  it('should publish the terminal from the error route, after the release', () => {
    // **The two routes end in the same order, and that is the promise** (D-66).
    // A consequential failure of a started operation still owes exactly one
    // end: the checkpoint drives `onError`, releases presentation and publishes
    // the terminal from `ERROR_REPORTED` — so a consumer never has to know
    // which route its drag took to know the element is its own again.
    //
    // **This is the route's producer, and it is a pre-commit one.** Nothing
    // between the settlement's commit and the terminal callback classifies:
    // the measurement is unclassified, the release reports warnings, and the
    // tail is unwound. A fault that is going to defer the terminal has to be
    // raised before the drop is decided.
    const harness = createHarness({
      moved(): never {
        throw new Error('cssom');
      },
    });

    activate(harness);
    move(60, 10);

    expect(harness.failures[0]!.stage).toBe(FAILURE_RENDERER_WRITE);
    expect(harness.calls).toContain('finalized');
    expect(harness.calls.indexOf('presentation.released')).toBeLessThan(
      harness.calls.indexOf('finalized'),
    );
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
    expect(harness.reports).toHaveLength(1);
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

    // The failure of a report has no *classification* left to take: a second
    // checkpoint would be dropped at REPORTING, which would swallow it. It
    // surfaces as a warning instead, and never replaces the initiating error.
    expect(harness.settlements).toHaveLength(1);
    expect(harness.reports).toHaveLength(1);
    expect(harness.calls).toContain('retire');
  });

  it('should not swallow a failure raised over the failed input', () => {
    const harness = createHarness({
      moved(): never {
        throw new Error('cssom');
      },
      settlement: {
        prepare(_draft, input): PreparedSettlement {
          harness.settlements.push(input);
          // **The stage this used to name is gone with the transport** (D-152),
          // and the row is unaffected: what it pins is that a fault raised
          // while mapping the *failed* input still surfaces, not which stage it
          // carried. The seam's own `FAILURE_RESOLUTION` is what classifies it,
          // and the report transition never publishing is why it arrives as a
          // warning either way.
          throw new Error('cannot map');
        },
        effect: (): void => {},
      },
    });

    activate(harness);
    move(60, 10);

    // The report transition never published, so nothing will drive
    // `ERROR_REPORTED` — but the operation still may not stay live, and the
    // raised error still has to surface somewhere.
    expect(harness.reports).toHaveLength(1);
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

  it('should replace an open settlement without disturbing a live tail', async () => {
    const harness = createHarness({
      moved(current, lift): void {
        lift.write(current.pointerX - current.originX, 0);
      },
      landingTail: tailOf(),
      finalized(): never {
        throw new Error('onFinish');
      },
    });

    activate(harness);
    release(80, 10);

    const [animation] = harness.item.getAnimations();

    await flush();

    // **The tail is not the settlement's to stop, and that is the change.** A
    // checkpoint replaces whatever settlement was open; what the replaced
    // settlement left travelling holds no lease on anything, so there is
    // nothing for the replacement to release and nothing that could still be
    // writing an inline style through `REPORTING`.
    expect(harness.failures[0]!.stage).toBe(FAILURE_TERMINAL_CALLBACK);
    expect(animation!.playState).not.toBe('idle');
  });
});

describe('cancellation stages', () => {
  it('should cancel an active drag at the proposal stage', () => {
    const harness = createHarness();

    activate(harness);
    harness.controller.cancel('reason');

    expect(harness.settlements).toEqual([
      {
        type: SETTLED_CANCELED,
        reason: 'reason',
        origin: CANCEL_SUPPLIED,
        stage: AT_PROPOSAL,
      },
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
      {
        type: SETTLED_CANCELED,
        reason: 'reason',
        origin: CANCEL_SUPPLIED,
        stage: AT_CONSUMER,
      },
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
      {
        type: SETTLED_CANCELED,
        reason: 'from the effect',
        origin: CANCEL_SUPPLIED,
        stage: AT_PROPOSAL,
      },
    ]);
    expect(harness.calls).toContain('finalized');
  });
});

/**
 * **The producer mapping** (D-154). `origin` answers *who decided*, and the
 * kernel is the only party that writes it — which is the whole reason it is not
 * carried on `reason`, a channel every party can write.
 *
 * One row per producer, because the mapping is the contract: a producer routed
 * to the wrong origin is a silent relabelling of a cause, and the field exists
 * to be switched on.
 */
describe('cancellation origins', () => {
  it('should mark a consumer cancel as supplied', () => {
    const harness = createHarness();

    activate(harness);
    harness.controller.cancel('reason');

    expect(harness.settlements[0]).toMatchObject({ origin: CANCEL_SUPPLIED });
  });

  it('should mark a behavior cancel as supplied', () => {
    // **Not a second origin.** A behavior's controller spreads `host.cancel`
    // through unchanged, so the kernel has no basis to tell the two callers
    // apart — and both of them are a party supplying a value.
    const harness = createHarness({
      onStart: (host) => {
        host.cancel('from the behavior');
      },
    });

    activate(harness);

    expect(harness.settlements[0]).toMatchObject({ origin: CANCEL_SUPPLIED });
  });

  it('should mark Escape as aborted', () => {
    const harness = createHarness();

    activate(harness);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );

    expect(harness.settlements[0]).toMatchObject({ origin: CANCEL_ABORTED });
  });

  it('should carry no reason for an Escape', () => {
    // The kernel supplies **no** value on a cause it decided itself. What used
    // to travel here was `'drag:escape'`, and a consumer comparing `reason` to
    // it was switching on a slot whose other legal occupants include arbitrary
    // thrown values.
    const harness = createHarness();

    activate(harness);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );

    expect(harness.settlements[0]).toMatchObject({ reason: undefined });
  });

  it('should mark a cancelled pointer as interrupted', () => {
    const harness = createHarness();

    activate(harness);
    document.dispatchEvent(
      new PointerEvent('pointercancel', { pointerId: POINTER_ID }),
    );

    expect(harness.settlements[0]).toMatchObject({
      origin: CANCEL_INTERRUPTED,
    });
  });

  it('should not let a supplied reason forge an origin', () => {
    // **The whole reason provenance is a separate field.** `cancel` accepts
    // anything, so a consumer can put a provenance constant on `reason` — and
    // it stays a value they supplied. `origin` is written by the kernel and
    // says so, which is the discrimination `reason` could never carry.
    const harness = createHarness();

    activate(harness);
    harness.controller.cancel(CANCEL_ABORTED);

    expect(harness.settlements[0]).toMatchObject({
      reason: CANCEL_ABORTED,
      origin: CANCEL_SUPPLIED,
    });
  });

  it('should mark lost pointer capture as interrupted', () => {
    // **The same origin as `pointercancel`, deliberately.** Two DOM spellings
    // of one fact — the pointer stream ended without a drop — and a consumer
    // cannot act differently on them, so telling them apart would re-export the
    // platform detail the kernel exists to absorb.
    const harness = createHarness();

    activate(harness);
    document.dispatchEvent(
      new PointerEvent('lostpointercapture', { pointerId: POINTER_ID }),
    );

    expect(harness.settlements[0]).toMatchObject({
      origin: CANCEL_INTERRUPTED,
    });
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
      {
        type: SETTLED_CANCELED,
        reason: 'invalidated',
        origin: CANCEL_SUPPLIED,
        stage: AT_PROPOSAL,
      },
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
    expect(harness.reports).toHaveLength(3);
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
  it('should start no tail after anchorTarget destroyed the controller', () => {
    // The join captures its locals before it commits `FINALIZING`, so teardown
    // clearing the kernel's slots does not stop it proceeding. Without the
    // entry revalidation it would interpolate an element whose authored styles
    // `destroy()` has already restored, and leave the animation running past
    // the controller's life (I-6).
    let harness: Harness | null = null;

    harness = createHarness({
      moved(current, lift): void {
        lift.write(current.pointerX - current.originX, 0);
      },
      landingTail: tailOf(),
      anchorTarget: () => {
        void harness!.controller.destroy();
        return { x: 300, y: 300 };
      },
    });

    activate(harness);
    move(40, 10);
    release(40, 10);

    expect(harness.item.getAnimations()).toEqual([]);
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

  it('should start no tail after a presentation disposer destroyed the controller', () => {
    let harness: Harness | null = null;

    harness = createHarness({
      activation: {
        prepare: (): HTMLElement => document.createElement('div'),
        effect(_current, _prepared, scope: ActivationScope): void {
          scope.presentation.use(() => {
            void harness!.controller.destroy();
          });
        },
      },
      moved(current, lift): void {
        lift.write(current.pointerX - current.originX, 0);
      },
      landingTail: tailOf(),
    });

    activate(harness);
    release(40, 10);

    // The disposer runs after the release and before the tail, so what a
    // destroy there must stop is the interpolation and the terminal. The
    // element is left exactly as `destroy()` restored it.
    expect(harness.item.style.transform).toBe('');
    expect(harness.item.getAnimations()).toEqual([]);
    expect(harness.calls).not.toContain('finalized');
  });
});

describe('the one channel', () => {
  /**
   * **D-130's own properties**, which no earlier row could hold: the platform
   * destination could not throw back into the library, so nothing here was
   * expressible before the channel became a consumer callback.
   */

  it('should run every remaining disposer when onError throws mid-teardown', () => {
    // **The §7 property, and the reason `unwind` survived the rename.** The
    // channel is reached from inside a `catch` whose next statement releases
    // another resource; if a throwing handler escaped that catch, one failing
    // notification would strand every disposer behind it.
    //
    // Three retire hooks, the first of which throws — so the channel is
    // entered from the unwind — and a handler that throws every time.
    const released: string[] = [];
    const harness = createHarness({
      retire: (): void => {
        released.push('retire');
        throw new Error('retire');
      },
      resetFramePart: (part): void => {
        released.push('reset');
        part.item = null;
      },
      reportError: (): never => {
        throw new Error('handler');
      },
    });

    activate(harness);
    released.length = 0;

    expect(() => harness.controller.destroy()).not.toThrow();

    // `retire` threw, the handler threw on the way out of the catch, and both
    // frame scrubs still ran.
    expect(released).toEqual(['retire', 'reset', 'reset']);
  });

  it('should discard a throwing onError without notifying it back', () => {
    // **The terminus** (§1.3). A recursive channel would call the handler with
    // the throw the handler just produced — and again with that one. Being
    // *incapable* of it is the property; counting the calls is how it is
    // observed.
    let calls = 0;
    const harness = createHarness({
      admit: (): never => {
        throw new Error('admit');
      },
      reportError: (): never => {
        calls += 1;
        throw new Error('handler');
      },
    });

    expect(() => {
      press(harness.item);
    }).not.toThrow();
    expect(calls).toBe(1);
  });

  it('should refuse every later notification once onError destroys', () => {
    // **Post-closure suppression, from the one place that can trigger it**
    // (E-03, I-31, D-53, D-37). The handler destroys on its first call; the
    // teardown that follows produces faults of its own — a throwing `retire`,
    // two throwing resets — and none of them may reach a slot the consumer has
    // already closed.
    const seen: Array<DraggableError | DraggableWarning> = [];
    // The handler destroys the controller it is reporting for, so the closure
    // reads the binding rather than a value passed in.
    const harness: Harness = createHarness({
      admit: (): never => {
        throw new Error('admit');
      },
      retire: (): never => {
        throw new Error('retire');
      },
      reportError: (error): void => {
        seen.push(error);
        void harness.controller.destroy();
      },
    });

    press(harness.item);

    // Exactly the one that opened the door, and nothing the door closing
    // produced.
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBeInstanceOf(DraggableError);
  });

  it('should surface a second checkpoint rather than dropping it silently', () => {
    // **F-103, and the branch matters.** `handleFailed` returns on a stale
    // checkpoint *or* on a second one arriving while a report is in flight,
    // and until D-130 that `return` was the one place in the library where an
    // error reached neither channel. It loses its **classification** — the
    // `return` decides that, and correctly, since the first report owns the
    // terminal — but it must not lose the fault.
    //
    // Two queued actions whose `prepare` both throw. Each queues its own
    // `FAILED`; the first opens `REPORTING`, and the second then arrives for a
    // report already in flight, which is the arm that used to be silent.
    const harness = createHarness({
      onStart: (host): void => {
        host.dispatch(0, 'first');
        host.dispatch(0, 'second');
      },
      action: {
        prepare(_tag, argument): never {
          throw new Error(String(argument));
        },
        effect(): void {},
      },
    });

    activate(harness);

    // One classified — the first, which owns the settlement and the terminal.
    expect(harness.failures).toHaveLength(1);
    expect(String(harness.failures[0]!.error)).toBe('Error: first');

    // The second reached the consumer as a warning rather than vanishing.
    const warnings = harness.reports.filter(
      (error) => error instanceof DraggableWarning,
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toBe('drag: failure/checkpoint-stale');
    expect(String(warnings[0]?.cause)).toBe('Error: second');
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

  it('should run both scrubs when a reset throws during destroy', () => {
    const counter = { calls: 0 };
    const harness = createHarness({ resetFramePart: throwingReset(counter) });

    activate(harness);
    harness.reports.length = 0;
    void harness.controller.destroy();

    // ~~Two resets, each reporting the thrown error.~~ **The reports are gone
    // and the totality is the point** (D-130 §1.1, D-37). `destroy()` sets the
    // latch on its own statement, so every notification after it is refused —
    // a declared consumer slot may not be invoked once the controller is
    // logically closed, and that rule is now enforced in one place instead of
    // three. What the platform channel used to carry here was *visibility into
    // a teardown the consumer had already asked for*, and D-37 is explicit that
    // it does not get callbacks after asking.
    //
    // So the surviving property is the one that was always the reason for the
    // guard: the first throwing reset does not skip the second.
    expect(counter.calls).toBe(2);
    expect(harness.reports).toEqual([]);
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
        reportError: (): void => {},
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

  it('should scrub both frames when arming fails after both were composed', () => {
    // The `composed > 1` arm of the unwind. **Its trigger changed** (D-128):
    // this used to be `assertFrameShapesMatch` throwing on a non-deterministic
    // factory, and that assertion is deleted, so the two frames no longer
    // disagree about anything the kernel checks. What can still fail with both
    // frames standing is the ingress attachment itself — the root is the
    // consumer's own element — and the property under test is unchanged: a
    // part that already holds a reference is reset on **both** frames before
    // the failure is rethrown.
    const root = document.createElement('div');
    document.body.append(root);
    cleanup.push(() => root.remove());

    let resets = 0;

    root.addEventListener = (): never => {
      throw new Error('ingress refused');
    };

    expect(() => {
      armWith(
        root,
        (): ExamplePart => ({ item: null, note: '' }),
        (part): void => {
          resets += 1;
          part.item = null;
        },
      );
    }).toThrow('ingress refused');

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
    harness.reports.length = 0;
    move(60, 10);

    expect(harness.reports.map((r) => r.cause)).toContain(error);
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
    const delivered: unknown[] = [];
    // The handler reads `harness.host.closed` from inside the report, which is
    // the assertion this row exists for.
    const harness: Harness = createHarness({
      retire: (): void => {
        order.push('retire');
      },
      // **Delivered through `spec.reportError` now, after logical closure**
      // (D-131). ~~A `globalThis.reportError` stub.~~ This is the named
      // exception to D-37 (a), and it is the whole reason the amendment needed
      // the owner's assent rather than being absorbed: every other route
      // refuses once the latch is set.
      reportError: (error): void => {
        delivered.push(error);
        order.push(`report:${String((error as DraggableError).stage)}`);
        // Read from *inside* the report, which is the assertion the ordering
        // exists for: a handler that calls back into the controller must find
        // it already closed.
        order.push(`closed:${String(harness.host.closed)}`);
      },
    });

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

    expect(order).toEqual(['report:null', 'closed:true', 'retire']);

    // **Panic is consequential and carries no stage, and D-132 lets it say
    // so.** It destroys the whole controller rather than one operation, so it
    // is a `DraggableError`; and `FailureStage` classifies faults *within* an
    // operation, so there is nothing to classify. ~~The code is picked
    // directly rather than mapped from one.~~ That code was `'platform'` —
    // the taxonomy's *other* bucket, glossed as *the platform refused
    // something* — which made a panicked controller indistinguishable from a
    // failed `requestAnimationFrame` (F-104). `null` is the only value that
    // means *the controller is destroyed*, and this is the assertion that
    // separates the two; nothing could make it before D-132.
    expect(delivered).toHaveLength(1);
    expect(delivered[0]).toBeInstanceOf(DraggableError);
    expect(delivered[0]).not.toBeInstanceOf(DraggableWarning);
    expect((delivered[0] as DraggableError).stage).toBeNull();
    expect((delivered[0] as DraggableError).cause).toBe(broken);
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
