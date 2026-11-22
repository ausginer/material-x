import { describe, expect, it, vi } from 'vitest';
import { family, type FamilyAccessor } from '../src/family.ts';
import {
  computed,
  effect,
  signal,
  type Accessor,
  type Signal,
} from '../src/index.ts';
import {
  activeEdges,
  activeSourceNames,
  subscriberCount,
} from './support/graph.ts';

function createRows(scores: readonly number[]) {
  const rows = scores.map((score, index) =>
    signal(score, { name: `row ${index}` }),
  );
  const list = signal<ReadonlyArray<Signal<number>>>(rows, { name: 'rows' });
  const threshold = signal(10, { name: 'threshold' });

  // The sketch's scan: the index of the first row over the threshold.
  const scan = vi.fn(
    (rows: FamilyAccessor<number>, threshold: Accessor<number>) => {
      const limit = threshold();
      const members = rows();

      for (let index = 0; index < members.length; index += 1) {
        if (rows.at(index) > limit) {
          return members[index]!.name;
        }
      }

      return undefined;
    },
  );
  const firstMatch = computed(
    [family(list, { name: 'rows' }), threshold],
    scan,
    { name: 'firstMatch' },
  );
  const seen: Array<string | undefined> = [];
  effect([firstMatch], (firstMatch) => {
    seen.push(firstMatch());
  });

  return { rows, list, threshold, firstMatch, scan, seen };
}

describe('family', () => {
  describe('bounded and narrowed (C1, C2)', () => {
    it('should subscribe to the rows up to and including the match only', () => {
      const { rows } = createRows([1, 2, 30, 4, 50]);

      expect(rows.map(subscriberCount)).toEqual([1, 1, 1, 0, 0]);
    });

    it('should subscribe to the list and the threshold', () => {
      const { list, threshold } = createRows([1, 30]);

      expect(subscriberCount(list)).toBe(1);
      expect(subscriberCount(threshold)).toBe(1);
    });

    it('should not rerun on a write to a row after the match', () => {
      const { rows, scan } = createRows([1, 30, 4]);
      scan.mockClear();

      rows[2]!.set(100);

      expect(scan).not.toHaveBeenCalled();
    });

    it('should rerun on a write to a row before the match and narrow to the new match', () => {
      const { rows, seen } = createRows([1, 2, 30]);

      rows[0]!.set(20);

      expect(seen).toEqual(['row 2', 'row 0']);
      expect(rows.map(subscriberCount)).toEqual([1, 0, 0]);
    });

    it('should widen when the match moves further down', () => {
      const { rows, threshold, seen } = createRows([1, 20, 30]);

      threshold.set(25);

      expect(seen).toEqual(['row 1', 'row 2']);
      expect(rows.map(subscriberCount)).toEqual([1, 1, 1]);
    });
  });

  describe('changes to the members (C1, C3)', () => {
    it('should subscribe to an inserted row that the scan reads', () => {
      const { rows, list, seen } = createRows([1, 2, 30]);
      const inserted = signal(40, { name: 'inserted' });

      list.set([rows[0]!, inserted, ...rows.slice(1)]);

      expect(seen).toEqual(['row 2', 'inserted']);
      expect(subscriberCount(inserted)).toBe(1);
      expect(rows.map(subscriberCount)).toEqual([1, 0, 0]);
    });

    it('should leave a removed row with no link to the consumer after its next run', () => {
      const { rows, list, firstMatch, scan } = createRows([1, 2, 30]);
      const removed = rows[1]!;
      scan.mockClear();

      list.set([rows[0]!, rows[2]!]);

      expect(scan).toHaveBeenCalledOnce();
      expect(subscriberCount(removed)).toBe(0);
      expect(activeEdges(firstMatch).map((edge) => edge.source)).not.toContain(
        removed,
      );
    });

    it('should not rerun on a write to a removed row', () => {
      const { rows, list, scan } = createRows([1, 2, 30]);
      list.set([rows[0]!, rows[2]!]);
      scan.mockClear();

      rows[1]!.set(100);

      expect(scan).not.toHaveBeenCalled();
    });

    it('should follow a reorder', () => {
      const { rows, list, seen } = createRows([1, 30, 40]);

      list.set([rows[2]!, rows[0]!, rows[1]!]);

      expect(seen).toEqual(['row 1', 'row 2']);
      expect(rows.map(subscriberCount)).toEqual([0, 0, 1]);
    });

    it('should drop the member edges a run no longer reads', () => {
      const { list, firstMatch } = createRows([1, 2, 30]);

      list.set([]);

      expect(activeSourceNames(firstMatch)).toEqual(['threshold', 'rows']);
    });
  });

  describe('inspection (C5)', () => {
    it('should expose the family as a declared source before the first run', () => {
      const list = signal<ReadonlyArray<Signal<number>>>([], { name: 'rows' });
      const rows = family(list, { name: 'rows' });
      const total = computed([rows], (rows) => rows().length);

      expect(total.sources).toEqual([rows]);
      expect(total.sources[0]).toMatchObject({ name: 'rows', list });
      expect(activeEdges(total)).toEqual([]);
    });

    it('should expose the member edges after a run', () => {
      const { firstMatch } = createRows([1, 30, 40]);

      expect(activeSourceNames(firstMatch)).toEqual([
        'threshold',
        'rows',
        'row 0',
        'row 1',
      ]);
    });
  });

  describe('steady state (C4)', () => {
    it('should reuse the member edges for a run that reads the same members', () => {
      const { firstMatch, threshold } = createRows([1, 2, 30, 40]);
      const before = activeEdges(firstMatch);

      threshold.set(5);

      expect(activeEdges(firstMatch)).toEqual(before);
      activeEdges(firstMatch).forEach((edge, index) => {
        expect(edge).toBe(before[index]);
      });
    });
  });

  describe('escaped reads', () => {
    it('should read the current member and mark no edge outside the run', () => {
      const rows = [signal(1), signal(2)];
      const list = signal<ReadonlyArray<Signal<number>>>(rows);
      let escaped: FamilyAccessor<number> | undefined;
      effect([family(list)], (members) => {
        escaped = members;
      });

      rows[1]!.set(5);

      expect(escaped!.at(1)).toBe(5);
      expect(subscriberCount(rows[1]!)).toBe(0);
    });
  });
});
