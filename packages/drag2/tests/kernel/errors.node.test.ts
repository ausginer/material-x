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
 * **The header's old warning still applies to the file that inherited it.** The
 * enumeration existed because the *other* total mapping in this vocabulary —
 * stage → recovery — had a gap that read as an unfinished row rather than as a
 * decision, and D-60 had to be written to close it. `STAGE_NAMES` is the only
 * total stage mapping left, and it is checked below through the message rather
 * than by reciting twelve pairs, because nothing branches on its output.
 */
import { describe, expect, it } from 'vitest';
import { DraggableError, DraggableWarning } from '../../src/kernel/errors.ts';
import {
  FAILURE_ADMISSION,
  FAILURE_LANDING_INTERRUPTED,
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

  it('should name the stage in words when it builds its own message', () => {
    // **The human channel** (D-132 §5.3). `stage` is the machine channel and
    // the message is the human one, split explicitly rather than by one string
    // union trying to be both. A stage whose name went missing renders
    // `drag:  failure`, which this catches.
    expect(new DraggableError(FAILURE_ADMISSION, null).message).toBe(
      'drag: admission failure',
    );
    expect(new DraggableError(null, null).message).toBe(
      'drag: controller destroyed',
    );
  });

  it('should keep the stage names on their own numbers', () => {
    // **The positional half of the 12/13 witness** (D-41, D-130). `STAGE_NAMES`
    // is indexed by the wire value and pads both holes, so an unpadded hole
    // would shift every later name by one. Asserted through the *neighbours*,
    // because that is the failure mode: 14 still rendering its own name is
    // what proves nothing slid across the gap. `stages.node.test.ts` holds the
    // other half — that neither number came back.
    expect(new DraggableError(FAILURE_TERMINAL_CALLBACK, null).message).toBe(
      'drag: terminal callback failure',
    );
    expect(new DraggableError(FAILURE_LANDING_INTERRUPTED, null).message).toBe(
      'drag: landing interrupted failure',
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
