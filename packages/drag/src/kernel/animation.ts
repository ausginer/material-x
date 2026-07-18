/**
 * Web Animations helpers for lift and landing.
 *
 * Animations are transform-based and interrupt-tolerant: a cancelled animation
 * is an expected lifecycle event, so callers await {@link LandingAnimation.done}
 * (which never rejects) rather than the raw `animation.finished`.
 */
import type { AnimationTiming, Point } from './types.ts';

/** Whether the user has asked for reduced motion. */
export function prefersReducedMotion(): boolean {
  return matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export type LandingAnimation = Readonly<{
  /** Resolves once the animation ends or is cancelled; never rejects. */
  done: Promise<void>;
  /** Stops the animation immediately (its `done` still resolves). */
  cancel(): void;
}>;

/** `translate(x, y)` from a viewport-space delta. */
const translate = (delta: Point): string =>
  `translate(${delta.x}px, ${delta.y}px)`;

/**
 * Animates `visual`'s transform from `from` to `to` (both viewport-space
 * deltas), pinning the final transform once it lands so removing the effect does
 * not snap back for a frame. Reduced motion collapses the animation to an
 * instant jump while preserving the same completion semantics.
 *
 * `base` is the visual's authored transform, if any. The drag translation is
 * *prepended* to it, so the authored rotate/scale/skew still renders about the
 * visual's own box while the translation acts in the (viewport-aligned) space of
 * the lifted, top-layer visual — the translation stays viewport-space regardless
 * of the authored transform.
 */
export function animateTranslate(
  visual: HTMLElement,
  from: Point,
  to: Point,
  timing: AnimationTiming,
  base = '',
): LandingAnimation {
  const suffix = base ? ` ${base}` : '';
  const toTransform = `${translate(to)}${suffix}`;

  const animation = visual.animate(
    [{ transform: `${translate(from)}${suffix}` }, { transform: toTransform }],
    prefersReducedMotion() ? { ...timing, duration: 0 } : timing,
  );

  let settled = false;

  const pin = (): void => {
    if (!settled) {
      settled = true;
      visual.style.transform = toTransform;
    }
  };

  const done = animation.finished.then(pin, pin);

  return {
    done,
    cancel() {
      animation.cancel();
    },
  };
}
