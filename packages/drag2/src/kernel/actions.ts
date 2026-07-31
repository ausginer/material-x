/**
 * Kernel action tags, and the offset behavior tags are lifted by.
 *
 * There is no `ADMIT` action. The phase table in contract 02 lists one, but
 * admission is **native dispatch, not queued** — the `pointerdown` listener
 * runs `admit`, revalidates, mints identity and commits `PENDING` inline
 * (contract 06 §Admission). Queuing it would put a `preventDefault()` and a
 * `composedPath()` read after the event has finished dispatching.
 *
 * `BEHAVIOR_BASE` is deliberately far above the last kernel tag rather than
 * adjacent to it: `dispatch` bounds-checks a behavior tag against
 * `config.actionTags` before adding the offset, and a gap means a bug in that
 * check surfaces as an unrecognised action the handler ignores rather than as a
 * silently aliased kernel transition.
 */

/** A committed pointer sample. */
export const MOVE = 1;
/** Input closed at the release point. */
export const UP = 2;
/** A latched cancellation is being applied. */
export const CANCEL = 3;
/** `activation.effect` returned and the operation is still valid. */
export const START_COMMITTED = 4;
/** The consumer round-trip produced a value. */
export const RESOLUTION_SETTLED = 5;
/** The authored-presentation gate resolved, rejected or timed out. */
export const READINESS_SETTLED = 6;
/** The landing runner completed. */
export const LANDING_SETTLED = 7;
/** A classified failure checkpoint. */
export const FAILED = 8;
/** `onError` is done; the failure recovery may proceed. */
export const ERROR_REPORTED = 9;
/** Return the controller to `IDLE`. */
export const RETIRE = 10;

/** Behavior tag `n` is queued as `BEHAVIOR_BASE + n`. */
export const BEHAVIOR_BASE = 32;
