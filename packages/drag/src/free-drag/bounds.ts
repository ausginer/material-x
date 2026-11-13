/**
 * `bounds()`: containment. An element is measured, a function is called and `null`
 * from it means unconstrained for that read. With no argument the drag stays
 * inside the viewport of the realm that owns the item.
 */

export type BoundsSource = HTMLElement | (() => DOMRectReadOnly | null);

export interface MotionConstraint {
  /** Clamps the delta in place: one call per sample, allocating nothing. */
  apply(motion: { x: number; y: number }, originRect: DOMRectReadOnly): void;
  /**
   * Staleness only, because scroll calls it many times a second. Also called on
   * resize, at activation, by the controller's `invalidate()` and at the drop.
   */
  invalidate(): void;
}

export type BoundsInstaller = (window: Window) => MotionConstraint;

export function bounds(source?: BoundsSource): BoundsInstaller {
  return (window) => {
    const box = { _left: 0, _top: 0, _right: 0, _bottom: 0 };
    /** The last read: `box`, or `null` for unconstrained. */
    let held: typeof box | null = null;
    let stale = true;

    /** Lazy: each resolve is a layout read or a consumer call. */
    const resolve = (): typeof box | null => {
      if (!stale) {
        return held;
      }

      stale = false;
      held = box;

      if (source === undefined) {
        box._left = 0;
        box._top = 0;
        box._right = window.innerWidth;
        box._bottom = window.innerHeight;
        return held;
      }

      const read =
        typeof source === 'function'
          ? source()
          : source.getBoundingClientRect();

      if (!read) {
        held = null;
        return held;
      }

      // Copied, because a function's rect is the consumer's object.
      box._left = read.left;
      box._top = read.top;
      box._right = read.right;
      box._bottom = read.bottom;
      return held;
    };

    return {
      apply(motion, originRect) {
        const rect = resolve();

        if (rect) {
          // Lower clamp first, so a box smaller than the visual pins to the far
          // edge and does not produce a `NaN`.
          motion.x = Math.min(
            Math.max(motion.x, rect._left - originRect.left),
            rect._right - originRect.right,
          );
          motion.y = Math.min(
            Math.max(motion.y, rect._top - originRect.top),
            rect._bottom - originRect.bottom,
          );
        }
      },
      invalidate() {
        stale = true;
      },
    };
  };
}
