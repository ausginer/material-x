/** `drag:DRD-39`: a type that a published signature names is exported from its entry. Checked by `tsc`, with no run. */
import { assertType, describe, it } from 'vitest';
import type { BehaviorOperation, VerdictAwaiter } from '../src/draggable.ts';
import type {
  DragAxis,
  FreeDragConfig,
  FreeDragSubject,
  ResolveHome,
} from '../src/free-drag.ts';

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
