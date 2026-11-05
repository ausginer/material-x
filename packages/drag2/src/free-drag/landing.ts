/**
 * Free drag's landing capability: a thin factory over the shared timing policy.
 *
 * This entry duplicates an entry, not an implementation. The timing domain and
 * its reduced-motion answer are behavior-neutral and live in
 * `src/shared/landing.ts`. The two entries do not share the installer type,
 * because their contribution types differ.
 *
 * `LandingOptions` is re-exported and not re-declared, so a consumer importing
 * it from either landing entry gets the same declaration.
 */
import { createLandingTiming, type LandingOptions } from '../shared/landing.ts';
import type { FreeDragConfig } from './config.ts';

export type {
  LandingDuration,
  LandingOptions,
  LandingTimingContext,
} from '../shared/landing.ts';

export function landing(
  options: LandingOptions = {},
): Pick<FreeDragConfig, 'landing'> {
  return {
    landing: ({ realm }) => ({
      landingTiming: createLandingTiming(options, realm),
    }),
  };
}
