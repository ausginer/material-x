/**
 * Displacement: the items a committed placeholder move pushed aside slide to their
 * new positions instead of jumping.
 *
 * This feature measures nothing: the vectors come from the axis. It owns duration,
 * easing and the animations it starts. A rebuild never cancels an animation, because
 * that would leave a window in which a row has jumped. `displaced` answers what an
 * animation currently carries, from its timing, with no layout read.
 *
 * Animations fold and do not stack. A second move arriving mid-flight cancels the
 * running animation and starts one from `residual + delta`, which lands the element
 * exactly where the running one had reached. So there is one animation per element,
 * and the sink can compute its current offset.
 *
 * No lifecycle waits for it: an animation in flight never delays release or teardown.
 */
import { delta, localDelta, type Space } from '@ydinjs/box-quad';
import type { DisplacementInstaller, DisplacementSink } from './axis.ts';

export type LayoutAnimationOptions = Readonly<{
  duration?: number;
  easing?: string;
}>;

const DEFAULT_DURATION = 160;
const DEFAULT_EASING = 'ease-out';

/** One element's animation, and the viewport vector it started with. */
type RowAnimation = Readonly<{
  animation: Animation;
  dx: number;
  dy: number;
}>;

/**
 * How much of an animation is still applied, as a fraction of its starting vector.
 * `progress` already has the easing applied, and the keyframes interpolate linearly
 * from the vector to zero. An overshooting easing takes this outside `[0, 1]`, which
 * is still exactly what the element carries, so it is not clamped.
 */
function remainingOf(animation: Animation): number {
  // Called once: each call returns a new timing dictionary.
  const { progress } = animation.effect!.getComputedTiming();

  return progress == null ? 0 : 1 - progress;
}

/** `finished` rejects when an animation is cancelled, and nothing waits for it. */
function ignoreRejection(): void {}

/**
 * Written `displacement: layoutAnimation()`. Row animations outlive the operation
 * that started them, and the controller cancels what is running on destruction.
 */
export const layoutAnimation =
  ({
    duration = DEFAULT_DURATION,
    easing = DEFAULT_EASING,
  }: LayoutAnimationOptions = {}): DisplacementInstaller =>
  () => {
    const running = new Map<HTMLElement, RowAnimation>();
    const local = delta();
    // What the last `displaced` call answered with, read through the getters.
    let carriedX = 0;
    let carriedY = 0;

    return {
      report(element: HTMLElement, dx: number, dy: number, space: Space): void {
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
        // units, which is what a settled measurement assumes.
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
        animation.finished.then(() => {
          if (running.get(element) === record) {
            running.delete(element);
          }
        }, ignoreRejection);
        running.set(element, record);
      },
      get dx(): number {
        return carriedX;
      },
      get dy(): number {
        return carriedY;
      },
      displaced(element: HTMLElement): boolean {
        const held = running.get(element);

        if (!held) {
          return false;
        }

        const remaining = remainingOf(held.animation);

        carriedX = held.dx * remaining;
        carriedY = held.dy * remaining;
        return true;
      },
      retire(): void {
        for (const { animation } of running.values()) {
          animation.cancel();
        }

        running.clear();
      },
    } satisfies DisplacementSink;
  };
