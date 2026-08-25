import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FAILURE_ACTIVATION,
  FAILURE_RELEASE,
  FAILURE_RENDERER_WRITE,
  type FailureStage,
} from '../../src/kernel/failures.ts';
import { frame, type Draft, type Frame } from '../../src/kernel/frames.ts';
import { ACTIVE, IDLE } from '../../src/kernel/phases.ts';
import { createActionQueue, drain, enqueue } from '../../src/kernel/queue.ts';
import {
  createSeamDriver,
  runActivationSeam,
  runReleaseSeam,
  SEAM_COMMITTED,
  SEAM_DISCARDED,
  SEAM_EFFECT_FAILED,
  SEAM_INVALIDATED,
  SEAM_PREPARE_FAILED,
  type SeamContext,
  type SeamDriver,
  type Transition,
} from '../../src/kernel/seams.ts';

type ExamplePart = {
  item: string | null;
  published: number;
};

const createExamplePart = (): ExamplePart => ({ item: null, published: 0 });

type Harness = Readonly<{
  driver: SeamDriver<ExamplePart>;
  context: SeamContext<ExamplePart>;
  /** Classified failures, in the order the kernel queued them. */
  failures: ReadonlyArray<Readonly<{ stage: FailureStage; error: unknown }>>;
  /** Quality failures, reported through `onError` and never classified (D-49). */
  quality: ReadonlyArray<Readonly<{ stage: FailureStage; error: unknown }>>;
  /** Errors sent to the platform reporter. */
  reported: readonly unknown[];
  current(): Readonly<Frame<ExamplePart>>;
  /** Simulates a reentrant cancel or destroy invalidating the preparation. */
  invalidate(): void;
  commits(): number;
  /** How many times a transaction rebuilt the draft from the committed frame. */
  begins(): number;
}>;

type Reporting = { reportError?(error: unknown): void };

let reported: unknown[];

beforeEach(() => {
  reported = [];
  (globalThis as Reporting).reportError = (error) => {
    reported.push(error);
  };
});

afterEach(() => {
  delete (globalThis as Reporting).reportError;
});

/**
 * A fake kernel: two real frames, a real commit swap, and a validity flag a
 * test flips to stand in for a reentrant cancel. No queue, no lifecycle — the
 * driver is what is under test.
 */
function createHarness(): Harness {
  let current = Object.assign(frame(), createExamplePart());
  let draft = Object.assign(frame(), createExamplePart());
  let valid = true;
  let commits = 0;
  let begins = 0;
  const failures: Array<{ stage: FailureStage; error: unknown }> = [];
  /** D-49's third state: reported through `onError`, never classified. */
  const quality: Array<{ stage: FailureStage; error: unknown }> = [];

  const context: SeamContext<ExamplePart> = {
    begin(): void {
      begins += 1;
      Object.assign(draft, current);
    },
    commit(): void {
      commits += 1;
      const previous = current;
      current = draft;
      draft = previous;
    },
    preparationValid: () => valid,
    readCurrent: () => current,
    readDraft: () => draft,
    fail(stage, error): void {
      failures.push({ stage, error });
    },
    reportQuality(stage, error): void {
      quality.push({ stage, error });
    },
  };

  return {
    driver: createSeamDriver(context),
    context,
    failures,
    quality,
    get reported(): readonly unknown[] {
      return reported;
    },
    current: () => current,
    invalidate(): void {
      valid = false;
    },
    commits: () => commits,
    begins: () => begins,
  };
}

/**
 * A transition that publishes into the draft and records which phases ran.
 *
 * The recorder wraps the *effective* callback rather than living in the
 * defaults, so an overridden phase is still recorded.
 */
function createTransition(
  overrides: Partial<Transition<ExamplePart, { staged: number }>> = {},
): Transition<ExamplePart, { staged: number }> & {
  readonly calls: string[];
} {
  const calls: string[] = [];

  const prepare =
    overrides.prepare ??
    ((draft: Draft<ExamplePart>) => {
      draft.item = 'staged';
      return { staged: 1 };
    });
  const effect = overrides.effect ?? ((): void => {});
  const rollback =
    'rollback' in overrides ? overrides.rollback : (): void => {};

  return {
    calls,
    prepare(draft, capability) {
      calls.push('prepare');
      return prepare(draft, capability);
    },
    effect(current, prepared, capability) {
      calls.push('effect');
      effect(current, prepared, capability);
    },
    ...(rollback
      ? {
          rollback(prepared: { staged: number }): void {
            calls.push('rollback');
            rollback(prepared);
          },
        }
      : {}),
  };
}

describe('runCore', () => {
  it('should commit and run the effect on a successful transition', () => {
    const harness = createHarness();
    const transition = createTransition();

    const outcome = harness.driver.runCore(
      transition,
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(outcome).toBe(SEAM_COMMITTED);
    expect(transition.calls).toEqual(['prepare', 'effect']);
  });

  it('should publish the prepared draft as the committed frame', () => {
    const harness = createHarness();

    harness.driver.runCore(createTransition(), undefined, FAILURE_ACTIVATION);

    expect(harness.current().item).toBe('staged');
  });

  it('should copy the committed frame into the draft before preparing', () => {
    const harness = createHarness();

    harness.driver.runCore(
      createTransition({
        prepare(draft) {
          draft.published = 7;
          return { staged: 1 };
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    let observed = -1;

    harness.driver.runCore(
      createTransition({
        prepare(draft) {
          observed = draft.published;
          return { staged: 1 };
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(observed).toBe(7);
  });

  it('should thread the staged value from prepare to effect', () => {
    const harness = createHarness();
    let received: { staged: number } | null = null;

    harness.driver.runCore(
      createTransition({
        prepare: () => ({ staged: 42 }),
        effect(_current, prepared) {
          received = prepared;
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(received).toEqual({ staged: 42 });
  });

  it('should give the effect the committed frame, never the draft', () => {
    const harness = createHarness();
    let seen: Readonly<Frame<ExamplePart>> | null = null;

    harness.driver.runCore(
      createTransition({
        effect(current) {
          seen = current;
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(seen).toBe(harness.current());
  });
});

describe('runCore discard', () => {
  it('should report a null prepare as discarded', () => {
    const harness = createHarness();

    expect(
      harness.driver.runCore(
        createTransition({ prepare: () => null }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    ).toBe(SEAM_DISCARDED);
  });

  it('should not commit a discarded transition', () => {
    const harness = createHarness();

    harness.driver.runCore(
      createTransition({ prepare: () => null }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(harness.commits()).toBe(0);
  });

  it('should leave the committed frame untouched by a discarded prepare', () => {
    const harness = createHarness();

    harness.driver.runCore(
      createTransition({
        prepare(draft) {
          // The draft is scratch space until commit; abandoning it publishes
          // nothing.
          draft.item = 'abandoned';
          return null;
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(harness.current().item).toBeNull();
  });

  it('should not run the effect for a discarded transition', () => {
    const harness = createHarness();
    const transition = createTransition({ prepare: () => null });

    harness.driver.runCore(transition, undefined, FAILURE_ACTIVATION);

    expect(transition.calls).not.toContain('effect');
  });
});

describe('runCore invalidation', () => {
  it('should report a reentrant invalidation rather than committing', () => {
    const harness = createHarness();

    const outcome = harness.driver.runCore(
      createTransition({
        prepare(_draft) {
          harness.invalidate();
          return { staged: 1 };
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(outcome).toBe(SEAM_INVALIDATED);
    expect(harness.commits()).toBe(0);
  });

  it('should roll back instead of running the effect', () => {
    const harness = createHarness();
    const transition = createTransition({
      prepare(_draft) {
        harness.invalidate();
        return { staged: 1 };
      },
    });

    harness.driver.runCore(transition, undefined, FAILURE_ACTIVATION);

    expect(transition.calls).toEqual(['prepare', 'rollback']);
  });

  it('should hand rollback the staged value', () => {
    const harness = createHarness();
    let released: { staged: number } | null = null;

    harness.driver.runCore(
      createTransition({
        prepare(_draft) {
          harness.invalidate();
          return { staged: 9 };
        },
        rollback(prepared) {
          released = prepared;
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(released).toEqual({ staged: 9 });
  });

  it('should tolerate a transition with no rollback', () => {
    const harness = createHarness();

    expect(() =>
      harness.driver.runCore(
        createTransition({
          prepare(_draft) {
            harness.invalidate();
            return { staged: 1 };
          },
          rollback: undefined,
        }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    ).not.toThrow();
  });

  it('should report a throwing rollback without classifying it', () => {
    const harness = createHarness();
    const error = new Error('rollback boom');

    const outcome = harness.driver.runCore(
      createTransition({
        prepare(_draft) {
          harness.invalidate();
          return { staged: 1 };
        },
        rollback(): void {
          throw error;
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    // Classifying it would open a transition against an operation the kernel
    // has just decided to abandon.
    expect(outcome).toBe(SEAM_INVALIDATED);
    expect(harness.failures).toHaveLength(0);
    expect(reported).toContain(error);
  });
});

describe('runCore failure', () => {
  it('should classify a throwing prepare without committing', () => {
    const harness = createHarness();
    const error = new Error('prepare boom');

    const outcome = harness.driver.runCore(
      createTransition({
        prepare(): { staged: number } {
          throw error;
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(outcome).toBe(SEAM_PREPARE_FAILED);
    expect(harness.commits()).toBe(0);
    expect(harness.failures).toEqual([{ stage: FAILURE_ACTIVATION, error }]);
  });

  it('should not run the effect after a throwing prepare', () => {
    const harness = createHarness();
    const transition = createTransition({
      prepare(): { staged: number } {
        throw new Error('boom');
      },
    });

    harness.driver.runCore(transition, undefined, FAILURE_ACTIVATION);

    expect(transition.calls).not.toContain('effect');
  });

  it('should classify a throwing effect from the committed state', () => {
    const harness = createHarness();
    const error = new Error('effect boom');

    const outcome = harness.driver.runCore(
      createTransition({
        effect(): void {
          throw error;
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    // An `effect` throw is a classified failure, never a panic (F-19) — and the
    // transition is **not** reverted (I-18).
    expect(outcome).toBe(SEAM_EFFECT_FAILED);
    expect(harness.commits()).toBe(1);
    expect(harness.current().item).toBe('staged');
    expect(harness.failures).toEqual([{ stage: FAILURE_ACTIVATION, error }]);
  });

  it('should classify at the stage the seam owns', () => {
    const harness = createHarness();

    harness.driver.runCore(
      createTransition({
        effect(): void {
          throw new Error('boom');
        },
      }),
      undefined,
      FAILURE_RELEASE,
    );

    expect(harness.failures[0]?.stage).toBe(FAILURE_RELEASE);
  });

  it('should not rollback a transition that already committed', () => {
    const harness = createHarness();
    const transition = createTransition({
      effect(): void {
        throw new Error('boom');
      },
    });

    harness.driver.runCore(transition, undefined, FAILURE_ACTIVATION);

    expect(transition.calls).toEqual(['prepare', 'effect']);
  });
});

describe('explicit failure latching', () => {
  it('should treat host.fail in prepare as a prepare failure', () => {
    const harness = createHarness();
    const error = new Error('explicit');

    const outcome = harness.driver.runCore(
      createTransition({
        prepare(): { staged: number } {
          harness.driver.requestFailure(FAILURE_ACTIVATION, error);
          return { staged: 1 };
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    // Returning normally after `host.fail` must be indistinguishable from a
    // throw at the driver boundary (D-28, F-34).
    expect(outcome).toBe(SEAM_PREPARE_FAILED);
    expect(harness.commits()).toBe(0);
    expect(harness.failures).toEqual([{ stage: FAILURE_ACTIVATION, error }]);
  });

  it('should not run the effect after a latched prepare failure', () => {
    const harness = createHarness();
    const transition = createTransition({
      prepare(): { staged: number } {
        harness.driver.requestFailure(FAILURE_ACTIVATION, new Error('x'));
        return { staged: 1 };
      },
    });

    harness.driver.runCore(transition, undefined, FAILURE_ACTIVATION);

    expect(transition.calls).toEqual(['prepare']);
  });

  it('should treat host.fail in an effect as an effect failure', () => {
    const harness = createHarness();

    const outcome = harness.driver.runCore(
      createTransition({
        effect(): void {
          harness.driver.requestFailure(FAILURE_ACTIVATION, new Error('x'));
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(outcome).toBe(SEAM_EFFECT_FAILED);
  });

  it('should clear the latch between the prepare and effect phases', () => {
    const harness = createHarness();
    let first = true;

    // A latch left set by an earlier seam would poison the next one.
    harness.driver.runCore(
      createTransition({
        prepare(): { staged: number } {
          if (first) {
            first = false;
            harness.driver.requestFailure(FAILURE_ACTIVATION, new Error('x'));
          }

          return { staged: 1 };
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(
      harness.driver.runCore(createTransition(), undefined, FAILURE_ACTIVATION),
    ).toBe(SEAM_COMMITTED);
  });

  it('should downgrade host.fail outside a seam to a platform report', () => {
    const harness = createHarness();
    const error = new Error('late');

    harness.driver.requestFailure(FAILURE_ACTIVATION, error);

    // A late continuation from one operation must not classify a failure
    // against another (F-23).
    expect(harness.failures).toHaveLength(0);
    expect(reported).toContain(error);
  });

  it('should classify only once when a phase latches a failure and then throws', () => {
    const harness = createHarness();
    const latched = new Error('latched');

    harness.driver.runCore(
      createTransition({
        prepare(): { staged: number } {
          harness.driver.requestFailure(FAILURE_ACTIVATION, latched);
          throw new Error('thrown');
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    // One phase, one classification: the latched checkpoint is already queued,
    // and a second would let the later error decide the operation's outcome.
    expect(harness.failures).toEqual([
      { stage: FAILURE_ACTIVATION, error: latched },
    ]);
  });

  it('should report the throw that followed a latched failure', () => {
    const harness = createHarness();
    const thrown = new Error('thrown');

    harness.driver.runCore(
      createTransition({
        prepare(): { staged: number } {
          harness.driver.requestFailure(FAILURE_ACTIVATION, new Error('x'));
          throw thrown;
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    // Not classified, but not lost either — it travels on the channel that
    // carries no consequence.
    expect(reported).toContain(thrown);
  });

  it('should still report the phase as failed when it latched and threw', () => {
    const harness = createHarness();

    const outcome = harness.driver.runCore(
      createTransition({
        prepare(): { staged: number } {
          harness.driver.requestFailure(FAILURE_ACTIVATION, new Error('x'));
          throw new Error('thrown');
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(outcome).toBe(SEAM_PREPARE_FAILED);
    expect(harness.commits()).toBe(0);
  });

  it('should downgrade host.fail inside rollback to a platform report', () => {
    const harness = createHarness();
    const error = new Error('during rollback');

    const outcome = harness.driver.runCore(
      createTransition({
        prepare(_draft) {
          harness.invalidate();
          return { staged: 1 };
        },
        rollback(): void {
          harness.driver.requestFailure(FAILURE_ACTIVATION, error);
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(outcome).toBe(SEAM_INVALIDATED);
    expect(harness.failures).toHaveLength(0);
    expect(reported).toContain(error);
  });

  it('should close the seam once the phase returns', () => {
    const harness = createHarness();
    let insideSeam = false;

    harness.driver.runCore(
      createTransition({
        prepare(): { staged: number } {
          insideSeam = harness.driver.isInSeam();
          return { staged: 1 };
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(insideSeam).toBe(true);
    expect(harness.driver.isInSeam()).toBe(false);
  });

  it('should close the seam even when a phase throws', () => {
    const harness = createHarness();

    harness.driver.runCore(
      createTransition({
        prepare(): { staged: number } {
          throw new Error('boom');
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(harness.driver.isInSeam()).toBe(false);
  });
});

describe('runLeaf', () => {
  it('should report success when the seam returns normally', () => {
    const harness = createHarness();

    expect(harness.driver.runLeaf(() => {}, FAILURE_RENDERER_WRITE)).toBe(true);
  });

  it('should classify a throw instead of letting it escape as a panic', () => {
    const harness = createHarness();
    const error = new Error('render boom');

    const succeeded = harness.driver.runLeaf(() => {
      throw error;
    }, FAILURE_RENDERER_WRITE);

    expect(succeeded).toBe(false);
    expect(harness.failures).toEqual([
      { stage: FAILURE_RENDERER_WRITE, error },
    ]);
  });

  it('should treat a latched failure exactly like a throw', () => {
    const harness = createHarness();

    const succeeded = harness.driver.runLeaf(() => {
      harness.driver.requestFailure(FAILURE_RENDERER_WRITE, new Error('x'));
    }, FAILURE_RENDERER_WRITE);

    expect(succeeded).toBe(false);
    expect(harness.failures).toHaveLength(1);
  });

  it('should let a leaf narrow its own stage from the inside', () => {
    const harness = createHarness();

    // `moved` renders and schedules in one callback, narrowing to
    // FAILURE_SCHEDULED_FRAME from within rather than splitting into two seams.
    harness.driver.runLeaf(() => {
      harness.driver.requestFailure(FAILURE_RELEASE, new Error('x'));
    }, FAILURE_RENDERER_WRITE);

    expect(harness.failures[0]?.stage).toBe(FAILURE_RELEASE);
  });
});

describe('runLeafValue', () => {
  it('should return the value when the seam returns normally', () => {
    const harness = createHarness();

    expect(
      harness.driver.runLeafValue(() => ({ x: 1, y: 2 }), FAILURE_RELEASE),
    ).toEqual({ x: 1, y: 2 });
  });

  it('should return undefined and classify when the seam throws', () => {
    const harness = createHarness();
    const error = new Error('measure boom');

    const value = harness.driver.runLeafValue(() => {
      throw error;
    }, FAILURE_RELEASE);

    expect(value).toBeUndefined();
    expect(harness.failures).toEqual([{ stage: FAILURE_RELEASE, error }]);
  });

  it('should return undefined when the seam latches a failure', () => {
    const harness = createHarness();

    const value = harness.driver.runLeafValue(() => {
      harness.driver.requestFailure(FAILURE_RELEASE, new Error('x'));
      return { x: 1, y: 2 };
    }, FAILURE_RELEASE);

    expect(value).toBeUndefined();
  });
});

describe('staged value', () => {
  it('should expose the staged value of a committed transition', () => {
    const harness = createHarness();

    harness.driver.runCore(
      createTransition({ prepare: () => ({ staged: 5 }) }),
      undefined,
      FAILURE_RELEASE,
    );

    expect(harness.driver.consumeStaged()).toEqual({ staged: 5 });
  });

  it('should clear the value once it is consumed', () => {
    const harness = createHarness();

    harness.driver.runCore(
      createTransition({ prepare: () => ({ staged: 5 }) }),
      undefined,
      FAILURE_RELEASE,
    );
    harness.driver.consumeStaged();

    // A staged value must never outlive the one transition that produced it.
    expect(harness.driver.consumeStaged()).toBeNull();
  });

  it('should not carry a committed value into a discarded seam', () => {
    const harness = createHarness();

    harness.driver.runCore(
      createTransition({ prepare: () => ({ staged: 5 }) }),
      undefined,
      FAILURE_RELEASE,
    );
    harness.driver.runCore(
      createTransition({ prepare: () => null }),
      undefined,
      FAILURE_RELEASE,
    );

    expect(harness.driver.consumeStaged()).toBeNull();
  });

  it('should not carry a committed value into an invalidated seam', () => {
    const harness = createHarness();

    harness.driver.runCore(
      createTransition({ prepare: () => ({ staged: 5 }) }),
      undefined,
      FAILURE_RELEASE,
    );
    harness.driver.runCore(
      createTransition({
        prepare(_draft) {
          harness.invalidate();
          return { staged: 6 };
        },
      }),
      undefined,
      FAILURE_RELEASE,
    );

    expect(harness.driver.consumeStaged()).toBeNull();
  });

  it('should not carry a committed value into a failed prepare', () => {
    const harness = createHarness();

    harness.driver.runCore(
      createTransition({ prepare: () => ({ staged: 5 }) }),
      undefined,
      FAILURE_RELEASE,
    );
    harness.driver.runCore(
      createTransition({
        prepare(): { staged: number } {
          throw new Error('boom');
        },
      }),
      undefined,
      FAILURE_RELEASE,
    );

    expect(harness.driver.consumeStaged()).toBeNull();
  });

  it('should not carry a committed value into a failed effect', () => {
    const harness = createHarness();

    harness.driver.runCore(
      createTransition({ prepare: () => ({ staged: 5 }) }),
      undefined,
      FAILURE_RELEASE,
    );
    harness.driver.runCore(
      createTransition({
        effect(): void {
          throw new Error('boom');
        },
      }),
      undefined,
      FAILURE_RELEASE,
    );

    // The seam committed, so its own staged value is gone too: a failed effect
    // publishes nothing the kernel may act on.
    expect(harness.driver.consumeStaged()).toBeNull();
  });

  it('should replace a consumed value with the next commit', () => {
    const harness = createHarness();

    harness.driver.runCore(
      createTransition({ prepare: () => ({ staged: 5 }) }),
      undefined,
      FAILURE_RELEASE,
    );
    harness.driver.consumeStaged();
    harness.driver.runCore(
      createTransition({ prepare: () => ({ staged: 6 }) }),
      undefined,
      FAILURE_RELEASE,
    );

    expect(harness.driver.consumeStaged()).toEqual({ staged: 6 });
  });

  it('should clear a value left unconsumed by an earlier seam', () => {
    const harness = createHarness();

    // Nothing read the first command. A later seam must still not be able to
    // execute it.
    harness.driver.runCore(
      createTransition({ prepare: () => ({ staged: 5 }) }),
      undefined,
      FAILURE_RELEASE,
    );
    harness.driver.runLeaf(() => {}, FAILURE_RELEASE);
    harness.driver.runCore(
      createTransition({ prepare: () => null }),
      undefined,
      FAILURE_RELEASE,
    );

    expect(harness.driver.consumeStaged()).toBeNull();
  });

  it('should report nothing staged before any seam has run', () => {
    expect(createHarness().driver.consumeStaged()).toBeNull();
  });

  it('should stage nothing when the effect abandoned the operation', () => {
    const harness = createHarness();

    // The staging assignment lands *after* the effect, which is exactly when a
    // reentrant `destroy()` has already run: clearing the slot inside teardown
    // cannot help, because the write that repopulates it happens next. So the
    // write itself is conditional.
    const outcome = harness.driver.runCore(
      createTransition({
        prepare: () => ({ staged: 5 }),
        effect(): void {
          harness.invalidate();
        },
      }),
      undefined,
      FAILURE_RELEASE,
    );

    expect(outcome).toBe(SEAM_COMMITTED);
    expect(harness.driver.consumeStaged()).toBeNull();
  });

  it('should report a value an earlier seam left unconsumed', () => {
    const harness = createHarness();

    harness.driver.runCore(
      createTransition({ prepare: () => ({ staged: 5 }) }),
      undefined,
      FAILURE_RELEASE,
    );
    harness.driver.runCore(
      createTransition({ prepare: () => null }),
      undefined,
      FAILURE_RELEASE,
    );

    // Dropping it is not enough on its own: a seam whose value nothing consumes
    // is a bug in the *caller*, and it stays invisible for as long as the drop
    // is silent.
    expect(harness.reported).toHaveLength(1);
    expect(harness.reported[0]).toMatchObject({
      message: expect.stringContaining('seam/staged-unconsumed'),
    });
  });
});

describe('runCore reentrancy', () => {
  /** Re-enters the driver from whichever phase the override installs. */
  const reenter = (harness: Harness): void => {
    harness.driver.runCore(createTransition(), undefined, FAILURE_ACTIVATION);
  };

  it('should refuse a seam opened from inside a prepare', () => {
    const harness = createHarness();

    expect(() =>
      harness.driver.runCore(
        createTransition({
          prepare(): { staged: number } {
            reenter(harness);
            return { staged: 1 };
          },
        }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    ).toThrow(/re-entered/u);
  });

  it('should refuse a seam opened from inside an effect', () => {
    const harness = createHarness();

    expect(() =>
      harness.driver.runCore(
        createTransition({
          effect: () => {
            reenter(harness);
          },
        }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    ).toThrow(/re-entered/u);
  });

  it('should panic rather than classify the refusal as a prepare failure', () => {
    const harness = createHarness();

    // The nested call raises from inside the outer `prepare`, so the outer
    // `catch` would otherwise launder an invariant break into an ordinary
    // behavior failure and return `SEAM_PREPARE_FAILED`.
    expect(() =>
      harness.driver.runCore(
        createTransition({
          prepare(): { staged: number } {
            reenter(harness);
            return { staged: 1 };
          },
        }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    ).toThrow(/re-entered/u);

    expect(harness.failures).toHaveLength(0);
  });

  it('should panic rather than classify the refusal as an effect failure', () => {
    const harness = createHarness();

    expect(() =>
      harness.driver.runCore(
        createTransition({
          effect: () => {
            reenter(harness);
          },
        }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    ).toThrow(/re-entered/u);

    expect(harness.failures).toHaveLength(0);
  });

  it('should panic even when the callback swallows the refusal', () => {
    const harness = createHarness();

    // The latch, not the throw, is what makes the break unhideable: behavior
    // code that catches its own re-entry cannot talk the driver out of it.
    expect(() =>
      harness.driver.runCore(
        createTransition({
          prepare(): { staged: number } {
            try {
              reenter(harness);
            } catch {
              // Swallowed on purpose.
            }

            return { staged: 1 };
          },
        }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    ).toThrow(/re-entered/u);
  });

  it('should panic on re-entry from inside a leaf', () => {
    const harness = createHarness();

    expect(() =>
      harness.driver.runLeaf(() => {
        reenter(harness);
      }, FAILURE_RENDERER_WRITE),
    ).toThrow(/re-entered/u);

    expect(harness.failures).toHaveLength(0);
  });

  it('should not swap the frame pair a second time when re-entry is refused', () => {
    const harness = createHarness();

    expect(() =>
      harness.driver.runCore(
        createTransition({
          effect: () => {
            reenter(harness);
          },
        }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    ).toThrow(/re-entered/u);

    // The outer seam committed once; a nested commit would have swapped its
    // half-built draft in on top of that.
    expect(harness.commits()).toBe(1);
    expect(harness.current().item).toBe('staged');
  });

  it('should stage nothing when a re-entry panic unwinds the seam', () => {
    const harness = createHarness();

    expect(() =>
      harness.driver.runCore(
        createTransition({
          prepare: () => ({ staged: 5 }),
          effect: () => {
            reenter(harness);
          },
        }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    ).toThrow(/re-entered/u);

    // Staging happens after the effect returns, and this one never did.
    expect(harness.driver.consumeStaged()).toBeNull();
  });

  it('should stage after the effect, so nothing the effect runs can observe it', () => {
    const harness = createHarness();
    let observedDuringEffect: unknown = 'unset';

    harness.driver.runCore(
      createTransition({
        prepare: () => ({ staged: 5 }),
        effect(): void {
          observedDuringEffect = harness.driver.consumeStaged();
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    // The value is assigned last, so a consumer callback inside the effect can
    // neither read nor clear it — the outer assignment lands afterwards.
    expect(observedDuringEffect).toBeNull();
    expect(harness.driver.consumeStaged()).toEqual({ staged: 5 });
  });

  it('should let a leaf seam run without tripping the guard', () => {
    const harness = createHarness();

    // The guard is about *nesting*, not about which seam is running: a leaf
    // opened with nothing else open is the ordinary case.
    expect(() =>
      harness.driver.runLeaf(() => {}, FAILURE_RENDERER_WRITE),
    ).not.toThrow();
  });

  it('should refuse the nested transaction before it rebuilds the draft', () => {
    const harness = createHarness();

    expect(() =>
      harness.driver.runCore(
        createTransition({
          prepare(): { staged: number } {
            reenter(harness);
            return { staged: 1 };
          },
        }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    ).toThrow(/re-entered/u);

    // `begin()` copies the committed frame over the draft. Had the refusal
    // landed one line later, it would have wiped the draft the outer seam was
    // still building.
    expect(harness.begins()).toBe(1);
  });

  it('should reopen normally once the outer seam has returned', () => {
    const harness = createHarness();

    harness.driver.runCore(createTransition(), undefined, FAILURE_ACTIVATION);

    expect(
      harness.driver.runCore(createTransition(), undefined, FAILURE_ACTIVATION),
    ).toBe(SEAM_COMMITTED);
  });
});

describe('leaf reentrancy', () => {
  it('should refuse a leaf opened from inside a transactional phase', () => {
    const harness = createHarness();

    expect(() =>
      harness.driver.runCore(
        createTransition({
          prepare(): { staged: number } {
            harness.driver.runLeaf(() => {}, FAILURE_RENDERER_WRITE);
            return { staged: 1 };
          },
        }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    ).toThrow(/re-entered/u);
  });

  it('should refuse a leaf opened from inside another leaf', () => {
    const harness = createHarness();

    expect(() =>
      harness.driver.runLeaf(() => {
        harness.driver.runLeaf(() => {}, FAILURE_RENDERER_WRITE);
      }, FAILURE_RENDERER_WRITE),
    ).toThrow(/re-entered/u);
  });

  it('should refuse a value leaf opened from inside another leaf', () => {
    const harness = createHarness();

    expect(() =>
      harness.driver.runLeaf(() => {
        harness.driver.runLeafValue(() => ({ x: 1 }), FAILURE_RELEASE);
      }, FAILURE_RENDERER_WRITE),
    ).toThrow(/re-entered/u);
  });

  it('should panic rather than classify a nested leaf as the outer failure', () => {
    const harness = createHarness();

    expect(() =>
      harness.driver.runLeaf(() => {
        harness.driver.runLeaf(() => {}, FAILURE_RENDERER_WRITE);
      }, FAILURE_RENDERER_WRITE),
    ).toThrow(/re-entered/u);

    expect(harness.failures).toHaveLength(0);
  });

  it('should reopen a leaf normally once the outer one has returned', () => {
    const harness = createHarness();

    harness.driver.runLeaf(() => {}, FAILURE_RENDERER_WRITE);

    expect(harness.driver.runLeaf(() => {}, FAILURE_RENDERER_WRITE)).toBe(true);
  });
});

describe('seams driven through the action queue', () => {
  /**
   * The guarantee end to end: seams run from the drain handler, so a dispatch
   * raised by behavior code *inside* a seam appends to the live queue and its
   * seam opens only after the outer one has returned.
   */
  function createQueuedKernel(): Readonly<{
    dispatch(action: number, argument: unknown): void;
    driver: SeamDriver<ExamplePart>;
    order: readonly string[];
    staged: readonly unknown[];
    panics: readonly unknown[];
  }> {
    const harness = createHarness();
    const queue = createActionQueue();
    const order: string[] = [];
    const staged: unknown[] = [];
    const panics: unknown[] = [];

    // `handle` and `dispatch` are mutually recursive: that is the point — a
    // seam reaches back into the kernel, and the kernel must queue it.
    let dispatch: (action: number, argument: unknown) => void;

    const handle = (action: number, argument: unknown): void => {
      order.push(`enter:${action}`);
      harness.driver.runCore(
        createTransition({
          prepare: () => ({ staged: action }),
          effect(): void {
            // Behavior code reaching back into the kernel mid-seam.
            if (typeof argument === 'number') {
              dispatch(argument, null);
            }
          },
        }),
        undefined,
        FAILURE_ACTIVATION,
      );
      staged.push(harness.driver.consumeStaged());
      order.push(`exit:${action}`);
    };

    const panic = (error: unknown): void => {
      panics.push(error);
    };

    dispatch = (action: number, argument: unknown): void => {
      enqueue(queue, action, argument);
      drain(queue, handle, panic);
    };

    return { dispatch, driver: harness.driver, order, staged, panics };
  }

  it('should queue a dispatch raised inside a seam rather than nesting it', () => {
    const kernel = createQueuedKernel();

    kernel.dispatch(1, 2);

    expect(kernel.order).toEqual(['enter:1', 'exit:1', 'enter:2', 'exit:2']);
  });

  it('should never trip the reentrancy guard when work is queued', () => {
    const kernel = createQueuedKernel();

    kernel.dispatch(1, 2);

    expect(kernel.panics).toHaveLength(0);
  });

  it('should give each queued seam its own staged value', () => {
    const kernel = createQueuedKernel();

    kernel.dispatch(1, 2);

    // The inner seam's clear-on-open ran after the outer seam had already been
    // read, so neither value was lost or crossed.
    expect(kernel.staged).toEqual([{ staged: 1 }, { staged: 2 }]);
  });

  it('should leave nothing staged once the drain completes', () => {
    const kernel = createQueuedKernel();

    kernel.dispatch(1, 2);

    expect(kernel.driver.consumeStaged()).toBeNull();
  });
});

describe('runActivationSeam', () => {
  const scope = { visual: null };
  /**
   * Stands in for the element `activation.prepare` returns. The driver only
   * threads it, so it is never dereferenced — and this suite runs in node,
   * where there is no DOM to build a real one from. It must be non-null: `null`
   * is the discard signal.
   */
  const stub: unknown = {};
  const element = stub as HTMLElement;

  function activation(
    overrides: Partial<Transition<ExamplePart, HTMLElement, typeof scope>> = {},
  ): Transition<ExamplePart, HTMLElement, typeof scope> {
    return {
      prepare: () => element,
      effect: () => {},
      ...overrides,
    };
  }

  it('should dispatch the checkpoint on a committed activation', () => {
    const harness = createHarness();
    const policy = { retire: vi.fn(), committed: vi.fn() };

    const outcome = runActivationSeam(
      harness.driver,
      activation(),
      scope,
      FAILURE_ACTIVATION,
      policy,
    );

    expect(outcome).toBe(SEAM_COMMITTED);
    expect(policy.committed).toHaveBeenCalledOnce();
    expect(policy.retire).not.toHaveBeenCalled();
  });

  it('should leave nothing staged behind after a committed activation', () => {
    const harness = createHarness();

    runActivationSeam(harness.driver, activation(), scope, FAILURE_ACTIVATION, {
      retire: (): void => {},
      committed: (): void => {},
    });

    // Activation's staged value is the placeholder, consumed by its own effect.
    // Nothing reads it afterwards, so nothing may still hold it.
    expect(harness.driver.consumeStaged()).toBeNull();
  });

  it('should drop the staged value before the policy runs', () => {
    const harness = createHarness();
    let observed: unknown = 'unset';

    runActivationSeam(harness.driver, activation(), scope, FAILURE_ACTIVATION, {
      retire: (): void => {},
      committed(): void {
        observed = harness.driver.consumeStaged();
      },
    });

    expect(observed).toBeNull();
  });

  it('should retire the operation when activation discards', () => {
    const harness = createHarness();
    const policy = { retire: vi.fn(), committed: vi.fn() };

    // There is no such thing as a pending operation with no presentation.
    runActivationSeam(
      harness.driver,
      activation({ prepare: () => null }),
      scope,
      FAILURE_ACTIVATION,
      policy,
    );

    expect(policy.retire).toHaveBeenCalledOnce();
    expect(policy.committed).not.toHaveBeenCalled();
  });

  it('should retire the operation when activation is invalidated', () => {
    const harness = createHarness();
    const policy = { retire: vi.fn(), committed: vi.fn() };

    runActivationSeam(
      harness.driver,
      activation({
        prepare(): HTMLElement {
          harness.invalidate();
          return element;
        },
      }),
      scope,
      FAILURE_ACTIVATION,
      policy,
    );

    expect(policy.retire).toHaveBeenCalledOnce();
  });

  it('should not retire on a prepare failure', () => {
    const harness = createHarness();
    const policy = { retire: vi.fn(), committed: vi.fn() };

    // Retiring here would make the queued FAILED entry stale, so `onError`
    // might never fire (F-27).
    runActivationSeam(
      harness.driver,
      activation({
        prepare(): HTMLElement {
          throw new Error('boom');
        },
      }),
      scope,
      FAILURE_ACTIVATION,
      policy,
    );

    expect(policy.retire).not.toHaveBeenCalled();
    expect(policy.committed).not.toHaveBeenCalled();
  });

  it('should not dispatch the checkpoint on an effect failure', () => {
    const harness = createHarness();
    const policy = { retire: vi.fn(), committed: vi.fn() };

    runActivationSeam(
      harness.driver,
      activation({
        effect(): void {
          throw new Error('boom');
        },
      }),
      scope,
      FAILURE_ACTIVATION,
      policy,
    );

    expect(policy.committed).not.toHaveBeenCalled();
    expect(policy.retire).not.toHaveBeenCalled();
  });

  it('should not dispatch the checkpoint on a latched effect failure', () => {
    const harness = createHarness();
    const policy = { retire: vi.fn(), committed: vi.fn() };

    runActivationSeam(
      harness.driver,
      activation({
        effect(): void {
          harness.driver.requestFailure(FAILURE_ACTIVATION, new Error('x'));
        },
      }),
      scope,
      FAILURE_ACTIVATION,
      policy,
    );

    expect(policy.committed).not.toHaveBeenCalled();
  });
});

describe('runReleaseSeam', () => {
  it('should leave nothing staged behind after executing', () => {
    const harness = createHarness();

    runReleaseSeam(
      harness.driver,
      { prepare: () => ({ invoke: null }), effect: () => {} },
      FAILURE_RELEASE,
      () => {},
    );

    expect(harness.driver.consumeStaged()).toBeNull();
  });

  it('should leave nothing staged behind after a failed release', () => {
    const harness = createHarness();

    runReleaseSeam(
      harness.driver,
      {
        prepare: () => ({ invoke: null }),
        effect(): void {
          throw new Error('boom');
        },
      },
      FAILURE_RELEASE,
      () => {},
    );

    expect(harness.driver.consumeStaged()).toBeNull();
  });

  it('should execute the staged command on a committed release', () => {
    const harness = createHarness();
    const execute = vi.fn();
    const command = { invoke: null };

    const outcome = runReleaseSeam(
      harness.driver,
      { prepare: () => command, effect: () => {} },
      FAILURE_RELEASE,
      (prepared: unknown) => {
        execute(prepared);
      },
    );

    expect(outcome).toBe(SEAM_COMMITTED);
    expect(execute).toHaveBeenCalledExactlyOnceWith(command);
  });

  it('should never invoke the consumer when the release effect abandoned the operation', () => {
    const harness = createHarness();
    const execute = vi.fn();

    // A `release.effect` that reentrantly destroys the controller still commits
    // — I-18 does not revert it — but the command it staged addresses an
    // operation that no longer exists, and running it would open the consumer
    // round-trip after the terminal barrier.
    const outcome = runReleaseSeam(
      harness.driver,
      {
        prepare: () => ({ invoke: null }),
        effect(): void {
          harness.invalidate();
        },
      },
      FAILURE_RELEASE,
      (prepared: unknown): void => {
        execute(prepared);
      },
    );

    expect(outcome).toBe(SEAM_COMMITTED);
    expect(execute).not.toHaveBeenCalled();
  });

  it('should never invoke the consumer after a failed release effect', () => {
    const harness = createHarness();
    const execute = vi.fn();

    // Running the command unconditionally let the consumer receive `onReorder`
    // for a release whose presentation effect had thrown (F-27).
    runReleaseSeam(
      harness.driver,
      {
        prepare: () => ({ invoke: null }),
        effect(): void {
          throw new Error('boom');
        },
      },
      FAILURE_RELEASE,
      (prepared: unknown) => {
        execute(prepared);
      },
    );

    expect(execute).not.toHaveBeenCalled();
  });

  it('should never invoke the consumer after a latched release failure', () => {
    const harness = createHarness();
    const execute = vi.fn();

    runReleaseSeam(
      harness.driver,
      {
        prepare: () => ({ invoke: null }),
        effect(): void {
          harness.driver.requestFailure(FAILURE_RELEASE, new Error('x'));
        },
      },
      FAILURE_RELEASE,
      (prepared: unknown) => {
        execute(prepared);
      },
    );

    expect(execute).not.toHaveBeenCalled();
  });
});

describe('frame phases', () => {
  it('should leave an untouched frame idle', () => {
    expect(createHarness().current().phase).toBe(IDLE);
  });

  it('should publish a phase written by the kernel through the draft', () => {
    const harness = createHarness();

    // The behavior cannot do this — `Draft` makes the kernel slice readonly.
    // The kernel writes it directly on the same physical object.
    harness.driver.runCore(
      createTransition({
        prepare(draft) {
          (draft as unknown as { phase: number }).phase = ACTIVE;
          return { staged: 1 };
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(harness.current().phase).toBe(ACTIVE);
  });
});
