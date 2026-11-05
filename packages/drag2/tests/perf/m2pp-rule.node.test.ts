import { describe, expect, it } from 'vitest';
import { schedule } from '../../bench/m2pp/protocol.ts';
import {
  allocationOutcome,
  classify,
  figuresOf,
  fisherTwoSided,
  median,
  outcomeOf,
  pairedRule,
  signTest,
  type Conditions,
} from '../../bench/m2pp/rule.ts';

/** `k` positive differences of `size` and the rest negative, over 12 rounds. */
const rounds = (k: number, size = 3): readonly number[] =>
  Array.from({ length: 12 }, (_, i) => (i < k ? size : -size));

const ALLOCATION = { tie: 0.05, regression: 0.0005, clear: 0.0025 };

const clean: Conditions = {
  gates: { v0: true, v1: true, v2: true },
  e1: ['no regression'],
  rangeAbove: false,
  e2: ['no regression'],
  L: 1,
  literalMisses: 0,
  tP: 1,
};

describe('signTest', () => {
  it('should sum the upper tail of the binomial', () => {
    expect(signTest(12, 9)).toBeCloseTo(299 / 4096, 12);
  });

  it('should read 1 with no untied rounds', () => {
    expect(signTest(0, 0)).toBe(1);
  });
});

describe('median', () => {
  it('should average the two middle values of an even count', () => {
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe('pairedRule', () => {
  it('should read regression at eleven of twelve', () => {
    expect(pairedRule(rounds(11)).verdict).toBe('regression');
  });

  it('should read inconclusive at ten of twelve', () => {
    expect(pairedRule(rounds(10)).verdict).toBe('inconclusive');
  });

  it('should hold a positive median short of no regression', () => {
    const differences = [...rounds(9, 1).slice(0, 9), -9, -9, -9];

    expect(pairedRule(differences).m).toBe(1);
    expect(pairedRule(differences).verdict).toBe('inconclusive');
  });

  it('should read no regression at even odds with a median at zero', () => {
    expect(pairedRule(rounds(6)).verdict).toBe('no regression');
  });

  it('should drop a difference under one byte as a tie', () => {
    const rule = pairedRule([0.9, -0.9, 3, -3]);

    expect([rule.n, rule.k]).toEqual([2, 1]);
  });

  it('should read n = 0 as p = 1 and m = 0', () => {
    const rule = pairedRule([0, 0.5]);

    expect([rule.p, rule.m, rule.verdict]).toEqual([1, 0, 'no regression']);
  });

  it('should read regression only at twelve of twelve under the allocation thresholds', () => {
    expect(pairedRule(rounds(12), ALLOCATION, 5).verdict).toBe('regression');
    expect(pairedRule(rounds(11), ALLOCATION, 5).verdict).toBe('no regression');
  });

  it('should hold the allocation median to the cell allowance', () => {
    expect(pairedRule(rounds(11), ALLOCATION, 2).verdict).toBe('inconclusive');
  });
});

describe('fisherTwoSided', () => {
  it('should match the textbook table', () => {
    expect(fisherTwoSided(1, 9, 11, 3)).toBeCloseTo(0.002759, 5);
  });

  it('should read 1 on equal margins', () => {
    expect(fisherTwoSided(2, 70, 2, 70)).toBeCloseTo(1, 10);
  });
});

describe('classify', () => {
  const steady = { f: 0, b: 1000, a: 4000, extra: 0 };

  it('should class a raised first reading as high-B', () => {
    const readings = [{ ...steady, b: 1600 }, steady, steady, steady, steady];

    expect(classify(readings, 0, 1000)).toBe('high-B');
  });

  it('should class a lowered second reading as low-A', () => {
    const readings = [steady, { ...steady, a: 3400 }, steady, steady, steady];

    expect(classify(readings, 1, 1000)).toBe('low-A');
  });

  it('should leave a split deficit unclassed', () => {
    const readings = [
      { ...steady, b: 1400, a: 3600 },
      steady,
      steady,
      steady,
      steady,
    ];

    expect(classify(readings, 0, 1000)).toBe('unclassed');
  });
});

describe('figuresOf', () => {
  it('should skip the warm-ups and read minimum and median per controller', () => {
    const readings = Array.from({ length: 96 }, () => 0);
    const measured = [500, 300, 900, 700, 100];

    measured.forEach((retained, i) => {
      readings[(3 + i) * 4 + 2] = retained;
    });

    const [sortable] = figuresOf({ count: 100, readings });

    expect([sortable!.e1, sortable!.e2]).toEqual([1, 5]);
  });
});

describe('outcomeOf', () => {
  it('should read A when every condition holds', () => {
    expect(outcomeOf(clean)).toBe('A');
  });

  it('should read D ahead of a regression when a gate fails', () => {
    expect(
      outcomeOf({
        ...clean,
        gates: { v0: true, v1: false, v2: true },
        e1: ['regression'],
      }),
    ).toBe('D');
  });

  it('should read B ahead of any uncertainty', () => {
    expect(
      outcomeOf({ ...clean, e1: ['regression', 'inconclusive'], tP: 0 }),
    ).toBe('B');
  });

  it.each([
    ['an inconclusive rule', { e1: ['inconclusive'] }],
    ['a regression on the median', { e2: ['regression'] }],
    ['a literal miss with no same-tree miss', { L: 0, literalMisses: 1 }],
    ['separated tails', { tP: 0.009 }],
  ] as const)('should read C on %s', (_, change) => {
    expect(outcomeOf({ ...clean, ...change })).toBe('C');
  });

  it('should read A with a literal miss when the same tree also misses', () => {
    expect(outcomeOf({ ...clean, L: 1, literalMisses: 2 })).toBe('A');
  });

  it('should not read A with a range above the baseline at 1000', () => {
    expect(outcomeOf({ ...clean, rangeAbove: true })).toBe('unmapped');
  });
});

describe('allocationOutcome', () => {
  it('should read a2 on any regression', () => {
    expect(allocationOutcome(['regression', 'inconclusive'], 8)).toBe('a2');
  });

  it('should read a3 on a booked byte', () => {
    expect(allocationOutcome(['no regression'], 8)).toBe('a3');
  });

  it('should read a1 when every cell is clear and no byte is booked', () => {
    expect(allocationOutcome(['no regression'], 0)).toBe('a1');
  });
});

describe('schedule', () => {
  const runs = schedule();
  const inBlock = (block: number) => runs.filter((run) => run.block === block);

  it('should hold the fixed run counts', () => {
    expect([1, 2, 3, 4].map((block) => inBlock(block).length)).toEqual([
      48, 24, 48, 48,
    ]);
  });

  it('should give every run a unique identity', () => {
    expect(new Set(runs.map(({ id }) => id)).size).toBe(168);
  });

  it('should repeat the cycle G, AB, G, AC', () => {
    expect(
      inBlock(1)
        .filter((_, i) => i % 2 === 0)
        .slice(0, 8)
        .map(({ set }) => set),
    ).toEqual(['G', 'AB', 'G', 'AC', 'G', 'AB', 'G', 'AC']);
  });

  it('should run the first-named arm first in odd rounds and second in even ones', () => {
    const firstArms = inBlock(1)
      .filter(({ set }) => set === 'G')
      .filter((_, i) => i % 2 === 0)
      .map(({ arm }) => arm);

    expect(firstArms.slice(0, 2)).toEqual(['candidate', 'base']);
  });

  it('should reverse the probes in even rounds', () => {
    const arms = inBlock(3).map(({ arm }) => arm);

    expect(arms.slice(0, 8)).toEqual([
      'd1-base',
      'd1-candidate',
      'd2-base',
      'd2-candidate',
      'd2-candidate',
      'd2-base',
      'd1-candidate',
      'd1-base',
    ]);
  });
});
