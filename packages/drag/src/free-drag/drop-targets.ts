/**
 * `dropTargets()`: drag and drop for `freeDrag`. While the drag is over a
 * target, that target has the `data-drop-over` attribute, and the drop's request
 * names it. A composition without it carries none of this code.
 */
import type { Drag } from '../draggable.ts';
import { FrameTask } from '../shared/invalidation.ts';

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
 * One operation's drop-target state. `freeDrag` creates it in `activate`, the
 * operation holds it, and the operation's release ends it.
 */
class DropTargetTracker {
  readonly #drag: DropTargetDrag;
  readonly #frame: FrameTask;
  readonly #rects: DOMRectReadOnly[] = [];
  readonly #elements: readonly HTMLElement[];
  #stale = true;
  #current: HTMLElement | null = null;

  constructor(
    drag: DropTargetDrag,
    window: Window,
    options: DropTargetsOptions,
  ) {
    this.#drag = drag;
    this.#frame = new FrameTask(window, () => {
      // A frame is foreign code, so its write goes through a step.
      drag.requestStep(this.#resolve, this);
    });

    // Registered before the consumer's `targets()` runs, so the release covers a
    // throw from it as well as a terminal, a cancel or destruction.
    drag.use(this.#release, this);
    this.#elements = options.targets();
  }

  /** The target under the pointer at the last resolution, or `null`. */
  get current(): HTMLElement | null {
    return this.#current;
  }

  /** Called on each sample. It reads no layout, and resolves at the next frame, in a step. */
  move(): void {
    this.#frame.schedule();
  }

  /** Called in the drop step. It resolves at the release position now. */
  drop(): void {
    this.#frame.cancel();
    this.#resolve();
  }

  /**
   * Called on scroll, resize and the controller's `invalidate()`, and at the drop
   * before `drop()`. It only marks the rects stale.
   */
  invalidate(): void {
    this.#stale = true;
  }

  #mark(next: HTMLElement | null): void {
    if (next !== this.#current) {
      this.#current?.removeAttribute(OVER);
      next?.setAttribute(OVER, '');
      this.#current = next;
    }
  }

  /** Reads layout only when stale, and allocates nothing otherwise. */
  #resolve(): void {
    const elements = this.#elements;

    if (this.#stale) {
      this.#stale = false;

      for (let i = 0; i < elements.length; i += 1) {
        this.#rects[i] = elements[i]!.getBoundingClientRect();
      }
    }

    // Read once, outside the hit-test loop.
    const { x, y } = this.#drag;
    let hit: HTMLElement | null = null;

    for (let i = 0; i < elements.length && !hit; i += 1) {
      const rect = this.#rects[i]!;

      if (
        x >= rect.left &&
        x < rect.right &&
        y >= rect.top &&
        y < rect.bottom
      ) {
        hit = elements[i]!;
      }
    }

    this.#mark(hit);
  }

  #release(): void {
    this.#frame.cancel();
    this.#mark(null);
  }
}

export type { DropTargetTracker };

/**
 * Tracks the target under the pointer. The mark follows the pointer at most once
 * per frame, and the targets are measured only when stale: at the first
 * resolution of each operation, after a scroll, a resize or `invalidate()`, and
 * at the drop.
 * The operation's release removes the mark. An accepted drop stays where it was
 * dropped, and the consumer commits it in `onEnd`.
 */
export function dropTargets(options: DropTargetsOptions): DropTargets {
  return (drag, window) => new DropTargetTracker(drag, window, options);
}
