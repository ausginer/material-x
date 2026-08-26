/**
 * The stage → code mapping, enumerated (D-64).
 *
 * **The type already guarantees totality**, because `STAGE_TO_CODE` is declared
 * `Readonly<Record<FailureStage, DraggableErrorCode>>` and adding a stage
 * without a code does not compile. This suite is the belt to that brace, and
 * the handoff asked for it by name for a reason worth restating: the *other*
 * total mapping in this vocabulary — stage → recovery — had a gap that read as
 * an unfinished row rather than as a decision, and D-60 had to be written to
 * close it. A `default:` arm handing out `'platform'` would reproduce that
 * silently, on the one channel a consumer actually reads.
 *
 * What the enumeration adds over the type is a **code per stage, written out**:
 * the `Record` proves every stage has *a* code and says nothing about which,
 * and D-64's whole content is which. The pairs below are the assertion.
 *
 * **Totality is asserted separately, and it has to be** (review 2, B-4). This
 * header used to claim the stage list was "taken from the exported constants",
 * which it was not — thirteen hand-written tuples and a `toHaveLength(13)` pin
 * the length of the *local table*, so a fourteenth stage added to `failures.ts`
 * and to `STAGE_TO_CODE` compiled and left this suite green. The list is now
 * derived by reflecting over the module's own `FAILURE_*` exports, which a new
 * stage necessarily joins, and the table is checked against it.
 */
import { describe, expect, it } from 'vitest';
import {
  DraggableError,
  DraggableWarning,
  toDraggableError,
  type DraggableErrorCode,
} from '../../src/kernel/errors.ts';
import * as stageModule from '../../src/kernel/failures.ts';
import {
  FAILURE_ACTION_EFFECT,
  FAILURE_ACTION_PREPARE,
  FAILURE_ACTIVATION,
  FAILURE_ADMISSION,
  FAILURE_INVALIDATION,
  FAILURE_LANDING_CREATE,
  FAILURE_LANDING_INTERRUPTED,
  FAILURE_RELEASE,
  FAILURE_RENDERER_WRITE,
  FAILURE_RESOLUTION,
  FAILURE_SCHEDULED_FRAME,
  FAILURE_TERMINAL_CALLBACK,
  type FailureStage,
} from '../../src/kernel/failures.ts';

/**
 * Every stage, with the code D-64 assigns it and the reason the axis assigns
 * it that one. The pairs are written out rather than derived, because a table
 * derived from the mapping would agree with it whatever it said.
 */
const STAGES: ReadonlyArray<
  readonly [name: string, stage: FailureStage, code: DraggableErrorCode]
> = [
  // Consumer code failing: a resolver, a round-trip, a terminal callback.
  ['admission', FAILURE_ADMISSION, 'consumer'],
  ['resolution', FAILURE_RESOLUTION, 'consumer'],
  ['terminal-callback', FAILURE_TERMINAL_CALLBACK, 'consumer'],
  // The interaction itself could not be taken over or given back.
  ['activation', FAILURE_ACTIVATION, 'interaction'],
  ['release', FAILURE_RELEASE, 'interaction'],
  // Presentation: the library's own writing and measuring.
  ['renderer-write', FAILURE_RENDERER_WRITE, 'presentation'],
  ['action-prepare', FAILURE_ACTION_PREPARE, 'presentation'],
  ['action-effect', FAILURE_ACTION_EFFECT, 'presentation'],
  ['landing-create', FAILURE_LANDING_CREATE, 'presentation'],
  ['landing-interrupted', FAILURE_LANDING_INTERRUPTED, 'presentation'],
  // The platform did not do what it promised.
  ['invalidation', FAILURE_INVALIDATION, 'platform'],
  ['scheduled-frame', FAILURE_SCHEDULED_FRAME, 'platform'],
];

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

describe('toDraggableError', () => {
  it('should enumerate every stage the module publishes', () => {
    // **The belt the header used to claim and did not have.** Compared as
    // sorted value lists rather than counts: a fourteenth stage fails here, and
    // so does a table entry for a stage that no longer ships.
    // Numeric constants, so the comparator is required rather than optional:
    // the default sort is lexicographic and would order 10 before 2.
    const byValue = (a: number, b: number): number => a - b;

    expect(STAGES.map(([, stage]) => stage).toSorted(byValue)).toEqual(
      PUBLISHED.toSorted(byValue),
    );
  });

  it('should assign a code to every published stage', () => {
    // **Twelve, and two numbers that will never come back.**
    // `FAILURE_PRESENTATION_READY = 13` went with the readiness protocol
    // (D-41); `FAILURE_LANDING_TARGET = 12` went with the `QUALITY` tier
    // (D-130), which was the only thing that produced it. Neither number is
    // reused — a stage constant is a wire value in a consumer's compiled code
    // — so the count is one a reader will keep wanting to check. Kept as a
    // literal on top of the derivation above: the derivation catches a stage
    // added *and* forgotten here, this catches the two moving together in a
    // direction nobody decided.
    expect(PUBLISHED).toHaveLength(12);

    for (const [name, stage, code] of STAGES) {
      expect([name, toDraggableError(stage, null).code]).toEqual([name, code]);
    }
  });

  it('should assign no code outside the four fault classes', () => {
    // The axis is fault attribution, and it is closed. A fifth class arriving
    // by accident — from a `default:` arm, or from a stage typed loosely enough
    // to slip past the `Record` — fails here.
    const codes = new Set(
      STAGES.map(([, stage]) => toDraggableError(stage, null).code),
    );

    expect([...codes].toSorted()).toEqual([
      'consumer',
      'interaction',
      'platform',
      'presentation',
    ]);
  });

  it('should leave 12 and 13 unoccupied', () => {
    // **A deleted stage's number is not free** (D-41, D-130). The `STAGE_TO_CODE`
    // tuple is positional, so an unpadded hole would silently shift every later
    // code by one; padding is what makes the hole a fact about the array rather
    // than a comment above it. Asserted through the *neighbours*, because that
    // is the failure mode: 14 keeping its code is what proves nothing slid.
    expect(PUBLISHED).not.toContain(12);
    expect(PUBLISHED).not.toContain(13);
    expect(toDraggableError(FAILURE_TERMINAL_CALLBACK, null).code).toBe(
      'consumer',
    );
    expect(toDraggableError(FAILURE_LANDING_INTERRUPTED, null).code).toBe(
      'presentation',
    );
  });

  it('should keep the three renamed stages on their original numbers', () => {
    // **K-4.** D-74 renamed three stages and moved no value. The rename is the
    // safe half — nothing but kernel-tier authors reads a stage *name*, and
    // there are none yet — while the number is inlined into every consumer's
    // compiled code, so a repointed value is a silent wire break that no
    // type, no export-equality assertion and no mapping test can see. Asserted
    // as literals rather than against the constants, because comparing a
    // constant to itself is what would have let the move through.
    expect([
      FAILURE_ACTION_PREPARE,
      FAILURE_ACTION_EFFECT,
      FAILURE_RESOLUTION,
    ]).toEqual([4, 5, 8]);
  });

  it('should carry the classifying error as the native cause', () => {
    const failure = new Error('boom');
    const error = toDraggableError(FAILURE_ADMISSION, failure);

    // `cause` is the ES2022 property, not a redeclared field: a consumer
    // reaches the original through the language rather than through us.
    expect(error).toBeInstanceOf(DraggableError);
    expect(error.cause).toBe(failure);
  });
});

describe('DraggableWarning', () => {
  it('should not be a DraggableError', () => {
    // **The single most important structural constraint of D-130.**
    // `err instanceof DraggableError` is published and already means *my
    // operation was affected*; a warning that satisfied it would silently turn
    // every existing handler into one that treats advisory diagnostics as
    // failures — the coupling the decision exists to remove, reintroduced
    // through the type graph. Asserted in both directions, because a shared
    // base class would pass the first half alone.
    const warning = new DraggableWarning('drag: test/advisory');

    expect(warning).toBeInstanceOf(Error);
    expect(warning).not.toBeInstanceOf(DraggableError);
    expect(new DraggableError('platform', null)).not.toBeInstanceOf(
      DraggableWarning,
    );
    expect(Object.getPrototypeOf(DraggableWarning)).toBe(Error);
    expect(Object.getPrototypeOf(DraggableError)).toBe(Error);
  });

  it('should carry no code', () => {
    // A warning names its reason in its message and carries the caught error as
    // `cause`; a code would be a field a consumer might branch on, and nothing
    // in the population branches. Publishing one now would freeze it.
    const warning = new DraggableWarning('drag: test/advisory');

    expect('code' in warning).toBe(false);
    expect(warning.name).toBe('DraggableWarning');
  });

  it('should carry the caught error as the native cause', () => {
    const caught = new Error('boom');
    const warning = new DraggableWarning('drag: test/advisory', caught);

    expect(warning.message).toBe('drag: test/advisory');
    expect(warning.cause).toBe(caught);
  });

  it('should leave cause undefined when the warning is library-authored', () => {
    // Half the population has no caught error at all — a duplicate gate hold, a
    // registration after closure — and the message is the whole payload there.
    expect(new DraggableWarning('drag: test/advisory').cause).toBeUndefined();
  });
});
