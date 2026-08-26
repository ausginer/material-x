/**
 * **The two error classes** (D-130, D-132).
 *
 * ~~The stage → code mapping, enumerated (D-64).~~ That was this file's whole
 * subject and D-132 deleted it: `DraggableError` carries the `FailureStage`
 * the kernel classified with, so there is no derivation left to enumerate and
 * no four-class closure to defend. The stage-vocabulary rows that outlived the
 * mapping moved to `stages.node.test.ts`; what stays here is what the two
 * constructors actually produce.
 *
 * **There is no total stage mapping left at all** (D-133). `STAGE_NAMES`
 * briefly was one — twelve stages rendered in words for the constructed
 * message — and it is deleted, because the message it fed runs only when a
 * consumer throws a non-`Error` and the payload it was written to improve
 * never reached it (F-105). The fallback carries the number, so the two rows
 * that read it below are one template rather than a table.
 */
import { describe, expect, it } from 'vitest';
import { DraggableError, DraggableWarning } from '../../src/kernel/errors.ts';
import {
  FAILURE_ADMISSION,
  FAILURE_TERMINAL_CALLBACK,
} from '../../src/kernel/failures.ts';

describe('DraggableError', () => {
  it('should carry the stage it was classified with', () => {
    // **The whole of D-132 in one assertion.** The field is `stage`, not
    // `code`, and it holds the number the kernel classified with rather than a
    // bucket derived from it. The rename is what makes the change loud: a
    // consumer's `err.code === 'consumer'` is a missing property now, not a
    // comparison that silently became always-false (D-132 §5.1).
    const error = new DraggableError(FAILURE_ADMISSION, null);

    expect(error.stage).toBe(FAILURE_ADMISSION);
    expect('code' in error).toBe(false);
  });

  it('should carry a null stage when the controller is destroyed', () => {
    // **`null` is panic's, and it means one thing** (D-132 §5.2). Not
    // *unknown* and not an *other* bucket: `FailureStage` classifies faults
    // within an operation, and panic ends the controller, so there is nothing
    // to classify. Manufacturing a thirteenth stage for it would reproduce on
    // the fatal class exactly the defect D-130 forbade on the other one.
    expect(new DraggableError(null, null).stage).toBeNull();
  });

  it('should carry the stage number in the message it builds itself', () => {
    // **One template, no table** (D-133). ~~`drag: admission failure`, from a
    // twelve-entry `STAGE_NAMES`.~~ The words cost the shared root 115 B of
    // its 261 and were rendered only here — on the non-`Error` path — while
    // the payload D-132 §5.3 set out to improve takes the cause's message and
    // never saw them (F-105). The library publishes the twelve constants so a
    // consumer can name the number; naming it for them in every install is
    // what was refused.
    expect(new DraggableError(FAILURE_ADMISSION, null).message).toBe(
      'drag: failure at stage 1',
    );
    expect(new DraggableError(FAILURE_TERMINAL_CALLBACK, null).message).toBe(
      'drag: failure at stage 14',
    );
  });

  it('should say the controller is destroyed when there is no stage', () => {
    // **The one case a number cannot state** (F-104, D-133). `null` is not a
    // stage and has no number to interpolate, so this message stays a fixed
    // string — one string, not twelve — and it is the whole reason the null
    // arm is distinguishable from a classified failure at all.
    expect(new DraggableError(null, null).message).toBe(
      'drag: controller destroyed',
    );
  });

  it('should prefer the classifying error message over its own', () => {
    // The caught error is the only thing that says *what* went wrong; the stage
    // says only where the library was standing when it did. So a caught `Error`
    // supplies the message and the constructed fallback is for everything else.
    expect(
      new DraggableError(FAILURE_ADMISSION, new Error('boom')).message,
    ).toBe('boom');
  });

  it('should carry the classifying error as the native cause', () => {
    const failure = new Error('boom');
    const error = new DraggableError(FAILURE_ADMISSION, failure);

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
    expect(new DraggableError(null, null)).not.toBeInstanceOf(DraggableWarning);
    expect(Object.getPrototypeOf(DraggableWarning)).toBe(Error);
    expect(Object.getPrototypeOf(DraggableError)).toBe(Error);
  });

  it('should carry no discriminator', () => {
    // A warning names its reason in its message and carries the caught error as
    // `cause`; a field a consumer might branch on would be one nothing in the
    // population branches on. Both names are checked, because D-132 renamed the
    // one this row was written against and a warning must acquire neither.
    const warning = new DraggableWarning('drag: test/advisory');

    expect('code' in warning).toBe(false);
    expect('stage' in warning).toBe(false);
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
