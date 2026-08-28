/**
 * Free drag's landing capability: a **thin factory** over the shared runner.
 *
 * **This entry duplicates an entry, not an implementation.** The runner, its
 * timing domain and its reduced-motion collapse are behavior-neutral and live
 * in `src/shared/landing-runner.ts`; what the two entries do not share is the
 * *installer type*, because their contribution types differ.
 *
 * `LandingOptions` is re-exported rather than re-declared, so a consumer
 * importing it from either landing entry gets the **same declaration**.
 */
import {
  createLandingStart,
  type LandingOptions,
} from '../shared/landing-runner.ts';
import type { FreeDragConfig } from './config.ts';

export type {
  LandingDuration,
  LandingOptions,
  LandingTimingContext,
} from '../shared/landing-runner.ts';

export function landing(
  options: LandingOptions = {},
): Pick<FreeDragConfig, 'landing'> {
  const start = createLandingStart(options);

  return { landing: () => ({ startLanding: start }) };
}
