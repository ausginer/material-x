/**
 * Free drag's landing capability: a **thin factory** over the shared runner.
 *
 * **This entry duplicates an entry, not an implementation** (07 §The export
 * topology extension). The runner, its timing domain and its reduced-motion
 * collapse are behavior-neutral and live in `src/shared/landing-runner.ts`;
 * what the two entries do not share is the *installer type*, because the
 * contribution types differ and unifying those is F-64's deferred question.
 *
 * The cost is a thin factory per entry, and the precedent is `rect-index.ts`
 * shared between `y()` and `xy()` at a measured 60 B — recorded rather than
 * absorbed. **This one's cost is measured and recorded the same way.**
 *
 * `LandingOptions` is re-exported rather than re-declared, so a consumer
 * importing it from either landing entry gets the **same declaration** (B-7).
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
