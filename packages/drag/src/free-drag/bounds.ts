/**
 * `bounds()`: containment. An element is measured, a function is called and `null`
 * from it means unconstrained for that read. With no argument the drag stays
 * inside the viewport of the realm that owns the item.
 */

export type BoundsSource = HTMLElement | (() => DOMRectReadOnly | null);

export type MotionConstraint = Readonly<{
  /** Clamps the delta in place: one call per sample, allocating nothing. */
  apply(motion: { x: number; y: number }, originRect: DOMRectReadOnly): void;
  /** Staleness only, because scroll calls it many times a second. */
  invalidate(): void;
}>;

export type BoundsInstaller = (window: Window) => MotionConstraint;

export function bounds(source?: BoundsSource): BoundsInstaller {
  return (window) => {
    const box = { left: 0, top: 0, right: 0, bottom: 0 };
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
        box.left = 0;
        box.top = 0;
        box.right = window.innerWidth;
        box.bottom = window.innerHeight;
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
      box.left = read.left;
      box.top = read.top;
      box.right = read.right;
      box.bottom = read.bottom;
      return held;
    };

    return {
      apply(motion, originRect) {
        const rect = resolve();

        if (rect) {
          // Lower clamp first, so a box smaller than the visual pins to the far
          // edge and does not produce a `NaN`.
          motion.x = Math.min(
            Math.max(motion.x, rect.left - originRect.left),
            rect.right - originRect.right,
          );
          motion.y = Math.min(
            Math.max(motion.y, rect.top - originRect.top),
            rect.bottom - originRect.bottom,
          );
        }
      },
      invalidate() {
        stale = true;
      },
    };
  };
}
