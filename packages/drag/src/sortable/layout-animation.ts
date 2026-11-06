/**
 * Displacement: the items a committed placeholder move pushed aside slide to their
 * new positions instead of jumping.
 *
 * This feature measures nothing: the vectors come from the axis. It owns duration,
 * easing and the animations it starts. A rebuild never cancels an animation, because
 * that would leave a window in which a row has jumped. `settle` subtracts what each
 * animation currently carries, from its timing, with no layout read.
 *
 * Animations fold and do not stack. A second move arriving mid-flight cancels the
 * running animation and starts one from `residual + delta`, which lands the element
 * exactly where the running one had reached. So there is one animation per element,
 * and the sink can compute its current offset.
 *
 * No lifecycle waits for it: an animation in flight never delays release or teardown.
 */
import { delta, localDelta } from '@ydinjs/box-quad';
import type { DisplacementInstaller } from './axis.ts';
import {
  BOTTOM,
  CENTER_X,
  CENTER_Y,
  LEFT,
  RIGHT,
  STRIDE,
  TOP,
} from './rect-index.ts';

export type LayoutAnimationOptions = Readonly<{
  duration?: number;
  easing?: string;
}>;

const DEFAULT_DURATION = 160;
const DEFAULT_EASING = 'ease-out';

/** One element's animation, and the viewport vector it started with. */
type RowAnimation = {
  readonly animation: Animation;
  readonly dx: number;
  readonly dy: number;
};

/**
 * How much of an animation is still applied, as a fraction of its starting vector.
 * `progress` already has the easing applied, and the keyframes interpolate linearly
 * from the vector to zero. An overshooting easing takes this outside `[0, 1]`, which
 * is still exactly what the element carries, so it is not clamped.
 */
const remainingOf = (animation: Animation): number => {
  const { progress } = animation.effect!.getComputedTiming();

  return progress == null ? 0 : 1 - progress;
};

/**
 * Written `displacement: layoutAnimation()`. Row animations outlive the operation
 * that started them, and the controller cancels what is running on destruction.
 */
export function layoutAnimation(
  options: LayoutAnimationOptions = {},
): DisplacementInstaller {
  const { duration = DEFAULT_DURATION, easing = DEFAULT_EASING } = options;

  return () => {
    const running = new Map<HTMLElement, RowAnimation>();
    const local = delta();

    return {
      report(element, dx, dy, space) {
        let sx = dx;
        let sy = dy;
        const previous = running.get(element);

        if (previous) {
          const remaining = remainingOf(previous.animation);

          sx += previous.dx * remaining;
          sy += previous.dy * remaining;
          previous.animation.cancel();
          running.delete(element);
        }

        // A singular ancestor renders nothing, so the vector's value is immaterial.
        if (!localDelta(space, sx, sy, local)) {
          local[0] = sx;
          local[1] = sy;
        }

        // The individual `translate` property, added. `transform` would replace an
        // authored transform, and an additive `transform` would land inside the
        // element's own `scale()`. `translate` applies before `transform`, and only
        // this keyframe is in local units: what the sink stores stays in viewport
        // units, which is what the settle walk assumes.
        const animation = element.animate(
          [
            { translate: `${local[0]!}px ${local[1]!}px` },
            { translate: '0 0' },
          ],
          { duration, easing, composite: 'add' },
        );
        const record: RowAnimation = { animation, dx: sx, dy: sy };

        // The identity test keeps a fold's cancellation from evicting the record
        // that replaced it. A cancel rejects `finished`, and each cancel has already
        // dropped its own record.
        animation.finished.then(
          () => {
            if (running.get(element) === record) {
              running.delete(element);
            }
          },
          () => {},
        );
        running.set(element, record);
      },

      settle(values, items, count) {
        // The common rebuild has nothing in flight.
        if (running.size === 0) {
          return;
        }

        for (let i = 0; i < count; i += 1) {
          const held = running.get(items[i]!);

          if (held) {
            const remaining = remainingOf(held.animation);
            const dx = held.dx * remaining;
            const dy = held.dy * remaining;
            const offset = i * STRIDE;
            const left = values[offset + LEFT]! - dx;
            const right = values[offset + RIGHT]! - dx;
            const top = values[offset + TOP]! - dy;
            const bottom = values[offset + BOTTOM]! - dy;

            values[offset + LEFT] = left;
            values[offset + RIGHT] = right;
            values[offset + CENTER_X] = (left + right) * 0.5;
            values[offset + TOP] = top;
            values[offset + BOTTOM] = bottom;
            values[offset + CENTER_Y] = (top + bottom) * 0.5;
          }
        }
      },

      retire() {
        for (const { animation } of running.values()) {
          animation.cancel();
        }

        running.clear();
      },
    };
  };
}
