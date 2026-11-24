/** `drag:DRD-39`: a type that a published signature names is exported from its entry. Checked by `tsc`, with no run. */
import { assertType, describe, expectTypeOf, it } from 'vitest';
import type { BehaviorOperation, VerdictAwaiter } from '../src/draggable.ts';
import type {
  BoundsInstaller,
  MotionConstraint,
} from '../src/free-drag/bounds.ts';
import {
  dropTargets,
  type DropTargets,
  type DropTargetTracker,
} from '../src/free-drag/drop-targets.ts';
import type {
  DragAxis,
  FreeDragConfig,
  FreeDragSubject,
  ResolveHome,
} from '../src/free-drag.ts';
import type { SortableConfig, SortableOperationKind } from '../src/sortable.ts';

describe('drag:DRD-39 the published types', () => {
  it('should let an operation name the type its drop returns', () => {
    const awaiter: VerdictAwaiter<boolean> = () => true;
    const operation: BehaviorOperation<boolean> = { drop: () => awaiter };

    assertType(operation);
  });

  it('should let a free drag config name its axis and home types', () => {
    const axis: DragAxis = 'x';
    const home: ResolveHome = (subject: FreeDragSubject) => {
      const rect = subject.visual.getBoundingClientRect();

      return { x: rect.left, y: rect.top };
    };
    const config: Pick<FreeDragConfig, 'axis' | 'home'> = { axis, home };

    assertType(config);
  });
});

describe('drag:DRD-71 the published operation kind', () => {
  it('should let a consumer name the kind that onStart receives', () => {
    const onStart = (_: HTMLElement, kind: SortableOperationKind): void => {
      expectTypeOf(kind).toEqualTypeOf<'pointer' | 'command'>();
    };
    const config: Pick<SortableConfig, 'onStart'> = { onStart };

    assertType(config);
    expectTypeOf<
      Parameters<NonNullable<SortableConfig['onStart']>>
    >().toEqualTypeOf<[item: HTMLElement, kind: SortableOperationKind]>();
  });

  it('should accept an onStart that takes only the item', () => {
    const config: Pick<SortableConfig, 'onStart'> = {
      onStart: (item: HTMLElement) => {
        item.focus();
      },
    };

    assertType(config);
  });
});

describe('drag:DRD-63 the published slot types', () => {
  it('should let a third party return its own drop-target tracker', () => {
    const targets: DropTargets = (drag) => {
      let current: HTMLElement | null = null;
      const tracker: DropTargetTracker = {
        get current() {
          return current;
        },
        move() {
          current = drag.x > 100 ? document.body : null;
        },
        drop() {},
        invalidate() {},
      };

      return tracker;
    };

    assertType(targets);
  });

  it('should let a third party return a tracker that wraps the built-in one', () => {
    const drops: Array<HTMLElement | null> = [];
    const targets: DropTargets = (drag, window) => {
      const inner = dropTargets({ targets: () => [] })(drag, window);

      return {
        get current() {
          return inner.current;
        },
        move: () => inner.move(),
        drop: () => {
          inner.drop();
          drops.push(inner.current);
        },
        invalidate: () => inner.invalidate(),
      };
    };

    assertType(targets);
  });

  it('should let a third party bounds installer return its own constraint', () => {
    const installer: BoundsInstaller = () => {
      const constraint: MotionConstraint = {
        apply(motion) {
          motion.x = Math.max(motion.x, 0);
        },
        invalidate() {},
      };

      return constraint;
    };

    assertType(installer);
  });
});
