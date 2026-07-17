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
 * `base` is the visual's authored transform, if any, so drag translation is
 * composed with it rather than replacing it.
 */
export function animateTranslate(
  visual: HTMLElement,
  from: Point,
  to: Point,
  timing: AnimationTiming,
  base = '',
): LandingAnimation {
  const prefix = base ? `${base} ` : '';
  const toTransform = `${prefix}${translate(to)}`;

  const animation = visual.animate(
    [{ transform: `${prefix}${translate(from)}` }, { transform: toTransform }],
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
