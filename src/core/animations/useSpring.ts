import type { ReactiveController } from '../elements/reactive-controller.ts';
import CSSVariableError from '../utils/CSSVariableError.ts';
import { ReactiveElement, use } from '../elements/reactive-element.ts';
import { TypedObject } from '../../interfaces.ts';

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
  duration: number,
): readonly number[] {
  // degrees per second -> radians per second (omega_n)
  const stiffnessOmegaN = stiffness * (Math.PI / 180);

  // Calculate damped natural frequency (omega_d)
  // Math.max(0, ...) prevents NaN if damping > 1, making omega_d = 0 for critically/overdamped.
  const omegaD =
    stiffnessOmegaN * Math.sqrt(Math.max(0, 1 - damping * damping));
  const frameAmount = 100; // Number of frames to generate

  return Array.from({ length: frameAmount }, (_, i) => {
    const t = (i / frameAmount) * duration; // Time of the current frame

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

export type InitEvent = (animation: Animation) => void;

export type ControlEventListener<E = Event> = (
  event: E,
  animation: Animation,
) => void;

export type ControlEvents = Readonly<
  { init?: InitEvent } & {
    [P in keyof HTMLElementEventMap]?: ControlEventListener<
      HTMLElementEventMap[P]
    >;
  }
>;

export type CSSVariables = Readonly<{
  damping: string;
  stiffness: string;
  duration: string;
  factor: string;
}>;

class SpringAnimationController implements ReactiveController {
  readonly #host: HTMLElement;
  readonly #events: ControlEvents;
  readonly #listenerController: AbortController = new AbortController();
  readonly #cssVariables: CSSVariables;

  constructor(
    host: HTMLElement,
    events: ControlEvents,
    cssVariables: CSSVariables,
  ) {
    this.#host = host;
    this.#cssVariables = cssVariables;
    this.#events = events;
  }

  connected(): void {
    const host = this.#host;
    const vars = this.#cssVariables;
    const { signal } = this.#listenerController;

    const styles = getComputedStyle(host);
    const [damping, stiffness, duration] = [
      vars.damping,
      vars.stiffness,
      vars.duration,
    ].map((variable) => {
      const value = styles.getPropertyValue(`--_${variable}`).trim();
      let result = parseFloat(value);

      if (value.endsWith('ms')) {
        result = result / 1000;
      }

      if (isNaN(result)) {
        throw new CSSVariableError(variable, host);
      }
      return result;
    });

    const keyframes = createSpringKeyframes(damping!, stiffness!, duration!);

    const animation = host.animate(
      keyframes.map((frame) => ({ [`--_${vars.factor}`]: frame })),
      { duration: duration! * 1000, fill: 'forwards' },
    );

    animation.pause();

    for (const [name, listener] of TypedObject.entries(this.#events)) {
      if (name === 'init') {
        (listener as InitEvent)(animation);
      } else {
        host.addEventListener(
          name,
          (event) => (listener as ControlEventListener)(event, animation),
          { signal },
        );
      }
    }
  }

  disconnected(): void {
    this.#listenerController.abort();
  }
}

export function useSpring(
  element: ReactiveElement,
  events: ControlEvents,
  cssVariables: CSSVariables,
): void {
  use(element, new SpringAnimationController(element, events, cssVariables));
}
