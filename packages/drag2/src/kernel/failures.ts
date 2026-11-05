/**
 * Classified failure stages, cancellation stages and cancellation origins.
 *
 * `FailureStage` is a closed union and not a bare `number`, so an invalid or
 * private stage cannot be forged. It is public at both tiers: an ordinary
 * consumer receives it on `DraggableError`, and a behavior author classifies
 * with it.
 *
 * The numbers are stable. A stage constant is inlined into a consumer's
 * compiled code, so no constant ever changes meaning and no retired number is
 * ever reused.
 *
 * A stage says where the library was when a fault occurred. What to recover is
 * the behavior's decision, and this module publishes no mapping from stage to
 * recovery.
 */

export const FAILURE_ADMISSION = 1;
export const FAILURE_ACTIVATION = 2;
export const FAILURE_RENDERER_WRITE = 3;
/** The action transition's `prepare`. */
export const FAILURE_ACTION_PREPARE = 4;
/** The action transition's `effect`. */
export const FAILURE_ACTION_EFFECT = 5;
export const FAILURE_INVALIDATION = 6;
export const FAILURE_SCHEDULED_FRAME = 7;
/** The settlement transition. */
export const FAILURE_RESOLUTION = 8;
export const FAILURE_RELEASE = 9;
// 10 through 13 are gaps, and none is ever reused. A stage constant is a wire
// value in a consumer's compiled code, so giving one of them a different
// meaning breaks that consumer silently. A new stage takes the next free number
// instead.
//
// No positional table in the library is indexed by these numbers, so nothing
// pads the gap and nothing would shift if one were filled.
// `tests/kernel/stages.node.test.ts` verifies this: it reflects over this
// module's own `FAILURE_*` exports, which include a reintroduced number whether
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
  | typeof FAILURE_TERMINAL_CALLBACK;

/**
 * Whether the operation was abandoned before the consumer round-trip opened, or
 * while it was in flight. Carried through to the public cancel result.
 */
export const AT_PROPOSAL = 20;
export const AT_CONSUMER = 21;

export type CancelStage = typeof AT_PROPOSAL | typeof AT_CONSUMER;

// Who decided the cancellation, and of what kind. The library writes this value
// and a consumer never does. For that reason provenance is not carried on
// `reason`: `requestCancel(reason?: unknown)` accepts anything, so a value
// arriving there is only what the caller asserts.
//
// This value is independent of `CancelStage` and `reason`, and the three answer
// different questions: `origin` is who decided, `stage` is when, and `reason`
// is what the decider had to say and stays open.
//
// `origin` names the cancellation that decided the terminal, not every fault
// the operation met. A failure raised while a cancellation is already recorded
// is refused its classification and surfaces as a `DraggableWarning`, because
// the cancellation owns the terminal. So the origin stays whatever cancelled,
// typically `CANCEL_SUPPLIED`. `onError` answers "did anything go wrong"; this
// field answers "what ended it".
//
// The numbers are stable on the same terms as the failure stages. A constant is
// inlined into a consumer's compiled code, so none ever changes meaning and no
// retired number is ever reused.
/** `requestCancel(reason?)` was called, by the consumer or by the behavior. */
export const CANCEL_SUPPLIED = 30;
/** The user pressed Escape. `reason` is `undefined`. */
export const CANCEL_ABORTED = 31;
/** The pointer stream ended without a drop. `reason` is `undefined`. */
export const CANCEL_INTERRUPTED = 32;
/**
 * A classified failure decided the operation. `reason` carries the value that
 * was thrown, and `onError` has already fired.
 *
 * The converse does not hold. A failure that arrived while a cancellation was
 * already recorded decided nothing, so it is reported separately and the origin
 * is the cancellation's. Branching on this value to ask "did something break"
 * under-reports; `onError` answers that.
 */
export const CANCEL_FAILED = 33;

export type CancelOrigin =
  | typeof CANCEL_SUPPLIED
  | typeof CANCEL_ABORTED
  | typeof CANCEL_INTERRUPTED
  | typeof CANCEL_FAILED;
