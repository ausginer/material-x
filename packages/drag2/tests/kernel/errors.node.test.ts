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
 * What the enumeration adds over the type is that the stage list is **taken
 * from the exported constants** rather than from the mapping's own keys, so a
 * stage that ships without reaching this mapping is a failing test and not a
 * missing entry nobody looks for.
 */
import { describe, expect, it } from 'vitest';
import {
  DraggableError,
  toDraggableError,
  type DraggableErrorCode,
} from '../../src/kernel/errors.ts';
import {
  FAILURE_ACTIVATION,
  FAILURE_ADMISSION,
  FAILURE_INSERTION,
  FAILURE_INVALIDATION,
  FAILURE_LANDING_CREATE,
  FAILURE_LANDING_INTERRUPTED,
  FAILURE_LANDING_TARGET,
  FAILURE_PLACEHOLDER_MOVE,
  FAILURE_RELEASE,
  FAILURE_RENDERER_WRITE,
  FAILURE_REORDER_RESOLUTION,
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
  ['reorder-resolution', FAILURE_REORDER_RESOLUTION, 'consumer'],
  ['terminal-callback', FAILURE_TERMINAL_CALLBACK, 'consumer'],
  // The interaction itself could not be taken over or given back.
  ['activation', FAILURE_ACTIVATION, 'interaction'],
  ['release', FAILURE_RELEASE, 'interaction'],
  // Presentation: the library's own writing and measuring.
  ['renderer-write', FAILURE_RENDERER_WRITE, 'presentation'],
  ['insertion', FAILURE_INSERTION, 'presentation'],
  ['placeholder-move', FAILURE_PLACEHOLDER_MOVE, 'presentation'],
  ['landing-create', FAILURE_LANDING_CREATE, 'presentation'],
  ['landing-interrupted', FAILURE_LANDING_INTERRUPTED, 'presentation'],
  ['landing-target', FAILURE_LANDING_TARGET, 'presentation'],
  // The platform did not do what it promised.
  ['invalidation', FAILURE_INVALIDATION, 'platform'],
  ['scheduled-frame', FAILURE_SCHEDULED_FRAME, 'platform'],
];

describe('toDraggableError', () => {
  it('should assign a code to every published stage', () => {
    // **Thirteen, not fourteen.** `FAILURE_PRESENTATION_READY = 13` went with
    // the readiness protocol (D-41) and its number was deliberately not reused,
    // so the count is one a reader will keep wanting to check.
    expect(STAGES).toHaveLength(13);

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

  it('should carry the classifying error as the native cause', () => {
    const failure = new Error('boom');
    const error = toDraggableError(FAILURE_ADMISSION, failure);

    // `cause` is the ES2022 property, not a redeclared field: a consumer
    // reaches the original through the language rather than through us.
    expect(error).toBeInstanceOf(DraggableError);
    expect(error.cause).toBe(failure);
  });
});
