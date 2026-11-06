/* oxlint-disable typescript/no-unsafe-call -- each such line expects a type error */
/* eslint-disable @typescript-eslint/no-unsafe-call -- each such line expects a type error */
/** `drag:DRI-18`: the type requirement. Checked by `tsc`, with no run. */
import { describe, it } from 'vitest';
import { draggable, type Drag } from '../src/draggable.ts';
import { lift } from '../src/lift.ts';

const root = document.createElement('div');

describe('drag:DRI-18 the type requirement', () => {
  it('should let a behavior with no lift name no lifted member', () => {
    draggable(root, {
      admit: () => null,
      move(drag) {
        // @ts-expect-error A behavior with no lift has no `translate`.
        drag.translate(0, 0);
        // @ts-expect-error A behavior with no lift has no `visual`.
        void drag.visual;
        // @ts-expect-error A behavior with no lift has no `box`.
        void drag.box;
        // @ts-expect-error A behavior with no lift has no `rect`.
        void drag.rect;
        // @ts-expect-error A behavior with no lift has no `visualSpace`.
        void drag.visualSpace;
      },
    });
  });

  it('should refuse a landing from a behavior with no lift', () => {
    draggable(root, {
      admit: () => null,
      // @ts-expect-error A landing needs `lift`.
      settle: () => ({ x: 0, y: 0 }),
    });
  });

  it('should refuse visual and box in an admission with no lift', () => {
    draggable(root, {
      // @ts-expect-error `visual` needs `lift`.
      admit: () => ({ item: root, visual: root }),
    });
    draggable(root, {
      // @ts-expect-error `box` needs `lift`.
      admit: () => ({ item: root, box: root }),
    });
  });

  it('should give a lifted behavior its members and a landing', () => {
    const panel = draggable(root, {
      lift,
      admit: () => ({ item: root, visual: root, box: root }),
      move(drag) {
        drag.translate(drag.x, drag.y);
        void drag.visualSpace;
      },
      settle: (drag) => ({ x: drag.rect.x, y: drag.rect.y }),
    });

    panel.requestStep((drag) => {
      drag?.translate(0, 0);
    });
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
    // @ts-expect-error `lift: false` is an absent key.
    draggable(root, { lift: false, admit: () => null });
  });
});
