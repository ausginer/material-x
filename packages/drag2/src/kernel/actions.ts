/**
 * Kernel action tags, and the offset added to behavior tags.
 *
 * There is no `ADMIT` action. Admission runs in native dispatch and is not
 * queued: the `pointerdown` listener runs `admit`, revalidates, creates the
 * identity and commits `PENDING` inline. Queuing it would put a
 * `preventDefault()` and a `composedPath()` read after the event has finished
 * dispatching.
 *
 * `BEHAVIOR_BASE` is far above the last kernel tag and not adjacent to it.
 * `dispatch` bounds-checks a behavior tag against `config.actionTags` before
 * adding the offset. Because of the gap, a bug in that check produces an
 * unrecognised action that the handler ignores, and not a silently aliased
 * kernel transition.
 */

/** A committed pointer sample. */
export const MOVE = 1;
/** Input closed at the release point. */
export const UP = 2;
/** A recorded cancellation is being applied. */
export const CANCEL = 3;
/** `activation.effect` returned and the operation is still valid. */
export const START_COMMITTED = 4;
/** The consumer round-trip produced a value. */
export const RESOLUTION_SETTLED = 5;
// 6 and 7 are unused and are not reclaimed: queued actions match the tags below
// by value, and renumbering them gives no benefit.
/** A classified failure checkpoint. */
export const FAILED = 8;
/** `onError` is done; the failure recovery may proceed. */
export const ERROR_REPORTED = 9;
/** Return the controller to `IDLE`. */
export const RETIRE = 10;
/**
 * Enter the activation transition for a pointerless operation.
 *
 * Queued by the command's native event pass. The pointer path reaches the same
 * transition inline from `MOVE`, because queuing it there would add an entry to
 * every activation and change the drain shape for no gain.
 */
export const ACTIVATE = 11;
/**
 * Close a pointerless operation by entering the same release transition that
 * `UP` enters at `ACTIVE`.
 *
 * Queued once `START_COMMITTED` has run. A command with no pointer has no other
 * producer of a release, so this is one slot.
 */
export const RELEASE = 12;
/**
 * Open the consumer round-trip for an operation that the release unit
 * committed.
 *
 * The release unit queues this entry instead of running the staged command, so
 * the round-trip is its own unit. A destruction requested in the release unit
 * is applied at that unit's boundary and discards this entry. A cancel
 * registered before this entry is admitted makes the entry decline.
 */
export const OPEN_RESOLUTION = 13;

/** Behavior tag `n` is queued as `BEHAVIOR_BASE + n`. */
export const BEHAVIOR_BASE = 32;
