/** Defaults shared by both entry points. */
import type { AnimationTiming } from './types.ts';

/** Pointer travel, in viewport pixels, before a press becomes a drag. */
export const DEFAULT_THRESHOLD = 8;

/** Lift/landing animation timing used when the consumer supplies none. */
export const DEFAULT_TIMING: AnimationTiming = {
  duration: 200,
  easing: 'ease',
};
