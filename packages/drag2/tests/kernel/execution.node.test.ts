import { describe, expect, it, vi } from 'vitest';
import { ExecutionBracket } from '../../src/kernel/execution.ts';

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

  it('should reach an entry appended during the same drain', () => {
    const harness = createHarness((bracket, action) => {
      if (action === 1) {
        bracket.dispatch(2, null);
      }
    });

    harness.bracket.dispatch(1, null);

    expect(harness.seen).toEqual([1, 2]);
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

  it('should stop immediately when the terminal latch is set mid-drain', () => {
    const harness = createHarness((bracket, action) => {
      if (action === 1) {
        void bracket.close();
      }
    });

    harness.bracket.runIngress(() => {
      harness.bracket.dispatch(1, null);
      harness.bracket.dispatch(2, null);
      harness.bracket.dispatch(3, null);
    });

    expect(harness.seen).toEqual([1]);
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

  it('should release the run latch after a panic', () => {
    const harness = createHarness((_bracket, action) => {
      if (action === 1) {
        throw new Error('boom');
      }
    });

    harness.bracket.dispatch(1, null);
    harness.bracket.dispatch(2, null);

    expect(harness.seen).toEqual([1, 2]);
  });
});
