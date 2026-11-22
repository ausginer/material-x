import { describe, expect, it } from 'vitest';
import { computed, effect, signal } from '../src/index.ts';
import { activeEdges, subscriberEdges } from './support/graph.ts';

describe('inspection seam (P9)', () => {
  it("should expose a signal's name", () => {
    expect(signal(0, { name: 'count' }).name).toBe('count');
  });

  it("should expose a computed's name and declared sources before its first run", () => {
    const show = signal(true, { name: 'show' });
    const a = signal(1, { name: 'a' });
    const b = signal(2, { name: 'b' });
    const picked = computed(
      [show, a, b],
      (show, a, b) => (show() ? a() : b()),
      {
        name: 'picked',
      },
    );

    expect(picked.name).toBe('picked');
    expect(picked.sources).toEqual([show, a, b]);
    expect(activeEdges(picked)).toEqual([]);
  });

  it('should leave the name undefined when none is given', () => {
    expect(signal(0).name).toBeUndefined();
  });
});

describe('steady-state edges (P8)', () => {
  it('should reuse the same edge objects for a run that reads the same edges', () => {
    const a = signal(1, { name: 'a' });
    const b = signal(2, { name: 'b' });
    const sum = computed([a, b], (a, b) => a() + b());
    effect([sum], (sum) => {
      sum();
    });
    const active = activeEdges(sum);
    const subscribers = [...subscriberEdges(a), ...subscriberEdges(b)];

    a.set(10);

    activeEdges(sum).forEach((edge, index) => {
      expect(edge).toBe(active[index]);
    });
    [...subscriberEdges(a), ...subscriberEdges(b)].forEach((edge, index) => {
      expect(edge).toBe(subscribers[index]);
    });
  });
});
