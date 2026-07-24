import { describe, expect, it, vi } from 'vitest';
import { createOperationLifetimes } from '../../src/kernel/lifetimes.ts';

function lifetimes(): ReturnType<typeof createOperationLifetimes> {
  return createOperationLifetimes(() => {});
}

describe('operation lifetimes', () => {
  describe('stage independence', () => {
    it('should close motion without closing cancellation or presentation', () => {
      const owned = lifetimes();
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

      owned.closeMotion();

      expect(order).toEqual(['motion']);
      expect(owned.motionSignal.aborted).toBe(true);
      expect(owned.cancelSignal.aborted).toBe(false);
    });

    it('should keep the resolver-bearing cancellation stage alive after release', () => {
      // This is the D-1 guarantee: closing motion at release must not abort a
      // consumer resolution that has not settled.
      const owned = lifetimes();
      const abort = vi.fn<(...args: unknown[]) => void>();
      const settled = false;
      owned.cancellation.useWhile(() => !settled, abort);

      owned.closeMotion();

      expect(abort).not.toHaveBeenCalled();
    });

    it('should abort an unsettled resolution when cancellation closes', () => {
      const owned = lifetimes();
      const abort = vi.fn<(...args: unknown[]) => void>();
      const settled = false;
      owned.cancellation.useWhile(() => !settled, abort);

      owned.closeCancellation();

      expect(abort).toHaveBeenCalledOnce();
      void settled;
    });

    it('should leave a settled resolution un-aborted when cancellation closes', () => {
      const owned = lifetimes();
      const abort = vi.fn<(...args: unknown[]) => void>();
      let settled = false;
      owned.cancellation.useWhile(() => !settled, abort);
      settled = true;

      owned.closeCancellation();

      expect(abort).not.toHaveBeenCalled();
    });

    it('should hold presentation after cancellation closes', () => {
      const owned = lifetimes();
      const released = vi.fn<(...args: unknown[]) => void>();
      owned.presentation.use(released);

      owned.closeCancellation();

      expect(released).not.toHaveBeenCalled();
    });
  });

  describe('ordering', () => {
    it('should close motion first when cancellation closes', () => {
      const owned = lifetimes();
      const order: string[] = [];
      owned.motion.use(() => {
        order.push('motion');
      });
      owned.cancellation.use(() => {
        order.push('cancellation');
      });

      owned.closeCancellation();

      expect(order).toEqual(['motion', 'cancellation']);
    });

    it('should dispose within a stage in reverse acquisition order', () => {
      const owned = lifetimes();
      const order: string[] = [];
      owned.presentation.use(() => {
        order.push('first');
      });
      owned.presentation.use(() => {
        order.push('second');
      });

      owned.releasePresentation();

      expect(order).toEqual(['second', 'first']);
    });

    it('should close every stage on destroy', () => {
      const owned = lifetimes();
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

      owned.destroy();

      expect(order).toEqual(['motion', 'cancellation', 'presentation']);
      expect(owned.motionSignal.aborted).toBe(true);
      expect(owned.cancelSignal.aborted).toBe(true);
    });
  });

  describe('idempotence', () => {
    it('should run each disposer once across repeated closes', () => {
      const owned = lifetimes();
      const disposer = vi.fn<(...args: unknown[]) => void>();
      owned.motion.use(disposer);

      owned.closeMotion();
      owned.closeMotion();
      owned.closeCancellation();
      owned.destroy();

      expect(disposer).toHaveBeenCalledOnce();
    });

    it('should report motion closure state', () => {
      const owned = lifetimes();

      expect(owned.motionClosed()).toBe(false);

      owned.closeMotion();

      expect(owned.motionClosed()).toBe(true);
    });
  });

  describe('failure isolation', () => {
    it('should keep disposing after one disposer throws', () => {
      const reported: unknown[] = [];
      const owned = createOperationLifetimes((error) => {
        reported.push(error);
      });
      const later = vi.fn<(...args: unknown[]) => void>();
      owned.presentation.use(later);
      owned.presentation.use(() => {
        throw new Error('restore failed');
      });

      owned.releasePresentation();

      expect(later).toHaveBeenCalledOnce();
      expect(reported).toHaveLength(1);
    });
  });
});
