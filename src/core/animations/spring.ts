import type { ReactiveController } from '../elements/reactive-controller.ts';
import { CSSVariableError } from '../utils.ts';

function createSpringKeyframes(
  /**
   * Damping factor of the spring, where 0 is no damping and 1 is critical
   * damping (prevents oscillation).
   */
  damping: number,
  /**
   * Stiffness of the spring, higher values result in faster oscillations.
   * Expressed in degrees per second.
   */
  stiffness: number,
  /**
   * Duration in milliseconds.
   */
  durationMs: number,
): readonly number[] {
  const durationSec = durationMs / 1000;

  // degrees per second -> radians per second (omega_n)
  const stiffnessOmegaN = stiffness * (Math.PI / 180);

  // Calculate damped natural frequency (omega_d)
  // Math.max(0, ...) prevents NaN if damping > 1, making omega_d = 0 for critically/overdamped.
  const omegaD =
    stiffnessOmegaN * Math.sqrt(Math.max(0, 1 - damping * damping));
  const frameAmount = 100; // Number of frames to generate

  return Array.from({ length: frameAmount }, (_, i) => {
    const t = (i / frameAmount) * durationSec; // Time of the current frame

    const distance =
      damping >= 1
        ? // For critically damped or overdamped systems, there's no oscillation.
          // The position approaches the final value exponentially.
          Math.exp(-damping * stiffnessOmegaN * t)
        : // For underdamped systems, it oscillates with exponential decay.
          // This formula describes the displacement from the final resting position.
          Math.exp(-damping * stiffnessOmegaN * t) * Math.cos(omegaD * t);

    // The value starts at 0 (at t=0) and settles at 1.
    // `distance` starts at 1 and decays to 0.
    // So, `1 - distance` correctly starts at 0 and approaches 1.
    return 1 - distance;
  });
}

export default class SpringAnimationController implements ReactiveController {
  readonly #host: HTMLElement;
  readonly #listenerController: AbortController = new AbortController();

  constructor(host: HTMLElement) {
    this.#host = host;
  }

  connected(): void {
    const host = this.#host;
    const { signal } = this.#listenerController;

    const styles = getComputedStyle(host);
    const [damping, stiffness, duration] = [
      '--_motion-damping',
      '--_motion-stiffness',
      '--_motion-duration',
    ].map((variable) => {
      const result = parseFloat(styles.getPropertyValue(variable).trim());
      if (isNaN(result)) {
        throw new CSSVariableError(variable, host);
      }
      return result;
    });

    const keyframes = createSpringKeyframes(damping, stiffness, duration);

    const animation = host.animate(
      keyframes.map((frame) => ({ '--_spring-factor': frame })),
      { duration: 150, fill: 'forwards' },
    );

    animation.pause();

    host.addEventListener(
      'pointerdown',
      () => {
        animation.playbackRate = 1;
        animation.play();
      },
      { signal },
    );

    host.addEventListener(
      'pointerup',
      () => {
        animation.playbackRate = -1;
        animation.play();
      },
      { signal },
    );
  }

  disconnected(): void {
    this.#listenerController.abort();
  }
}
