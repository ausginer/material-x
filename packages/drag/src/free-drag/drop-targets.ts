/**
 * `dropTargets()`: drag and drop for `freeDrag`. While the drag is over a
 * target, that target has the `data-drop-over` attribute, and the drop's request
 * names it. A composition without it carries none of this code.
 */
import type { Drag } from '../draggable.ts';
import { createFrameTask } from '../shared/invalidation.ts';

export type DropTargetsOptions = Readonly<{
  /**
   * The targets, pulled once per operation, at activation. Where targets
   * overlap, the first in the array wins.
   */
  targets(): readonly HTMLElement[];
}>;

/** What a drop-target capability may use of the operation. Nothing enforces it at runtime. */
export type DropTargetDrag = Pick<Drag, 'x' | 'y' | 'use' | 'requestStep'>;

/**
 * One operation's drop-target state. `freeDrag` creates it in `activate`, the
 * operation holds it, and the operation's release ends it.
 */
export interface DropTargetTracker {
  /** The target under the pointer at the last resolution, or `null`. */
  readonly current: HTMLElement | null;
  /** Called on each sample. It reads no layout, and resolves at the next frame, in a step. */
  move(): void;
  /** Called in the drop step. It resolves at the release position now. */
  drop(): void;
  /**
   * Called on scroll, resize and the controller's `invalidate()`, and at the drop
   * before `drop()`. It only marks the rects stale.
   */
  invalidate(): void;
}

/**
 * The value a `freeDrag` config holds as `targets`. It holds no state, so one
 * config serves every controller. `freeDrag` calls it once per operation, from
 * `activate`, after the lift's acquisition. Whatever it acquires is released
 * through `drag.use`, registered before it runs consumer code. A third party may
 * supply its own.
 */
export type DropTargets = (
  drag: DropTargetDrag,
  window: Window,
) => DropTargetTracker;

const OVER = 'data-drop-over';

/**
 * Tracks the target under the pointer. The mark follows the pointer at most once
 * per frame, and the targets are measured only when stale: at the first
 * resolution of each operation, after a scroll, a resize or `invalidate()`, and
 * at the drop.
 * The operation's release removes the mark. An accepted drop stays where it was
 * dropped, and the consumer commits it in `onEnd`.
 */
export function dropTargets(options: DropTargetsOptions): DropTargets {
  return (drag, window) => {
    const rects: DOMRectReadOnly[] = [];
    let elements: readonly HTMLElement[] = [];
    let stale = true;
    let current: HTMLElement | null = null;

    const mark = (next: HTMLElement | null): void => {
      if (next !== current) {
        current?.removeAttribute(OVER);
        next?.setAttribute(OVER, '');
        current = next;
      }
    };

    /** Reads layout only when stale, and allocates nothing otherwise. */
    const resolve = (): void => {
      if (stale) {
        stale = false;

        for (let i = 0; i < elements.length; i += 1) {
          rects[i] = elements[i]!.getBoundingClientRect();
        }
      }

      // Read once, outside the hit-test loop.
      const { x, y } = drag;
      let hit: HTMLElement | null = null;

      for (let i = 0; i < elements.length && !hit; i += 1) {
        const rect = rects[i]!;

        if (
          x >= rect.left &&
          x < rect.right &&
          y >= rect.top &&
          y < rect.bottom
        ) {
          hit = elements[i]!;
        }
      }

      mark(hit);
    };

    const frame = createFrameTask(window, () => {
      // A frame is foreign code, so its write goes through a step.
      drag.requestStep(resolve);
    });

    // Registered before the consumer's `targets()` runs, so the release covers a
    // throw from it as well as a terminal, a cancel or destruction.
    drag.use(() => {
      frame.cancel();
      mark(null);
    });
    elements = options.targets();

    return {
      get current() {
        return current;
      },
      move() {
        frame.schedule();
      },
      drop() {
        frame.cancel();
        resolve();
      },
      invalidate() {
        stale = true;
      },
    };
  };
}
