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
 * **The construction window**: `draggable()` obtains the spec from the behavior
 * factory and then calls `arm()`, which composes two frame parts before
 * publishing the spec last. A behavior holds `BehaviorContext` for the whole of
 * that window — the factory body and both frame-part factories — and every
 * member behaves there as its own contract states.
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
 * it. `arm()` binds `pointerdown` on the root and nothing dispatches one.
 */
function createRoot(): HTMLElement {
  return {
    ownerDocument: { defaultView: { HTMLElement: Object } },
    addEventListener(): void {},
    removeEventListener(): void {},
  } as unknown as HTMLElement;
}

type Recorder = Readonly<{
  /** Everything that reached `spec.reportError` — the behavior's one channel. */
  reports: ReadonlyArray<DraggableError | DraggableWarning>;
  createFramePart(): number;
  resetFramePart(): number;
  retire(): number;
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
function createBehavior(onCreateFramePart?: (call: number) => void): Behavior {
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
        prepare: () => true,
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

  const behavior = createBehavior(
    fromFramePart && ((call) => fromFramePart(context, call)),
  );

  draggable<null, ExamplePart>(createRoot(), (kernel) => {
    context = kernel;
    fromFactory(kernel);

    return { spec: mutate(behavior.spec), controller: null };
  });

  return behavior.recorder;
}

describe('the construction window', () => {
  it('should retire the behavior when a frame-part factory destroys the controller', () => {
    // **`retire` is the assertion, not the frame resets.** Step 4 of teardown
    // is the step this window loses if `arm()`'s unwind is reached only by its
    // throwing exit, and it is the one the behavior is owed: a spec that
    // reached `arm()` is retired exactly once for any `destroy()` at all.
    const recorder = arm(
      () => {},
      (kernel) => {
        void kernel.destroy();
      },
    );

    expect(recorder.retire()).toBe(1);
  });

  it('should reset only the frame parts a destroying factory composed', () => {
    // One composition ran, so one reset is owed. `resetFramePart` declares a
    // `Frame<Part>` parameter, and handing it a frame that was never composed
    // is a fault the library would be committing against the behavior.
    const recorder = arm(
      () => {},
      (kernel) => {
        void kernel.destroy();
      },
    );

    expect([recorder.createFramePart(), recorder.resetFramePart()]).toEqual([
      1, 1,
    ]);
  });

  it('should unwind both frames when the second frame-part factory destroys the controller', () => {
    // The terminal latch is what decides this branch. Both compositions
    // completed, so both frames physically exist and neither guard on the
    // unwind is what stops the controller arming over a closed latch — the
    // latch test itself is, and it is the only conjunct that can be false
    // here.
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

  it('should compose no frame part and still retire when the factory body destroys the controller', () => {
    const recorder = arm((kernel) => {
      void kernel.destroy();
    });

    expect([recorder.createFramePart(), recorder.retire()]).toEqual([0, 1]);
  });

  it('should reset no frame part when the factory body destroys the controller', () => {
    // Nothing was composed, so nothing may be handed to `resetFramePart`: a
    // reset of the frame the unwind does not hold would call the behavior's
    // own member with a value its declaration says is a `Frame<Part>`.
    const recorder = arm((kernel) => {
      void kernel.destroy();
    });

    expect(recorder.resetFramePart()).toBe(0);
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

    // Nothing was latched and nothing was reported, and the controller went on
    // to arm: two frame parts, no retirement.
    expect([
      recorder.reports.length,
      recorder.createFramePart(),
      recorder.retire(),
    ]).toEqual([0, 2, 0]);
  });

  it('should refuse an invalid configuration even when the factory destroyed the controller', () => {
    // Static configuration validation runs before the first latch test.
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
