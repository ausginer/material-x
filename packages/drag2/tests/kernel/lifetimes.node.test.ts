import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLifetime,
  createOperationLifetimes,
} from '../../src/kernel/lifetimes.ts';

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

describe('createLifetime', () => {
  it('should run disposers in LIFO order', () => {
    const order: number[] = [];
    const lifetime = createLifetime();

    lifetime.use(() => {
      order.push(1);
    });
    lifetime.use(() => {
      order.push(2);
    });
    lifetime.use(() => {
      order.push(3);
    });
    lifetime.dispose();

    expect(order).toEqual([3, 2, 1]);
  });

  it('should abort its signal before running disposers', () => {
    const lifetime = createLifetime();
    let abortedWhenDisposed: boolean | null = null;

    lifetime.use(() => {
      abortedWhenDisposed = lifetime.signal.aborted;
    });
    lifetime.dispose();

    expect(abortedWhenDisposed).toBe(true);
  });

  it('should run the remaining disposers when one throws', () => {
    const survived = vi.fn();
    const lifetime = createLifetime();

    lifetime.use(() => {
      survived();
    });
    lifetime.use(() => {
      throw new Error('boom');
    });
    lifetime.dispose();

    expect(survived).toHaveBeenCalledOnce();
  });

  it('should report a failing disposer through the platform reporter', () => {
    const error = new Error('boom');
    const lifetime = createLifetime();

    lifetime.use(() => {
      throw error;
    });
    lifetime.dispose();

    expect(reported).toContain(error);
  });

  it('should latch dispose so a second call is a no-op', () => {
    const disposer = vi.fn();
    const lifetime = createLifetime();

    lifetime.use(() => {
      disposer();
    });
    lifetime.dispose();
    lifetime.dispose();

    expect(disposer).toHaveBeenCalledOnce();
  });

  it('should invoke a disposer registered after dispose immediately', () => {
    const disposer = vi.fn();
    const lifetime = createLifetime();

    lifetime.dispose();
    expect(disposer).not.toHaveBeenCalled();

    lifetime.use(() => {
      disposer();
    });

    expect(disposer).toHaveBeenCalledOnce();
  });

  it('should report a registration made after dispose', () => {
    const lifetime = createLifetime();

    lifetime.dispose();
    lifetime.use(() => {});

    expect(reported).toHaveLength(1);
  });

  it('should skip a guarded disposer whose guard is false', () => {
    const disposer = vi.fn();
    const lifetime = createLifetime();

    lifetime.useWhile(
      () => false,
      () => {
        disposer();
      },
    );
    lifetime.dispose();

    expect(disposer).not.toHaveBeenCalled();
  });

  it('should run a guarded disposer whose guard is true', () => {
    const disposer = vi.fn();
    const lifetime = createLifetime();

    lifetime.useWhile(
      () => true,
      () => {
        disposer();
      },
    );
    lifetime.dispose();

    expect(disposer).toHaveBeenCalledOnce();
  });

  it('should dispose once however many times it is called', () => {
    // What ~~`finalized`~~ was read for before it was removed (2026-08-22):
    // the latch is still there, and this is the observable half of it.
    const lifetime = createLifetime();
    const disposer = vi.fn();

    lifetime.use(disposer);
    lifetime.dispose();
    lifetime.dispose();

    expect(disposer).toHaveBeenCalledOnce();
  });
});

describe('createOperationLifetimes', () => {
  it('should dispose presentation, then motion, then cancellation', () => {
    const order: string[] = [];
    const lifetimes = createOperationLifetimes();

    lifetimes.motion.use(() => {
      order.push('motion');
    });
    lifetimes.cancellation.use(() => {
      order.push('cancellation');
    });
    lifetimes.presentation.use(() => {
      order.push('presentation');
    });
    lifetimes.dispose();

    expect(order).toEqual(['presentation', 'motion', 'cancellation']);
  });

  it('should keep cancellation open when motion closes', () => {
    const lifetimes = createOperationLifetimes();
    const later = vi.fn();

    lifetimes.motion.dispose();
    // Read through what the scopes do rather than through a flag: a scope that
    // is still open runs a disposer registered after its sibling closed.
    lifetimes.cancellation.use(later);
    lifetimes.presentation.use(later);

    expect(later).not.toHaveBeenCalled();

    lifetimes.dispose();

    expect(later).toHaveBeenCalledTimes(2);
  });
});
