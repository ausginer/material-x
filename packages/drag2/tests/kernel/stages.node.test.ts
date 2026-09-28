/**
 * **The stage vocabulary itself** (D-74, D-132).
 *
 * These four rows were `errors.node.test.ts`'s and outlived its subject. That
 * file existed to enumerate the stage → code mapping; D-132 deleted the
 * mapping, and what is left here is about the stage list and its *numbers*,
 * which nothing about the deletion touches.
 *
 * **The witness changed with the move, and D-133 finished the change.** The
 * holes at 12 and 13 used to be witnessed by `STAGE_TO_CODE`'s padding, and
 * for one day by `STAGE_NAMES`'; both arrays are gone, and **no positional
 * table indexed by a stage number exists in the library any more**. So this
 * file is the whole witness: a stage added to `failures.ts` necessarily joins
 * `PUBLISHED`, and 12 or 13 coming back is a value appearing in it.
 *
 * **That is a stronger witness than the padding was**, which is worth stating
 * because the padding is what the earlier records treat as the real
 * instrument. An array's padding only ever caught a hole being *closed up* —
 * entries sliding down one slot. The reflection catches that and also catches
 * a constant being reintroduced at either number, which is the failure the
 * never-reuse rule actually forbids.
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
  it('should publish exactly ten stages', () => {
    // **Ten, and four numbers that will never come back.**
    // `FAILURE_PRESENTATION_READY = 13` went with the readiness protocol
    // (D-41); `FAILURE_LANDING_TARGET = 12` went with the `QUALITY` tier
    // (D-130), which was the only thing that produced it; and
    // `FAILURE_LANDING_CREATE = 10` and `FAILURE_LANDING_INTERRUPTED = 11`
    // went with the landing gate (D-155), which was the only thing that armed a
    // runner for either to classify. No number is reused, so the count is one a
    // reader will keep wanting to check.
    expect(PUBLISHED).toHaveLength(10);
  });

  it('should leave 10 through 13 unoccupied', () => {
    // **A deleted stage's number is not free** (D-41, D-130, D-155). A stage
    // constant is inlined into a consumer's compiled code, so repointing one of
    // these at a new meaning breaks that consumer silently and invisibly.
    // Asserted against the reflection rather than against a hand-written list,
    // so a constant reintroduced at any of them fails here whether or not
    // anyone updates this file.
    expect(PUBLISHED).not.toContain(10);
    expect(PUBLISHED).not.toContain(11);
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
    // outside 1–14 — the range the four holes sit inside — is a vocabulary
    // change nobody decided. This is the reflection's other direction: the
    // count row catches an addition, this catches an addition that also
    // renumbers.
    expect(PUBLISHED.toSorted((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 14,
    ]);
  });
});
