/**
 * Classified failure stages and cancellation stages.
 *
 * `FailureStage` is a **closed union** rather than a bare `number`, so an
 * invalid or private stage cannot be forged. It is public at both tiers: an
 * ordinary consumer receives it on `DraggableError`, and a behavior author
 * classifies with it.
 *
 * **The numbers are stable.** A stage constant is inlined into a consumer's
 * compiled code, so no constant is ever repointed at a different meaning and no
 * retired number is ever reused.
 *
 * A stage says where the library was standing when a fault occurred. What to
 * recover is the behavior's own question, and no mapping from stage to recovery
 * is published here.
 */

export const FAILURE_ADMISSION = 1;
export const FAILURE_ACTIVATION = 2;
export const FAILURE_RENDERER_WRITE = 3;
/** The action seam's `prepare`. */
export const FAILURE_ACTION_PREPARE = 4;
/** The action seam's `effect`. */
export const FAILURE_ACTION_EFFECT = 5;
export const FAILURE_INVALIDATION = 6;
export const FAILURE_SCHEDULED_FRAME = 7;
/** The settlement seam. */
export const FAILURE_RESOLUTION = 8;
export const FAILURE_RELEASE = 9;
export const FAILURE_LANDING_CREATE = 10;
export const FAILURE_LANDING_INTERRUPTED = 11;
// **12 and 13 are holes and neither is ever reused.** A stage constant is a
// wire value in a consumer's compiled code, so repointing either number at a
// different meaning breaks that consumer silently. Adding a stage takes the
// next free number instead.
//
// No positional table is indexed by these numbers anywhere in the library, so
// nothing pads the gap and nothing would slide if one were filled.
// `tests/kernel/stages.node.test.ts` is the witness: it reflects over this
// module's own `FAILURE_*` exports, which a reintroduced 12 or 13 joins whether
// or not anyone remembers the file, and it asserts every stage as a literal.
export const FAILURE_TERMINAL_CALLBACK = 14;

/** Where a classified failure occurred. */
export type FailureStage =
  | typeof FAILURE_ADMISSION
  | typeof FAILURE_ACTIVATION
  | typeof FAILURE_RENDERER_WRITE
  | typeof FAILURE_ACTION_PREPARE
  | typeof FAILURE_ACTION_EFFECT
  | typeof FAILURE_INVALIDATION
  | typeof FAILURE_SCHEDULED_FRAME
  | typeof FAILURE_RESOLUTION
  | typeof FAILURE_RELEASE
  | typeof FAILURE_LANDING_CREATE
  | typeof FAILURE_LANDING_INTERRUPTED
  | typeof FAILURE_TERMINAL_CALLBACK;

/**
 * Whether the operation was abandoned before the consumer round-trip opened, or
 * while it was in flight. Carried through to the public cancel result.
 */
export const AT_PROPOSAL = 20;
export const AT_CONSUMER = 21;

export type CancelStage = typeof AT_PROPOSAL | typeof AT_CONSUMER;
