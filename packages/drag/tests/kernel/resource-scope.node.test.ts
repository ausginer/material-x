import { describe, expect, it, vi } from 'vitest';
import { createResourceScope } from '../../src/kernel/resource-scope.ts';

/** A scope plus the errors its reporter received, in report order. */
function scopeWithReports(): {
  scope: ReturnType<typeof createResourceScope>;
  reported: unknown[];
} {
  const reported: unknown[] = [];
  return {
    scope: createResourceScope((error) => {
      reported.push(error);
    }),
    reported,
  };
}

describe('createResourceScope', () => {
  it('should dispose registered disposers in reverse acquisition order', () => {
    const order: string[] = [];
    const { scope } = scopeWithReports();

    scope.use(() => order.push('first'));
    scope.use(() => order.push('second'));
    scope.use(() => order.push('third'));
    scope.dispose();

    expect(order).toEqual(['third', 'second', 'first']);
  });

  it('should run every disposer even when an earlier one throws', () => {
    const order: string[] = [];
    const { scope } = scopeWithReports();

    scope.use(() => order.push('outer'));
    scope.use(() => {
      throw new Error('inner failed');
    });
    scope.use(() => order.push('innermost'));
    scope.dispose();

    // The throwing disposer sits between the two survivors, so this proves one
    // failed restoration cannot suppress the restorations still queued behind it.
    expect(order).toEqual(['innermost', 'outer']);
  });

  it('should report a failed disposer through the reporter', () => {
    const failure = new Error('inner failed');
    const { scope, reported } = scopeWithReports();

    scope.use(() => {
      throw failure;
    });
    scope.dispose();

    expect(reported).toEqual([failure]);
  });

  it('should report every failure when more than one disposer throws', () => {
    const first = new Error('first');
    const second = new Error('second');
    const { scope, reported } = scopeWithReports();

    scope.use(() => {
      throw first;
    });
    scope.use(() => {
      throw second;
    });
    scope.dispose();

    expect(reported).toEqual([second, first]);
  });

  it('should not run a disposer twice across repeated dispose calls', () => {
    const disposer = vi.fn();
    const { scope } = scopeWithReports();

    scope.use(disposer);
    scope.dispose();
    scope.dispose();

    expect(disposer).toHaveBeenCalledOnce();
  });

  it('should not re-run a disposer when one of them triggers a re-entrant dispose', () => {
    const { scope } = scopeWithReports();
    const inner = vi.fn();

    scope.use(inner);
    scope.use(() => {
      // A disposer that tears the gesture down again: the stack is drained
      // before anything runs, so this must not replay `inner`.
      scope.dispose();
    });
    scope.dispose();

    expect(inner).toHaveBeenCalledOnce();
  });

  it('should run a guarded disposer while its guard holds', () => {
    const disposer = vi.fn();
    const { scope } = scopeWithReports();

    scope.useWhile(() => true, disposer);
    scope.dispose();

    expect(disposer).toHaveBeenCalledOnce();
  });

  it('should skip a guarded disposer once its guard no longer holds', () => {
    const disposer = vi.fn();
    const { scope } = scopeWithReports();
    let resolved = false;

    // The unresolved-only cleanup shape: aborting a consumer resolution that
    // has since completed normally must not run.
    scope.useWhile(() => !resolved, disposer);
    resolved = true;
    scope.dispose();

    expect(disposer).not.toHaveBeenCalled();
  });

  it('should evaluate the guard at dispose time rather than registration time', () => {
    const guard = vi.fn(() => true);
    const { scope } = scopeWithReports();

    scope.useWhile(guard, () => {});
    expect(guard).not.toHaveBeenCalled();

    scope.dispose();
    expect(guard).toHaveBeenCalledOnce();
  });

  it('should keep guarded and unguarded disposers in one reverse-order stack', () => {
    const order: string[] = [];
    const { scope } = scopeWithReports();

    scope.use(() => order.push('plain-first'));
    scope.useWhile(
      () => true,
      () => order.push('guarded'),
    );
    scope.use(() => order.push('plain-last'));
    scope.dispose();

    expect(order).toEqual(['plain-last', 'guarded', 'plain-first']);
  });

  it('should dispose nothing and report nothing when no resource was acquired', () => {
    const { scope, reported } = scopeWithReports();

    expect(() => scope.dispose()).not.toThrow();
    expect(reported).toEqual([]);
  });

  it('should dispose resources registered after an earlier dispose', () => {
    const order: string[] = [];
    const { scope } = scopeWithReports();

    scope.use(() => order.push('first-cycle'));
    scope.dispose();
    scope.use(() => order.push('second-cycle'));
    scope.dispose();

    expect(order).toEqual(['first-cycle', 'second-cycle']);
  });
});
