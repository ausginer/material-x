/* oxlint-disable typescript/no-unsafe-call -- each such line expects a type error */
/* eslint-disable @typescript-eslint/no-unsafe-call -- each such line expects a type error */
/** `drag:DRI-18` and `drag:DRD-27`: the type requirement. Checked by `tsc`, with no run. */
import { describe, it } from 'vitest';
import {
  draggable,
  type Admission,
  type Behavior,
  type Drag,
} from '../src/draggable.ts';
import { Lifter, type Lift } from '../src/lift.ts';

const root = document.createElement('div');

describe('drag:DRI-18 the type requirement', () => {
  it('should let a hook name no lift member on a drag', () => {
    draggable(root, {
      admit: () => null,
      move(drag) {
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
      },
    });
  });

  it('should let a controller step name no lift member on a drag', () => {
    const panel = draggable(root, { admit: () => null });

    panel.requestStep((drag) => {
      // @ts-expect-error A drag has no `lift`.
      void drag?.lift;
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

  it('should compose the lift in the behavior state', () => {
    const lifter = new Lifter(window);
    const panel = draggable<{ lift: Lift | null }>(root, {
      admit: () => ({ item: root, state: { lift: null } }),
      activate(drag) {
        drag.state.lift = lifter.acquire(drag, root, root);
        return undefined;
      },
      move(drag) {
        drag.state.lift!.translate(drag.x, drag.y);
        void drag.state.lift!.visualSpace;
      },
      settle(drag) {
        const lift = drag.state.lift!;

        lift.land({ x: lift.rect.x, y: lift.rect.y });
      },
    });

    panel.use(lifter.cancelLanding);
    panel.requestStep((drag) => {
      drag?.state.lift?.translate(0, 0);
    });
  });

  it('should accept a class instance with extra members', () => {
    type State = { lift: Lift | null };

    class Lifted implements Behavior<State> {
      readonly extra = 1;
      readonly #lifter = new Lifter(window);

      // oxlint-disable-next-line class-methods-use-this -- a hook the kernel calls as a method
      admit() {
        return { item: root, state: { lift: null } };
      }

      activate(drag: Drag<State>): undefined {
        drag.state.lift = this.#lifter.acquire(drag);
        return undefined;
      }
    }

    draggable(root, new Lifted());
  });

  it('should not let a controller or a drag reach the session', () => {
    const panel = draggable(root, { admit: () => null });

    // @ts-expect-error The controller has no session member.
    void panel.session;
    panel.requestStep((drag: Drag | null) => {
      // @ts-expect-error The view has no state machine.
      void drag?.phase;
      // @ts-expect-error The view has no next step.
      void drag?.next;
      // @ts-expect-error The view has no decision.
      void drag?.decision;
    });
  });

  it('should refuse the removed names', () => {
    const panel = draggable(root, { admit: () => null });

    // @ts-expect-error `run` is `requestStep`.
    void panel.run;
    // @ts-expect-error `requestApply` is `requestStep`.
    void panel.requestApply;
    // @ts-expect-error A behavior has no `lift` member.
    draggable(root, { lift: false, admit: () => null });
  });
});
