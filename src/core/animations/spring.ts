const FRAME_COUNT = 100;
const START_VALUE = 0;
const END_VALUE = 1;
const INITIAL_VELOCITY = 0;

export type SpringAnimationInput = Readonly<{
  /**
   * Damping factor of the spring, where 0 is no damping and 1 is critical
   * damping (prevents oscillation).
   */
  damping: number;
  /**
   * Stiffness constant of the spring; higher values settle faster.
   */
  stiffness: number;
  /**
   * Duration in seconds.
   */
  duration: number;
}>;

function createSpringKeyframes({
  damping,
  stiffness,
  duration,
}: SpringAnimationInput): readonly number[] {
  const naturalFrequency = Math.sqrt(stiffness);
  const initialDisplacement = START_VALUE - END_VALUE;

  let getDisplacement: (time: number) => number;

  if (damping > 1) {
    // Overdamped: two negative real roots.
    const sqrtTerm = Math.sqrt(damping * damping - 1);
    const gammaPlus = -damping * naturalFrequency + naturalFrequency * sqrtTerm;
    const gammaMinus =
      -damping * naturalFrequency - naturalFrequency * sqrtTerm;
    const denominator = gammaMinus - gammaPlus;
    const coeffA =
      initialDisplacement -
      (gammaMinus * initialDisplacement - INITIAL_VELOCITY) / denominator;
    const coeffB =
      (gammaMinus * initialDisplacement - INITIAL_VELOCITY) / denominator;

    getDisplacement = (time) =>
      coeffA * Math.exp(gammaMinus * time) +
      coeffB * Math.exp(gammaPlus * time);
  } else if (damping === 1) {
    // Critically Damped
    // Formula: (A + B * time) * Math.exp(-naturalFrequency * time)
    const coeffA = initialDisplacement;
    const coeffB = INITIAL_VELOCITY + naturalFrequency * initialDisplacement;

    getDisplacement = (time) =>
      (coeffA + coeffB * time) * Math.exp(-naturalFrequency * time);
  } else {
    // Underdamped: complex conjugate roots (oscillation with decay).
    const dampedFrequency =
      naturalFrequency * Math.sqrt(Math.max(0, 1 - damping * damping));
    const cosCoeff = initialDisplacement;
    const sinCoeff =
      (1 / dampedFrequency) *
      (damping * naturalFrequency * initialDisplacement + INITIAL_VELOCITY);

    getDisplacement = (time) => {
      const envelope = Math.exp(-damping * naturalFrequency * time);
      const angle = dampedFrequency * time;
      return (
        envelope * (cosCoeff * Math.cos(angle) + sinCoeff * Math.sin(angle))
      );
    };
  }

  const keyframes = Array.from({ length: FRAME_COUNT }, (_, index) => {
    const time = (duration * index) / (FRAME_COUNT - 1);
    const displacement = getDisplacement(time);
    return displacement + END_VALUE;
  });

  keyframes[0] = START_VALUE;
  keyframes[FRAME_COUNT - 1] = END_VALUE;

  return keyframes;
}

export function createSpringAnimation(
  host: HTMLElement,
  factorName: string,
  input: SpringAnimationInput,
): Animation {
  const keyframes = createSpringKeyframes(input);

  const animation = host.animate(
    keyframes.map((frame) => ({ [`--${factorName}`]: frame })),
    { duration: input.duration * 1000, fill: 'forwards' },
  );
  animation.pause();
  animation.currentTime = 0;

  return animation;
}
