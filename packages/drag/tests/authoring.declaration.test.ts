/* oxlint-disable typescript/no-unsafe-call -- each such line expects a type error */
/* eslint-disable @typescript-eslint/no-unsafe-call -- each such line expects a type error */
/** `drag:DRI-18`, `drag:DRD-27` and `drag:DRD-30`: the type requirement. Checked by `tsc`, with no run. */
import { describe, it } from 'vitest';
import {
  draggable,
  type Admission,
  type Behavior,
  type BehaviorOperation,
  type Drag,
} from '../src/draggable.ts';
import { Lifter, type Lift } from '../src/lift.ts';

const root = document.createElement('div');

/** An operation that keeps its lift. */
type Lifted = BehaviorOperation & Readonly<{ lift: Lift }>;

describe('drag:DRI-18 the type requirement', () => {
  it('should let activate name no lift member on a drag', () => {
    draggable(root, {
      admit: () => null,
      activate(drag) {
        // @ts-expect-error A drag has no `lift`.
        void drag.lift;
        // @ts-expect-error A drag has no `translate`.
        drag.translate(0, 0);
        // @ts-expect-error A drag has no `visual`.
        void drag.visual;
        // @ts-expect-error A drag has no `box`.
        void drag.box;
        // @ts-expect-error A drag has no `rect`.
        void drag.rect;
        // @ts-expect-error A drag has no `visualSpace`.
        void drag.visualSpace;
        return null;
      },
    });
  });

  it('should let a controller step name no lift member on the operation', () => {
    const panel = draggable(root, { admit: () => null, activate: () => null });

    panel.requestStep((operation) => {
      // @ts-expect-error An operation has no `lift` unless the behavior adds one.
      void operation?.lift;
    });
  });

  it('should refuse visual and box in an admission', () => {
    // @ts-expect-error An admission has no `visual`.
    const withVisual: Admission<undefined> = { item: root, visual: root };
    // @ts-expect-error An admission has no `box`.
    const withBox: Admission<undefined> = { item: root, box: root };

    void withVisual;
    void withBox;
  });

  it('should compose the lift in the operation', () => {
    const lifter = new Lifter(window);
    const panel = draggable<undefined, unknown, Lifted>(root, {
      admit: () => ({ item: root }),
      activate(drag) {
        const lift = lifter.acquire(drag, root, root);

        return {
          lift,
          move() {
            lift.translate(drag.x, drag.y);
            void lift.visualSpace;
          },
          settle() {
            // @ts-expect-error A lift has no `translatedX`.
            void lift.translatedX;
            lift.land(lift.rect.x, lift.rect.y);
          },
        };
      },
    });

    panel.use(lifter.cancelLanding);
    panel.requestStep((operation) => {
      operation?.lift.translate(0, 0);
    });
  });

  it('should accept class instances with extra members', () => {
    class Operation implements BehaviorOperation {
      readonly extra = 1;
      readonly lift: Lift;

      constructor(lift: Lift) {
        this.lift = lift;
      }

      move(): void {
        this.lift.translate(0, 0);
      }

      nudge(): void {
        this.lift.translate(1, 1);
      }
    }

    class Behaving implements Behavior<undefined, unknown, Operation> {
      readonly extra = 1;
      readonly #lifter = new Lifter(window);

      // oxlint-disable-next-line class-methods-use-this -- a hook the kernel calls as a method
      admit() {
        return { item: root };
      }

      activate(drag: Drag<Operation>): Operation {
        return new Operation(this.#lifter.acquire(drag));
      }
    }

    const panel = draggable(root, new Behaving());

    panel.requestStep((operation) => {
      operation?.nudge();
    });
  });

  it('should not let a controller or a drag reach the session', () => {
    const panel = draggable(root, { admit: () => null, activate: () => null });

    // @ts-expect-error The controller has no session member.
    void panel.session;
    draggable(root, {
      admit: () => null,
      activate(drag) {
        // @ts-expect-error A drag has no state machine.
        void drag.phase;
        // @ts-expect-error A drag has no next step.
        void drag.next;
        // @ts-expect-error A drag has no decision.
        void drag.decision;
        return null;
      },
    });
    panel.requestStep((operation: BehaviorOperation | null) => {
      // @ts-expect-error The operation has no state machine.
      void operation?.phase;
      // @ts-expect-error The operation has no next step.
      void operation?.next;
      // @ts-expect-error The operation has no decision.
      void operation?.decision;
    });
  });

  it('should refuse the removed names', () => {
    const panel = draggable(root, { admit: () => null, activate: () => null });

    // @ts-expect-error `run` is `requestStep`.
    void panel.run;
    // @ts-expect-error `requestApply` is `requestStep`.
    void panel.requestApply;
    // @ts-expect-error A behavior has no `lift` member.
    draggable(root, { lift: false, admit: () => null, activate: () => null });
  });
});

describe('drag:DRD-30 the activation result', () => {
  it('should give a drag no state', () => {
    draggable<{ value: number }>(root, {
      admit: () => ({ item: root, state: { value: 1 } }),
      activate(drag, state) {
        void state.value;
        // @ts-expect-error A drag has no `state`: `activate` receives it.
        void drag.state;
        return null;
      },
    });
  });

  it('should give a behavior none of the operation hooks', () => {
    const activate = (): null => null;

    // @ts-expect-error `start` is the operation's.
    draggable(root, { admit: () => null, activate, start() {} });
    // @ts-expect-error `move` is the operation's.
    draggable(root, { admit: () => null, activate, move() {} });
    // @ts-expect-error `drop` is the operation's.
    draggable(root, { admit: () => null, activate, drop: () => null });
    // @ts-expect-error `settle` is the operation's.
    draggable(root, { admit: () => null, activate, settle() {} });
    // @ts-expect-error `end` is the operation's.
    draggable(root, { admit: () => null, activate, end() {} });
  });

  it('should require activate', () => {
    // @ts-expect-error Without `activate` no operation exists.
    draggable(root, { admit: () => null });
  });

  it('should let activate return the operation or null, and nothing else', () => {
    draggable(root, { admit: () => null, activate: () => ({}) });
    draggable(root, { admit: () => null, activate: () => null });
    // @ts-expect-error `false` no longer declines.
    draggable(root, { admit: () => null, activate: () => false });
    // @ts-expect-error `undefined` is not an operation.
    draggable(root, { admit: () => null, activate: () => undefined });
  });

  it('should give a step the operation type or null, through the controller and through a drag', () => {
    const panel = draggable<undefined, unknown, Lifted>(root, {
      admit: () => null,
      activate(drag) {
        drag.requestStep((operation) => {
          const typed: Lifted | null = operation;

          // @ts-expect-error The step may receive `null`.
          void operation.lift;
          void typed;
        });
        return null;
      },
    });

    panel.requestStep((operation) => {
      const typed: Lifted | null = operation;

      // @ts-expect-error The step may receive `null`.
      void operation.lift;
      void typed;
    });
    // @ts-expect-error A step does not receive a drag.
    panel.requestStep((drag: Drag<Lifted> | null) => {
      void drag;
    });
  });
});
