import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DraggableError, DraggableWarning } from '../../src/kernel/errors.ts';
import {
  createOperationLifetimes,
  type Disposer,
  Lifetime,
} from '../../src/kernel/lifetimes.ts';

/**
 * **The notifier is an argument now** (D-130). ~~A `globalThis.reportError`
 * stub.~~ A lifetime holds no controller reference, so the channel reaches it
 * through the parameter list — which is also what makes these assertions
 * ordinary: the fixture *is* the consumer, and there is no ambient destination
 * left to intercept.
 */
let reported: Array<DraggableError | DraggableWarning>;

const notify = (error: DraggableError | DraggableWarning): void => {
  reported.push(error);
};

beforeEach(() => {
  reported = [];
});

describe('Lifetime', () => {
  it('should run disposers in LIFO order', () => {
    const order: number[] = [];
    const lifetime = new Lifetime(notify);

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
    const lifetime = new Lifetime(notify);
    let abortedWhenDisposed: boolean | null = null;

    lifetime.use(() => {
      abortedWhenDisposed = lifetime.signal.aborted;
    });
    lifetime.dispose();

    expect(abortedWhenDisposed).toBe(true);
  });

  it('should run the remaining disposers when one throws', () => {
    const survived = vi.fn();
    const lifetime = new Lifetime(notify);

    lifetime.use(() => {
      survived();
    });
    lifetime.use(() => {
      throw new Error('boom');
    });
    lifetime.dispose();

    expect(survived).toHaveBeenCalledOnce();
  });

  it('should report a failing disposer as a warning', () => {
    const error = new Error('boom');
    const lifetime = new Lifetime(notify);

    lifetime.use(() => {
      throw error;
    });
    lifetime.dispose();

    // **The class is the assertion** (D-130). The resource was still released
    // — eagerly, by the loop that caught this — so nothing about the operation
    // changed, and a `DraggableError` here would tell a consumer their drag
    // failed because a teardown step did.
    expect(reported).toHaveLength(1);
    expect(reported[0]).toBeInstanceOf(DraggableWarning);
    expect(reported[0]).not.toBeInstanceOf(DraggableError);
    expect(reported[0]?.cause).toBe(error);
  });

  it('should latch dispose so a second call is a no-op', () => {
    const disposer = vi.fn();
    const lifetime = new Lifetime(notify);

    lifetime.use(() => {
      disposer();
    });
    lifetime.dispose();
    lifetime.dispose();

    expect(disposer).toHaveBeenCalledOnce();
  });

  it('should invoke a disposer registered after dispose immediately', () => {
    const disposer = vi.fn();
    const lifetime = new Lifetime(notify);

    lifetime.dispose();
    expect(disposer).not.toHaveBeenCalled();

    lifetime.use(() => {
      disposer();
    });

    expect(disposer).toHaveBeenCalledOnce();
  });

  it('should report a registration made after dispose as a warning', () => {
    const lifetime = new Lifetime(notify);

    lifetime.dispose();
    lifetime.use(() => {});

    expect(reported).toHaveLength(1);
    expect(reported[0]).toBeInstanceOf(DraggableWarning);
    expect(reported[0]?.message).toBe('drag: lifetime/use-after-dispose');
  });

  it('should run a disposer registered from an abort listener immediately', () => {
    const disposer = vi.fn<Disposer>();
    const lifetime = new Lifetime(notify);
    let ranInsideListener = false;

    // The latch is set before the abort, so a listener registering work
    // reaches the late branch rather than the stack the loop then drains.
    // Recorded rather than asserted in place: event dispatch swallows a throw
    // from a listener.
    lifetime.signal.addEventListener('abort', () => {
      lifetime.use(disposer);
      ranInsideListener = disposer.mock.calls.length === 1;
    });
    lifetime.dispose();

    expect(ranInsideListener).toBe(true);
  });

  it('should dispose once however many times it is called', () => {
    // What ~~`finalized`~~ was read for before it was removed (2026-08-22):
    // the latch is still there, and this is the observable half of it.
    const lifetime = new Lifetime(notify);
    const disposer = vi.fn<Disposer>();

    lifetime.use(disposer);
    lifetime.dispose();
    lifetime.dispose();

    expect(disposer).toHaveBeenCalledOnce();
  });
});

describe('createOperationLifetimes', () => {
  it('should dispose presentation, then motion, then cancellation', () => {
    const order: string[] = [];
    const lifetimes = createOperationLifetimes(notify);

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
    const lifetimes = createOperationLifetimes(notify);
    const later = vi.fn<Disposer>();

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
