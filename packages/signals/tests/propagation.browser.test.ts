import { describe, expect, it, vi } from 'vitest';
import { batch, computed, effect, signal } from '../src/index.ts';

function createDiamond() {
  const a = signal(1, { name: 'a' });
  const runs = { b: 0, c: 0, d: 0 };
  const b = computed([a], (a) => {
    runs.b += 1;
    return a() * 2;
  });
  const c = computed([a], (a) => {
    runs.c += 1;
    return a() * 3;
  });
  const d = computed([b, c], (b, c) => {
    runs.d += 1;
    return `${a.get()}:${b()}+${c()}`;
  });

  return { a, d, runs };
}

describe('propagation', () => {
  describe('diamond a → b, c → d (P1, P2)', () => {
    it('should run b, c and d once each for one write to a', () => {
      const { a, d, runs } = createDiamond();
      const seen: string[] = [];
      effect([d], (d) => {
        seen.push(d());
      });
      runs.b = 0;
      runs.c = 0;
      runs.d = 0;

      a.set(2);

      expect(runs).toEqual({ b: 1, c: 1, d: 1 });
    });

    it('should show the effect a consistent d', () => {
      const { a, d } = createDiamond();
      const seen: string[] = [];
      effect([d], (d) => {
        seen.push(d());
      });

      a.set(2);
      a.set(3);

      expect(seen).toEqual(['1:2+3', '2:4+6', '3:6+9']);
    });

    it('should run the effect once for one write to a', () => {
      const { a, d } = createDiamond();
      const fn = vi.fn((d: () => string) => {
        d();
      });
      effect([d], fn);
      fn.mockClear();

      a.set(2);

      expect(fn).toHaveBeenCalledOnce();
    });
  });

  describe('equality cut-off (P3)', () => {
    it('should not rerun the consumers of a computed whose value is unchanged', () => {
      const n = signal(1);
      const parity = computed([n], (n) => n() % 2);
      const consumer = vi.fn((parity: () => number) => parity());
      const observed = computed([parity], consumer);
      const runs = vi.fn();
      effect([observed], (observed) => {
        observed();
        runs();
      });
      consumer.mockClear();
      runs.mockClear();

      n.set(3);

      expect(consumer).not.toHaveBeenCalled();
      expect(runs).not.toHaveBeenCalled();
    });

    it('should use the equality function the node names', () => {
      const point = signal(
        { x: 1, y: 2 },
        { equals: (previous, next) => previous.x === next.x },
      );
      const runs = vi.fn();
      effect([point], (point) => {
        point();
        runs();
      });
      runs.mockClear();

      point.set({ x: 1, y: 3 });

      expect(runs).not.toHaveBeenCalled();
    });

    it('should not run an effect for a write of an equal value', () => {
      const n = signal(1);
      const runs = vi.fn();
      effect([n], (n) => {
        n();
        runs();
      });
      runs.mockClear();

      n.set(1);

      expect(runs).not.toHaveBeenCalled();
    });
  });

  describe('batching (P10)', () => {
    it('should propagate the writes in a batch once, at its end', () => {
      const a = signal(1);
      const b = signal(1);
      const seen: number[] = [];
      effect([a, b], (a, b) => {
        seen.push(a() + b());
      });

      batch(() => {
        a.set(2);
        b.set(3);
        expect(seen).toEqual([2]);
      });

      expect(seen).toEqual([2, 5]);
    });

    it('should flush nested batches at the end of the outermost one', () => {
      const a = signal(1);
      const seen: number[] = [];
      effect([a], (a) => {
        seen.push(a());
      });

      batch(() => {
        batch(() => {
          a.set(2);
        });
        expect(seen).toEqual([1]);
        a.set(3);
      });

      expect(seen).toEqual([1, 3]);
    });

    it('should return what the batched function returns', () => {
      expect(batch(() => 7)).toBe(7);
    });

    it('should flush when the batched function throws', () => {
      const a = signal(1);
      const seen: number[] = [];
      effect([a], (a) => {
        seen.push(a());
      });

      expect(() =>
        batch(() => {
          a.set(2);
          throw new Error('stop');
        }),
      ).toThrow('stop');
      expect(seen).toEqual([1, 2]);
    });

    it('should run an effect written to by another effect in the same flush', () => {
      const a = signal(1);
      const doubled = signal(0);
      const seen: number[] = [];
      effect([a], (a) => {
        doubled.set(a() * 2);
      });
      effect([doubled], (doubled) => {
        seen.push(doubled());
      });

      a.set(5);

      expect(seen).toEqual([2, 10]);
    });
  });
});

describe('effect', () => {
  it('should run once before it returns', () => {
    const runs = vi.fn();

    effect([], runs);

    expect(runs).toHaveBeenCalledOnce();
  });

  it('should run the cleanup before the next run and on disposal', () => {
    const a = signal(1);
    const log: string[] = [];
    const dispose = effect([a], (a) => {
      const value = a();
      log.push(`run ${value}`);
      return () => {
        log.push(`cleanup ${value}`);
      };
    });

    a.set(2);
    dispose();

    expect(log).toEqual(['run 1', 'cleanup 1', 'run 2', 'cleanup 2']);
  });

  it('should not run after disposal', () => {
    const a = signal(1);
    const runs = vi.fn((a: () => number) => {
      a();
    });
    const dispose = effect([a], runs);
    runs.mockClear();

    dispose();
    a.set(2);

    expect(runs).not.toHaveBeenCalled();
  });

  it('should not run when disposed in a batch after it was marked', () => {
    const a = signal(1);
    const runs = vi.fn((a: () => number) => {
      a();
    });
    const dispose = effect([a], runs);
    runs.mockClear();

    batch(() => {
      a.set(2);
      dispose();
    });

    expect(runs).not.toHaveBeenCalled();
  });

  it('should rethrow from the flush and still run the other effects', () => {
    const a = signal(1);
    const seen: number[] = [];
    effect([a], (a) => {
      if (a() === 2) {
        throw new Error('two');
      }
    });
    effect([a], (a) => {
      seen.push(a());
    });

    expect(() => a.set(2)).toThrow('two');
    expect(seen).toEqual([1, 2]);
  });
});

describe('computed', () => {
  it('should rethrow what its run threw to each reader until a source changes', () => {
    const a = signal(0);
    const runs = vi.fn((a: () => number) => {
      if (a() === 0) {
        throw new Error('zero');
      }

      return 10 / a();
    });
    const c = computed([a], runs);

    expect(() => c.get()).toThrow('zero');
    expect(() => c.get()).toThrow('zero');
    expect(runs).toHaveBeenCalledOnce();

    a.set(5);

    expect(c.get()).toBe(2);
  });

  it('should run an effect again after the computed it reads recovers', () => {
    const a = signal(0);
    const c = computed([a], (a) => {
      if (a() === 0) {
        throw new Error('zero');
      }

      return a();
    });
    const seen: number[] = [];

    expect(() =>
      effect([c], (c) => {
        seen.push(c());
      }),
    ).toThrow('zero');

    effect([c], (c) => {
      try {
        seen.push(c());
      } catch {
        seen.push(-1);
      }
    });
    a.set(1);
    a.set(2);

    expect(seen).toEqual([-1, 1, 2]);
  });
});
