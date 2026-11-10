/**
 * The smallest useful behavior: no lift and no verdict. The size is in the target's
 * own box, so the viewport delta converts through that box. Escape restores the size.
 */
import { box, coordinates, delta, localDelta } from '@ydinjs/box-quad';
import {
  draggable,
  type BehaviorOperation,
  type DraggableController,
} from '../../src/draggable.ts';

type Size = Readonly<{ width: number; height: number }>;
type State = Size & { readonly basis: Float64Array };

export function resizeHandle(
  handle: HTMLElement,
  target: HTMLElement,
  onEnd: (size: Size | 'restored') => void,
): DraggableController<BehaviorOperation> {
  const local = delta();
  const write = (width: number, height: number): void => {
    target.style.width = `${width}px`;
    target.style.height = `${height}px`;
  };

  return draggable<State>(handle, {
    threshold: 1,

    admit: () => ({
      item: handle,
      state: {
        width: target.offsetWidth,
        height: target.offsetHeight,
        basis: box(),
      },
    }),

    activate(drag, state) {
      if (!coordinates(target, state.basis)) {
        throw new Error('resize-handle/no-basis');
      }

      return {
        move() {
          const { x, y, originX, originY } = drag;

          if (localDelta(state.basis, x - originX, y - originY, local)) {
            write(
              Math.max(80, state.width + local[0]!),
              Math.max(60, state.height + local[1]!),
            );
          }
        },

        end(outcome) {
          if (outcome.type === 'canceled') {
            write(state.width, state.height);
            onEnd('restored');
          } else {
            onEnd({ width: target.offsetWidth, height: target.offsetHeight });
          }
        },
      };
    },
  });
}
