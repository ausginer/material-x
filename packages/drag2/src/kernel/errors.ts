/**
 * **The consumer-facing fault vocabulary** (D-64).
 *
 * `FailureStage` is how a *behavior* classifies, which is kernel-tier work. An
 * ordinary consumer receives a `DraggableError` carrying a coarse `code`
 * instead, and never a stage: the classification machinery is unchanged, only
 * its audience narrowed.
 */

import {
  FAILURE_ACTION_EFFECT,
  FAILURE_ACTION_PREPARE,
  FAILURE_ACTIVATION,
  FAILURE_ADMISSION,
  FAILURE_INVALIDATION,
  FAILURE_LANDING_CREATE,
  FAILURE_LANDING_INTERRUPTED,
  FAILURE_LANDING_TARGET,
  FAILURE_RELEASE,
  FAILURE_RENDERER_WRITE,
  FAILURE_RESOLUTION,
  FAILURE_SCHEDULED_FRAME,
  FAILURE_TERMINAL_CALLBACK,
  type FailureStage,
} from './failures.ts';

/**
 * The coarse consumer-facing fault classes. **Names are not frozen; the axis
 * is** — a code names an actionable fault class, never an internal pipeline
 * seam.
 */
export type DraggableErrorCode =
  | 'consumer'
  | 'interaction'
  | 'presentation'
  | 'platform';

/**
 * A class, therefore a **runtime value** rather than an erased type: a consumer
 * writes `err instanceof DraggableError`, and so does a kernel-tier behavior
 * author. That is what keeps it on `drag.js`, the shared root — putting it on
 * `sortable.js` would make a kernel author import the sortable behavior to
 * recognise an error the kernel raised, and putting it on `kernel.js` would
 * make an ordinary consumer import the kernel to recognise an error its own
 * handler was given (D-64).
 *
 * `cause` is the native ES2022 property and is deliberately not redeclared.
 */
export class DraggableError extends Error {
  readonly code: DraggableErrorCode;

  constructor(code: DraggableErrorCode, cause: unknown) {
    super(
      cause instanceof Error ? cause.message : `drag: ${code} failure`,
      // Preserved rather than flattened: the classifying error is the only
      // thing that says *what* went wrong, and the code says only whose fault
      // it is.
      { cause },
    );
    this.name = 'DraggableError';
    this.code = code;
  }
}

/**
 * **Total in the type, and that is the whole point** (D-64).
 *
 * This is the second total mapping the failure vocabulary carries, and the
 * first one — stage → recovery — is the reason to insist: D-60 exists because a
 * gap there was read as an unfinished row rather than as a decision. A
 * `default:` arm assigning `'platform'` to whatever is left would reproduce
 * that defect silently, on the channel a consumer actually reads. Adding a
 * stage without naming a code does not compile.
 *
 * **The axis is fault attribution where the stage names a caller, and seam
 * position where it names a seam** — narrowed at Checkpoint E (E-08), because
 * the stronger claim this comment used to make is not what the call sites do.
 * `ADMISSION`, `RESOLUTION` and `TERMINAL_CALLBACK` do name consumer code
 * failing — `RESOLUTION` is `FAILURE_REORDER_RESOLUTION`'s D-74 name, and this
 * comment still used the retired one — and `SCHEDULED_FRAME` and `INVALIDATION`
 * name the library's own. But the generic seam stages are chosen by **where
 * the throw happened**, not by whose code it was: one consumer-supplied
 * `bounds` source produces `ACTIVATION`, `RENDERER_WRITE`, `ACTION_EFFECT` or
 * `RELEASE` depending only on which seam resolved the rect first (D-81).
 *
 * **That is correct, and the vocabulary stays closed at thirteen**: a
 * behavior-selected stage is the alternative and it is refused, because it
 * would make the wire value a function of which behavior was installed. What
 * changed here is only the claim, not the mapping — a reader deriving an
 * attribution from a stage constant's neighbourhood rather than from the call
 * site gets a plausible wrong answer, which is how two contract rows went wrong
 * (D-83's `bounds`, D-84's `visual`).
 */
const STAGE_TO_CODE: Readonly<Record<FailureStage, DraggableErrorCode>> = {
  [FAILURE_ADMISSION]: 'consumer',
  [FAILURE_ACTIVATION]: 'interaction',
  [FAILURE_RENDERER_WRITE]: 'presentation',
  [FAILURE_ACTION_PREPARE]: 'presentation',
  [FAILURE_ACTION_EFFECT]: 'presentation',
  [FAILURE_INVALIDATION]: 'platform',
  [FAILURE_SCHEDULED_FRAME]: 'platform',
  [FAILURE_RESOLUTION]: 'consumer',
  [FAILURE_RELEASE]: 'interaction',
  [FAILURE_LANDING_CREATE]: 'presentation',
  [FAILURE_LANDING_INTERRUPTED]: 'presentation',
  [FAILURE_LANDING_TARGET]: 'presentation',
  [FAILURE_TERMINAL_CALLBACK]: 'consumer',
};

/** Wraps a classified failure in the coarse error the consumer receives. */
export function toDraggableError(
  stage: FailureStage,
  error: unknown,
): DraggableError {
  return new DraggableError(STAGE_TO_CODE[stage], error);
}
