import v8 from 'node:v8';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import {
  ERROR_REPORTED,
  FAILED,
  RESOLUTION_SETTLED,
} from '../../src/kernel/actions.ts';
import { ExecutionBracket } from '../../src/kernel/execution.ts';

/**
 * A real collection, which is the only way to read an argument-release
 * invariant: the queue is the bracket's own field, so *whether it still holds
 * the value* is not a question the entity's surface can answer, and asserting
 * on the call that clears it would assert the mechanism instead of the
 * property.
 */
v8.setFlagsFromString('--expose-gc');
const collect = vm.runInNewContext('gc') as () => void;

const settledWithin = async (
  promise: Promise<void>,
  ms: number,
): Promise<string> =>
  await Promise.race([
    promise.then(() => 'settled'),
    new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve('outstanding');
      }, ms);
    }),
  ]);

const NOOP = (): void => {};

type Harness = Readonly<{
  bracket: ExecutionBracket;
  seen: readonly number[];
  args: readonly unknown[];
  panics: readonly unknown[];
  teardowns: number;
  passes: number;
}>;

/**
 * A bracket with the four callbacks recorded rather than performed. `handle`
 * takes an optional extra step so a row can drive re-entry from inside the
 * drain, which is where every ordering property here lives.
 */
function createHarness(
  step?: (bracket: ExecutionBracket, action: number, argument: unknown) => void,
): Harness {
  const seen: number[] = [];
  const args: unknown[] = [];
  const panics: unknown[] = [];
  const counts = { teardowns: 0, passes: 0 };

  const bracket = new ExecutionBracket(
    (action, argument) => {
      seen.push(action);
      args.push(argument);
      step?.(bracket, action, argument);
    },
    (error) => {
      panics.push(error);
    },
    () => {
      counts.teardowns += 1;
    },
    () => {
      counts.passes += 1;
    },
  );

  return {
    bracket,
    seen,
    args,
    panics,
    get teardowns() {
      return counts.teardowns;
    },
    get passes() {
      return counts.passes;
    },
  };
}

describe('the execution bracket', () => {
  it('should process entries in FIFO order', () => {
    const harness = createHarness();

    harness.bracket.runIngress(() => {
      harness.bracket.dispatch(1, null);
      harness.bracket.dispatch(2, null);
      harness.bracket.dispatch(3, null);
    });

    expect(harness.seen).toEqual([1, 2, 3]);
  });

  it('should pair each entry with its own argument', () => {
    const harness = createHarness();

    harness.bracket.runIngress(() => {
      harness.bracket.dispatch(1, 'a');
      harness.bracket.dispatch(2, 'b');
    });

    expect(harness.args).toEqual(['a', 'b']);
  });

  it('should not interrupt the running action when dispatch nests', () => {
    const order: string[] = [];
    const harness = createHarness((bracket, action) => {
      if (action === 1) {
        order.push('outer:start');
        bracket.dispatch(2, null);
        order.push('outer:end');
        return;
      }

      order.push('appended');
    });

    harness.bracket.dispatch(1, null);

    expect(order).toEqual(['outer:start', 'outer:end', 'appended']);
  });

  it('should handle no entry behind an action that requests destruction', () => {
    const harness = createHarness((bracket, action) => {
      if (action === 1) {
        void bracket.requestClose();
      }
    });

    harness.bracket.runIngress(() => {
      harness.bracket.dispatch(1, null);
      harness.bracket.dispatch(2, null);
      harness.bracket.dispatch(3, null);
    });

    expect(harness.seen).toEqual([1]);
  });

  it('should let the requesting action run to completion', () => {
    const order: string[] = [];
    const harness = createHarness((bracket) => {
      void bracket.requestClose();
      order.push(`after request: closed=${String(bracket.closed)}`);
    });

    harness.bracket.dispatch(1, null);

    expect(order).toEqual(['after request: closed=false']);
  });

  it('should route an escaping throw to panic', () => {
    const error = new Error('boom');
    const panic = vi.fn();
    const bracket = new ExecutionBracket(
      () => {
        throw error;
      },
      (thrown) => {
        panic(thrown);
      },
      NOOP,
      NOOP,
    );

    bracket.dispatch(1, null);

    expect(panic).toHaveBeenCalledExactlyOnceWith(error);
  });

  it('should drop every drained entry so a later pass replays nothing', () => {
    const harness = createHarness();

    harness.bracket.dispatch(1, { retained: true });
    harness.bracket.dispatch(2, null);

    expect(harness.seen).toEqual([1, 2]);
  });

  it('should close before it reports a panic', () => {
    let closedAtPanic: boolean | null = null;
    const bracket: ExecutionBracket = new ExecutionBracket(
      () => {
        throw new Error('boom');
      },
      () => {
        closedAtPanic = bracket.closed;
      },
      NOOP,
      NOOP,
    );

    bracket.dispatch(1, null);

    expect(closedAtPanic).toBe(true);
  });

  it('should tear down after it reports a panic', () => {
    const order: string[] = [];
    const bracket = new ExecutionBracket(
      () => {
        throw new Error('boom');
      },
      () => {
        order.push('panic');
      },
      () => {
        order.push('teardown');
      },
      NOOP,
    );

    bracket.dispatch(1, null);

    expect(order).toEqual(['panic', 'teardown']);
  });

  it('should handle nothing after a panic', () => {
    const harness = createHarness((_bracket, action) => {
      if (action === 1) {
        throw new Error('boom');
      }
    });

    harness.bracket.dispatch(1, null);
    harness.bracket.dispatch(2, null);

    expect(harness.seen).toEqual([1]);
  });

  it('should have settled its promise when destruction is requested after a panic', async () => {
    // Panic applies without a request, so a later request applies nothing and
    // must still hand back a settled promise (the step-1 review's reviewer-B).
    const harness = createHarness(() => {
      throw new Error('boom');
    });

    harness.bracket.dispatch(1, null);
    const closing = harness.bracket.requestClose();

    await expect(
      Promise.race([closing, Promise.resolve('outstanding')]),
    ).resolves.toBeUndefined();
    expect(harness.teardowns).toBe(1);
  });

  it('should return one promise from every request after a panic', () => {
    const harness = createHarness(() => {
      throw new Error('boom');
    });

    harness.bracket.dispatch(1, null);
    const first = harness.bracket.requestClose();

    expect(harness.bracket.requestClose()).toBe(first);
  });

  it('should settle a promise requested from the panic report after teardown', async () => {
    const order: string[] = [];
    let closing!: Promise<void>;
    const bracket = new ExecutionBracket(
      () => {
        throw new Error('boom');
      },
      () => {
        closing = bracket.requestClose();
        void closing.then(() => {
          order.push('settled');
        });
      },
      () => {
        order.push('teardown');
      },
      NOOP,
    );

    bracket.dispatch(1, null);
    await closing;

    expect(order).toEqual(['teardown', 'settled']);
    expect(bracket.requestClose()).toBe(closing);
  });

  it('should apply a destruction an action requests when that action ends', () => {
    let duringPass = -1;
    const harness = createHarness((bracket) => {
      void bracket.requestClose();
      duringPass = harness.teardowns;
    });

    harness.bracket.dispatch(1, null);

    expect([duringPass, harness.teardowns]).toEqual([0, 1]);
  });

  it('should apply a destruction requested with no unit running before it returns', () => {
    const harness = createHarness();

    void harness.bracket.requestClose();

    expect([harness.teardowns, harness.bracket.closed]).toEqual([1, true]);
  });

  it('should have settled its promise when a request with no unit running returns', async () => {
    const bracket = new ExecutionBracket(NOOP, NOOP, NOOP, NOOP);
    const closing = bracket.requestClose();

    // An already-settled promise wins this race, because its reaction is
    // queued before the sentinel's.
    await expect(
      Promise.race([closing, Promise.resolve('outstanding')]),
    ).resolves.toBeUndefined();
  });

  it('should return one promise from every request', () => {
    const harness = createHarness();
    let inside!: Promise<void>;

    harness.bracket.runIngress(() => {
      inside = harness.bracket.requestClose();
    });

    expect([
      harness.bracket.requestClose(),
      harness.bracket.requestClose(),
    ]).toEqual([inside, inside]);
  });

  it('should settle its one promise once', async () => {
    const harness = createHarness();
    let settlements = 0;

    harness.bracket.runIngress(() => {
      void harness.bracket.requestClose().then(() => {
        settlements += 1;
      });
      void harness.bracket.requestClose();
    });
    await harness.bracket.requestClose().then(() => {
      settlements += 1;
    });

    expect([settlements, harness.teardowns]).toEqual([2, 1]);
  });

  it('should apply a destruction requested inside an ingress pass when the pass ends', () => {
    let duringPass = -1;
    const harness = createHarness();

    harness.bracket.runIngress(() => {
      void harness.bracket.requestClose();
      duringPass = harness.teardowns;
    });

    expect([duringPass, harness.teardowns]).toEqual([0, 1]);
  });

  it('should drain after admission and handle nothing once admission requested destruction', () => {
    const harness = createHarness();

    harness.bracket.runIngress(() => {
      harness.bracket.dispatch(1, null);
      void harness.bracket.requestClose();
    });

    expect([harness.seen, harness.teardowns]).toEqual([[], 1]);
  });

  it('should report the fault entries behind a requested destruction in FIFO order and handle nothing', () => {
    // (B1) A settlement with no fault carries no report, and `ERROR_REPORTED`
    // carries a record whose fault was already delivered.
    const reported: string[] = [];
    const entry = (name: string): Readonly<{ discard(): void }> => ({
      discard(): void {
        reported.push(name);
      },
    });
    const harness = createHarness((bracket, action) => {
      if (action === 1) {
        void bracket.requestClose();
      }
    });

    harness.bracket.runIngress(() => {
      harness.bracket.dispatch(1, null);
      harness.bracket.dispatch(FAILED, {
        discard(): void {
          reported.push('checkpoint');
          harness.bracket.dispatch(FAILED, entry('appended'));
        },
      });
      harness.bracket.dispatch(2, null);
      harness.bracket.dispatch(RESOLUTION_SETTLED, entry('rejection'));
      harness.bracket.dispatch(RESOLUTION_SETTLED, {});
      harness.bracket.dispatch(ERROR_REPORTED, entry('delivered'));
    });

    expect(reported).toEqual(['checkpoint', 'rejection', 'appended']);
    expect(harness.seen).toEqual([1]);
  });

  it('should not report an entry handled before destruction was requested', () => {
    // (B2)
    const reported: string[] = [];
    const entry = (name: string): Readonly<{ discard(): void }> => ({
      discard(): void {
        reported.push(name);
      },
    });
    const harness = createHarness((bracket) => {
      void bracket.requestClose();
    });

    harness.bracket.runIngress(() => {
      harness.bracket.dispatch(FAILED, entry('handled'));
      harness.bracket.dispatch(FAILED, entry('discarded'));
    });

    expect(harness.seen).toEqual([FAILED]);
    expect(reported).toEqual(['discarded']);
  });

  it('should call no report for a fault entry behind a panic', () => {
    // (B3)
    let reported = 0;
    const harness = createHarness(() => {
      throw new Error('invariant');
    });

    harness.bracket.runIngress(() => {
      harness.bracket.dispatch(1, null);
      harness.bracket.dispatch(FAILED, {
        discard(): void {
          reported += 1;
        },
      });
    });

    expect(harness.panics).toHaveLength(1);
    expect(reported).toBe(0);
  });

  it('should tear down once however often destruction is requested', () => {
    const harness = createHarness();

    void harness.bracket.requestClose();
    void harness.bracket.requestClose();

    expect(harness.teardowns).toBe(1);
  });

  it('should enqueue without draining while an ingress pass is running', () => {
    let duringPass: readonly number[] = [-1];
    const harness = createHarness();

    harness.bracket.runIngress(() => {
      harness.bracket.dispatch(1, null);
      duringPass = [...harness.seen];
    });

    expect([duringPass, harness.seen]).toEqual([[], [1]]);
  });

  it('should refuse a nested pass before the caller prepares one', () => {
    const harness = createHarness();
    let nested = 0;

    harness.bracket.runIngress(() => {
      harness.bracket.runIngress(() => {
        nested += 1;
      });
    });

    expect([harness.passes, nested]).toEqual([1, 0]);
  });

  it('should refuse an ingress pass while a drained action runs', () => {
    let nested = 0;
    const harness = createHarness((bracket) => {
      bracket.runIngress(() => {
        nested += 1;
      });
    });

    harness.bracket.dispatch(1, null);

    expect([harness.passes, nested]).toEqual([0, 0]);
  });

  it('should refuse an ingress pass while construction runs', () => {
    const harness = createHarness();
    let nested = 0;

    harness.bracket.construct(() => {
      harness.bracket.runIngress(() => {
        nested += 1;
      });
    });

    expect([harness.passes, nested]).toEqual([0, 0]);
  });

  it('should refuse an ingress pass once destruction is applied', () => {
    const harness = createHarness();
    let admitted = 0;

    void harness.bracket.requestClose();
    harness.bracket.runIngress(() => {
      admitted += 1;
    });

    expect([harness.passes, admitted]).toEqual([0, 0]);
  });

  it('should report idle only with no unit running and the controller live', () => {
    const harness = createHarness();
    const seen: boolean[] = [harness.bracket.idle];

    harness.bracket.construct(() => {
      seen.push(harness.bracket.idle);
    });
    seen.push(harness.bracket.idle);
    void harness.bracket.requestClose();
    seen.push(harness.bracket.idle);

    expect(seen).toEqual([true, false, true, false]);
  });

  it('should return what construction built', () => {
    const harness = createHarness();
    const built = {};

    expect(harness.bracket.construct(() => built)).toBe(built);
  });

  it('should drain what construction dispatched once it has built', () => {
    let duringBuild: readonly number[] = [-1];
    const harness = createHarness();

    harness.bracket.construct(() => {
      harness.bracket.dispatch(1, null);
      duringBuild = [...harness.seen];
    });

    expect([duringBuild, harness.seen]).toEqual([[], [1]]);
  });

  it('should apply a destruction requested during construction before construct returns', () => {
    let duringBuild = -1;
    const harness = createHarness();

    harness.bracket.construct(() => {
      void harness.bracket.requestClose();
      duringBuild = harness.teardowns;
    });

    expect([duringBuild, harness.teardowns]).toEqual([0, 1]);
  });

  it('should discard what construction queued when construction throws', () => {
    const harness = createHarness();

    expect(() =>
      harness.bracket.construct(() => {
        harness.bracket.dispatch(1, null);
        throw new Error('construction');
      }),
    ).toThrow('construction');

    harness.bracket.dispatch(2, null);

    expect(harness.seen).toEqual([2]);
  });

  it('should settle its promise only after the teardown callback has run', async () => {
    const OUTSTANDING = 'outstanding';
    let closing!: Promise<void>;
    let probe!: Promise<unknown>;
    const bracket = new ExecutionBracket(
      NOOP,
      NOOP,
      () => {
        // An already-settled promise wins this race, because its reaction is
        // queued before the sentinel's; one still outstanding loses it. That is
        // the only synchronous reading of "has it settled yet" there is.
        probe = Promise.race([closing, Promise.resolve(OUTSTANDING)]);
      },
      NOOP,
    );

    // Closed from inside a pass, so the promise exists before the callback the
    // ordering is about runs.
    bracket.runIngress(() => {
      closing = bracket.requestClose();
    });

    await expect(probe).resolves.toBe(OUTSTANDING);
  });

  it('should release the arguments a destroying pass left queued', async () => {
    let queued!: WeakRef<object>;
    const bracket = new ExecutionBracket(NOOP, NOOP, NOOP, NOOP);

    bracket.runIngress(() => {
      const argument = { retained: true };

      queued = new WeakRef(argument);
      // Queued rather than drained, because the pass owns the drain — and then
      // never drained at all, because the resolver closed the controller. The
      // teardown's own release is the only thing that can drop it.
      bracket.dispatch(1, argument);
      void bracket.requestClose();
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    collect();

    expect(queued.deref()).toBeUndefined();
  });

  it('should settle its promise when the teardown callback throws', async () => {
    let closing!: Promise<void>;
    const throwing = new ExecutionBracket(
      NOOP,
      NOOP,
      () => {
        throw new Error('teardown');
      },
      NOOP,
    );

    expect(() => {
      throwing.runIngress(() => {
        closing = throwing.requestClose();
      });
    }).toThrow('teardown');

    // The pre-arc shape left this promise pending for the life of the page
    // whenever the last teardown step threw.
    await expect(settledWithin(closing, 50)).resolves.toBe('settled');
  });
});
