/**
 * Kernel action tags, and the offset behavior tags are lifted by.
 *
 * There is no `ADMIT` action. Admission is **native dispatch, not queued** —
 * the `pointerdown` listener runs `admit`, revalidates, mints identity and
 * commits `PENDING` inline. Queuing it would put a `preventDefault()` and a
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
// 6 is unused: there is no authored-presentation gate for it to tag. The number
// is left unused rather than reclaimed, because the tags below are matched by
// value in queued actions and renumbering them buys nothing.
/** The landing runner completed. */
export const LANDING_SETTLED = 7;
/** A classified failure checkpoint. */
export const FAILED = 8;
/** `onError` is done; the failure recovery may proceed. */
export const ERROR_REPORTED = 9;
/** Return the controller to `IDLE`. */
export const RETIRE = 10;
/**
 * Enter the activation seam for a **pointerless** operation.
 *
 * Queued by the command ingress boundary. The pointer path reaches the same
 * seam inline from `MOVE`, because queuing it there would add an entry to every
 * activation and change the drain shape for no gain.
 */
export const ACTIVATE = 11;
/**
 * Close a **pointerless** operation, entering the same release transition `UP`
 * enters at `ACTIVE`.
 *
 * Queued once `START_COMMITTED` has run: a command with no pointer has no other
 * producer of a release, which is what makes it one slot.
 */
export const RELEASE = 12;

/** Behavior tag `n` is queued as `BEHAVIOR_BASE + n`. */
export const BEHAVIOR_BASE = 32;
