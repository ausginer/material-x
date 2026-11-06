/**
 * The sortable's landing capability: a thin factory over the shared timing
 * policy.
 *
 * The policy is behavior-neutral and lives in `src/shared/landing.ts`, and the
 * interpolation itself is the kernel's. So how a dropped visual travels to its
 * final place has nothing to do with collections. This module owns only the
 * shape of the fragment that the slot takes. `free-drag/landing.js` wraps the
 * same policy and returns its own fragment.
 *
 * `LandingOptions` is re-exported and not re-declared, so a consumer importing
 * it from either entry gets the same declaration.
 */
import { createLandingTiming, type LandingOptions } from '../shared/landing.ts';
import type { SortableConfig } from './config.ts';

export type {
  LandingDuration,
  LandingOptions,
  LandingTimingContext,
} from '../shared/landing.ts';

export function landing(
  options: LandingOptions = {},
): Pick<SortableConfig, 'landing'> {
  return {
    landing: ({ realm }) => ({
      landingTiming: createLandingTiming(options, realm),
    }),
  };
}
