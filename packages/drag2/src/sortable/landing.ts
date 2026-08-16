/**
 * The sortable's landing capability: a **thin factory** over the shared runner.
 *
 * **The runner is behavior-neutral and lives in `src/landing-runner.ts`** (07
 * §The export topology extension). `LandingStart`, `LandingContext` and
 * `LandingHandle` are kernel SPI, so how a lifted visual travels to its final
 * place has nothing to do with collections — what this module owns is the one
 * thing that is the sortable's: the shape of the fragment the slot takes.
 * `free-drag/landing.js` wraps the same runner and returns its own.
 *
 * `LandingOptions` is re-exported rather than re-declared, so a consumer
 * importing it from either entry gets the **same declaration** (B-7, F-64).
 */
import {
  createLandingStart,
  type LandingOptions,
} from '../shared/landing-runner.ts';
import type { SortableConfig } from './config.ts';

export type {
  LandingDuration,
  LandingOptions,
  LandingTimingContext,
} from '../shared/landing-runner.ts';

export function landing(
  options: LandingOptions = {},
): Pick<SortableConfig, 'landing'> {
  const start = createLandingStart(options);

  return { landing: () => ({ startLanding: start }) };
}
