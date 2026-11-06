import { describe, expect, it, vi } from 'vitest';
import {
  BehaviorRunner,
  runActivationTransition,
  runReleaseTransition,
  TRANSITION_COMMITTED,
  TRANSITION_DISCARDED,
  TRANSITION_EFFECT_FAILED,
  TRANSITION_PREPARE_FAILED,
  type Transition,
} from '../../src/kernel/behavior-runner.ts';
import {
  DraggableError,
  type DraggableWarning,
} from '../../src/kernel/errors.ts';
import { ExecutionLoop } from '../../src/kernel/execution.ts';
import {
  FAILURE_ACTIVATION,
  FAILURE_RELEASE,
  FAILURE_RENDERER_WRITE,
  type FailureStage,
} from '../../src/kernel/failures.ts';
import { frame, type Draft, type Frame } from '../../src/kernel/frames.ts';
import { ACTIVATING, ACTIVE, IDLE } from '../../src/kernel/phases.ts';
import { FrameTransaction } from '../../src/kernel/transaction.ts';

type ExamplePart = {
  item: string | null;
  published: number;
};

const createExamplePart = (): ExamplePart => ({ item: null, published: 0 });

type Harness = Readonly<{
  driver: BehaviorRunner<ExamplePart>;
  /** Classified failures, in the order the kernel queued them. */
  failures: ReadonlyArray<Readonly<{ stage: FailureStage; error: unknown }>>;
  /**
   * **One collector where there were two** (D-130). ~~`quality`, fed by
   * `reportQuality`, and `reported`, fed by a `globalThis.reportError` stub.~~
   * The driver has one non-classifying route now, so the harness has one array
   * — and the collapse is visible here before it is asserted anywhere.
   */
  warnings: readonly DraggableWarning[];
  current(): Readonly<Frame<ExamplePart>>;
  /**
   * Whether the pair is swapped from the way it was built.
   *
   * **A commit is a swap and nothing else swaps the pair**, so this reads *an
   * odd number of transactions landed* — which is the whole question at every
   * row below: none against one, or one against a nested second that would
   * have published a half-built draft on top of it.
   */
  committed(): boolean;
  /** How many times a transaction rebuilt the draft from the committed frame. */
  begins(): number;
}>;

/**
 * A real frame transaction — two composed frames, the real copy and the real
 * swap. No queue, no lifecycle: the driver is what is under test, and the pair
 * it drives is the shipped one rather than a description of it.
 *
 * The kernel's two remaining edges stay closures, which is what they are on
 * the kernel too: the two channels are the controller's. There is no third:
 * the driver reads no request, so nothing stands in for one.
 *
 * **The transaction count is taken at `FrameTransaction.begin` itself**, which
 * is where the driver opens one. Counting it through a collaborator would
 * describe the harness's own wiring rather than the driver's.
 */
function createHarness(): Harness {
  const first = Object.assign(frame(), createExamplePart());
  const frames = new FrameTransaction<ExamplePart>(
    first,
    Object.assign(frame(), createExamplePart()),
  );
  const begins = vi.spyOn(frames, 'begin');
  const failures: Array<{ stage: FailureStage; error: unknown }> = [];
  const warnings: DraggableWarning[] = [];

  return {
    driver: new BehaviorRunner<ExamplePart>(
      frames,
      (stage, error): void => {
        failures.push({ stage, error });
      },
      (error): void => {
        warnings.push(error);
      },
    ),
    failures,
    warnings,
    current: () => frames.current,
    committed: () => frames.current !== first,
    begins: () => begins.mock.calls.length,
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
  };
}

describe('runTransition', () => {
  it('should commit and run the effect on a successful transition', () => {
    const harness = createHarness();
    const transition = createTransition();

    const outcome = harness.driver.runTransition(
      transition,
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(outcome).toBe(TRANSITION_COMMITTED);
    expect(transition.calls).toEqual(['prepare', 'effect']);
  });

  it('should publish the prepared draft as the committed frame', () => {
    const harness = createHarness();

    harness.driver.runTransition(
      createTransition(),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(harness.current().item).toBe('staged');
  });

  it('should copy the committed frame into the draft before preparing', () => {
    const harness = createHarness();

    harness.driver.runTransition(
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

    harness.driver.runTransition(
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

    harness.driver.runTransition(
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

    harness.driver.runTransition(
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

describe('runTransition discard', () => {
  it('should report a null prepare as discarded', () => {
    const harness = createHarness();

    expect(
      harness.driver.runTransition(
        createTransition({ prepare: () => null }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    ).toBe(TRANSITION_DISCARDED);
  });

  it('should not commit a discarded transition', () => {
    const harness = createHarness();

    harness.driver.runTransition(
      createTransition({ prepare: () => null }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(harness.committed()).toBe(false);
  });

  it('should leave the committed frame untouched by a discarded prepare', () => {
    const harness = createHarness();

    harness.driver.runTransition(
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

    harness.driver.runTransition(transition, undefined, FAILURE_ACTIVATION);

    expect(transition.calls).not.toContain('effect');
  });
});

describe('runTransition failure', () => {
  it('should classify a throwing prepare without committing', () => {
    const harness = createHarness();
    const error = new Error('prepare boom');

    const outcome = harness.driver.runTransition(
      createTransition({
        prepare(): { staged: number } {
          throw error;
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(outcome).toBe(TRANSITION_PREPARE_FAILED);
    expect(harness.committed()).toBe(false);
    expect(harness.failures).toEqual([{ stage: FAILURE_ACTIVATION, error }]);
  });

  it('should not run the effect after a throwing prepare', () => {
    const harness = createHarness();
    const transition = createTransition({
      prepare(): { staged: number } {
        throw new Error('boom');
      },
    });

    harness.driver.runTransition(transition, undefined, FAILURE_ACTIVATION);

    expect(transition.calls).not.toContain('effect');
  });

  it('should classify a throwing effect from the committed state', () => {
    const harness = createHarness();
    const error = new Error('effect boom');

    const outcome = harness.driver.runTransition(
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
    expect(outcome).toBe(TRANSITION_EFFECT_FAILED);
    expect(harness.committed()).toBe(true);
    expect(harness.current().item).toBe('staged');
    expect(harness.failures).toEqual([{ stage: FAILURE_ACTIVATION, error }]);
  });

  it('should classify at the stage the seam owns', () => {
    const harness = createHarness();

    harness.driver.runTransition(
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

  it('should run nothing after a throwing effect', () => {
    const harness = createHarness();
    const transition = createTransition({
      effect(): void {
        throw new Error('boom');
      },
    });

    harness.driver.runTransition(transition, undefined, FAILURE_ACTIVATION);

    expect(transition.calls).toEqual(['prepare', 'effect']);
  });
});

describe('explicit failure latching', () => {
  it('should treat kernel.fail in prepare as a prepare failure', () => {
    const harness = createHarness();
    const error = new Error('explicit');

    const outcome = harness.driver.runTransition(
      createTransition({
        prepare(): { staged: number } {
          harness.driver.requestFailure(FAILURE_ACTIVATION, error);
          return { staged: 1 };
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    // Returning normally after `kernel.fail` must be indistinguishable from a
    // throw at the driver boundary (D-28, F-34).
    expect(outcome).toBe(TRANSITION_PREPARE_FAILED);
    expect(harness.committed()).toBe(false);
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

    harness.driver.runTransition(transition, undefined, FAILURE_ACTIVATION);

    expect(transition.calls).toEqual(['prepare']);
  });

  it('should treat kernel.fail in an effect as an effect failure', () => {
    const harness = createHarness();

    const outcome = harness.driver.runTransition(
      createTransition({
        effect(): void {
          harness.driver.requestFailure(FAILURE_ACTIVATION, new Error('x'));
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(outcome).toBe(TRANSITION_EFFECT_FAILED);
  });

  it('should clear the latch between the prepare and effect phases', () => {
    const harness = createHarness();
    let first = true;

    // A latch left set by an earlier seam would poison the next one.
    harness.driver.runTransition(
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
      harness.driver.runTransition(
        createTransition(),
        undefined,
        FAILURE_ACTIVATION,
      ),
    ).toBe(TRANSITION_COMMITTED);
  });

  it('should report kernel.fail outside a seam as a warning rather than classifying it', () => {
    const harness = createHarness();
    const error = new Error('late');

    harness.driver.requestFailure(FAILURE_ACTIVATION, error);

    // A late continuation from one operation must not classify a failure
    // against another (F-23).
    expect(harness.failures).toHaveLength(0);

    // **One warning where there were two reports** (D-130 §2.2): the caught
    // error and the library's companion naming the reason are now one object,
    // message and `cause`. The caller's `FAILURE_ACTIVATION` is deliberately
    // absent — it names the classification this branch just refused.
    expect(harness.warnings).toHaveLength(1);
    expect(harness.warnings[0]?.message).toBe('drag: seam/fail-outside-seam');
    expect(harness.warnings[0]?.cause).toBe(error);
  });

  it('should classify only once when a phase latches a failure and then throws', () => {
    const harness = createHarness();
    const latched = new Error('latched');

    harness.driver.runTransition(
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

    harness.driver.runTransition(
      createTransition({
        prepare(): { staged: number } {
          harness.driver.requestFailure(FAILURE_ACTIVATION, new Error('x'));
          throw thrown;
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    // Not classified, but not lost either — it reaches the same consumer the
    // classified one would, carrying no consequence with it.
    expect(harness.warnings).toHaveLength(1);
    expect(harness.warnings[0]?.message).toBe('drag: seam/failed-then-threw');
    expect(harness.warnings[0]?.cause).toBe(thrown);
  });

  it('should still report the phase as failed when it latched and threw', () => {
    const harness = createHarness();

    const outcome = harness.driver.runTransition(
      createTransition({
        prepare(): { staged: number } {
          harness.driver.requestFailure(FAILURE_ACTIVATION, new Error('x'));
          throw new Error('thrown');
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(outcome).toBe(TRANSITION_PREPARE_FAILED);
    expect(harness.committed()).toBe(false);
  });

  it('should close the seam once the phase returns', () => {
    const harness = createHarness();
    let insideSeam = false;

    harness.driver.runTransition(
      createTransition({
        prepare(): { staged: number } {
          insideSeam = harness.driver.isRunningBehavior();
          return { staged: 1 };
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(insideSeam).toBe(true);
    expect(harness.driver.isRunningBehavior()).toBe(false);
  });

  it('should close the seam even when a phase throws', () => {
    const harness = createHarness();

    harness.driver.runTransition(
      createTransition({
        prepare(): { staged: number } {
          throw new Error('boom');
        },
      }),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(harness.driver.isRunningBehavior()).toBe(false);
  });
});

describe('runCallback', () => {
  it('should report success when the seam returns normally', () => {
    const harness = createHarness();

    expect(harness.driver.runCallback(() => {}, FAILURE_RENDERER_WRITE)).toBe(
      true,
    );
  });

  it('should classify a throw instead of letting it escape as a panic', () => {
    const harness = createHarness();
    const error = new Error('render boom');

    const succeeded = harness.driver.runCallback(() => {
      throw error;
    }, FAILURE_RENDERER_WRITE);

    expect(succeeded).toBe(false);
    expect(harness.failures).toEqual([
      { stage: FAILURE_RENDERER_WRITE, error },
    ]);
  });

  it('should treat a latched failure exactly like a throw', () => {
    const harness = createHarness();

    const succeeded = harness.driver.runCallback(() => {
      harness.driver.requestFailure(FAILURE_RENDERER_WRITE, new Error('x'));
    }, FAILURE_RENDERER_WRITE);

    expect(succeeded).toBe(false);
    expect(harness.failures).toHaveLength(1);
  });

  it('should let a callback narrow its own stage from the inside', () => {
    const harness = createHarness();

    // `moved` renders and schedules in one callback, narrowing to
    // FAILURE_SCHEDULED_FRAME from within rather than splitting into two seams.
    harness.driver.runCallback(() => {
      harness.driver.requestFailure(FAILURE_RELEASE, new Error('x'));
    }, FAILURE_RENDERER_WRITE);

    expect(harness.failures[0]?.stage).toBe(FAILURE_RELEASE);
  });
});

describe('runCallbackForValue', () => {
  it('should return the value when the seam returns normally', () => {
    const harness = createHarness();

    expect(
      harness.driver.runCallbackForValue(
        () => ({ x: 1, y: 2 }),
        FAILURE_RELEASE,
      ),
    ).toEqual({ x: 1, y: 2 });
  });

  it('should return undefined and classify when the seam throws', () => {
    const harness = createHarness();
    const error = new Error('measure boom');

    const value = harness.driver.runCallbackForValue(() => {
      throw error;
    }, FAILURE_RELEASE);

    expect(value).toBeUndefined();
    expect(harness.failures).toEqual([{ stage: FAILURE_RELEASE, error }]);
  });

  it('should return undefined when the seam latches a failure', () => {
    const harness = createHarness();

    const value = harness.driver.runCallbackForValue(() => {
      harness.driver.requestFailure(FAILURE_RELEASE, new Error('x'));
      return { x: 1, y: 2 };
    }, FAILURE_RELEASE);

    expect(value).toBeUndefined();
  });
});

describe('staged value', () => {
  it('should expose the staged value of a committed transition', () => {
    const harness = createHarness();

    harness.driver.runTransition(
      createTransition({ prepare: () => ({ staged: 5 }) }),
      undefined,
      FAILURE_RELEASE,
    );

    expect(harness.driver.consumeStaged()).toEqual({ staged: 5 });
  });

  it('should clear the value once it is consumed', () => {
    const harness = createHarness();

    harness.driver.runTransition(
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

    harness.driver.runTransition(
      createTransition({ prepare: () => ({ staged: 5 }) }),
      undefined,
      FAILURE_RELEASE,
    );
    harness.driver.runTransition(
      createTransition({ prepare: () => null }),
      undefined,
      FAILURE_RELEASE,
    );

    expect(harness.driver.consumeStaged()).toBeNull();
  });

  it('should not carry a committed value into a failed prepare', () => {
    const harness = createHarness();

    harness.driver.runTransition(
      createTransition({ prepare: () => ({ staged: 5 }) }),
      undefined,
      FAILURE_RELEASE,
    );
    harness.driver.runTransition(
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

    harness.driver.runTransition(
      createTransition({ prepare: () => ({ staged: 5 }) }),
      undefined,
      FAILURE_RELEASE,
    );
    harness.driver.runTransition(
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

    harness.driver.runTransition(
      createTransition({ prepare: () => ({ staged: 5 }) }),
      undefined,
      FAILURE_RELEASE,
    );
    harness.driver.consumeStaged();
    harness.driver.runTransition(
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
    harness.driver.runTransition(
      createTransition({ prepare: () => ({ staged: 5 }) }),
      undefined,
      FAILURE_RELEASE,
    );
    harness.driver.runCallback(() => {}, FAILURE_RELEASE);
    harness.driver.runTransition(
      createTransition({ prepare: () => null }),
      undefined,
      FAILURE_RELEASE,
    );

    expect(harness.driver.consumeStaged()).toBeNull();
  });

  it('should report nothing staged before any seam has run', () => {
    expect(createHarness().driver.consumeStaged()).toBeNull();
  });

  it('should report a value an earlier seam left unconsumed', () => {
    const harness = createHarness();

    harness.driver.runTransition(
      createTransition({ prepare: () => ({ staged: 5 }) }),
      undefined,
      FAILURE_RELEASE,
    );
    harness.driver.runTransition(
      createTransition({ prepare: () => null }),
      undefined,
      FAILURE_RELEASE,
    );

    // Dropping it is not enough on its own: a seam whose value nothing consumes
    // is a bug in the *caller*, and it stays invisible for as long as the drop
    // is silent.
    expect(harness.warnings).toHaveLength(1);
    expect(harness.warnings[0]).toMatchObject({
      message: 'drag: seam/staged-unconsumed',
    });
  });
});

/**
 * Distinguishes *nothing was thrown* from *something falsy was thrown*.
 *
 * **Load-bearing since the escape became `null`** (D-153): a helper that
 * returned `null` or `undefined` for a run that completed normally would make
 * the assertion below pass vacuously on exactly the bug it exists to catch —
 * a refusal that stopped refusing.
 */
const NOTHING_THROWN = Symbol('nothing thrown');

/** Whatever a run raised, or {@link NOTHING_THROWN}. */
const escapeOf = (run: () => unknown): unknown => {
  try {
    run();
  } catch (error) {
    return error;
  }

  return NOTHING_THROWN;
};

/**
 * The driver's re-entry escape, asserted **by what it carries — nothing**.
 *
 * These thirteen rows read `/re-entered/u` until the identity was withdrawn,
 * and the replacement is not a weaker spelling of the same assertion. Matching
 * a message proved a violation was refused *and* that the refusal announced
 * itself; the announcement is the half that had to go, since the site is P2 on
 * the call graph and no consumer can reach it (F-85). What is left is the half
 * that was always the point — **something unwound, and it was not an ordinary
 * failure**.
 *
 * A bare `.toThrow()` would not do: it passes for a behavior's own error
 * escaping classification, which is precisely the bug the latch exists to
 * prevent. `null` is what the refusal throws and nothing in the driver's own
 * failure path produces it — a classified fault leaves as a value, not a
 * throw — so pinning it exactly separates *refused* from *failed* without
 * pinning any text.
 *
 * The `null` half of that is only an assertion because {@link escapeOf}
 * reports a completed run as {@link NOTHING_THROWN} rather than as a falsy
 * value of its own.
 */
const expectReentryPanic = (run: () => unknown): void => {
  expect(escapeOf(run)).toBeNull();
};

describe('runTransition reentrancy', () => {
  /** Re-enters the driver from whichever phase the override installs. */
  const reenter = (harness: Harness): void => {
    harness.driver.runTransition(
      createTransition(),
      undefined,
      FAILURE_ACTIVATION,
    );
  };

  it('should refuse a seam opened from inside a prepare', () => {
    const harness = createHarness();

    expectReentryPanic(() =>
      harness.driver.runTransition(
        createTransition({
          prepare(): { staged: number } {
            reenter(harness);
            return { staged: 1 };
          },
        }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    );
  });

  it('should refuse a seam opened from inside an effect', () => {
    const harness = createHarness();

    expectReentryPanic(() =>
      harness.driver.runTransition(
        createTransition({
          effect: () => {
            reenter(harness);
          },
        }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    );
  });

  it('should panic rather than classify the refusal as a prepare failure', () => {
    const harness = createHarness();

    // The nested call raises from inside the outer `prepare`, so the outer
    // `catch` would otherwise launder an invariant break into an ordinary
    // behavior failure and return `TRANSITION_PREPARE_FAILED`.
    expectReentryPanic(() =>
      harness.driver.runTransition(
        createTransition({
          prepare(): { staged: number } {
            reenter(harness);
            return { staged: 1 };
          },
        }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    );

    expect(harness.failures).toHaveLength(0);
  });

  it('should panic rather than classify the refusal as an effect failure', () => {
    const harness = createHarness();

    expectReentryPanic(() =>
      harness.driver.runTransition(
        createTransition({
          effect: () => {
            reenter(harness);
          },
        }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    );

    expect(harness.failures).toHaveLength(0);
  });

  it('should panic even when the callback swallows the refusal', () => {
    const harness = createHarness();

    // The latch, not the throw, is what makes the break unhideable: behavior
    // code that catches its own re-entry cannot talk the driver out of it.
    expectReentryPanic(() =>
      harness.driver.runTransition(
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
    );
  });

  it('should reach the consumer as a controller panic carrying no identity', () => {
    const harness = createHarness();

    // **The two halves the consumer actually meets, composed.** The driver
    // produces the escape; `panic` in `kernel.ts` is `notify(new
    // DraggableError(null, error))`, called after the bracket has closed, and
    // that statement is reproduced here verbatim. Composed rather than driven
    // through the SPI on purpose: F-85 settled from the call graph that **no
    // behavior-facing entry can open a nested phase** — every one is inside a
    // queue handler — so a test that appeared to reach this latch through
    // `BehaviorContext` would be asserting a reachability the record has
    // disproved.
    const thrown = escapeOf(() =>
      harness.driver.runTransition(
        createTransition({
          prepare(): { staged: number } {
            harness.driver.runTransition(
              createTransition(),
              undefined,
              FAILURE_ACTIVATION,
            );
            return { staged: 1 };
          },
        }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    );
    const report = new DraggableError(null, thrown);

    // `null` is the classification and it is the right one: the controller is
    // destroyed, and `FailureStage` classifies faults *within* an operation.
    expect(report.stage).toBeNull();

    // **The identity is gone from both places it could survive.** The message
    // is the constructor's own — a non-`Error` cause has none to adopt — and
    // this is the assertion that fails if `refuseReentry` goes back to throwing
    // a slugged `Error`, because the constructor would adopt that slug as the
    // message. The `cause` is `null`, which is both the truth on this path and
    // the one replacement a consumer's ordinary handling survives: a symbol
    // there throws `TypeError` on interpolation and `notify`'s terminus
    // swallows the report whole (F-166).
    expect(report.message).toBe('drag: controller destroyed');
    expect(report.cause).toBeNull();
    // A real interpolation, not `String(...)`: `String(symbol)` succeeds and
    // only `${symbol}` throws, so this is the one spelling that discriminates.
    // The rule is right in general and this row is what it is about.
    // oxlint-disable-next-line typescript/restrict-template-expressions
    expect(String(report.cause)).toBe('null');

    // The withdrawn identity, spelled out so the row states what it forbids.
    expect(JSON.stringify([report.message, String(report.cause)])).not.toMatch(
      /re-entered|drag: seam\//u,
    );
  });

  it('should panic on re-entry from inside a callback', () => {
    const harness = createHarness();

    expectReentryPanic(() =>
      harness.driver.runCallback(() => {
        reenter(harness);
      }, FAILURE_RENDERER_WRITE),
    );

    expect(harness.failures).toHaveLength(0);
  });

  it('should not swap the frame pair a second time when re-entry is refused', () => {
    const harness = createHarness();

    expectReentryPanic(() =>
      harness.driver.runTransition(
        createTransition({
          effect: () => {
            reenter(harness);
          },
        }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    );

    // The outer seam committed once; a nested commit would have swapped its
    // half-built draft in on top of that.
    expect(harness.committed()).toBe(true);
    expect(harness.current().item).toBe('staged');
  });

  it('should stage nothing when a re-entry panic unwinds the seam', () => {
    const harness = createHarness();

    expectReentryPanic(() =>
      harness.driver.runTransition(
        createTransition({
          prepare: () => ({ staged: 5 }),
          effect: () => {
            reenter(harness);
          },
        }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    );

    // Staging happens after the effect returns, and this one never did.
    expect(harness.driver.consumeStaged()).toBeNull();
  });

  it('should stage after the effect, so nothing the effect runs can observe it', () => {
    const harness = createHarness();
    let observedDuringEffect: unknown = 'unset';

    harness.driver.runTransition(
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

  it('should let a callback run without tripping the guard', () => {
    const harness = createHarness();

    // The guard is about *nesting*, not about which seam is running: a callback
    // opened with nothing else open is the ordinary case.
    expect(() =>
      harness.driver.runCallback(() => {}, FAILURE_RENDERER_WRITE),
    ).not.toThrow();
  });

  it('should refuse the nested transaction before it rebuilds the draft', () => {
    const harness = createHarness();

    expectReentryPanic(() =>
      harness.driver.runTransition(
        createTransition({
          prepare(): { staged: number } {
            reenter(harness);
            return { staged: 1 };
          },
        }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    );

    // `begin()` copies the committed frame over the draft. Had the refusal
    // landed one line later, it would have wiped the draft the outer seam was
    // still building.
    expect(harness.begins()).toBe(1);
  });

  it('should reopen normally once the outer seam has returned', () => {
    const harness = createHarness();

    harness.driver.runTransition(
      createTransition(),
      undefined,
      FAILURE_ACTIVATION,
    );

    expect(
      harness.driver.runTransition(
        createTransition(),
        undefined,
        FAILURE_ACTIVATION,
      ),
    ).toBe(TRANSITION_COMMITTED);
  });
});

describe('callback reentrancy', () => {
  it('should refuse a callback opened from inside a transactional phase', () => {
    const harness = createHarness();

    expectReentryPanic(() =>
      harness.driver.runTransition(
        createTransition({
          prepare(): { staged: number } {
            harness.driver.runCallback(() => {}, FAILURE_RENDERER_WRITE);
            return { staged: 1 };
          },
        }),
        undefined,
        FAILURE_ACTIVATION,
      ),
    );
  });

  it('should refuse a callback opened from inside another callback', () => {
    const harness = createHarness();

    expectReentryPanic(() =>
      harness.driver.runCallback(() => {
        harness.driver.runCallback(() => {}, FAILURE_RENDERER_WRITE);
      }, FAILURE_RENDERER_WRITE),
    );
  });

  it('should refuse a value callback opened from inside another callback', () => {
    const harness = createHarness();

    expectReentryPanic(() =>
      harness.driver.runCallback(() => {
        harness.driver.runCallbackForValue(() => ({ x: 1 }), FAILURE_RELEASE);
      }, FAILURE_RENDERER_WRITE),
    );
  });

  it('should panic rather than classify a nested callback as the outer failure', () => {
    const harness = createHarness();

    expectReentryPanic(() =>
      harness.driver.runCallback(() => {
        harness.driver.runCallback(() => {}, FAILURE_RENDERER_WRITE);
      }, FAILURE_RENDERER_WRITE),
    );

    expect(harness.failures).toHaveLength(0);
  });

  it('should reopen a callback normally once the outer one has returned', () => {
    const harness = createHarness();

    harness.driver.runCallback(() => {}, FAILURE_RENDERER_WRITE);

    expect(harness.driver.runCallback(() => {}, FAILURE_RENDERER_WRITE)).toBe(
      true,
    );
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
    driver: BehaviorRunner<ExamplePart>;
    order: readonly string[];
    staged: readonly unknown[];
    panics: readonly unknown[];
  }> {
    const harness = createHarness();
    const order: string[] = [];
    const staged: unknown[] = [];
    const panics: unknown[] = [];

    // `handle` and the bracket are mutually recursive: that is the point — a
    // seam reaches back into the kernel, and the bracket must queue it.
    let bracket: ExecutionLoop;

    const handle = (action: number, argument: unknown): void => {
      order.push(`enter:${action}`);
      harness.driver.runTransition(
        createTransition({
          prepare: () => ({ staged: action }),
          effect(): void {
            // Behavior code reaching back into the kernel mid-seam.
            if (typeof argument === 'number') {
              bracket.dispatch(argument, null);
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

    bracket = new ExecutionLoop(
      handle,
      panic,
      () => {},
      () => {},
    );

    return {
      dispatch: (action: number, argument: unknown): void => {
        bracket.dispatch(action, argument);
      },
      driver: harness.driver,
      order,
      staged,
      panics,
    };
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

describe('runActivationTransition', () => {
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

    const outcome = runActivationTransition(
      harness.driver,
      activation(),
      scope,
      FAILURE_ACTIVATION,
      ACTIVATING,
      policy,
    );

    expect(outcome).toBe(TRANSITION_COMMITTED);
    expect(policy.committed).toHaveBeenCalledOnce();
    expect(policy.retire).not.toHaveBeenCalled();
  });

  it('should leave nothing staged behind after a committed activation', () => {
    const harness = createHarness();

    runActivationTransition(
      harness.driver,
      activation(),
      scope,
      FAILURE_ACTIVATION,
      ACTIVATING,
      {
        retire: (): void => {},
        committed: (): void => {},
      },
    );

    // Activation's staged value is the placeholder, consumed by its own effect.
    // Nothing reads it afterwards, so nothing may still hold it.
    expect(harness.driver.consumeStaged()).toBeNull();
  });

  it('should drop the staged value before the policy runs', () => {
    const harness = createHarness();
    let observed: unknown = 'unset';

    runActivationTransition(
      harness.driver,
      activation(),
      scope,
      FAILURE_ACTIVATION,
      ACTIVATING,
      {
        retire: (): void => {},
        committed(): void {
          observed = harness.driver.consumeStaged();
        },
      },
    );

    expect(observed).toBeNull();
  });

  it('should retire the operation when activation discards', () => {
    const harness = createHarness();
    const policy = { retire: vi.fn(), committed: vi.fn() };

    // There is no such thing as a pending operation with no presentation.
    runActivationTransition(
      harness.driver,
      activation({ prepare: () => null }),
      scope,
      FAILURE_ACTIVATION,
      ACTIVATING,
      policy,
    );

    expect(policy.retire).toHaveBeenCalledOnce();
    expect(policy.committed).not.toHaveBeenCalled();
  });

  it('should not retire on a prepare failure', () => {
    const harness = createHarness();
    const policy = { retire: vi.fn(), committed: vi.fn() };

    // Retiring here would make the queued FAILED entry stale, so `onError`
    // might never fire (F-27).
    runActivationTransition(
      harness.driver,
      activation({
        prepare(): HTMLElement {
          throw new Error('boom');
        },
      }),
      scope,
      FAILURE_ACTIVATION,
      ACTIVATING,
      policy,
    );

    expect(policy.retire).not.toHaveBeenCalled();
    expect(policy.committed).not.toHaveBeenCalled();
  });

  it('should not dispatch the checkpoint on an effect failure', () => {
    const harness = createHarness();
    const policy = { retire: vi.fn(), committed: vi.fn() };

    runActivationTransition(
      harness.driver,
      activation({
        effect(): void {
          throw new Error('boom');
        },
      }),
      scope,
      FAILURE_ACTIVATION,
      ACTIVATING,
      policy,
    );

    expect(policy.committed).not.toHaveBeenCalled();
    expect(policy.retire).not.toHaveBeenCalled();
  });

  it('should not dispatch the checkpoint on a latched effect failure', () => {
    const harness = createHarness();
    const policy = { retire: vi.fn(), committed: vi.fn() };

    runActivationTransition(
      harness.driver,
      activation({
        effect(): void {
          harness.driver.requestFailure(FAILURE_ACTIVATION, new Error('x'));
        },
      }),
      scope,
      FAILURE_ACTIVATION,
      ACTIVATING,
      policy,
    );

    expect(policy.committed).not.toHaveBeenCalled();
  });
});

describe('runReleaseTransition', () => {
  it('should leave nothing staged behind after executing', () => {
    const harness = createHarness();

    runReleaseTransition(
      harness.driver,
      { prepare: () => ({ invoke: null }), effect: () => {} },
      FAILURE_RELEASE,
      () => {},
    );

    expect(harness.driver.consumeStaged()).toBeNull();
  });

  it('should leave nothing staged behind after a failed release', () => {
    const harness = createHarness();

    runReleaseTransition(
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

    const outcome = runReleaseTransition(
      harness.driver,
      { prepare: () => command, effect: () => {} },
      FAILURE_RELEASE,
      (prepared: unknown) => {
        execute(prepared);
      },
    );

    expect(outcome).toBe(TRANSITION_COMMITTED);
    expect(execute).toHaveBeenCalledExactlyOnceWith(command);
  });

  it('should never invoke the consumer after a failed release effect', () => {
    const harness = createHarness();
    const execute = vi.fn();

    // Running the command unconditionally let the consumer receive `onReorder`
    // for a release whose presentation effect had thrown (F-27).
    runReleaseTransition(
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

    runReleaseTransition(
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
    harness.driver.runTransition(
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
