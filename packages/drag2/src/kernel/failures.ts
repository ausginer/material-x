/**
 * Classified failure stages and cancellation stages.
 *
 * `FailureStage` is a **closed union**, not a bare `number`, so a participant
 * cannot forge an invalid or kernel-private stage (contract 02 §Failure
 * classification, F-23). It is **public**: a consumer receiving `onError` has
 * to be able to discriminate it (D-30).
 *
 * The stage → recovery mapping is deliberately **not** here. `outcome`,
 * `recovery` and `domain` are fields of the behavior's frame part, which the
 * kernel cannot name or write; the behavior maps a `SETTLED_FAILED` input to
 * its own recovery (D-24, F-33).
 */

export const FAILURE_ADMISSION = 1;
export const FAILURE_ACTIVATION = 2;
export const FAILURE_RENDERER_WRITE = 3;
export const FAILURE_INSERTION = 4;
export const FAILURE_PLACEHOLDER_MOVE = 5;
export const FAILURE_INVALIDATION = 6;
export const FAILURE_SCHEDULED_FRAME = 7;
export const FAILURE_REORDER_RESOLUTION = 8;
export const FAILURE_RELEASE = 9;
export const FAILURE_LANDING_CREATE = 10;
export const FAILURE_LANDING_INTERRUPTED = 11;
export const FAILURE_LANDING_TARGET = 12;
export const FAILURE_PRESENTATION_READY = 13;
export const FAILURE_TERMINAL_CALLBACK = 14;

/** Where a classified failure occurred. */
export type FailureStage =
  | typeof FAILURE_ADMISSION
  | typeof FAILURE_ACTIVATION
  | typeof FAILURE_RENDERER_WRITE
  | typeof FAILURE_INSERTION
  | typeof FAILURE_PLACEHOLDER_MOVE
  | typeof FAILURE_INVALIDATION
  | typeof FAILURE_SCHEDULED_FRAME
  | typeof FAILURE_REORDER_RESOLUTION
  | typeof FAILURE_RELEASE
  | typeof FAILURE_LANDING_CREATE
  | typeof FAILURE_LANDING_INTERRUPTED
  | typeof FAILURE_LANDING_TARGET
  | typeof FAILURE_PRESENTATION_READY
  | typeof FAILURE_TERMINAL_CALLBACK;

/**
 * Whether the operation was abandoned before the consumer round-trip opened, or
 * while it was in flight. Carried through to the public cancel result.
 */
export const AT_PROPOSAL = 20;
export const AT_CONSUMER = 21;

export type CancelStage = typeof AT_PROPOSAL | typeof AT_CONSUMER;
