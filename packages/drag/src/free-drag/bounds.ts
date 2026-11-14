/**
 * `bounds()`: containment. An element is measured, a function is called and `null`
 * from it means unconstrained for that read. With no argument the drag stays
 * inside the viewport of the realm that owns the item.
 */

export type BoundsSource = HTMLElement | (() => DOMRectReadOnly | null);

type Box = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

class MotionConstraint {
  readonly #window: Window;
  readonly #source?: BoundsSource;
  readonly #box = { left: 0, top: 0, right: 0, bottom: 0 };
  #held: Box | null = null;
  #stale = false;

  constructor(window: Window, source?: BoundsSource) {
    this.#window = window;
    this.#source = source;
  }

  /** Clamps the delta in place: one call per sample, allocating nothing. */
  apply(motion: { x: number; y: number }, originRect: DOMRectReadOnly): void {
    const rect = this.#resolve();

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
  }
  /**
   * Staleness only, because scroll calls it many times a second. Also called on
   * resize, at activation, by the controller's `invalidate()` and at the drop.
   */
  invalidate(): void {
    this.#stale = true;
  }

  /** Lazy: each resolve is a layout read or a consumer call. */
  #resolve(): Box | null {
    if (!this.#stale) {
      return this.#held;
    }

    this.#stale = false;
    this.#held = this.#box;

    if (!this.#source) {
      this.#box.left = 0;
      this.#box.top = 0;
      this.#box.right = this.#window.innerWidth;
      this.#box.bottom = this.#window.innerHeight;
      return this.#held;
    }

    const read =
      typeof this.#source === 'function'
        ? this.#source()
        : this.#source.getBoundingClientRect();

    if (!read) {
      this.#held = null;
      return this.#held;
    }

    // Copied, because a function's rect is the consumer's object.
    this.#box.left = read.left;
    this.#box.top = read.top;
    this.#box.right = read.right;
    this.#box.bottom = read.bottom;
    return this.#held;
  }
}

export type { MotionConstraint };

export type BoundsInstaller = (window: Window) => MotionConstraint;

export function bounds(source?: BoundsSource): BoundsInstaller {
  return (window) => new MotionConstraint(window, source);
}
