/**
 * Classified failure stages and cancellation stages.
 *
 * `FailureStage` is a **closed union**, not a bare `number`, so a participant
 * cannot forge an invalid or kernel-private stage (contract 02 §Failure
 * classification, F-23). It is **public**: a consumer receiving `onError` has
 * to be able to discriminate it (D-30). ~~It is **public**: a consumer
 * receiving `onError` has to be able to discriminate it (D-30).~~ **False since
 * D-64** — an ordinary consumer receives a coarse `code` and no stage — and the
 * premise expired rather than the sentence being wrong when written (F-80 (d),
 * F-81). It is public because a **kernel-tier behavior** classifies with it.
 *
 * The stage → recovery mapping is deliberately **not** here. `recovery` and
 * `domain` are fields of the behavior's frame part, which the kernel cannot
 * name or write; the behavior maps a `SETTLED_FAILED` input to its own
 * recovery (D-24, F-33).
 *
 * ## Three names changed and no value did (D-74)
 *
 * `FAILURE_INSERTION` (4), `FAILURE_PLACEHOLDER_MOVE` (5) and
 * `FAILURE_REORDER_RESOLUTION` (8) are now `FAILURE_ACTION_PREPARE`,
 * `FAILURE_ACTION_EFFECT` and `FAILURE_RESOLUTION`. The kernel runs the action
 * seam under 4/5 and the settlement seam under 8 for **every** behavior, not as
 * a default a behavior may override, so three published constants named
 * behavior-generic seams in one behavior's vocabulary (F-62). A free-drag
 * `moveTo()` whose prepare throws would have reported an *insertion* failure.
 *
 * **The numbers are the wire and they do not move.** A stage constant is
 * inlined into a consumer's compiled code, so a rename that repoints a value is
 * the one change this list must never make — the same rule the `= 13` hole
 * below states for deletion. `tests/kernel/errors.node.test.ts` asserts 4, 5
 * and 8 as literals for exactly this reason.
 */

export const FAILURE_ADMISSION = 1;
export const FAILURE_ACTIVATION = 2;
export const FAILURE_RENDERER_WRITE = 3;
/** The action seam's `prepare`. `FAILURE_INSERTION` until D-74. */
export const FAILURE_ACTION_PREPARE = 4;
/** The action seam's `effect`. `FAILURE_PLACEHOLDER_MOVE` until D-74. */
export const FAILURE_ACTION_EFFECT = 5;
export const FAILURE_INVALIDATION = 6;
export const FAILURE_SCHEDULED_FRAME = 7;
/** The settlement seam. `FAILURE_REORDER_RESOLUTION` until D-74. */
export const FAILURE_RESOLUTION = 8;
export const FAILURE_RELEASE = 9;
export const FAILURE_LANDING_CREATE = 10;
export const FAILURE_LANDING_INTERRUPTED = 11;
/**
 * **Two holes, and the rule that makes them holes rather than gaps.**
 *
 * ~~`FAILURE_LANDING_TARGET = 12`~~ — **deleted 2026-08-26 with the `QUALITY`
 * tier (D-130)**. It was the one stage D-49 created to be *classified,
 * non-consequential and carrying no recovery*, which is a shape that existed
 * only because the destination encoded severity: a landing measurement that
 * cannot be trusted had to be classified in order to reach `onError` at all.
 * With one channel it reaches the consumer as a `DraggableWarning` and needs no
 * stage, and its only producer — `runQualityValue` — is gone with it.
 *
 * ~~`FAILURE_PRESENTATION_READY = 13`~~ — **deleted with the readiness protocol
 * (D-41)**.
 *
 * **Twelve stages, and neither number is ever reused.** A stage constant is a
 * wire value in a consumer's compiled code, so silently repointing 12 or 13 at
 * a different meaning is the one change this list must never make. The
 * positional `STAGE_TO_CODE` tuple in `errors.ts` keeps a padded slot for each,
 * which is what makes the hole a fact about the array rather than a comment.
 */
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
