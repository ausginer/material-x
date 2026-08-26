/**
 * **The stage vocabulary itself** (D-74, D-132).
 *
 * These four rows were `errors.node.test.ts`'s and outlived its subject. That
 * file existed to enumerate the stage → code mapping; D-132 deleted the
 * mapping, and what is left here is about the stage list and its *numbers*,
 * which nothing about the deletion touches.
 *
 * **The witness changed with the move.** The holes at 12 and 13 used to be
 * witnessed by `STAGE_TO_CODE`'s padding — an array that no longer exists. The
 * witness is now the published union plus the reflection below: a stage added
 * to `failures.ts` necessarily joins `PUBLISHED`, and 12 or 13 coming back is
 * a value appearing in it. The *positional* half of the old witness survives
 * in `errors.node.test.ts`, which reads a neighbouring stage's rendered
 * message.
 *
 * **And the numbers are now load-bearing rather than belt** (D-132 §8). Until
 * D-132 a stage number reached only a kernel-tier behavior author; it now
 * reaches an ordinary consumer on `DraggableError.stage`, so a repointed value
 * is a wire break in fact and not merely in intent.
 */
import { describe, expect, it } from 'vitest';
import * as stageModule from '../../src/kernel/failures.ts';
import {
  FAILURE_ACTION_EFFECT,
  FAILURE_ACTION_PREPARE,
  FAILURE_RESOLUTION,
  type FailureStage,
} from '../../src/kernel/failures.ts';

/**
 * The stages as the module publishes them, by reflection.
 *
 * The prefix is the whole selector: `failures.ts` also declares the
 * cancellation stages, which are a different vocabulary on the same axis of
 * "where did this end". A stage added to the module joins this set whether or
 * not anyone remembers this file.
 */
const PUBLISHED = Object.entries(stageModule)
  .filter(([name]) => name.startsWith('FAILURE_'))
  .map(([, stage]) => stage as FailureStage);

describe('the failure stage vocabulary', () => {
  it('should publish exactly twelve stages', () => {
    // **Twelve, and two numbers that will never come back.**
    // `FAILURE_PRESENTATION_READY = 13` went with the readiness protocol
    // (D-41); `FAILURE_LANDING_TARGET = 12` went with the `QUALITY` tier
    // (D-130), which was the only thing that produced it. Neither number is
    // reused, so the count is one a reader will keep wanting to check.
    expect(PUBLISHED).toHaveLength(12);
  });

  it('should leave 12 and 13 unoccupied', () => {
    // **A deleted stage's number is not free** (D-41, D-130). Asserted against
    // the reflection rather than against a hand-written list, so a constant
    // reintroduced at either number fails here whether or not anyone updates
    // this file.
    expect(PUBLISHED).not.toContain(12);
    expect(PUBLISHED).not.toContain(13);
  });

  it('should keep the three renamed stages on their original numbers', () => {
    // **K-4.** D-74 renamed three stages and moved no value. The rename is the
    // safe half — nothing but kernel-tier authors reads a stage *name* — while
    // the number is inlined into every consumer's compiled code, so a
    // repointed value is a silent wire break that no type, no export-equality
    // assertion and no mapping test can see. Asserted as literals rather than
    // against the constants, because comparing a constant to itself is what
    // would have let the move through.
    expect([
      FAILURE_ACTION_PREPARE,
      FAILURE_ACTION_EFFECT,
      FAILURE_RESOLUTION,
    ]).toEqual([4, 5, 8]);
  });

  it('should hold every stage inside the published numeric range', () => {
    // The union is closed and its members are wire values, so a stage arriving
    // outside 1–14 — the range the two holes sit inside — is a vocabulary
    // change nobody decided. This is the reflection's other direction: the
    // count row catches an addition, this catches an addition that also
    // renumbers.
    expect(PUBLISHED.toSorted((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14,
    ]);
  });
});
