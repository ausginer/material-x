import { describe, expect, it, vi } from 'vitest';
import {
  createLifetime,
  createOperationLifetimes,
  type Lifetime,
} from '../../src/kernel/lifetimes.ts';

function operationLifetimes(): ReturnType<typeof createOperationLifetimes> {
  return createOperationLifetimes(() => {});
}

function lifetimeWithReports(): Readonly<{
  lifetime: Lifetime;
  reported: unknown[];
}> {
  const reported: unknown[] = [];

  return {
    lifetime: createLifetime((error) => {
      reported.push(error);
    }),
    reported,
  };
}

describe('Lifetime', () => {
  describe('disposal', () => {
    it('should dispose registered disposers in reverse acquisition order', () => {
      const order: string[] = [];
      const { lifetime } = lifetimeWithReports();

      lifetime.use(() => {
        order.push('first');
      });
      lifetime.use(() => {
        order.push('second');
      });
      lifetime.use(() => {
        order.push('third');
      });

      lifetime.dispose();

      expect(order).toEqual(['third', 'second', 'first']);
    });

    it('should run every disposer when one throws', () => {
      const order: string[] = [];
      const { lifetime } = lifetimeWithReports();

      lifetime.use(() => {
        order.push('outer');
      });
      lifetime.use(() => {
        throw new Error('inner failed');
      });
      lifetime.use(() => {
        order.push('innermost');
      });

      lifetime.dispose();

      expect(order).toEqual(['innermost', 'outer']);
    });

    it('should report a failed disposer', () => {
      const failure = new Error('inner failed');
      const { lifetime, reported } = lifetimeWithReports();
      lifetime.use(() => {
        throw failure;
      });

      lifetime.dispose();

      expect(reported).toEqual([failure]);
    });

    it('should report every failure in disposal order', () => {
      const first = new Error('first');
      const second = new Error('second');
      const { lifetime, reported } = lifetimeWithReports();
      lifetime.use(() => {
        throw first;
      });
      lifetime.use(() => {
        throw second;
      });

      lifetime.dispose();

      expect(reported).toEqual([second, first]);
    });

    it('should dispose nothing and report nothing without acquisitions', () => {
      const { lifetime, reported } = lifetimeWithReports();

      expect(() => lifetime.dispose()).not.toThrow();
      expect(reported).toEqual([]);
    });
  });

  describe('idempotence', () => {
    it('should not run a disposer twice across repeated dispose calls', () => {
      const disposer = vi.fn<() => void>();
      const { lifetime } = lifetimeWithReports();
      lifetime.use(disposer);

      lifetime.dispose();
      lifetime.dispose();

      expect(disposer).toHaveBeenCalledOnce();
    });

    it('should not replay a disposer during re-entrant disposal', () => {
      const inner = vi.fn<() => void>();
      const { lifetime } = lifetimeWithReports();
      lifetime.use(inner);
      lifetime.use(() => {
        lifetime.dispose();
      });

      lifetime.dispose();

      expect(inner).toHaveBeenCalledOnce();
    });
  });

  describe('guarded disposal', () => {
    it('should run a guarded disposer while its guard holds', () => {
      const disposer = vi.fn<() => void>();
      const { lifetime } = lifetimeWithReports();
      lifetime.useWhile(() => true, disposer);

      lifetime.dispose();

      expect(disposer).toHaveBeenCalledOnce();
    });

    it('should skip a guarded disposer when its guard no longer holds', () => {
      const disposer = vi.fn<() => void>();
      const { lifetime } = lifetimeWithReports();
      let resolved = false;
      lifetime.useWhile(() => !resolved, disposer);
      resolved = true;

      lifetime.dispose();

      expect(disposer).not.toHaveBeenCalled();
    });

    it('should evaluate the guard at dispose time', () => {
      const guard = vi.fn(() => true);
      const { lifetime } = lifetimeWithReports();
      lifetime.useWhile(guard, () => {});

      expect(guard).not.toHaveBeenCalled();

      lifetime.dispose();

      expect(guard).toHaveBeenCalledOnce();
    });

    it('should keep guarded and unguarded disposers in one LIFO stack', () => {
      const order: string[] = [];
      const { lifetime } = lifetimeWithReports();
      lifetime.use(() => {
        order.push('plain-first');
      });
      lifetime.useWhile(
        () => true,
        () => {
          order.push('guarded');
        },
      );
      lifetime.use(() => {
        order.push('plain-last');
      });

      lifetime.dispose();

      expect(order).toEqual(['plain-last', 'guarded', 'plain-first']);
    });
  });

  describe('state', () => {
    it('should abort its signal when disposed', () => {
      const { lifetime } = lifetimeWithReports();

      expect(lifetime.signal.aborted).toBe(false);

      lifetime.dispose();

      expect(lifetime.signal.aborted).toBe(true);
    });

    it('should report whether it is finalized', () => {
      const { lifetime } = lifetimeWithReports();

      expect(lifetime.finalized).toBe(false);

      lifetime.dispose();

      expect(lifetime.finalized).toBe(true);
    });
  });
});

describe('createOperationLifetimes', () => {
  describe('stage independence', () => {
    it('should close motion without closing cancellation or presentation', () => {
      const owned = operationLifetimes();
      const order: string[] = [];
      owned.motion.use(() => {
        order.push('motion');
      });
      owned.cancellation.use(() => {
        order.push('cancellation');
      });
      owned.presentation.use(() => {
        order.push('presentation');
      });

      owned.motion.dispose();

      expect(order).toEqual(['motion']);
      expect(owned.motion.signal.aborted).toBe(true);
      expect(owned.cancellation.signal.aborted).toBe(false);
    });

    it('should keep the resolver-bearing cancellation stage alive after release', () => {
      // This is the D-1 guarantee: closing motion at release must not abort a
      // consumer resolution that has not settled.
      const owned = operationLifetimes();
      const abort = vi.fn<(...args: unknown[]) => void>();
      const settled = false;
      owned.cancellation.useWhile(() => !settled, abort);

      owned.motion.dispose();

      expect(abort).not.toHaveBeenCalled();
    });

    it('should abort an unsettled resolution when cancellation closes', () => {
      const owned = operationLifetimes();
      const abort = vi.fn<(...args: unknown[]) => void>();
      const settled = false;
      owned.cancellation.useWhile(() => !settled, abort);

      owned.cancellation.dispose();

      expect(abort).toHaveBeenCalledOnce();
      void settled;
    });

    it('should leave a settled resolution un-aborted when cancellation closes', () => {
      const owned = operationLifetimes();
      const abort = vi.fn<(...args: unknown[]) => void>();
      let settled = false;
      owned.cancellation.useWhile(() => !settled, abort);
      settled = true;

      owned.cancellation.dispose();

      expect(abort).not.toHaveBeenCalled();
    });

    it('should hold presentation after cancellation closes', () => {
      const owned = operationLifetimes();
      const released = vi.fn<(...args: unknown[]) => void>();
      owned.presentation.use(released);

      owned.cancellation.dispose();

      expect(released).not.toHaveBeenCalled();
    });
  });

  describe('ordering', () => {
    it('should close every stage on destroy', () => {
      const owned = operationLifetimes();
      const order: string[] = [];
      owned.motion.use(() => {
        order.push('motion');
      });
      owned.cancellation.use(() => {
        order.push('cancellation');
      });
      owned.presentation.use(() => {
        order.push('presentation');
      });

      owned.dispose();

      expect(order).toEqual(['motion', 'cancellation', 'presentation']);
      expect(owned.motion.signal.aborted).toBe(true);
      expect(owned.cancellation.signal.aborted).toBe(true);
    });
  });

  describe('idempotence', () => {
    it('should run each disposer once across repeated closes', () => {
      const owned = operationLifetimes();
      const disposer = vi.fn<(...args: unknown[]) => void>();
      owned.motion.use(disposer);

      owned.dispose();
      owned.dispose();

      expect(disposer).toHaveBeenCalledOnce();
    });
  });
});
