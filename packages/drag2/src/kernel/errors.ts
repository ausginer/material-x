/**
 * **The consumer-facing fault vocabulary** (D-64).
 *
 * `FailureStage` is how a *behavior* classifies, which is kernel-tier work. An
 * ordinary consumer receives a `DraggableError` carrying a coarse `code`
 * instead, and never a stage: the classification machinery is unchanged, only
 * its audience narrowed.
 */

import type { FailureStage } from './failures.ts';

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
 *
 * ## Positional, and still total (2026-08-22)
 *
 * This was `Readonly<Record<FailureStage, DraggableErrorCode>>` with thirteen
 * computed keys. The array is **15–27 B smaller** on every composition and
 * **exactly 0 B on both published roots** — `drag.js` shakes the map away from
 * `DraggableError` and `kernel.js` never pulls this module at all.
 *
 * **No stage number moved and no guarantee was traded for the bytes.** The
 * `satisfies` keeps D-64's mechanism above literally true — adding a stage
 * without naming a code does not compile, and it now fails twice, here and at
 * the lookup, which returns `undefined` for a stage the tuple is too short
 * for. The published values are wire values in a consumer's compiled code
 * (D-30, D-74), so a **dense zero-based** representation was refused: that is
 * an API change wearing a size optimization's clothes.
 *
 * **Slots 0 and 13 are unreachable and are padded with an existing code rather
 * than left `undefined`** — `13` is D-41's deliberate hole. Padding measures
 * 7 B *better* after Brotli while measuring 8 B worse minified: a repeat is
 * cheaper to the compressor than a novel token. The minified figure disagrees
 * with the shipped one in direction here, which is the reason both are read.
 *
 * **What position costs, and what already covers it.** The computed-key form
 * followed each constant, so a renumbered stage carried its code with it; this
 * one pins by index instead. Renumbering is the one change `failures.ts` says
 * must never happen — the values are inlined in consumers' compiled code — and
 * it is checked twice over from outside: `tests/kernel/errors.node.test.ts`
 * pins 4, 5 and 8 as literals for D-74, and pins every stage's code **through
 * its constant**, so a repointed value fails there rather than reaching a
 * consumer.
 */
const STAGE_TO_CODE = [
  'consumer', // 0 — unused
  'consumer', // 1  FAILURE_ADMISSION
  'interaction', // 2  FAILURE_ACTIVATION
  'presentation', // 3  FAILURE_RENDERER_WRITE
  'presentation', // 4  FAILURE_ACTION_PREPARE
  'presentation', // 5  FAILURE_ACTION_EFFECT
  'platform', // 6  FAILURE_INVALIDATION
  'platform', // 7  FAILURE_SCHEDULED_FRAME
  'consumer', // 8  FAILURE_RESOLUTION
  'interaction', // 9  FAILURE_RELEASE
  'presentation', // 10 FAILURE_LANDING_CREATE
  'presentation', // 11 FAILURE_LANDING_INTERRUPTED
  'presentation', // 12 FAILURE_LANDING_TARGET
  'consumer', // 13 — the D-41 hole
  'consumer', // 14 FAILURE_TERMINAL_CALLBACK
] as const satisfies Record<FailureStage, DraggableErrorCode>;

/** Wraps a classified failure in the coarse error the consumer receives. */
export function toDraggableError(
  stage: FailureStage,
  error: unknown,
): DraggableError {
  return new DraggableError(STAGE_TO_CODE[stage], error);
}
