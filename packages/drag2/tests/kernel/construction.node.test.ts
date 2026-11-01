import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type {
  DraggableError,
  DraggableWarning,
} from '../../src/kernel/errors.ts';
import { FAILURE_RENDERER_WRITE } from '../../src/kernel/failures.ts';
import { LIFT_FLAT } from '../../src/kernel/presentation.ts';
import { POINTER_DOWN } from '../../src/kernel/protocol.ts';
import type {
  BehaviorContext,
  BehaviorSpec,
  ResolutionCommand,
} from '../../src/kernel/spec.ts';
import { draggable } from '../../src/kernel.ts';

/**
 * **The construction window**: `draggable()` runs one unit that obtains the
 * spec from the behavior factory, composes two frame parts and publishes the
 * spec last. A behavior holds `BehaviorContext` for the whole of that window —
 * the factory body and both frame-part factories — and every member behaves
 * there as its own contract states. A destruction requested inside is applied
 * when the unit ends, after publication.
 *
 * **The layer is `node` because the subject needs no layout, no pointer and no
 * real event.** A stub root carrying an owning window is the whole environment;
 * nothing here admits an operation.
 */

type ExamplePart = {
  note: string;
};

/**
 * A root with an owning window and inert ingress.
 *
 * `createRealm` reads `ownerDocument.defaultView` and refuses a null one, so a
 * view is the whole of what it needs; the view's `HTMLElement` is reached only
 * by `isElement`, which nothing here calls, and any constructor stands in for
 * it. Construction binds `pointerdown` on the root, and `listen` sees every
 * binding, which is how a row reaches the listeners or the signal owning them.
 */
function createRoot(
  listen: (
    type: string,
    listener: (event: Event) => void,
    options: AddEventListenerOptions,
  ) => void = () => {},
): HTMLElement {
  return {
    ownerDocument: { defaultView: { HTMLElement: Object } },
    addEventListener: listen,
    removeEventListener(): void {},
  } as unknown as HTMLElement;
}

type Recorder = Readonly<{
  /** Everything that reached `spec.reportError` — the behavior's one channel. */
  reports: ReadonlyArray<DraggableError | DraggableWarning>;
  createFramePart(): number;
  resetFramePart(): number;
  retire(): number;
  /** The promise of the first `destroy()` a row raised, if it raised one. */
  destroyed: Promise<void> | null;
  /** Every signal construction bound a root listener under. */
  signals: readonly AbortSignal[];
}>;

type Behavior = Readonly<{
  spec: BehaviorSpec<ExamplePart>;
  recorder: Recorder;
}>;

/**
 * The minimal conforming behavior, with the two members this file counts and
 * one hook into the first frame-part factory.
 *
 * Every seam is present because `BehaviorSpec` requires it, and none of them
 * runs: no operation is ever admitted here.
 */
function createBehavior(
  onCreateFramePart?: (call: number) => void,
  log: unknown[] = [],
): Behavior {
  const reports: Array<DraggableError | DraggableWarning> = [];
  const createFramePart = vi.fn((): ExamplePart => ({ note: '' }));
  const resetFramePart = vi.fn((part: ExamplePart): void => {
    part.note = '';
  });
  const retire = vi.fn((): void => {});

  return {
    recorder: {
      reports,
      createFramePart: () => createFramePart.mock.calls.length,
      resetFramePart: () => resetFramePart.mock.calls.length,
      retire: () => retire.mock.calls.length,
      destroyed: null,
      signals: [],
    },
    spec: {
      createFramePart: (): ExamplePart => {
        const part = createFramePart();

        onCreateFramePart?.(createFramePart.mock.calls.length);

        return part;
      },
      resetFramePart,
      config: { threshold: 8, liftMode: LIFT_FLAT, actionTags: 1 },
      admit: () => null,
      activation: {
        prepare: () => true,
        effect: (): void => {},
      },
      release: {
        prepare: (): ResolutionCommand => ({ invoke: null }),
        effect: (): void => {},
      },
      settlement: {
        prepare: () => true,
        effect: (): void => {},
      },
      action: {
        prepare: (tag, argument) => {
          log.push(`action ${String(tag)} ${String(argument)}`);
          return true;
        },
        effect: (): void => {},
      },
      moved: (): void => {},
      anchorTarget: () => ({ x: 0, y: 0 }),
      finalized: (): void => {},
      reportError: (error): void => {
        reports.push(error);
      },
      retire,
    },
  };
}

/**
 * Arms a controller, letting the caller act on the context from the factory
 * body and from inside a frame-part factory.
 */
function arm(
  fromFactory: (kernel: BehaviorContext) => void = () => {},
  fromFramePart?: (kernel: BehaviorContext, call: number) => void,
  mutate: (spec: BehaviorSpec<ExamplePart>) => BehaviorSpec<ExamplePart> = (
    spec,
  ) => spec,
): Recorder {
  let context!: BehaviorContext;
  const signals: AbortSignal[] = [];
  let destroyed: Promise<void> | null = null;

  const behavior = createBehavior(
    fromFramePart && ((call) => fromFramePart(context, call)),
  );

  draggable<null, ExamplePart>(
    createRoot((_type, _listener, options) => {
      signals.push(options.signal!);
    }),
    (kernel) => {
      // The first `destroy()` a row raises is the one whose promise it reads.
      context = {
        ...kernel,
        dispatch: kernel.dispatch.bind(kernel),
        fail: kernel.fail.bind(kernel),
        cancel: kernel.cancel.bind(kernel),
        destroy: () => {
          destroyed ??= kernel.destroy();
          return destroyed;
        },
        get closed() {
          return kernel.closed;
        },
      };
      fromFactory(context);

      return { spec: mutate(behavior.spec), controller: null };
    },
  );

  return {
    ...behavior.recorder,
    reports: behavior.recorder.reports,
    destroyed,
    signals,
  };
}

const OUTSTANDING = 'outstanding';

/**
 * Whether `promise` has settled, read synchronously at the call: an
 * already-settled promise wins the race because its reaction is queued before
 * the sentinel's.
 */
const probe = async (promise: Promise<void> | null): Promise<unknown> =>
  await Promise.race([promise, Promise.resolve(OUTSTANDING)]);

describe('the construction window', () => {
  it('should retire the behavior once when a frame-part factory destroys the controller', () => {
    // Destruction requested inside construction is applied after the
    // controller is published, and application retires a published spec
    // exactly once.
    const recorder = arm(
      () => {},
      (kernel, call) => {
        if (call === 1) {
          void kernel.destroy();
        }
      },
    );

    expect(recorder.retire()).toBe(1);
  });

  it('should compose both frame parts when the first frame-part factory destroys the controller', () => {
    const recorder = arm(
      () => {},
      (kernel, call) => {
        if (call === 1) {
          void kernel.destroy();
        }
      },
    );

    expect(recorder.createFramePart()).toBe(2);
  });

  it('should reset each frame once when the first frame-part factory destroys the controller', () => {
    const recorder = arm(
      () => {},
      (kernel, call) => {
        if (call === 1) {
          void kernel.destroy();
        }
      },
    );

    expect(recorder.resetFramePart()).toBe(2);
  });

  it('should attach ingress and abort it when a frame-part factory destroys the controller', () => {
    const recorder = arm(
      () => {},
      (kernel, call) => {
        if (call === 1) {
          void kernel.destroy();
        }
      },
    );

    expect(recorder.signals.map((signal) => signal.aborted)).toEqual([true]);
  });

  it('should have settled the destroy promise when draggable() returns', async () => {
    const recorder = arm(
      () => {},
      (kernel, call) => {
        if (call === 1) {
          void kernel.destroy();
        }
      },
    );

    await expect(probe(recorder.destroyed)).resolves.toBeUndefined();
  });

  it('should unwind both frames once when the second frame-part factory destroys the controller', () => {
    const recorder = arm(
      () => {},
      (kernel, call) => {
        if (call === 2) {
          void kernel.destroy();
        }
      },
    );

    expect([recorder.resetFramePart(), recorder.retire()]).toEqual([2, 1]);
  });

  it('should compose both frame parts and retire once when the factory body destroys the controller', () => {
    const recorder = arm((kernel) => {
      void kernel.destroy();
    });

    expect([recorder.createFramePart(), recorder.retire()]).toEqual([2, 1]);
  });

  it('should reset each frame once when the factory body destroys the controller', () => {
    const recorder = arm((kernel) => {
      void kernel.destroy();
    });

    expect(recorder.resetFramePart()).toBe(2);
  });

  it('should reset no frame part when the first frame-part factory throws', () => {
    // Nothing was composed, so nothing may be handed to `resetFramePart`: the
    // unwind resets only the frames it holds.
    const behavior = createBehavior(() => {
      throw new Error('first factory');
    });

    expect(() =>
      draggable<null, ExamplePart>(createRoot(), () => ({
        spec: behavior.spec,
        controller: null,
      })),
    ).toThrow('first factory');
    expect(behavior.recorder.resetFramePart()).toBe(0);
  });

  it('should leave the controller live after construction when nothing destroyed it', () => {
    const recorder = arm();

    expect([
      recorder.signals.map((signal) => signal.aborted),
      recorder.retire(),
    ]).toEqual([[false], 0]);
  });

  it('should demote a fail() raised from the factory body instead of throwing', () => {
    // The member's own contract: a call outside a seam is downgraded to a
    // platform report. The demotion is silent here because the report travels
    // through the spec, which is not published yet.
    const recorder = arm((kernel) => {
      kernel.fail(FAILURE_RENDERER_WRITE, new Error('boom'));
    });

    expect(recorder.reports).toEqual([]);
  });

  it('should treat a cancel() raised from the factory body as the idle no-op', () => {
    const recorder = arm((kernel) => {
      kernel.cancel('reason');
    });

    // Nothing was registered and nothing was reported, and the controller went
    // on to arm: two frame parts, no retirement.
    expect([
      recorder.reports.length,
      recorder.createFramePart(),
      recorder.retire(),
    ]).toEqual([0, 2, 0]);
  });

  it('should refuse an invalid configuration even when the factory destroyed the controller', () => {
    // `actionTags` is a fact about the spec rather than about the controller's
    // liveness, and a `TypeError` that appeared or vanished depending on
    // whether the behavior destroyed itself is a configuration error its
    // author cannot reproduce.
    expect(() =>
      arm(
        (kernel) => {
          void kernel.destroy();
        },
        undefined,
        (spec) => ({
          ...spec,
          config: { ...spec.config, actionTags: -1 },
        }),
      ),
    ).toThrow(TypeError);
  });

  it('should refuse a colliding command type even when the factory destroyed the controller', () => {
    // The second half of the static validation, and it is refused on the same
    // terms as `actionTags`: a `command` type colliding with the kernel's own
    // pointer ingress is a fact about the spec, and the controller's liveness
    // does not decide whether the author is told about it.
    expect(() =>
      arm(
        (kernel) => {
          void kernel.destroy();
        },
        undefined,
        (spec) => ({
          ...spec,
          command: { types: [POINTER_DOWN], admit: () => null },
        }),
      ),
    ).toThrow(TypeError);
  });
});

/**
 * **Behavior actions dispatched during construction** (D-204). They are queued
 * and applied after publication, before `draggable()` returns, in dispatch
 * order. No row here dispatches an out-of-range tag from the window: its
 * outcome is unspecified, and pinning one would turn misuse into contract.
 */
describe('dispatch during construction', () => {
  type Window = Readonly<{
    fromFactory?(kernel: BehaviorContext): void;
    fromFramePart?(kernel: BehaviorContext, call: number): void;
  }>;

  function construct(window: Window): readonly unknown[] {
    const log: unknown[] = [];
    let context!: BehaviorContext;
    const behavior = createBehavior((call) => {
      window.fromFramePart?.(context, call);
    }, log);
    const spec = {
      ...behavior.spec,
      reportError: (error: DraggableError | DraggableWarning): void => {
        log.push(`report ${error.message}`);
      },
    };

    try {
      draggable<null, ExamplePart>(
        createRoot((type) => {
          log.push(`listen ${type}`);
        }),
        (kernel) => {
          context = kernel;
          window.fromFactory?.(kernel);
          return { spec, controller: null };
        },
      );
      log.push('returned');
    } catch (error) {
      log.push(`threw ${(error as Error).message}`);
    }

    return log;
  }

  it('should apply window actions after publication and before draggable() returns, in dispatch order', () => {
    // R23: one from the factory body, one from the first frame-part factory.
    // Publication is visible as the ingress listener being attached.
    expect(
      construct({
        fromFactory: (kernel) => {
          kernel.dispatch(0, 'a');
        },
        fromFramePart: (kernel, call) => {
          if (call === 1) {
            kernel.dispatch(0, 'b');
          }
        },
      }),
    ).toEqual(['listen pointerdown', 'action 0 a', 'action 0 b', 'returned']);
  });

  it('should apply no window action once a window destruction is applied', () => {
    // R24: the destroy requested in the window is applied at construction's
    // boundary, ahead of everything queued, and clears the queue.
    expect(
      construct({
        fromFactory: (kernel) => {
          kernel.dispatch(0, 'a');
          void kernel.destroy();
        },
      }),
    ).toEqual(['listen pointerdown', 'returned']);
  });

  it('should apply no window action when construction fails', () => {
    // R24: a failure that unwinds construction clears the queue with it.
    expect(
      construct({
        fromFactory: (kernel) => {
          kernel.dispatch(0, 'a');
        },
        fromFramePart: () => {
          throw new Error('frame part');
        },
      }),
    ).toEqual(['threw frame part']);
  });
});

/**
 * **Foreign code inside ingress attachment.** A root whose `addEventListener`
 * for a command type synchronously dispatches a primary press and a command
 * through the listeners already bound, then throws.
 */
describe('ingress attachment during construction', () => {
  const COMMAND = 'keydown';
  const PRESS = {
    type: POINTER_DOWN,
    button: 0,
    isPrimary: true,
    pointerId: 1,
    clientX: 0,
    clientY: 0,
  } as unknown as Event;

  type Attempt = Readonly<{
    thrown: unknown;
    admissions: number;
    signals: readonly AbortSignal[];
  }>;

  function attach(): Attempt {
    const listeners = new Map<string, (event: Event) => void>();
    const signals: AbortSignal[] = [];
    let admissions = 0;
    let thrown: unknown = null;
    const behavior = createBehavior();
    const root = createRoot((type, listener, options) => {
      signals.push(options.signal!);
      listeners.set(type, listener);

      if (type === COMMAND) {
        listeners.get(POINTER_DOWN)!(PRESS);
        listener({ type: COMMAND } as Event);
        throw new Error('attachment');
      }
    });

    try {
      draggable<null, ExamplePart>(root, () => ({
        spec: {
          ...behavior.spec,
          admit: () => {
            admissions += 1;
            return null;
          },
          command: {
            types: [COMMAND],
            admit: () => {
              admissions += 1;
              return null;
            },
          },
        },
        controller: null,
      }));
    } catch (error) {
      thrown = error;
    }

    return { thrown, admissions, signals };
  }

  it('should rethrow the attachment failure', () => {
    expect((attach().thrown as Error).message).toBe('attachment');
  });

  it('should admit nothing dispatched from inside attachment', () => {
    expect(attach().admissions).toBe(0);
  });

  it('should leave no ingress listener attached', () => {
    expect(attach().signals.map((signal) => signal.aborted)).toEqual([
      true,
      true,
    ]);
  });
});

/**
 * **R27, structural.** The count bounding a `dispatch` tag is read at two
 * sites and no others: construction's static validation and armed intake.
 * Nothing on the drain path reads it, so a queued action is applied without
 * a second check, and no list of construction-window tags is held for later.
 */
describe('the action-tag bound', () => {
  it('should be read only by static validation and armed intake', async () => {
    const directory = new URL('../../src/kernel/', import.meta.url).pathname;
    const names = (await readdir(directory)).toSorted();
    const sources = await Promise.all(
      names.map(async (name) => await readFile(join(directory, name), 'utf8')),
    );
    // The read expressions, not the lines: formatting moves the latter.
    const reads = names.flatMap((name, index) =>
      sources[index]!.split('\n')
        .map((line) => line.trim())
        .filter((code) => !code.startsWith('//') && !code.startsWith('*'))
        .flatMap((code) => code.match(/[\w#.]+\.actionTags\b/gu) ?? [])
        .map((read) => `${name}: ${read}`),
    );

    // Armed intake reads the published spec; static validation reads the
    // spec being armed, twice in one condition.
    expect(reads).toEqual([
      'kernel.ts: this.#spec.config.actionTags',
      'kernel.ts: next.config.actionTags',
      'kernel.ts: next.config.actionTags',
    ]);
  });
});
