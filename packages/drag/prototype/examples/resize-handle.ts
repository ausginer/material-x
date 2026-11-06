/**
 * The smallest useful behavior: no lift and no verdict. Escape restores the size.
 */
import { draggable } from '@ydinjs/drag/draggable.js';

type Size = Readonly<{ width: number; height: number }>;

export function resizeHandle(
  handle: HTMLElement,
  target: HTMLElement,
  onEnd: (size: Size | 'restored') => void,
) {
  const write = ({ width, height }: Size): void => {
    target.style.width = `${width}px`;
    target.style.height = `${height}px`;
  };

  return draggable<Size>(handle, {
    lift: false,
    threshold: 1,

    admit: () => ({
      item: handle,
      state: { width: target.offsetWidth, height: target.offsetHeight },
    }),

    move({ state, x, y, originX, originY }) {
      write({
        width: Math.max(80, state.width + x - originX),
        height: Math.max(60, state.height + y - originY),
      });
    },

    end({ state }, outcome) {
      if (outcome.type === 'canceled') {
        write(state);
        onEnd('restored');
      } else {
        onEnd({ width: target.offsetWidth, height: target.offsetHeight });
      }
    },
  });
}
